"""WebSocket endpoint for real-time updates"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_service import manager
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time device updates

    Clients connect here to receive:
    - Real-time device readings
    - Alarm notifications
    - Device status changes

    Pass ?token=<JWT> to receive only updates for the regions the user is allowed to see.
    Without a valid token the connection is unrestricted (back-compat).
    """
    regions = None
    token = websocket.query_params.get("token")
    if token:
        from app.db.database import SessionLocal
        from app.api.v1.auth import get_user_from_token
        from app.core.scoping import allowed_regions
        db = SessionLocal()
        try:
            user = get_user_from_token(token, db)
            if user is not None:
                regions = allowed_regions(user, db)
        finally:
            db.close()

    await manager.connect(websocket, regions)
    logger.info(f"WebSocket client connected. Total connections: {len(manager.active_connections)}")

    try:
        while True:
            # Keep connection alive and handle client messages
            data = await websocket.receive_text()
            logger.debug(f"Received from client: {data}")

            # Echo back for now (can be extended for client commands)
            await websocket.send_json({
                "type": "pong",
                "message": "Connection alive"
            })

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info(f"WebSocket client disconnected. Total connections: {len(manager.active_connections)}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        manager.disconnect(websocket)
