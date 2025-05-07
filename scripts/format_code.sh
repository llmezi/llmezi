#!/usr/bin/env bash

# Script to format both backend and frontend code

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the project root directory (parent of scripts directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo -e "${YELLOW}Formatting project code...${NC}"

# Format backend code
if [ -d "$BACKEND_DIR" ]; then
    echo -e "${GREEN}Formatting backend code...${NC}"
    cd "$BACKEND_DIR" || exit
    uv run ruff check --fix && uv run ruff format
else
    echo -e "${YELLOW}Backend directory not found at $BACKEND_DIR${NC}"
fi

# Format frontend code
if [ -d "$FRONTEND_DIR" ]; then
    echo -e "${GREEN}Formatting frontend code...${NC}"
    cd "$FRONTEND_DIR" || exit
    yarn format
else
    echo -e "${YELLOW}Frontend directory not found at $FRONTEND_DIR${NC}"
fi

echo -e "${GREEN}Formatting completed successfully!${NC}"