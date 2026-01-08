# GitHub Setup Guide - SNGPL IoT Dashboard

## 📌 What We've Done So Far

✅ Downloaded your current EC2 frontend & backend code
✅ Created `.gitignore` files (excludes `node_modules`, `venv`, `.env`, etc.)
✅ Initialized Git repository
✅ Created first commit with all your code

---

## 🚀 Next Steps: Push to GitHub

### Step 1: Create GitHub Repository

1. Go to **https://github.com** and log in
2. Click the **"+"** button (top right) → **"New repository"**
3. Fill in details:
   - **Repository name:** `sngpl-iot-dashboard`
   - **Description:** `SNGPL Smart Gas Metering & Monitoring System`
   - **Visibility:** Choose **Private** (recommended) or Public
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

---

### Step 2: Link Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these:

**Open Command Prompt or PowerShell:**

```bash
cd e:\final\github-backup

# Add GitHub as remote origin (replace YOUR-USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR-USERNAME/sngpl-iot-dashboard.git

# Verify remote was added
git remote -v

# Push code to GitHub
git branch -M main
git push -u origin main
```

**Example:**
```bash
git remote add origin https://github.com/sngpl-official/sngpl-iot-dashboard.git
git branch -M main
git push -u origin main
```

**You'll be prompted for GitHub credentials:**
- Username: Your GitHub username
- Password: Use **Personal Access Token** (NOT your GitHub password)

---

### Step 3: Create Personal Access Token (PAT)

If you don't have a token:

1. Go to **GitHub.com** → Click your profile picture → **Settings**
2. Scroll down to **Developer settings** (bottom left)
3. Click **Personal access tokens** → **Tokens (classic)**
4. Click **Generate new token** → **Generate new token (classic)**
5. Give it a name: `SNGPL Dashboard Deploy`
6. Select scopes:
   - ✅ **repo** (full control of private repositories)
7. Click **Generate token**
8. **COPY THE TOKEN** (you won't see it again!)
9. Use this token as password when pushing to GitHub

---

### Step 4: Verify Upload

1. Go to your GitHub repository page
2. You should see:
   - `sngpl-frontend/` folder
   - `sngpl-backend/` folder
   - `README.md`
   - `.gitignore` files

---

## 📝 Daily Workflow: Making Changes

### When You Make Changes to Frontend or Backend:

```bash
cd e:\final\github-backup

# Check what files changed
git status

# Add all changed files
git add .

# Commit with a message
git commit -m "Updated DeviceAnalytics page with new charts"

# Push to GitHub
git push
```

---

## 🔄 Example Scenarios

### Scenario 1: You updated frontend code

```bash
cd e:\final\github-backup

# Copy updated files from your source
# (Manually copy changed files from E:\SNGPL-Frontend-Source\frontend to e:\final\github-backup\sngpl-frontend)

# Then commit
git add sngpl-frontend/
git commit -m "Frontend: Added T18-T114 analytics parameters"
git push
```

### Scenario 2: You updated backend API

```bash
cd e:\final\github-backup

# Download latest backend from EC2
scp -i "e:\final\sngpl-dashboard-key.pem" -r ubuntu@sngpldashboard.online:/var/www/sngpl-dashboard/backend/app e:\final\github-backup\sngpl-backend\

# Commit changes
git add sngpl-backend/
git commit -m "Backend: Added T18-T114 fields to stations.py API"
git push
```

### Scenario 3: Deploy from GitHub to New Server

```bash
# On new server
cd /var/www
git clone https://github.com/YOUR-USERNAME/sngpl-iot-dashboard.git sngpl-dashboard
cd sngpl-dashboard

# Setup frontend
cd sngpl-frontend
npm install
npm run build

# Setup backend
cd ../sngpl-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
nano .env
# (Add your database credentials, MQTT config, etc.)

# Run migrations
alembic upgrade head

# Start services
python main.py
```

---

## 🔐 Important Security Notes

### Files That Are EXCLUDED from Git (via .gitignore):

**Frontend:**
- ❌ `node_modules/` (dependencies - reinstall with `npm install`)
- ❌ `dist/` (build output - rebuild with `npm run build`)
- ❌ `.env` files (environment variables - create manually)

**Backend:**
- ❌ `venv/` (Python virtual environment - recreate with `python -m venv venv`)
- ❌ `__pycache__/` (Python cache)
- ❌ `.env` (database passwords, secrets)
- ❌ `*.pem` (SSL certificates, private keys)
- ❌ `logs/` (log files)

**NEVER commit:**
- Database passwords
- API keys
- SSL certificates
- Private keys

---

## 📂 Repository Structure

```
sngpl-iot-dashboard/          # GitHub repository root
├── README.md                  # Main documentation
├── GITHUB_SETUP_GUIDE.md     # This file
│
├── sngpl-frontend/           # React + Vite frontend
│   ├── .gitignore            # Excludes node_modules, dist
│   ├── src/                  # Source code
│   ├── public/               # Static assets
│   ├── package.json          # Dependencies
│   └── vite.config.js        # Build config
│
└── sngpl-backend/            # FastAPI Python backend
    ├── .gitignore            # Excludes venv, .env, *.pem
    ├── app/                  # Application code
    │   ├── api/v1/           # API endpoints
    │   ├── models/           # Database models
    │   ├── core/             # Core utilities
    │   └── services/         # Business logic
    ├── main.py               # FastAPI entry point
    ├── mqtt_listener.py      # MQTT data ingestion
    └── requirements.txt      # Python dependencies
```

---

## 🆘 Common Issues & Solutions

### Issue: "fatal: remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR-USERNAME/sngpl-iot-dashboard.git
```

### Issue: "Support for password authentication was removed"
**Solution:** You must use a Personal Access Token (PAT) instead of your GitHub password.
Follow **Step 3** above to create a token.

### Issue: "Permission denied (publickey)"
**Solution:** Use HTTPS URL, not SSH:
```bash
# Wrong (SSH):
git remote add origin git@github.com:YOUR-USERNAME/sngpl-iot-dashboard.git

# Correct (HTTPS):
git remote add origin https://github.com/YOUR-USERNAME/sngpl-iot-dashboard.git
```

### Issue: "Your branch is ahead of 'origin/main' by X commits"
```bash
# Push your local commits to GitHub
git push
```

### Issue: "Your branch is behind 'origin/main'"
```bash
# Pull latest changes from GitHub
git pull
```

---

## 📞 Need Help?

- **Git Basics:** https://git-scm.com/book/en/v2
- **GitHub Docs:** https://docs.github.com
- **Git Cheat Sheet:** https://education.github.com/git-cheat-sheet-education.pdf

---

## ✅ Checklist

- [ ] Created GitHub repository
- [ ] Generated Personal Access Token (PAT)
- [ ] Linked local repository to GitHub (`git remote add origin`)
- [ ] Pushed code to GitHub (`git push -u origin main`)
- [ ] Verified code is visible on GitHub website
- [ ] Saved PAT securely for future pushes

---

**Last Updated:** January 8, 2026
**Repository:** https://github.com/YOUR-USERNAME/sngpl-iot-dashboard
