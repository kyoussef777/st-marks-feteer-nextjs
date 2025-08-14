#!/bin/bash

# Development deployment script for Next.js Feteer App

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

case "${1:-}" in
    "start")
        print_status "Starting development environment..."
        docker-compose -f docker-compose.dev.yml up -d
        print_success "Development environment started"
        echo "Access the app at: http://localhost:3000"
        ;;
    "stop")
        print_status "Stopping development environment..."
        docker-compose -f docker-compose.dev.yml down
        print_success "Development environment stopped"
        ;;
    "restart")
        print_status "Restarting development environment..."
        docker-compose -f docker-compose.dev.yml restart
        print_success "Development environment restarted"
        ;;
    "logs")
        docker-compose -f docker-compose.dev.yml logs -f
        ;;
    "build")
        print_status "Building development image..."
        docker-compose -f docker-compose.dev.yml build --no-cache
        print_success "Development image built"
        ;;
    *)
        echo "Next.js Feteer App - Development Commands"
        echo "Usage: $0 {start|stop|restart|logs|build}"
        echo
        echo "Commands:"
        echo "  start   - Start the development environment"
        echo "  stop    - Stop the development environment"
        echo "  restart - Restart the development environment"
        echo "  logs    - View development logs"
        echo "  build   - Build the development image"
        ;;
esac