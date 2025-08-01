#!/bin/bash

echo "🏠 Real Estate Automation Setup"
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js is installed"

# Setup Backend
echo ""
echo "🔧 Setting up Backend..."
cd backend

if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your API keys"
else
    echo "✅ .env file already exists"
fi

echo "📦 Installing backend dependencies..."
npm install

echo "✅ Backend setup complete!"

# Setup Frontend
echo ""
echo "🎨 Setting up Frontend..."
cd ../frontend

echo "📦 Installing frontend dependencies..."
npm install

echo "✅ Frontend setup complete!"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update backend/.env with your Supabase and OpenAI API keys"
echo "2. Start the backend: cd backend && npm run dev"
echo "3. Start the frontend: cd frontend && npm start"
echo ""
echo "Backend will run on: http://localhost:3001"
echo "Frontend will run on: http://localhost:3000" 