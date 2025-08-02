# AgentHub Project Overview

## 🏗️ Project Structure

```
real-estate-automation/
├── 📁 backend/                    # Backend server (Node.js + Express)
│   ├── 📄 server.js              # Main server file with all API endpoints
│   ├── 📄 package.json           # Backend dependencies
│   ├── 📄 .env                   # Environment variables (local only)
│   ├── 📄 .env.example           # Environment template
│   └── 📁 uploads/               # File upload directory
├── 📁 frontend/                   # Frontend application (React)
│   ├── 📁 public/                # Static assets
│   ├── 📁 src/                   # React source code
│   │   ├── 📄 App.js             # Main React component
│   │   ├── 📄 index.js           # React entry point
│   │   └── 📄 index.css          # Global styles
│   ├── 📄 package.json           # Frontend dependencies
│   └── 📄 tailwind.config.js     # Tailwind CSS configuration
├── 📄 README.md                   # Main project documentation
├── 📄 GMAIL_SETUP.md             # Gmail integration setup guide
├── 📄 PROJECT_OVERVIEW.md        # This file - project overview
├── 📄 setup.sh                   # Project setup script
└── 📄 .gitignore                 # Git ignore rules
```

## 🚀 Quick Start

### 1. Start Backend Server
```bash
cd backend
npm install
npm run dev
```
Server runs on: http://localhost:3001

### 2. Start Frontend Application
```bash
cd frontend
npm install
npm start
```
App runs on: http://localhost:3000

## 📋 File Descriptions

### Backend Files

#### `backend/server.js`
- **Purpose**: Main Express server with all API endpoints
- **Key Features**:
  - Gmail OAuth integration
  - OpenAI GPT-4 integration
  - Supabase database connection
  - File upload handling
  - CORS configuration
  - Session management

#### `backend/package.json`
- **Dependencies**: Express, Supabase, OpenAI, Google APIs, Multer, CORS
- **Scripts**: `npm start`, `npm run dev`

#### `backend/.env`
- **Contains**: API keys and configuration
- **Important**: Never commit this file (contains sensitive data)

### Frontend Files

#### `frontend/src/App.js`
- **Purpose**: Main React application component
- **Key Features**:
  - Two-step workflow (Add Notes → Generate Follow-up)
  - Gmail integration settings
  - Theme customization
  - Communication history
  - File upload interface
  - Modern UI with Liquid Glass theme

#### `frontend/src/index.css`
- **Purpose**: Global styles and Tailwind CSS imports
- **Features**: Inter font, custom scrollbars, glassmorphic effects

#### `frontend/tailwind.config.js`
- **Purpose**: Tailwind CSS configuration
- **Features**: Custom colors, fonts, and design system

### Documentation Files

#### `README.md`
- **Purpose**: Main project documentation
- **Content**: Setup instructions, API endpoints, deployment guide

#### `GMAIL_SETUP.md`
- **Purpose**: Complete Gmail OAuth setup guide
- **Content**: Google Cloud Console setup, environment configuration, troubleshooting

#### `PROJECT_OVERVIEW.md`
- **Purpose**: This file - comprehensive project overview
- **Content**: File descriptions, quick start guide, project structure

## 🔧 Key Features

### 1. AI-Powered Follow-ups
- Generate personalized client follow-up messages
- Uses OpenAI GPT-4 for intelligent content generation
- Learns from agent's communication style

### 2. Gmail Integration
- OAuth 2.0 authentication with Google
- Direct email sending from the platform
- Secure token management
- Connection status monitoring

### 3. Modern UI/UX
- Two-step workflow design
- Liquid Glass-inspired theme
- Responsive design
- Expandable communication history
- Theme customization

### 4. File Management
- Drag & drop file upload
- Support for multiple file types
- Automatic file processing

### 5. Data Management
- Supabase database integration
- Real-time data synchronization
- Client notes and agent messages storage

## 🌐 API Endpoints

### Core Endpoints
- `POST /api/generate-followup` - Generate AI follow-up
- `GET /api/data` - Get client and agent data
- `POST /api/client-notes` - Add client notes
- `POST /api/agent-messages` - Add agent messages

### Gmail Integration
- `GET /api/auth/gmail` - Initiate OAuth flow
- `GET /auth/gmail/callback` - OAuth callback
- `GET /api/auth/gmail/status` - Check connection
- `POST /api/gmail/send` - Send email
- `POST /api/auth/gmail/disconnect` - Disconnect

### File Upload
- `POST /api/upload-client-note` - Upload files

## 🎨 Design System

### Colors
- **Background**: Deep navy `#0B1F33`
- **Cards**: Soft beige `#F8EEDB`
- **Primary**: Modern blue `#1E85F2`
- **Secondary**: Green `#10B981`

### Typography
- **Font**: Inter (Google Fonts)
- **Weights**: 300-900
- **Sizes**: 16-18px base, larger headings

### Components
- Glassmorphic cards with backdrop blur
- Smooth transitions and animations
- Responsive grid layouts
- Modern button designs

## 🔒 Security Features

- OAuth 2.0 authentication
- Secure token storage
- CORS configuration
- Environment variable protection
- Session management

## 📱 Responsive Design

- Mobile-first approach
- Tablet and desktop optimized
- Touch-friendly interfaces
- Adaptive layouts

## 🚀 Deployment Ready

### Backend Deployment
- Vercel (serverless)
- Railway
- Heroku
- DigitalOcean

### Frontend Deployment
- Vercel
- Netlify
- GitHub Pages

## 🔄 Development Workflow

1. **Backend Development**: `cd backend && npm run dev`
2. **Frontend Development**: `cd frontend && npm start`
3. **Database**: Supabase dashboard
4. **Version Control**: Git with GitHub

## 📊 Database Schema

### Tables
- `client_notes` - Client interaction notes
- `agent_messages` - Agent communication examples
- `generated_messages` - AI-generated follow-ups

## 🛠️ Tech Stack

### Backend
- Node.js + Express
- Supabase (PostgreSQL)
- OpenAI GPT-4
- Google APIs (Gmail)
- Multer (file uploads)

### Frontend
- React 18
- Tailwind CSS
- Inter font
- Modern JavaScript

### Infrastructure
- Git + GitHub
- npm package management
- Environment configuration

## 📈 Future Enhancements

- Outlook integration
- Email templates
- Advanced scheduling
- Analytics dashboard
- Multi-user support
- Mobile app

## 🆘 Support

- Check `GMAIL_SETUP.md` for Gmail integration issues
- Review browser console for frontend errors
- Check server logs for backend issues
- Verify environment variables are set correctly

---

**Last Updated**: January 2025
**Version**: 2.0.0 (with Gmail Integration) 