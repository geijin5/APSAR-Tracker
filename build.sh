#!/bin/bash
set -e

echo "Building APSAR Tracker..."

# Install root dependencies
npm install

# Build backend
echo "Installing backend dependencies..."
cd backend
npm install
echo "Backend build complete!"

# Return to root
cd ..

echo "Build complete!"
