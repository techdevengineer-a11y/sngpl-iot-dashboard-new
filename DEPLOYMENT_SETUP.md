# Automatic Deployment Setup Guide

This guide will help you set up automatic deployment from GitHub to your EC2 server.

## How It Works

Once configured, every time you push code to GitHub:
1. GitHub Actions automatically triggers
2. Connects to your EC2 server via SSH
3. Pulls latest code from GitHub
4. Installs dependencies
5. Builds frontend
6. Restarts backend services
7. Reloads nginx

**No manual SSH required!**

---

## Setup Steps

### Step 1: Get Your EC2 SSH Private Key

You need the `.pem` file you use to connect to your EC2 server.

**Location:** The file you use with commands like:
```bash
ssh -i "your-key.pem" ubuntu@sngpldashboard.online
```

**Find it:**
- Usually in `C:\Users\YourName\Downloads\` or `C:\Users\YourName\.ssh\`
- File name ends with `.pem` (e.g., `sngpl-ec2-key.pem`)

**Read the key content:**
```bash
# On Windows Command Prompt
type C:\path\to\your-key.pem

# On Windows PowerShell
Get-Content C:\path\to\your-key.pem
```

Copy the **entire content** including:
```
-----BEGIN RSA PRIVATE KEY-----
...all the lines...
-----END RSA PRIVATE KEY-----
```

---

### Step 2: Add Secrets to GitHub

1. Go to your repository: **https://github.com/techdevengineer-a11y/sngpl-iot-dashboard**

2. Click **"Settings"** tab (top menu)

3. In left sidebar, click **"Secrets and variables"** → **"Actions"**

4. Click **"New repository secret"** button

5. Add these **3 secrets** one by one:

#### Secret 1: EC2_HOST
- **Name:** `EC2_HOST`
- **Value:** `sngpldashboard.online`
- Click **"Add secret"**

#### Secret 2: EC2_USERNAME
- **Name:** `EC2_USERNAME`
- **Value:** `ubuntu`
- Click **"Add secret"**

#### Secret 3: EC2_SSH_KEY
- **Name:** `EC2_SSH_KEY`
- **Value:** Paste the **entire content** of your `.pem` file (including BEGIN/END lines)
- Click **"Add secret"**

---

### Step 3: Initialize Git on EC2 Server

SSH to your server and set up Git in both directories:

```bash
# SSH to server
ssh ubuntu@sngpldashboard.online

# Setup backend git
cd /var/www/sngpl-dashboard/backend
git init
git remote add origin https://github.com/techdevengineer-a11y/sngpl-iot-dashboard.git
git fetch
git checkout -b main origin/main

# Setup frontend git
cd /var/www/sngpl-dashboard/frontend
git init
git remote add origin https://github.com/techdevengineer-a11y/sngpl-iot-dashboard.git
git fetch
git checkout -b main origin/main

# Give ubuntu user permissions
sudo chown -R ubuntu:ubuntu /var/www/sngpl-dashboard

exit
```

---

### Step 4: Allow Sudo Without Password (Required for Service Restarts)

GitHub Actions needs to restart services. Configure passwordless sudo:

```bash
# SSH to server
ssh ubuntu@sngpldashboard.online

# Edit sudoers file
sudo visudo

# Add this line at the END of the file:
ubuntu ALL=(ALL) NOPASSWD: /bin/systemctl restart sngpl-backend, /bin/systemctl restart mqtt-listener, /usr/sbin/nginx, /bin/systemctl reload nginx

# Save and exit (Ctrl+X, then Y, then Enter)
exit
```

---

### Step 5: Push Workflow to GitHub

Now push the GitHub Actions workflow file:

```bash
cd e:\final\github-backup

git add .github/workflows/deploy.yml
git add DEPLOYMENT_SETUP.md
git commit -m "Add automatic deployment workflow"
git push
```

---

## Testing the Deployment

### Test 1: Manual Trigger

1. Go to: https://github.com/techdevengineer-a11y/sngpl-iot-dashboard/actions

2. Click on **"Deploy to EC2"** workflow

3. Click **"Run workflow"** button → **"Run workflow"**

4. Watch the deployment happen in real-time!

### Test 2: Make a Code Change

```bash
cd e:\final\github-backup

# Make a small change (example)
echo "# Test deployment" >> README.md

git add .
git commit -m "Test automatic deployment"
git push
```

Then check: https://github.com/techdevengineer-a11y/sngpl-iot-dashboard/actions

You'll see the deployment automatically start!

---

## Daily Workflow (After Setup)

```bash
cd e:\final\github-backup

# 1. Make your changes to code...

# 2. Add and commit
git add .
git commit -m "Describe what you changed"

# 3. Push to GitHub
git push

# 4. That's it! GitHub automatically deploys to EC2
```

Check deployment status at: https://github.com/techdevengineer-a11y/sngpl-iot-dashboard/actions

---

## Troubleshooting

### Deployment Failed?

1. Check the logs: https://github.com/techdevengineer-a11y/sngpl-iot-dashboard/actions

2. Common issues:
   - **SSH key wrong**: Re-add `EC2_SSH_KEY` secret with correct `.pem` content
   - **Git not initialized**: Run Step 3 commands again
   - **Permission denied**: Run Step 4 commands again
   - **Service restart failed**: Check if services exist with `sudo systemctl status sngpl-backend`

### Check EC2 Server Manually

```bash
ssh ubuntu@sngpldashboard.online

# Check backend status
sudo systemctl status sngpl-backend
sudo systemctl status mqtt-listener

# Check nginx status
sudo systemctl status nginx

# Check logs
sudo journalctl -u sngpl-backend -n 50
```

---

## Security Notes

- ✅ SSH private key is stored securely in GitHub Secrets (encrypted)
- ✅ Only you can view/edit secrets (repository owner)
- ✅ Secrets are never exposed in logs
- ✅ Only `main` branch triggers deployment
- ❌ Never commit `.pem` files to Git
- ❌ Never share your GitHub Personal Access Token

---

## What Gets Deployed?

**Backend:**
- Python code updates
- New dependencies from `requirements.txt`
- Services automatically restarted

**Frontend:**
- React component updates
- New npm packages
- Automatically rebuilt and served via nginx

**What's NOT deployed:**
- `.env` files (must be manually managed on EC2)
- Database changes (must be manually migrated)
- Nginx configuration changes (must be manually updated)

---

## Need Help?

If deployment fails, provide:
1. GitHub Actions log URL
2. Error message from the logs
3. What code change you made

Happy deploying! 🚀
