# Deployment Script for GCP Cloud Run
# This script builds and deploys both the backend and frontend to Google Cloud Run.

$PROJECT_ID = "lad-develop"
$REGION = "us-central1"
$REPOSITORY = "pulse-app"

# 1. Set the project
gcloud config set project $PROJECT_ID

# 2. Enable APIs
Write-Host "Enabling necessary APIs..." -ForegroundColor Cyan
gcloud services enable artifactregistry.googleapis.com run.googleapis.com cloudbuild.googleapis.com

# 3. Create Artifact Registry repository if it doesn't exist
Write-Host "Checking Artifact Registry..." -ForegroundColor Cyan
if (!(gcloud artifacts repositories list --location=$REGION --filter="name:projects/$PROJECT_ID/locations/$REGION/repositories/$REPOSITORY")) {
    gcloud artifacts repositories create $REPOSITORY --repository-format=docker --location=$REGION --description="Pulse App Repository"
}

# 4. Deploy Backend
Write-Host "Deploying Backend (Pulse API)..." -ForegroundColor Cyan
gcloud builds submit backend --tag $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/pulse-api:latest

gcloud run deploy pulse-api `
    --image $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/pulse-api:latest `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --set-env-vars "NODE_ENV=production"

# 5. Get Backend URL
$BACKEND_URL = (gcloud run services describe pulse-api --platform managed --region $REGION --format 'value(status.url)')
Write-Host "Backend deployed at: $BACKEND_URL" -ForegroundColor Green

# 6. Deploy Frontend
Write-Host "Deploying Frontend (Pulse Web)..." -ForegroundColor Cyan
# Build the frontend with the backend URL embedded
gcloud builds submit frontend `
    --tag $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/pulse-frontend:latest `
    --build-arg "VITE_API_BASE_URL=$BACKEND_URL/api"

gcloud run deploy pulse-frontend `
    --image $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/pulse-frontend:latest `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated

Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "Frontend URL: $(gcloud run services describe pulse-frontend --platform managed --region $REGION --format 'value(status.url)')" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: You must configure environment variables (DB_HOST, GITHUB_TOKEN, etc.) for the 'pulse-api' service in the GCP Console." -ForegroundColor Yellow
