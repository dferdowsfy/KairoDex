#!/bin/bash

# AgentHub Project Viewer
# This script helps you view all project files and their structure

echo "🏠 AgentHub Project Overview"
echo "=============================="
echo ""

# Show project structure
echo "📁 Project Structure:"
echo "====================="
tree -I 'node_modules|.git' --dirsfirst

echo ""
echo "📋 Key Files Summary:"
echo "===================="

# Backend files
echo ""
echo "🔧 Backend Files:"
echo "----------------"
echo "📄 backend/server.js - Main server with Gmail OAuth & API endpoints"
echo "📄 backend/package.json - Dependencies (Express, Supabase, OpenAI, Google APIs)"
echo "📄 backend/.env - Environment variables (contains API keys)"
echo "📄 backend/.env.example - Environment template"

# Frontend files
echo ""
echo "🎨 Frontend Files:"
echo "-----------------"
echo "📄 frontend/src/App.js - Main React app with modern UI & Gmail integration"
echo "📄 frontend/src/index.css - Global styles & Tailwind CSS"
echo "📄 frontend/tailwind.config.js - Tailwind configuration with custom theme"
echo "📄 frontend/package.json - Frontend dependencies"

# Documentation files
echo ""
echo "📚 Documentation Files:"
echo "----------------------"
echo "📄 README.md - Main project documentation"
echo "📄 GMAIL_SETUP.md - Complete Gmail OAuth setup guide"
echo "📄 PROJECT_OVERVIEW.md - This comprehensive overview"
echo "📄 view-project.sh - This viewing script"

echo ""
echo "🚀 Quick Commands:"
echo "=================="
echo "cd backend && npm run dev    # Start backend server"
echo "cd frontend && npm start     # Start frontend app"
echo "open http://localhost:3000   # Open in browser"
echo ""

echo "📖 View Specific Files:"
echo "======================="
echo "cat backend/server.js        # View main server file"
echo "cat frontend/src/App.js      # View main React component"
echo "cat GMAIL_SETUP.md           # View Gmail setup guide"
echo "cat PROJECT_OVERVIEW.md      # View this overview"
echo ""

echo "🔍 File Search:"
echo "=============="
echo "find . -name '*.js' -type f  # Find all JavaScript files"
echo "find . -name '*.md' -type f  # Find all documentation files"
echo "find . -name '*.json' -type f # Find all package files"
echo ""

echo "📊 Git Status:"
echo "============="
git status --short

echo ""
echo "🎯 Next Steps:"
echo "============="
echo "1. Set up Gmail OAuth (see GMAIL_SETUP.md)"
echo "2. Start both servers"
echo "3. Test the application"
echo "4. Commit changes to GitHub"
echo ""

echo "💡 Tips:"
echo "======="
echo "- Never commit .env files (they contain API keys)"
echo "- Check GMAIL_SETUP.md for OAuth configuration"
echo "- Use 'npm run dev' for development with auto-reload"
echo "- The app runs on http://localhost:3000"
echo "" 