@echo off
REM SNGPL Frontend - Build and Deploy to Server
REM This script builds the frontend and deploys to production server
REM It also cleans up old build files to save storage

echo ========================================
echo SNGPL Frontend - Build and Deploy
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] Building frontend...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [2/5] Backing up current version on server...
ssh -i "E:\final\sngpl-dashboard-key.pem" ubuntu@sngpldashboard.online "cd /var/www/sngpl-dashboard && sudo cp -r frontend frontend.backup.$(date +%%Y%%m%%d_%%H%%M%%S) 2>/dev/null || echo 'No existing frontend to backup'"

echo.
echo [3/5] Cleaning old files on server...
ssh -i "E:\final\sngpl-dashboard-key.pem" ubuntu@sngpldashboard.online "sudo rm -rf /var/www/sngpl-dashboard/frontend/assets/*"

echo.
echo [4/5] Uploading new build to server...
scp -i "E:\final\sngpl-dashboard-key.pem" -r dist/assets/* ubuntu@sngpldashboard.online:/tmp/assets_upload/
scp -i "E:\final\sngpl-dashboard-key.pem" dist/index.html ubuntu@sngpldashboard.online:/tmp/index_upload.html
ssh -i "E:\final\sngpl-dashboard-key.pem" ubuntu@sngpldashboard.online "sudo mv /tmp/assets_upload/* /var/www/sngpl-dashboard/frontend/assets/ && sudo mv /tmp/index_upload.html /var/www/sngpl-dashboard/frontend/index.html && sudo chown -R ubuntu:ubuntu /var/www/sngpl-dashboard/frontend/"

echo.
echo [5/5] Cleaning up old backups (keeping last 3)...
ssh -i "E:\final\sngpl-dashboard-key.pem" ubuntu@sngpldashboard.online "cd /var/www/sngpl-dashboard && sudo ls -t frontend.backup.* 2>/dev/null | tail -n +4 | xargs sudo rm -rf"

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Frontend deployed to: https://sngpldashboard.online
echo.

pause
