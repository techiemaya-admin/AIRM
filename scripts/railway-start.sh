#!/bin/bash
# Build frontend, then backend, then start backend server
cd AIRM/frontend && npm install && npm run build
cd ../backend && npm install && npm start
