#!/usr/bin/env bash

# Script to ensure correct Node version is used for frontend development

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Frontend directory not found at $FRONTEND_DIR${NC}"
    exit 1
fi

cd "$FRONTEND_DIR" || exit

# Check if nvm is installed and available
if [ -z "$(command -v nvm)" ]; then
    if [ -f "$HOME/.nvm/nvm.sh" ]; then
        echo -e "${YELLOW}Loading NVM...${NC}"
        export NVM_DIR="$HOME/.nvm"
        # This loads nvm
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    else
        echo -e "${RED}NVM is not installed. Please install NVM first:${NC}"
        echo -e "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
        exit 1
    fi
fi

# Read the required Node version from .nvmrc
if [ -f .nvmrc ]; then
    REQUIRED_NODE_VERSION=$(cat .nvmrc)
    echo -e "${GREEN}Required Node version: $REQUIRED_NODE_VERSION${NC}"
    
    # Check if the required version is installed
    if ! nvm ls "$REQUIRED_NODE_VERSION" > /dev/null; then
        echo -e "${YELLOW}Node $REQUIRED_NODE_VERSION is not installed. Installing now...${NC}"
        nvm install 
    fi
    
    # Use the required Node version
    echo -e "${GREEN}Switching to Node $REQUIRED_NODE_VERSION${NC}"
    nvm use
    
    # Launch a new shell with the correct Node version
    echo -e "${GREEN}Launching a new shell with Node $(node -v)${NC}"
    echo -e "${YELLOW}To exit this environment and return to your global Node version, type 'exit'${NC}"
    exec $SHELL -i
else
    echo -e "${RED}.nvmrc file not found in the frontend directory${NC}"
    exit 1
fi