#!/bin/bash

# Production deployment script for Next.js Feteer App
# This script handles the complete deployment process including:
# - Building the Docker images
# - Setting up SSL certificates
# - Creating necessary directories
# - Starting the production environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups"
DATA_DIR="./data"
LOGS_DIR="./logs"
SSL_DIR="./nginx/prod/ssl"

# Functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    print_status "Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Requirements check passed"
}

create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p "$DATA_DIR"
    mkdir -p "$LOGS_DIR/nginx"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$SSL_DIR"
    mkdir -p "./monitoring/grafana/dashboards"
    mkdir -p "./monitoring/grafana/datasources"
    
    print_success "Directories created"
}

generate_ssl_certificates() {
    print_status "Checking SSL certificates..."
    
    if [[ ! -f "$SSL_DIR/server.crt" || ! -f "$SSL_DIR/server.key" ]]; then
        print_warning "SSL certificates not found. Generating self-signed certificates..."
        print_warning "For production, replace these with real SSL certificates!"
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$SSL_DIR/server.key" \
            -out "$SSL_DIR/server.crt" \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        chmod 600 "$SSL_DIR/server.key"
        chmod 644 "$SSL_DIR/server.crt"
        
        print_success "Self-signed SSL certificates generated"
    else
        print_success "SSL certificates found"
    fi
}

create_env_file() {
    if [[ ! -f "$ENV_FILE" ]]; then
        print_status "Creating production environment file..."
        
        cat > "$ENV_FILE" << EOL
# Production Environment Variables
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Database Configuration
POSTGRES_USER=nextjs
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB=nextjs_production

# Redis Configuration
REDIS_PASSWORD=$(openssl rand -hex 16)

# Monitoring Configuration
GRAFANA_USER=admin
GRAFANA_PASSWORD=$(openssl rand -hex 12)

# Security
SESSION_SECRET=$(openssl rand -hex 32)

# Domain Configuration (update these for your domain)
DOMAIN=localhost
EMAIL=admin@localhost

# Backup Configuration
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
EOL
        
        print_success "Production environment file created: $ENV_FILE"
        print_warning "Please review and update the environment variables in $ENV_FILE"
    else
        print_success "Production environment file exists"
    fi
}

backup_database() {
    if [[ -f "$DATA_DIR/db.sqlite3" ]]; then
        print_status "Creating database backup..."
        
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sqlite3"
        
        cp "$DATA_DIR/db.sqlite3" "$BACKUP_FILE"
        
        # Compress old backups
        find "$BACKUP_DIR" -name "db_backup_*.sqlite3" -type f -mtime +7 -exec gzip {} \;
        
        # Remove old backups (keep 30 days)
        find "$BACKUP_DIR" -name "db_backup_*.sqlite3.gz" -type f -mtime +30 -delete
        
        print_success "Database backup created: $BACKUP_FILE"
    fi
}

build_images() {
    print_status "Building Docker images..."
    
    # Build the production image
    docker-compose -f "$COMPOSE_FILE" build --no-cache nextjs-app
    
    print_success "Docker images built successfully"
}

start_services() {
    print_status "Starting production services..."
    
    # Load environment variables and start services
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    print_success "Services started"
}

health_check() {
    print_status "Performing health checks..."
    
    # Wait for services to start
    sleep 30
    
    # Check if containers are running
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        print_success "Containers are running"
    else
        print_error "Some containers failed to start"
        docker-compose -f "$COMPOSE_FILE" ps
        exit 1
    fi
    
    # Check application health (assuming health endpoint exists)
    for i in {1..30}; do
        if curl -f http://localhost/health > /dev/null 2>&1; then
            print_success "Application is healthy"
            break
        fi
        
        if [[ $i -eq 30 ]]; then
            print_error "Application health check failed"
            print_error "Check logs with: docker-compose -f $COMPOSE_FILE logs"
            exit 1
        fi
        
        sleep 2
    done
}

show_status() {
    print_status "Deployment Status:"
    echo
    docker-compose -f "$COMPOSE_FILE" ps
    echo
    print_status "Access URLs:"
    echo "  Web Application: https://localhost"
    echo "  Health Check: https://localhost/health"
    
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q grafana; then
        echo "  Grafana Dashboard: https://localhost:3000"
    fi
    
    echo
    print_status "Useful Commands:"
    echo "  View logs: docker-compose -f $COMPOSE_FILE logs -f"
    echo "  Stop services: docker-compose -f $COMPOSE_FILE down"
    echo "  Restart services: docker-compose -f $COMPOSE_FILE restart"
    echo "  View status: docker-compose -f $COMPOSE_FILE ps"
}

cleanup_old_images() {
    print_status "Cleaning up old Docker images..."
    
    # Remove dangling images
    docker image prune -f
    
    print_success "Cleanup completed"
}

main() {
    echo "=========================================="
    echo "  Next.js Feteer App - Production Deploy"
    echo "=========================================="
    echo
    
    check_requirements
    create_directories
    generate_ssl_certificates
    create_env_file
    
    # Ask for confirmation before proceeding
    echo
    read -p "Ready to deploy to production? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Deployment cancelled"
        exit 0
    fi
    
    backup_database
    build_images
    start_services
    health_check
    cleanup_old_images
    
    echo
    print_success "Production deployment completed successfully!"
    echo
    show_status
}

# Handle script arguments
case "${1:-}" in
    "build")
        check_requirements
        build_images
        ;;
    "start")
        start_services
        ;;
    "stop")
        docker-compose -f "$COMPOSE_FILE" down
        ;;
    "status")
        show_status
        ;;
    "logs")
        docker-compose -f "$COMPOSE_FILE" logs -f
        ;;
    "backup")
        backup_database
        ;;
    "cleanup")
        cleanup_old_images
        ;;
    "health")
        health_check
        ;;
    *)
        main
        ;;
esac