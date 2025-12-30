# Dokploy Production & Staging Deployment Setup

This guide covers setting up production and staging deployments using Dokploy with CI/CD pipelines.

## Overview

Dokploy supports multiple approaches for managing environments:

1. **Environment-Level Variables** - Define staging/production configurations within a single project
2. **Preview Deployments** - Automatic PR-based ephemeral environments
3. **Separate Projects** - Completely isolated staging and production projects

This guide focuses on **Approach 1 + Preview Deployments** for the best developer experience.

## Architecture

```
GitHub Push (main)    → Build Images → Push to GHCR → Deploy Production
GitHub Push (develop) → Build Images → Push to GHCR → Deploy Staging
GitHub PR             → Preview Deployment (automatic via Dokploy)
```

## Dokploy Variable Hierarchy

Dokploy supports three levels of environment variables:

| Level           | Scope                   | Use Case                                  |
| --------------- | ----------------------- | ----------------------------------------- |
| **Project**     | All services in project | Shared secrets (DB credentials, API keys) |
| **Environment** | Staging OR Production   | Environment-specific URLs, feature flags  |
| **Service**     | Single service only     | Service-specific overrides                |

Reference syntax:

- Project: `${{project.VARIABLE_NAME}}`
- Environment: `${{environment.VARIABLE_NAME}}`
- Service: Direct reference or `${{VARIABLE_NAME}}`

## Setup Guide

### Step 1: Create Project in Dokploy

1. Log into Dokploy Dashboard
2. Click **Create Project**
3. Name it `tiween` (or your project name)

### Step 2: Create Applications

Create **4 applications** in the project (2 per environment):

| Application Name    | Environment | Image                                                   |
| ------------------- | ----------- | ------------------------------------------------------- |
| `client-staging`    | Staging     | `ghcr.io/{owner}/tiween-bmad-version/client:staging`    |
| `client-production` | Production  | `ghcr.io/{owner}/tiween-bmad-version/client:production` |
| `strapi-staging`    | Staging     | `ghcr.io/{owner}/tiween-bmad-version/strapi:staging`    |
| `strapi-production` | Production  | `ghcr.io/{owner}/tiween-bmad-version/strapi:production` |

For each application:

1. Click **Create Application**
2. Set **Source Type**: Docker
3. Enter the Docker image path (replace `{owner}` with your GitHub username/org)
4. Configure the port (3000 for client, 1337 for Strapi)

### Step 3: Configure Project-Level Variables (Shared)

In Project Settings → Environment Variables, add shared secrets:

```bash
# Database (shared connection details, different passwords per environment)
DATABASE_CLIENT=postgres
DATABASE_PORT=5432

# Strapi Keys (generate unique for each environment in environment-level)
# These are referenced but defined at environment level
```

### Step 4: Configure Environment-Level Variables

#### Staging Environment Variables

For `client-staging`:

```bash
NODE_ENV=production
STRAPI_URL=https://api-staging.yourdomain.com
NEXTAUTH_URL=https://staging.yourdomain.com
NEXTAUTH_SECRET=<staging-secret>
STRAPI_REST_READONLY_API_KEY=<staging-readonly-key>
STRAPI_REST_CUSTOM_API_KEY=<staging-custom-key>
APP_PUBLIC_URL=https://staging.yourdomain.com
STRAPI_PREVIEW_SECRET=<staging-preview-secret>
```

For `strapi-staging`:

```bash
NODE_ENV=production
HOST=0.0.0.0
PORT=1337
APP_URL=https://api-staging.yourdomain.com
DATABASE_HOST=<staging-db-host>
DATABASE_NAME=tiween_staging
DATABASE_USERNAME=<staging-db-user>
DATABASE_PASSWORD=<staging-db-password>
DATABASE_SSL=true
REDIS_HOST=<staging-redis-host>
REDIS_PORT=6379
APP_KEYS=<staging-app-keys>
API_TOKEN_SALT=<staging-api-token-salt>
ADMIN_JWT_SECRET=<staging-admin-jwt>
JWT_SECRET=<staging-jwt>
TRANSFER_TOKEN_SALT=<staging-transfer-salt>
CLIENT_URL=https://staging.yourdomain.com
STRAPI_PREVIEW_ENABLED=true
STRAPI_PREVIEW_SECRET=<staging-preview-secret>
```

#### Production Environment Variables

For `client-production`:

```bash
NODE_ENV=production
STRAPI_URL=https://api.yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<production-secret>
STRAPI_REST_READONLY_API_KEY=<production-readonly-key>
STRAPI_REST_CUSTOM_API_KEY=<production-custom-key>
APP_PUBLIC_URL=https://yourdomain.com
STRAPI_PREVIEW_SECRET=<production-preview-secret>
```

For `strapi-production`:

```bash
NODE_ENV=production
HOST=0.0.0.0
PORT=1337
APP_URL=https://api.yourdomain.com
DATABASE_HOST=<production-db-host>
DATABASE_NAME=tiween_production
DATABASE_USERNAME=<production-db-user>
DATABASE_PASSWORD=<production-db-password>
DATABASE_SSL=true
REDIS_HOST=<production-redis-host>
REDIS_PORT=6379
APP_KEYS=<production-app-keys>
API_TOKEN_SALT=<production-api-token-salt>
ADMIN_JWT_SECRET=<production-admin-jwt>
JWT_SECRET=<production-jwt>
TRANSFER_TOKEN_SALT=<production-transfer-salt>
CLIENT_URL=https://yourdomain.com
STRAPI_PREVIEW_ENABLED=true
STRAPI_PREVIEW_SECRET=<production-preview-secret>
```

### Step 5: Configure Domains

#### Staging Domains

| Application      | Domain                       | Port |
| ---------------- | ---------------------------- | ---- |
| `client-staging` | `staging.yourdomain.com`     | 3000 |
| `strapi-staging` | `api-staging.yourdomain.com` | 1337 |

#### Production Domains

| Application         | Domain               | Port |
| ------------------- | -------------------- | ---- |
| `client-production` | `yourdomain.com`     | 3000 |
| `strapi-production` | `api.yourdomain.com` | 1337 |

Enable HTTPS (Let's Encrypt) for all domains.

### Step 6: Configure Health Checks

In each application's **Advanced → Cluster Settings → Swarm Settings**:

#### Client Health Check:

```json
{
  "Test": ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"],
  "Interval": 30000000000,
  "Timeout": 10000000000,
  "StartPeriod": 40000000000,
  "Retries": 3
}
```

#### Strapi Health Check:

```json
{
  "Test": ["CMD", "wget", "-q", "--spider", "http://localhost:1337/_health"],
  "Interval": 30000000000,
  "Timeout": 10000000000,
  "StartPeriod": 60000000000,
  "Retries": 3
}
```

### Step 7: Configure Automatic Rollback

In **Advanced → Cluster Settings → Update Config**:

```json
{
  "Parallelism": 1,
  "Delay": 10000000000,
  "FailureAction": "rollback",
  "Order": "start-first"
}
```

This ensures:

- Zero-downtime deployments (`start-first`)
- Automatic rollback on failure
- 10-second delay between updates

### Step 8: Set Up Preview Deployments (Optional)

For PR-based staging environments:

1. Go to `client-staging` → **Preview Deployments** tab
2. Click **Configure**
3. Settings:
   - **Enable**: Toggle ON
   - **Domain**: `*.staging.yourdomain.com` (requires wildcard DNS)
   - **Port**: 3000
   - **Preview Limit**: 3 (optional)
4. Save

Preview URLs will be: `preview-client-staging-{uniqueId}.staging.yourdomain.com`

> ⚠️ **Security Note**: Avoid preview deployments for public repositories as external contributors can execute builds on your server.

## GitHub Configuration

### Step 1: Create GitHub Environments

1. Go to Repository → **Settings → Environments**
2. Create two environments:
   - `staging`
   - `production`
3. For `production`, add protection rules:
   - Required reviewers (optional)
   - Wait timer (optional)

### Step 2: Configure Secrets

Add these secrets to each environment:

#### Staging Environment Secrets

| Secret                  | Description                         |
| ----------------------- | ----------------------------------- |
| `DOKPLOY_URL`           | Your Dokploy server URL             |
| `DOKPLOY_API_KEY`       | API key from Dokploy                |
| `DOKPLOY_CLIENT_APP_ID` | Application ID for `client-staging` |
| `DOKPLOY_STRAPI_APP_ID` | Application ID for `strapi-staging` |

#### Production Environment Secrets

| Secret                  | Description                            |
| ----------------------- | -------------------------------------- |
| `DOKPLOY_URL`           | Your Dokploy server URL                |
| `DOKPLOY_API_KEY`       | API key from Dokploy                   |
| `DOKPLOY_CLIENT_APP_ID` | Application ID for `client-production` |
| `DOKPLOY_STRAPI_APP_ID` | Application ID for `strapi-production` |

### Getting Application IDs from Dokploy

1. Open the application in Dokploy
2. The Application ID is in the URL: `https://dokploy.yourdomain.com/project/{projectId}/services/application/{applicationId}`
3. Or check the application settings panel

### Creating API Key in Dokploy

1. Go to Dokploy Dashboard → **Settings → API**
2. Click **Create Token**
3. Copy the token and save as `DOKPLOY_API_KEY`

## Deployment Workflow

### Automatic Deployments

| Trigger           | Environment          |
| ----------------- | -------------------- |
| Push to `main`    | Production           |
| Push to `develop` | Staging              |
| Pull Request      | Preview (if enabled) |

### Manual Deployments

1. Go to **Actions → Deploy**
2. Click **Run workflow**
3. Select environment (`staging` or `production`)
4. Click **Run workflow**

### Image Tags

The workflow creates these Docker image tags:

| Tag Pattern   | Example                 | Use                     |
| ------------- | ----------------------- | ----------------------- |
| `{env}`       | `staging`, `production` | Latest for environment  |
| `{env}-{run}` | `staging-42`            | Specific build number   |
| `{env}-{sha}` | `production-abc1234`    | Git commit reference    |
| `latest`      | `latest`                | Latest production build |

## Database Setup

### Option A: Managed Database (Recommended)

Use a managed PostgreSQL service:

- **Supabase** (free tier available)
- **Neon** (free tier available)
- **Railway**
- **DigitalOcean Managed Database**

Create separate databases for staging and production.

### Option B: Self-Hosted via Dokploy

1. In your project, click **Create Database**
2. Select **PostgreSQL**
3. Configure credentials
4. Create two instances: one for staging, one for production
5. Use internal hostnames for applications

## Redis Setup

### Option A: Managed Redis

- **Upstash** (free tier, serverless)
- **Redis Cloud**

### Option B: Self-Hosted via Dokploy

1. Create a Redis service for each environment
2. Use internal hostnames

## Monitoring

### Dokploy Dashboard

- Real-time container logs
- Resource usage metrics
- Deployment history

### Health Check Monitoring

- Automatic container restarts on health check failure
- Rollback on deployment failure

## Troubleshooting

### Deployment Not Triggering

1. Verify GitHub secrets are correctly configured
2. Check Dokploy API key permissions
3. Verify application IDs match

### Image Pull Errors

1. Ensure GHCR images are accessible
2. Check if repository is public or configure registry authentication in Dokploy
3. Verify image tags exist: `docker pull ghcr.io/{owner}/tiween-bmad-version/client:staging`

### Health Check Failures

1. Verify health endpoint is accessible: `curl http://localhost:3000/api/health`
2. Check application startup time
3. Increase `StartPeriod` if needed

### Preview Deployment Issues

1. Verify wildcard DNS is configured
2. Check Dokploy can access your GitHub repository
3. Ensure the PR targets the correct branch

## Security Best Practices

1. **Secrets Management**

   - Use unique secrets for each environment
   - Rotate secrets periodically
   - Never commit secrets to version control

2. **Network Security**

   - Use internal networking for database/Redis
   - Enable HTTPS for all public endpoints
   - Configure firewall rules

3. **Access Control**
   - Use GitHub environment protection rules for production
   - Limit Dokploy API key scope
   - Enable branch protection on `main`

## Generating Secrets

```bash
# Generate base64 secret
openssl rand -base64 32

# Generate 4 APP_KEYS for Strapi
echo "$(openssl rand -base64 32),$(openssl rand -base64 32),$(openssl rand -base64 32),$(openssl rand -base64 32)"

# Generate hex secret (for NEXTAUTH_SECRET)
openssl rand -hex 32
```

## Sources

- [Dokploy Preview Deployments](https://docs.dokploy.com/docs/core/applications/preview-deployments)
- [Dokploy Environment Variables](https://docs.dokploy.com/docs/core/variables)
- [Dokploy Going Production](https://docs.dokploy.com/docs/core/applications/going-production)
