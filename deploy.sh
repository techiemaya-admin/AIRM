#!/usr/bin/env bash
# ============================================================
# deploy.sh — Manual deployment script for AIRM to Cloud Run
# ============================================================
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Prerequisites:
#   1. gcloud CLI installed and authenticated: `gcloud auth login`
#   2. Docker installed and running
#   3. Docker configured for Artifact Registry:
#      `gcloud auth configure-docker REGION-docker.pkg.dev`
#
# ============================================================

set -euo pipefail

# ─── CONFIGURATION ───────────────────────────────────────────
PROJECT_ID="lad-develop"          # ← Updated from gcloud config
REGION="asia-south1"                       # ← CHANGE if needed (e.g. us-central1)
REPO_NAME="airm"                           # Artifact Registry repo name
BACKEND_SERVICE="airm-backend"
FRONTEND_SERVICE="airm-frontend"

BACKEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/backend"
FRONTEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/frontend"

TAG=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

# ─── COLOURS ─────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  AIRM Cloud Run Deployment${NC}"
echo -e "${BLUE}  Project : ${PROJECT_ID}${NC}"
echo -e "${BLUE}  Region  : ${REGION}${NC}"
echo -e "${BLUE}  Tag     : ${TAG}${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

# ─── PRE-FLIGHT checks ───────────────────────────────────────
if [[ "${PROJECT_ID}" == "your-gcp-project-id" ]]; then
  echo -e "${RED}❌ ERROR: Please edit deploy.sh and set PROJECT_ID to your real GCP project ID.${NC}"
  exit 1
fi

command -v gcloud &>/dev/null || { echo -e "${RED}❌ gcloud CLI not found. Install from https://cloud.google.com/sdk/docs/install${NC}"; exit 1; }
command -v docker &>/dev/null || { echo -e "${RED}❌ docker not found.${NC}"; exit 1; }

gcloud config set project "${PROJECT_ID}"

# ─── STEP 1: Ensure Artifact Registry repo exists ────────────
echo -e "\n${YELLOW}[1/7] Setting up Artifact Registry repository...${NC}"
gcloud artifacts repositories describe "${REPO_NAME}" --location="${REGION}" &>/dev/null \
  || gcloud artifacts repositories create "${REPO_NAME}" \
       --repository-format=docker \
       --location="${REGION}" \
       --description="AIRM Docker images"

gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# ─── STEP 2: Enable required GCP APIs ────────────────────────
echo -e "\n${YELLOW}[2/7] Enabling GCP APIs...${NC}"
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --quiet

# ─── STEP 3: Build & push backend ────────────────────────────
echo -e "\n${YELLOW}[3/7] Building backend image...${NC}"
docker build \
  --tag "${BACKEND_IMAGE}:${TAG}" \
  --tag "${BACKEND_IMAGE}:latest" \
  --file backend/Dockerfile \
  backend/

echo -e "\n${YELLOW}[4/7] Pushing backend image...${NC}"
docker push "${BACKEND_IMAGE}:${TAG}"
docker push "${BACKEND_IMAGE}:latest"

# ─── STEP 4: Deploy backend ──────────────────────────────────
echo -e "\n${YELLOW}[5/7] Deploying backend to Cloud Run...${NC}"

# Build --set-env-vars string from .env if it exists, otherwise use defaults
ENV_VARS="NODE_ENV=production"

# NOTE: Sensitive secrets should be in Secret Manager, not env vars.
# Add them like: --update-secrets=DATABASE_URL=airm-database-url:latest
SECRET_FLAGS=""
if gcloud secrets describe airm-database-url &>/dev/null; then
  SECRET_FLAGS="--update-secrets=DATABASE_URL=airm-database-url:latest,JWT_SECRET=airm-jwt-secret:latest,GITLAB_TOKEN=airm-gitlab-token:latest,GITHUB_TOKEN=airm-github-token:latest"
fi

gcloud run deploy "${BACKEND_SERVICE}" \
  --image="${BACKEND_IMAGE}:${TAG}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --min-instances=0 \
  --max-instances=5 \
  --memory=1Gi \
  --cpu=1 \
  --timeout=60 \
  --set-env-vars="${ENV_VARS}" \
  ${SECRET_FLAGS} \
  --quiet

BACKEND_URL=$(gcloud run services describe "${BACKEND_SERVICE}" \
  --region="${REGION}" \
  --format='value(status.url)')
echo -e "${GREEN}✅ Backend deployed: ${BACKEND_URL}${NC}"

# ─── STEP 5: Build & push frontend ───────────────────────────
echo -e "\n${YELLOW}[6/7] Building frontend image (VITE_API_BASE_URL=${BACKEND_URL})...${NC}"
docker build \
  --tag "${FRONTEND_IMAGE}:${TAG}" \
  --tag "${FRONTEND_IMAGE}:latest" \
  --build-arg "VITE_API_BASE_URL=${BACKEND_URL}" \
  --file frontend/Dockerfile \
  frontend/

docker push "${FRONTEND_IMAGE}:${TAG}"
docker push "${FRONTEND_IMAGE}:latest"

# ─── STEP 6: Deploy frontend ─────────────────────────────────
echo -e "\n${YELLOW}[7/7] Deploying frontend to Cloud Run...${NC}"
gcloud run deploy "${FRONTEND_SERVICE}" \
  --image="${FRONTEND_IMAGE}:${TAG}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --min-instances=0 \
  --max-instances=3 \
  --memory=256Mi \
  --cpu=1 \
  --quiet

FRONTEND_URL=$(gcloud run services describe "${FRONTEND_SERVICE}" \
  --region="${REGION}" \
  --format='value(status.url)')

# ─── DONE ────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Deployment complete!${NC}"
echo -e "${GREEN}  🌐 Frontend : ${FRONTEND_URL}${NC}"
echo -e "${GREEN}  🔌 Backend  : ${BACKEND_URL}${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}⚠️  Don't forget to set CORS_ORIGIN on the backend:${NC}"
echo -e "   gcloud run services update ${BACKEND_SERVICE} \\"
echo -e "     --region=${REGION} \\"
echo -e "     --update-env-vars=CORS_ORIGIN=${FRONTEND_URL}"
