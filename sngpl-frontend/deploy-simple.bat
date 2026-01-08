@echo off
echo ====================================
echo SNGPL Frontend Deployment
echo ====================================
echo.

cd /d E:\SNGPL-Frontend-Source\frontend

echo Cleaning old files on server...
ssh ubuntu@sngpldashboard.online "sudo rm -rf /var/www/sngpl-dashboard/frontend/assets/*"

echo.
echo Uploading assets...
scp -r dist\assets\* ubuntu@sngpldashboard.online:/var/www/sngpl-dashboard/frontend/assets/

echo.
echo Uploading index.html...
scp dist\index.html ubuntu@sngpldashboard.online:/var/www/sngpl-dashboard/frontend/

echo.
echo Reloading Nginx...
ssh ubuntu@sngpldashboard.online "sudo systemctl reload nginx"

echo.
echo ====================================
echo Deployment Complete!
echo ====================================
pause
