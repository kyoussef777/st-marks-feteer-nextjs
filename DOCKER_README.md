# Docker Deployment Guide

This guide covers how to deploy the Next.js Feteer App using Docker in both development and production environments.

## Prerequisites

- Docker (v20.10+)
- Docker Compose (v2.0+)
- For production: Domain name and SSL certificates (optional, self-signed will be generated)

## Quick Start

### Development Environment

```bash
# Start development environment
./deploy-dev.sh start

# View logs
./deploy-dev.sh logs

# Stop development environment
./deploy-dev.sh stop
```

Access the application at: http://localhost:3000

### Production Environment

```bash
# Deploy to production (interactive)
./deploy-prod.sh

# Or use individual commands
./deploy-prod.sh build    # Build images only
./deploy-prod.sh start    # Start services only
./deploy-prod.sh status   # Check status
./deploy-prod.sh stop     # Stop all services
```

Access the application at: https://localhost

## File Structure

```
.
├── Dockerfile              # Production Docker image
├── Dockerfile.dev          # Development Docker image
├── docker-compose.yml      # Main Docker Compose (development)
├── docker-compose.dev.yml  # Development-focused compose
├── docker-compose.prod.yml # Production compose with all services
├── .dockerignore           # Files to ignore in Docker build
├── deploy-prod.sh          # Production deployment script
├── deploy-dev.sh           # Development deployment script
├── nginx/
│   └── prod/
│       └── nginx.conf      # Production Nginx configuration
├── data/                   # SQLite database storage
├── logs/                   # Application and service logs
├── backups/               # Database backups
└── monitoring/            # Monitoring configuration
    ├── grafana/
    └── prometheus.yml
```

## Development Environment

### Features

- Hot reloading enabled
- Source code mounted as volume
- All development dependencies included
- SQLite database persisted

### Configuration

The development environment uses `docker-compose.dev.yml` with:

- **Port**: 3000
- **Environment**: development
- **Command**: `npm run dev`
- **Volumes**: Source code mounted for hot reloading

### Commands

```bash
# Start development
./deploy-dev.sh start

# View real-time logs
./deploy-dev.sh logs

# Restart services
./deploy-dev.sh restart

# Rebuild development image
./deploy-dev.sh build

# Stop all services
./deploy-dev.sh stop
```

## Production Environment

### Features

- Nginx reverse proxy with SSL termination
- Rate limiting and security headers
- PostgreSQL database (optional, alongside SQLite)
- Redis for caching and sessions
- Monitoring with Prometheus and Grafana
- Automated SSL certificate generation
- Database backups
- Health checks

### Services

1. **nextjs-app**: The main Next.js application
2. **nginx**: Reverse proxy with SSL termination
3. **postgres**: PostgreSQL database (optional)
4. **redis**: Redis for caching and sessions
5. **prometheus**: Metrics collection (optional)
6. **grafana**: Monitoring dashboards (optional)

### Production Deployment Steps

1. **Initial Setup**:
   ```bash
   ./deploy-prod.sh
   ```
   This will:
   - Check requirements
   - Create necessary directories
   - Generate SSL certificates (self-signed)
   - Create environment file
   - Build Docker images
   - Start all services
   - Perform health checks

2. **Environment Configuration**:
   The script creates `.env.production` with secure random passwords. Review and update:
   ```bash
   nano .env.production
   ```

3. **SSL Certificates**:
   - For production, replace self-signed certificates in `nginx/prod/ssl/`
   - Or use Let's Encrypt integration (modify nginx config)

### Production Commands

```bash
# Full deployment
./deploy-prod.sh

# Individual operations
./deploy-prod.sh build     # Build images
./deploy-prod.sh start     # Start services
./deploy-prod.sh stop      # Stop services
./deploy-prod.sh status    # Show status
./deploy-prod.sh logs      # View logs
./deploy-prod.sh backup    # Create database backup
./deploy-prod.sh health    # Run health checks
./deploy-prod.sh cleanup   # Clean old Docker images
```

### Manual Docker Commands

If you prefer manual control:

```bash
# Production
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Development
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

## Environment Variables

### Development

Set in `docker-compose.dev.yml`:
```yaml
environment:
  - NODE_ENV=development
  - NEXT_TELEMETRY_DISABLED=1
  - CHOKIDAR_USEPOLLING=true
```

### Production

Set in `.env.production` (auto-generated):
```bash
# Database
POSTGRES_USER=nextjs
POSTGRES_PASSWORD=generated_password
POSTGRES_DB=nextjs_production

# Redis
REDIS_PASSWORD=generated_password

# Monitoring
GRAFANA_USER=admin
GRAFANA_PASSWORD=generated_password

# Security
SESSION_SECRET=generated_secret
```

## Database Management

### SQLite (Default)

- **Development**: `./db.sqlite3` mounted to container
- **Production**: `./data/db.sqlite3` with automated backups

### PostgreSQL (Production Option)

If you want to use PostgreSQL in production:

1. Uncomment PostgreSQL service in `docker-compose.prod.yml`
2. Update application database configuration
3. Run database migrations

### Backups

Production deployment automatically:
- Creates daily backups at 2 AM
- Compresses backups older than 7 days
- Removes backups older than 30 days

Manual backup:
```bash
./deploy-prod.sh backup
```

## Monitoring

### Prometheus + Grafana

Production setup includes optional monitoring:

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
  - Username: admin
  - Password: Set in `.env.production`

To enable monitoring, uncomment the services in `docker-compose.prod.yml`.

### Health Checks

- Application: `https://localhost/health`
- Nginx: Built-in health endpoint
- Database: Connection health checks

## Security

### Production Security Features

1. **SSL/TLS**: HTTPS with modern cipher suites
2. **Rate Limiting**: API and static content rate limiting
3. **Security Headers**: XSS protection, CSRF protection, etc.
4. **Network Isolation**: Services run in isolated Docker network
5. **Non-root User**: Application runs as non-root user
6. **Secrets Management**: Random generated passwords

### Firewall Configuration

Recommended firewall rules:
```bash
# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Block direct access to application port
ufw deny 3000/tcp

# SSH (adjust as needed)
ufw allow 22/tcp
```

## Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   # Check what's using the port
   lsof -i :3000
   
   # Stop conflicting services
   ./deploy-dev.sh stop
   ```

2. **Permission denied**:
   ```bash
   # Make scripts executable
   chmod +x deploy-prod.sh deploy-dev.sh
   ```

3. **Docker build fails**:
   ```bash
   # Clean Docker cache
   docker system prune -a
   
   # Rebuild without cache
   ./deploy-prod.sh build
   ```

4. **SSL certificate issues**:
   ```bash
   # Regenerate self-signed certificates
   rm -rf nginx/prod/ssl/*
   ./deploy-prod.sh
   ```

### Viewing Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f nextjs-app

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100
```

### Database Access

```bash
# SQLite
sqlite3 ./data/db.sqlite3

# PostgreSQL (if using)
docker-compose -f docker-compose.prod.yml exec postgres psql -U nextjs -d nextjs_production
```

## Scaling

### Horizontal Scaling

To run multiple app instances:

```yaml
services:
  nextjs-app:
    scale: 3  # Run 3 instances
```

### Load Balancing

Nginx automatically load balances between multiple app instances.

## Maintenance

### Updates

1. **Application Updates**:
   ```bash
   git pull
   ./deploy-prod.sh build
   ./deploy-prod.sh start
   ```

2. **Docker Image Updates**:
   ```bash
   docker-compose -f docker-compose.prod.yml pull
   ./deploy-prod.sh start
   ```

### Cleanup

```bash
# Remove old images
./deploy-prod.sh cleanup

# Full system cleanup
docker system prune -a --volumes
```

## Performance Tuning

### Nginx Tuning

Adjust worker processes and connections in `nginx/prod/nginx.conf`:
```nginx
events {
    worker_connections 2048;  # Increase for high traffic
}

http {
    worker_processes auto;    # Use all CPU cores
}
```

### Node.js Tuning

Set environment variables in production:
```bash
NODE_OPTIONS="--max-old-space-size=4096"  # Increase heap size
```

## Security Considerations

1. **Change Default Passwords**: Update all passwords in `.env.production`
2. **SSL Certificates**: Use real certificates for production
3. **Domain Configuration**: Update nginx config for your domain
4. **Firewall**: Configure proper firewall rules
5. **Updates**: Keep Docker images and dependencies updated
6. **Backups**: Ensure backups are stored securely off-site

## Support

For issues and questions:
1. Check logs: `./deploy-prod.sh logs`
2. Verify health: `./deploy-prod.sh health`
3. Check status: `./deploy-prod.sh status`
4. Review configuration files
5. Consult Docker documentation