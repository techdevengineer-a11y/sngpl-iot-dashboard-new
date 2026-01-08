# ✅ Automatic Deployment Setup Complete!

## Summary

Your SNGPL IoT Dashboard is now connected to GitHub with **automatic deployment**! 🎉

Every time you push code to GitHub, it will automatically deploy to your EC2 server at **www.sngpldashboard.online**

---

## What Was Set Up

### 1. GitHub Repository
- **URL:** https://github.com/techdevengineer-a11y/sngpl-iot-dashboard
- **Privacy:** Private repository
- **Contents:** Full frontend + backend source code

### 2. GitHub Actions Workflow
- **File:** `.github/workflows/deploy.yml`
- **Trigger:** Automatic on every push to `main` branch
- **What it does:**
  1. Copies backend code to EC2 via SCP
  2. Copies frontend code to EC2 via SCP
  3. Preserves .env file and venv
  4. Installs Python dependencies
  5. Restarts backend services
  6. Builds frontend with npm
  7. Reloads nginx

### 3. GitHub Secrets (Configured)
- ✅ `EC2_HOST` = sngpldashboard.online
- ✅ `EC2_USERNAME` = ubuntu
- ✅ `EC2_SSH_KEY` = Your EC2 private key

### 4. EC2 Server Configuration
- ✅ Passwordless sudo for service restarts
- ✅ File permissions set correctly
- ✅ Backend service running on port 8080
- ✅ Frontend served via nginx
- ✅ Website live at: https://www.sngpldashboard.online

---

## How to Use (Daily Workflow)

### Making Changes to Your Code

```bash
# 1. Navigate to your project
cd e:\final\github-backup

# 2. Edit your files (backend or frontend)
# Make your changes...

# 3. Check what changed
git status

# 4. Add your changes
git add .

# 5. Commit with a descriptive message
git commit -m "Describe what you changed"

# 6. Push to GitHub (this triggers automatic deployment!)
git push
```

**That's it!** GitHub will automatically deploy to your EC2 server.

---

## Monitoring Deployments

### Watch Deployment Progress

1. Go to: https://github.com/techdevengineer-a11y/sngpl-iot-dashboard/actions
2. Click on the latest workflow run
3. Watch the deployment logs in real-time!

### Deployment Steps You'll See:

1. **Checkout code** - GitHub Actions downloads your code
2. **Deploy Backend to EC2** - Copies backend files via SCP
3. **Deploy Frontend to EC2** - Copies frontend files via SCP
4. **Install and Restart Services** - Installs dependencies and restarts everything

**Time:** Takes about 2-3 minutes per deployment

---

## Example Scenarios

### Scenario 1: Fix a Bug in Backend

```bash
cd e:\final\github-backup\sngpl-backend

# Edit the file with the bug
# Fix the bug in app/api/v1/devices.py

git add .
git commit -m "Fix device status endpoint bug"
git push

# ✅ Automatically deploys to EC2!
```

### Scenario 2: Update Frontend UI

```bash
cd e:\final\github-backup\sngpl-frontend

# Edit your component
# Update src/pages/Dashboard.jsx

git add .
git commit -m "Update dashboard layout"
git push

# ✅ Automatically builds and deploys frontend!
```

### Scenario 3: Add New Python Dependency

```bash
cd e:\final\github-backup\sngpl-backend

# Add package to requirements.txt
echo "new-package==1.0.0" >> requirements.txt

git add requirements.txt
git commit -m "Add new-package dependency"
git push

# ✅ Automatically installs new package on EC2!
```

### Scenario 4: Update npm Package

```bash
cd e:\final\github-backup\sngpl-frontend

# Update package.json
# Add or update package version

git add package.json
git commit -m "Update React to latest version"
git push

# ✅ Automatically runs npm install on EC2!
```

---

## What Gets Preserved (NOT Overwritten)

The deployment is smart and preserves these files:

### Backend:
- ✅ `.env` file (database passwords, secrets)
- ✅ `venv/` directory (Python virtual environment)
- ✅ `__pycache__/` (Python cache files)

### Frontend:
- ✅ `node_modules/` (npm packages - reinstalled from package.json)
- ✅ `dist/` (build output - rebuilt automatically)

---

## Troubleshooting

### Deployment Failed?

1. Check the logs: https://github.com/techdevengineer-a11y/sngpl-iot-dashboard/actions
2. Click on the failed workflow
3. Expand the step that failed
4. Read the error message

**Common Issues:**

#### Issue 1: SSH Connection Failed
- **Cause:** EC2 secrets might be wrong
- **Fix:** Re-add GitHub secrets (especially `EC2_SSH_KEY`)

#### Issue 2: Port Already in Use
- **Cause:** Old backend process still running
- **Fix:** SSH to server and run:
  ```bash
  sudo kill -9 $(sudo lsof -t -i:8080)
  sudo systemctl restart sngpl-backend
  ```

#### Issue 3: npm Build Failed
- **Cause:** Syntax error in frontend code
- **Fix:** Check the error message, fix the code, and push again

#### Issue 4: Backend Service Won't Start
- **Cause:** Python error or missing dependency
- **Fix:** SSH to server and check logs:
  ```bash
  sudo journalctl -u sngpl-backend -n 50
  ```

---

## Manual Deployment (If Needed)

If automatic deployment fails, you can manually deploy:

```bash
# SSH to your server
ssh ubuntu@sngpldashboard.online

# Update backend
cd /var/www/sngpl-dashboard/backend
git pull
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart sngpl-backend

# Update frontend
cd /var/www/sngpl-dashboard/frontend
git pull
npm install
npm run build
sudo systemctl reload nginx
```

---

## Files Modified on EC2

During deployment, these files are updated:

```
/var/www/sngpl-dashboard/
├── backend/
│   ├── app/              # ✅ Updated from GitHub
│   ├── main.py           # ✅ Updated from GitHub
│   ├── mqtt_listener.py  # ✅ Updated from GitHub
│   ├── requirements.txt  # ✅ Updated from GitHub
│   ├── venv/             # ⚠️ Preserved (not overwritten)
│   └── app/.env          # ⚠️ Preserved (not overwritten)
└── frontend/
    ├── src/              # ✅ Updated from GitHub
    ├── public/           # ✅ Updated from GitHub
    ├── package.json      # ✅ Updated from GitHub
    ├── vite.config.js    # ✅ Updated from GitHub
    ├── node_modules/     # 🔄 Reinstalled from package.json
    └── dist/             # 🔄 Rebuilt automatically
```

---

## Services That Auto-Restart

After each deployment:

1. ✅ **sngpl-backend** - FastAPI backend (port 8080)
2. ✅ **nginx** - Web server (ports 80, 443)
3. ⚠️ **mqtt-listener** - Only if service exists

---

## Security Notes

### ✅ What's Secure:
- GitHub repository is **private** (only you can see it)
- SSH private key is encrypted in GitHub Secrets
- `.env` files are **never** committed to Git
- Certificates (*.pem) are **never** committed to Git

### ⚠️ Important:
- Never commit `.env` files
- Never commit `*.pem` certificates
- Never share your GitHub Personal Access Token
- Never share your EC2 SSH private key

---

## Repository Structure

```
sngpl-iot-dashboard/
├── .github/
│   └── workflows/
│       └── deploy.yml                 # Deployment workflow
├── sngpl-backend/                     # Backend source code
│   ├── app/
│   │   ├── api/v1/                   # API endpoints
│   │   ├── models/                   # Database models
│   │   ├── core/                     # Core utilities
│   │   └── services/                 # Business logic
│   ├── main.py                       # FastAPI entry point
│   ├── mqtt_listener.py              # MQTT data ingestion
│   ├── requirements.txt              # Python dependencies
│   └── .gitignore                    # Excludes venv, .env, etc.
├── sngpl-frontend/                    # Frontend source code
│   ├── src/
│   │   ├── pages/                    # Page components
│   │   ├── components/               # Reusable components
│   │   ├── contexts/                 # React contexts
│   │   └── services/                 # API services
│   ├── package.json                  # npm dependencies
│   ├── vite.config.js                # Build configuration
│   └── .gitignore                    # Excludes node_modules, dist, etc.
├── README.md                          # Main documentation
├── GITHUB_SETUP_GUIDE.md             # GitHub setup guide
├── DEPLOYMENT_SETUP.md               # Deployment setup guide
└── AUTOMATIC_DEPLOYMENT_COMPLETE.md  # This file!
```

---

## Quick Reference Commands

### Check Deployment Status
```bash
# View all deployments
https://github.com/techdevengineer-a11y/sngpl-iot-dashboard/actions

# Check website is live
curl -I https://www.sngpldashboard.online
```

### SSH to Server
```bash
ssh ubuntu@sngpldashboard.online
```

### Check Service Status
```bash
# Backend
sudo systemctl status sngpl-backend

# Nginx
sudo systemctl status nginx

# View logs
sudo journalctl -u sngpl-backend -f
```

### Manual Service Restart
```bash
sudo systemctl restart sngpl-backend
sudo systemctl reload nginx
```

---

## Next Steps

You're all set! Here's what to do next:

1. ✅ Make changes to your code locally in `e:\final\github-backup`
2. ✅ Commit and push: `git add . && git commit -m "Your message" && git push`
3. ✅ Watch deployment at: https://github.com/techdevengineer-a11y/sngpl-iot-dashboard/actions
4. ✅ Verify website: https://www.sngpldashboard.online

---

## Support

If you need help:
1. Check deployment logs on GitHub Actions
2. SSH to server and check service logs
3. Review the error messages
4. If stuck, provide the error message for assistance

Happy coding! 🚀
