# Deployment Documentation

## Server Requirements and Setup

### Prerequisites
- Node.js 18 or later
- Docker and Docker Compose
- Sufficient RAM and CPU for Node.js application
- Access to MongoDB Atlas and Redis managed services
- Required API keys (Anthropic, Perplexity)

## Docker Deployment

### Building and Running with Docker

1. Build the Docker image:
```bash
docker build -t inseat-backend .
```

2. Run using Docker Compose:
```bash
docker-compose up -d
```

The application will be available on port 3001.

### Docker Configuration Details
- Base image: node:18-alpine
- Exposed port: 3001
- Health check configured at /health endpoint
- Automatic container restart policy: unless-stopped
- Non-root user execution for security
- Volume mapping for logs: ./logs:/app/logs

## Environment Variables

The following environment variables must be configured:

### Core Configuration
- NODE_ENV: Set to 'production' for production deployment
- PORT: Application port (default: 3001)

### Database Configuration
- MONGO_URL: MongoDB Atlas connection string for main database
- MONGO_DEMO_URL: MongoDB Atlas connection string for demo database
- REDIS_URL: Managed Redis service connection URL

### Authentication
- JWT_SECRET: Secret key for JWT operations
- ACCESS_TOKEN_SECRET: Secret for access token generation
- REFRESH_TOKEN_SECRET: Secret for refresh token generation

### AI Service Configuration
- MODEL: AI model selection (default: claude-3-7-sonnet-20250219)
- MAX_TOKENS: Maximum tokens for AI responses (default: 64000)
- TEMPERATURE: AI response temperature (default: 0.2)
- ANTHROPIC_API_KEY: API key for Anthropic services
- PERPLEXITY_API_KEY: API key for Perplexity services
- PERPLEXITY_MODEL: Perplexity model selection (default: sonar-pro)

### Logging and Debug
- DEBUG: Enable/disable debug mode (default: false)
- LOG_LEVEL: Logging level (default: info)

You can set these environment variables using a .env file or directly in your deployment environment.

## Database Configuration

### MongoDB Setup
1. Create a MongoDB Atlas cluster
2. Configure network access and database user
3. Obtain the connection string
4. Set the MONGO_URL environment variable
5. Set up a separate database for demo purposes (MONGO_DEMO_URL)

### Redis Setup
1. Set up a managed Redis instance
2. Configure access credentials
3. Set the REDIS_URL environment variable

## Third-Party Service Integrations

### Anthropic Integration
1. Sign up for Anthropic API access
2. Generate an API key
3. Set the ANTHROPIC_API_KEY environment variable
4. Configure MODEL and related parameters as needed

### Perplexity Integration
1. Obtain Perplexity API credentials
2. Set the PERPLEXITY_API_KEY environment variable
3. Configure PERPLEXITY_MODEL as needed

## Deployment Validation

### Health Check
- The application includes a built-in health check endpoint at `/health`
- Docker is configured to monitor this endpoint every 30 seconds
- Health check parameters:
    - Interval: 30s
    - Timeout: 5s
    - Start period: 10s
    - Retries: 3

### Monitoring
1. Check container status:
```bash
docker-compose ps
```

2. View logs:
```bash
docker-compose logs -f app
```

## Rollback Procedures

### Docker-based Rollback
1. To rollback to a previous version:
```bash
# Stop the current container
docker-compose down

# Pull the previous version
docker pull inseat-backend:previous-tag

# Update the docker-compose.yml image tag
# Start the container with the previous version
docker-compose up -d
```

### Troubleshooting
1. Check container logs for errors:
```bash
docker-compose logs app
```

2. Verify environment variables:
```bash
docker-compose config
```

3. Check the health endpoint:
```bash
curl http://localhost:3001/health
```

4. Common issues:
- Database connection errors: Verify MongoDB Atlas and Redis connection strings
- Authentication issues: Check JWT and token secrets
- API integration errors: Verify API keys and configurations

## Automated Deployment

A deployment script (`deploy.sh`) is provided to automate the entire deployment process. This script handles:
- Pulling the latest code from GitHub
- Building the Docker image
- Managing container deployment
- Performing health checks
- Managing environment files
- Reloading Caddy if necessary
- Cleaning up old Docker images

### Prerequisites for deploy.sh
- Git installed and configured
- Docker and Docker Compose installed
- Proper permissions to run Docker commands
- Access to the GitHub repository
- Sufficient disk space for Docker images
- (Optional) Caddy server installed if using as reverse proxy

### Using the Deployment Script

1. Make the script executable:
```bash
chmod +x deploy.sh
```

2. Run the deployment:
```bash
./deploy.sh
```

### What the Script Does

1. Checks if Docker is running
2. Creates and manages deployment directory (/opt/inseat-backend)
3. Backs up existing .env file if present
4. Pulls latest code from the main branch
5. Restores .env file
6. Builds new Docker image
7. Manages container lifecycle (stop, remove, start)
8. Verifies deployment with health checks
9. Handles Caddy reload if necessary
10. Cleans up old Docker images

### Troubleshooting the Deployment Script

If the deployment fails, the script will:
- Display error messages in red
- Provide specific error information
- Keep the .env backup safe
- Exit with a non-zero status code

Check the logs using:
```bash
docker logs inseat-backend
```

