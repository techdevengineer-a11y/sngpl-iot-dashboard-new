# SNGPL IoT Dashboard

Real-time monitoring and analytics dashboard for SNGPL gas monitoring stations.

## Project Structure

- **sngpl-frontend/** - React + Vite frontend application
- **sngpl-backend/** - FastAPI Python backend
- **.github/workflows/** - GitHub Actions CI/CD configuration

## Deployment

This project uses GitHub Actions for automatic deployment to AWS EC2.

Push to `main` branch will automatically deploy to production.

## Tech Stack

### Frontend
- React 18
- Vite
- TailwindCSS
- Chart.js & Recharts
- React Router
- Axios

### Backend
- FastAPI
- PostgreSQL
- SQLAlchemy
- MQTT Integration

## License

Proprietary - SNGPL IoT Team
