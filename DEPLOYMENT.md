# Deployment Guide

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment to Railway.com.

### Workflow Overview

The CI/CD pipeline consists of the following steps:

1. **Testing**: Runs Karma tests using ChromeHeadless
2. **Building**: Builds the Angular application for production
3. **Deployment**: Deploys the built application to Railway.com

### GitHub Actions Configuration

The workflow is defined in `.github/workflows/ci-cd.yml` and is triggered on:

- Push to the main branch
- Pull requests to the main branch
- Manual trigger (workflow_dispatch)

## Railway.com Deployment

### Prerequisites

1. Create an account on [Railway.com](https://railway.app/)
2. Install the Railway CLI: `npm install -g @railway/cli`
3. Login to Railway: `railway login`
4. Create a new project on Railway

### Setting up Railway Token

To enable GitHub Actions to deploy to Railway, you need to add your Railway token as a secret in your GitHub repository:

1. Generate a Railway token: `railway login`
2. Go to your GitHub repository settings > Secrets and variables > Actions
3. Add a new repository secret with the name `RAILWAY_TOKEN` and the value of your Railway token

### Deployment Configuration

The deployment configuration is defined in `railway.json` and includes:

- Build command: `npm run build`
- Start command: `node server.js`
- Health check path: `/`

## Local Development

- Run the development server: `npm run start:dev`
- Build for production: `npm run build`
- Test the production build locally: `npm start`
