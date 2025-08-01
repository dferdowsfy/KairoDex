# Real Estate Follow-Up Automation

A full-stack application that generates personalized client follow-up messages for real estate agents using OpenAI GPT-4 and Supabase.

## Features

- **AI-Powered Follow-Ups**: Generate personalized follow-up messages based on client notes and agent message history
- **Real-time Data**: View client notes, agent messages, and generated follow-ups in a clean interface
- **Make.com Compatible**: REST API endpoints for integration with Make.com workflows
- **Modern UI**: Clean, mobile-first design inspired by Redfin with real estate theming

## Tech Stack

### Backend
- **Node.js** with Express
- **Supabase** for database
- **OpenAI GPT-4** for message generation
- **CORS** enabled for frontend integration

### Frontend
- **React** with hooks
- **Tailwind CSS** for styling
- **Mobile-first** responsive design

## Database Schema

### Tables

#### `client_notes`
- `id` (primary key)
- `agent_id` (foreign key)
- `client_id` (foreign key)
- `note` (text)
- `created_at` (timestamp)

#### `agent_messages`
- `id` (primary key)
- `agent_id` (foreign key)
- `message` (text)
- `created_at` (timestamp)

#### `generated_messages`
- `id` (primary key)
- `agent_id` (foreign key)
- `client_id` (foreign key)
- `message` (text)
- `timestamp` (timestamp)

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project
- OpenAI API key

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update `.env` with your credentials:
```env
SUPABASE_KEY=your_supabase_anon_key_here
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
```

5. Start the development server:
```bash
npm run dev
```

The backend will be available at `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## API Endpoints

### Generate Follow-Up
```
POST /api/generate-followup
Content-Type: application/json

{
  "clientId": "string",
  "agentId": "string"
}
```

### Get Data
```
GET /api/data?agentId=string&clientId=string
```

### Health Check
```
GET /api/health
```

## Make.com Integration

To integrate with Make.com:

1. Use the **HTTP** module to make requests to the API endpoints
2. Set the base URL to your deployed backend URL
3. Use the `/api/generate-followup` endpoint for automation
4. Handle the response to extract the generated message

Example Make.com scenario:
1. Trigger: New client note added to Supabase
2. Action: HTTP request to generate follow-up
3. Action: Send follow-up via email/SMS
4. Action: Log the sent message back to Supabase

## Environment Variables

### Backend (.env)
- `SUPABASE_KEY`: Your Supabase anon/public key
- `OPENAI_API_KEY`: Your OpenAI API key
- `PORT`: Server port (default: 3001)

## Development

### Backend Development
```bash
cd backend
npm run dev  # Starts with nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend
npm start    # Starts React development server
```

## Deployment

### Backend Deployment
The backend can be deployed to:
- Vercel (serverless functions)
- Railway
- Heroku
- DigitalOcean App Platform

### Frontend Deployment
The frontend can be deployed to:
- Vercel
- Netlify
- GitHub Pages

## Project Structure

```
real-estate-automation/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License 