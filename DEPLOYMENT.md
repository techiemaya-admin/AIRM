# AIRM — Google Cloud Run Deployment Guide

## Architecture

```
Internet
   │
   ▼
┌─────────────────────────┐    HTTPS     ┌─────────────────────────┐
│  Cloud Run: Frontend    │ ──────────►  │  Cloud Run: Backend     │
│  (nginx + React build)  │              │  (Node.js Express API)  │
│  airm-frontend          │              │  airm-backend           │
└─────────────────────────┘              └────────────┬────────────┘
                                                      │
                                                      ▼
                                         ┌────────────────────────┐
                                         │  PostgreSQL Database   │
                                         │  (External / Cloud SQL) │
                                         └────────────────────────┘
```

Two separate Cloud Run services:
- **Backend** — Node.js Express API, auto-scales 0→5 instances, 1 GiB RAM
- **Frontend** — Nginx serving the React/Vite build, auto-scales 0→3 instances, 256 MiB RAM

---

## Prerequisites

1. **Google Cloud account** with billing enabled
2. **`gcloud` CLI** installed → https://cloud.google.com/sdk/docs/install
3. **Docker Desktop** installed and running
4. A **GCP Project** created

---

## Step-by-Step Deployment

### 1. Install & authenticate gcloud

```bash
# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Authenticate Docker to push images
gcloud auth configure-docker asia-south1-docker.pkg.dev
```

### 2. Enable required GCP APIs

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

### 3. Create the Artifact Registry repository

```bash
gcloud artifacts repositories create airm \
  --repository-format=docker \
  --location=asia-south1 \
  --description="AIRM Docker images"
```

### 4. Set up secrets in Secret Manager

```bash
# Run the interactive setup script (Linux/Mac/Git Bash)
chmod +x setup-secrets.sh
./setup-secrets.sh
```

**Or manually:**

```bash
# Database URL
echo -n "postgresql://USER:PASS@HOST:5432/airm" | \
  gcloud secrets create airm-database-url --data-file=-

# JWT Secret
echo -n "your-strong-random-jwt-secret" | \
  gcloud secrets create jwt-secret --data-file=-

# GitLab Token (optional)
echo -n "glpat-xxxxxxxxxxxx" | \
  gcloud secrets create gitlab-token --data-file=-

# GitHub Token (optional)
echo -n "ghp_xxxxxxxxxxxx" | \
  gcloud secrets create github-token --data-file=-

# Grant the default compute SA access to secrets
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')
for SECRET in database-url jwt-secret gitlab-token github-token; do
  gcloud secrets add-iam-policy-binding "${SECRET}" \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

> **Note:** Login uses **email + password** (JWT). Magic-link email login is not used.

### 5. Deploy (manual — one-shot)

Edit `deploy.sh`:
```bash
# Line 8 — set your project:
PROJECT_ID="your-actual-gcp-project-id"
REGION="asia-south1"   # or your preferred region
```

Then run:
```bash
# On Linux/Mac/Git Bash:
chmod +x deploy.sh
./deploy.sh

# On Windows (PowerShell) — use Cloud Build instead (see Step 6)
```

### 6. Set CORS_ORIGIN on the backend after first deploy

After the frontend is deployed, you'll get a frontend URL like
`https://airm-frontend-abc123-uc.a.run.app`. Set it as the allowed CORS origin:

```bash
gcloud run services update airm-backend \
  --region=asia-south1 \
  --update-env-vars=CORS_ORIGIN=https://airm-frontend-abc123-uc.a.run.app
```

---

## CI/CD with Cloud Build (Automatic Deploys)

### Set up the trigger

1. Go to **Cloud Build → Triggers → Create Trigger**
2. Connect your GitHub repository (`prasad29999/my-test-repo`)
3. Set **Branch** = `^main$` (deploys on every push to main)
4. Select **cloudbuild.yaml** as the build config file
5. Set the **location** to `AIRM/cloudbuild.yaml` (relative to repo root)
6. Add substitution variables:
   | Variable | Value |
   |---|---|
   | `_REGION` | `asia-south1` |
   | `_BACKEND_SERVICE` | `airm-backend` |
   | `_FRONTEND_SERVICE` | `airm-frontend` |

7. Grant Cloud Build the required IAM roles:
```bash
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Environment Variables Reference

### Backend (Cloud Run env vars + Secret Manager)

| Variable | Where | Description |
|---|---|---|
| `NODE_ENV` | Env var | Set to `production` |
| `PORT` | Auto (Cloud Run injects) | Listening port (8080) |
| `APP_BASE_URL` | Env var (Cloud Build sub `_APP_BASE_URL`) | Backend Cloud Run URL |
| `CORS_ORIGIN` | Env var (Cloud Build sub `_CORS_ORIGIN`) | Frontend Cloud Run URL |
| `FRONTEND_URL` | Env var (Cloud Build sub `_FRONTEND_URL`) | Frontend URL |
| `DATABASE_URL` | **Secret Manager** (`database-url`) | PostgreSQL connection string |
| `JWT_SECRET` | **Secret Manager** (`jwt-secret`) | JWT signing secret |
| `GITLAB_TOKEN` | **Secret Manager** (`gitlab-token`) | Optional GitLab token |
| `GITHUB_TOKEN` | **Secret Manager** (`github-token`) | Optional GitHub token |

Auth is **email + password**. Magic-link email login providers are not used.

### Frontend (baked in at build time)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend Cloud Run URL (e.g. `https://airm-backend-xyz.run.app`) |

---

## Useful Commands

```bash
# View logs
gcloud run services logs read airm-backend --region=asia-south1 --limit=50
gcloud run services logs read airm-frontend --region=asia-south1 --limit=50

# Get service URLs
gcloud run services describe airm-backend --region=asia-south1 --format='value(status.url)'
gcloud run services describe airm-frontend --region=asia-south1 --format='value(status.url)'

# Update an env var
gcloud run services update airm-backend \
  --region=asia-south1 \
  --update-env-vars=CORS_ORIGIN=https://your-frontend-url.run.app

# Rollback to previous revision
gcloud run services update-traffic airm-backend \
  --region=asia-south1 \
  --to-revisions=PREVIOUS_REVISION=100
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| CORS errors in browser | Set `CORS_ORIGIN` on backend to frontend URL |
| 502 Bad Gateway | Backend crashed — check logs with `gcloud run services logs read` |
| "cannot connect to server" in frontend | `VITE_API_BASE_URL` was wrong at build time — redeploy frontend with correct URL |
| Docker build fails with puppeteer | The backend Dockerfile installs Chromium system deps |
| TypeScript errors during frontend build | Run `npm run build` locally first to catch TS errors before deploying |
