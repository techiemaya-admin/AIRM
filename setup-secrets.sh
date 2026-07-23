#!/usr/bin/env bash
# ============================================================
# setup-secrets.sh — Create secrets in Google Secret Manager
# ============================================================
# Run this ONCE before your first deployment.
# Usage: ./setup-secrets.sh
#
# Never put real secret values in git. This script prompts interactively.
# Auth uses email + password (JWT). Resend is not used.
# ============================================================

set -euo pipefail

PROJECT_ID="your-gcp-project-id"   # ← CHANGE THIS
REGION="us-central1"               # ← CHANGE if needed

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

if [[ "${PROJECT_ID}" == "your-gcp-project-id" ]]; then
  echo -e "${RED}❌ ERROR: Please edit setup-secrets.sh and set PROJECT_ID.${NC}"
  exit 1
fi

gcloud config set project "${PROJECT_ID}"
gcloud services enable secretmanager.googleapis.com --quiet

create_or_update_secret() {
  local NAME=$1
  local VALUE=$2

  if gcloud secrets describe "${NAME}" &>/dev/null; then
    echo -e "${YELLOW}↻  Updating secret: ${NAME}${NC}"
    echo -n "${VALUE}" | gcloud secrets versions add "${NAME}" --data-file=-
  else
    echo -e "${GREEN}+  Creating secret: ${NAME}${NC}"
    echo -n "${VALUE}" | gcloud secrets create "${NAME}" \
      --data-file=- \
      --replication-policy=automatic
  fi
}

echo "Enter the values for each secret (press Enter to skip if already set):"
echo ""

read -rsp "DATABASE_URL (postgres connection string): " DB_URL; echo
if [[ -n "${DB_URL}" ]]; then
  create_or_update_secret "database-url" "${DB_URL}"
fi

read -rsp "JWT_SECRET: " JWT_SECRET; echo
if [[ -n "${JWT_SECRET}" ]]; then
  create_or_update_secret "jwt-secret" "${JWT_SECRET}"
fi

read -rsp "GITLAB_TOKEN (optional): " GITLAB_TOKEN; echo
if [[ -n "${GITLAB_TOKEN}" ]]; then
  create_or_update_secret "gitlab-token" "${GITLAB_TOKEN}"
fi

read -rsp "GITHUB_TOKEN (optional): " GITHUB_TOKEN; echo
if [[ -n "${GITHUB_TOKEN}" ]]; then
  create_or_update_secret "github-token" "${GITHUB_TOKEN}"
fi

echo ""
echo -e "${YELLOW}Granting Cloud Run service account access to secrets...${NC}"

PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')
SA="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for SECRET in database-url jwt-secret gitlab-token github-token; do
  if gcloud secrets describe "${SECRET}" &>/dev/null; then
    gcloud secrets add-iam-policy-binding "${SECRET}" \
      --member="${SA}" \
      --role="roles/secretmanager.secretAccessor" \
      --quiet
    echo -e "${GREEN}✅ Granted access: ${SECRET}${NC}"
  fi
done

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Secrets configured!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "Set Cloud Build substitutions for URLs (_CORS_ORIGIN, _APP_BASE_URL, etc.)."
echo -e "Then run your Cloud Build trigger / deploy script."
