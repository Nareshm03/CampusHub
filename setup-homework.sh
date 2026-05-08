#!/bin/bash

echo "================================"
echo "Homework System Setup Script"
echo "================================"
echo ""

# Create upload directories
echo "Creating upload directories..."
mkdir -p backend/uploads/homework
echo "✓ Created backend/uploads/homework"

# Check if in backend directory
if [ -d "backend" ]; then
  cd backend
fi

# Install backend dependencies
echo ""
echo "Installing backend dependencies..."
if [ -f "package.json" ]; then
  npm install multer
  echo "✓ Installed multer"
else
  echo "⚠ package.json not found. Please run from project root or backend directory."
  exit 1
fi

echo ""
echo "================================"
echo "Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Start the backend server: npm run dev"
echo "2. Start the frontend: cd ../frontend && npm run dev"
echo "3. Navigate to /homework to access the system"
echo ""
echo "Documentation: See HOMEWORK_SYSTEM.md for details"
