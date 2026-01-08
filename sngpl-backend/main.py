"""
SNGPL IoT Monitoring Platform - FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import uvicorn
import logging

from app.core.config import settings
from app.core.logging_config import setup_logging, get_logger
from app.core.rate_limit import limiter
from app.db.database import engine, Base, init_timescale
from app.api.v1 import auth, devices, alarms, analytics, notifications, dashboard, users, websocket, reports, audit, retention, backup, stations, roles, odorant
from app.api import export
from app.services.websocket_service import manager
from app.services.cleanup_service import cleanup_service

# Setup logging
setup_logging()
logger = get_logger(__name__)

# Create database tables and initialize TimescaleDB (optional)
try:
    Base.metadata.create_all(bind=engine)
    logger.info("✓ Database tables created successfully")

    # Initialize TimescaleDB hypertables (optional - gracefully handles if not installed)
    init_timescale()
    logger.info("✓ Database initialization complete")
except Exception as e:
    logger.error(f"Failed to initialize database: {e}", exc_info=True)
    raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("="*60)
    logger.info("SNGPL IoT Platform - FastAPI Backend Starting")
    logger.info("="*60)
    logger.info("NOTE: MQTT service runs independently via mqtt_listener.py")

    # Start cleanup service
    try:
        cleanup_service.start()
        logger.info("Cleanup service started successfully")
    except Exception as e:
        logger.error(f"Failed to start cleanup service: {e}", exc_info=True)

    yield

    # Shutdown
    logger.info("Shutting down application...")

    try:
        cleanup_service.stop()
        logger.info("Cleanup service stopped successfully")
    except Exception as e:
        logger.error(f"Error stopping cleanup service: {e}", exc_info=True)


# Create FastAPI app
app = FastAPI(
    title="SNGPL IoT Platform API",
    description="Real-time IoT monitoring for 400 gas pipeline devices",
    version="1.0.0",
    lifespan=lifespan
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors"""
    logger.error(
        f"Unhandled exception: {exc}",
        exc_info=True,
        extra={
            "path": request.url.path,
            "method": request.method,
            "client": request.client.host if request.client else "unknown"
        }
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests"""
    api_logger = get_logger("api")
    api_logger.info(f"{request.method} {request.url.path} - Client: {request.client.host if request.client else 'unknown'}")

    try:
        response = await call_next(request)
        api_logger.info(f"{request.method} {request.url.path} - Status: {response.status_code}")
        return response
    except Exception as e:
        api_logger.error(f"{request.method} {request.url.path} - Error: {e}", exc_info=True)
        raise


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_PREFIX}/users", tags=["users"])
app.include_router(devices.router, prefix=f"{settings.API_V1_PREFIX}/devices", tags=["devices"])
app.include_router(alarms.router, prefix=f"{settings.API_V1_PREFIX}/alarms", tags=["alarms"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_PREFIX}/analytics", tags=["analytics"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_PREFIX}/notifications", tags=["notifications"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_PREFIX}/dashboard", tags=["dashboard"])
app.include_router(reports.router, prefix=f"{settings.API_V1_PREFIX}/reports", tags=["reports"])
app.include_router(audit.router, prefix=f"{settings.API_V1_PREFIX}/audit", tags=["audit"])
app.include_router(retention.router, prefix=f"{settings.API_V1_PREFIX}/retention", tags=["retention"])
app.include_router(backup.router, prefix=f"{settings.API_V1_PREFIX}/backup", tags=["backup"])
app.include_router(odorant.router, prefix=f"{settings.API_V1_PREFIX}/odorant", tags=["odorant"])
app.include_router(stations.router, prefix=f"{settings.API_V1_PREFIX}", tags=["sections"])  # Renamed to sections
app.include_router(roles.router, prefix=f"{settings.API_V1_PREFIX}/roles", tags=["roles"])
app.include_router(export.router, prefix=f"{settings.API_V1_PREFIX}/export", tags=["export"])
app.include_router(websocket.router, tags=["websocket"])


@app.get("/")
@limiter.limit("10/minute")  # More restrictive for root
async def root(request: Request):
    """Root endpoint"""
    return {
        "name": "SNGPL IoT Platform API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/api/health")
@limiter.limit("30/minute")  # More permissive for health checks
async def health_check(request: Request):
    """Enhanced health check endpoint"""
    from datetime import datetime
    from app.db.database import get_db

    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "mqtt": {
                "status": "independent",
                "note": "MQTT listener runs as separate process"
            },
            "websocket": {
                "active_connections": len(manager.active_connections),
                "status": "healthy"
            },
            "database": {
                "status": "unknown"
            }
        }
    }

    # Check database connection
    try:
        from sqlalchemy import text
        db = next(get_db())
        db.execute(text("SELECT 1"))
        health_status["services"]["database"]["status"] = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        health_status["services"]["database"]["status"] = "unhealthy"
        health_status["services"]["database"]["error"] = str(e)
        health_status["status"] = "degraded"

    return health_status


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8080,
        reload=True
    )
