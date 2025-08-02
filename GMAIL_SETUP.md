# Gmail Integration Setup Guide

This guide will help you set up Gmail OAuth integration for AgentHub to send emails directly from the platform.

## Prerequisites

- A Google account
- Access to Google Cloud Console
- Node.js and npm installed

## Step 1: Google Cloud Console Setup

### 1.1 Create a New Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Name your project (e.g., "AgentHub Gmail Integration")
5. Click "Create"

### 1.2 Enable Gmail API
1. In your new project, go to "APIs & Services" > "Library"
2. Search for "Gmail API"
3. Click on "Gmail API"
4. Click "Enable"

### 1.3 Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. If prompted, configure the OAuth consent screen:
   - User Type: External
   - App name: AgentHub
   - User support email: Your email
   - Developer contact information: Your email
   - Save and continue through the steps

4. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Name: AgentHub Web Client
   - Authorized redirect URIs: `http://localhost:3001/auth/gmail/callback`
   - Click "Create"

5. Copy the Client ID and Client Secret

## Step 2: Update Environment Variables

1. Open `/backend/.env`
2. Replace the placeholder values with your actual credentials:

```env
# Gmail OAuth Configuration
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/gmail/callback
```

## Step 3: Install Dependencies

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install the new dependencies:
```bash
npm install
```

## Step 4: Start the Servers

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend server (in a new terminal):
```bash
cd frontend
npm start
```

## Step 5: Connect Gmail

1. Open AgentHub in your browser (http://localhost:3000)
2. Click the "⚙️ Settings" button in the header
3. In the Email Integration section, select "Gmail"
4. Click "🔗 Connect Gmail"
5. A popup will open with Google's OAuth consent screen
6. Sign in with your Google account
7. Grant the requested permissions:
   - Send emails on your behalf
   - View your email address
   - View your basic profile info
8. The popup will close automatically
9. You should see "Connected" status in the settings

## Step 6: Test Email Sending

1. Add a note in Step 1
2. Generate a follow-up in Step 2
3. Click "Send Now"
4. The email will be sent via your connected Gmail account

## Troubleshooting

### Common Issues

**"Invalid redirect URI" error:**
- Make sure the redirect URI in Google Cloud Console exactly matches: `http://localhost:3001/auth/gmail/callback`
- No trailing slashes or extra spaces

**"Gmail not connected" error:**
- Check that you completed the OAuth flow
- Try disconnecting and reconnecting Gmail
- Check browser console for errors

**"Token expired" error:**
- Disconnect and reconnect Gmail
- This happens when tokens expire (usually after 1 hour)

**CORS errors:**
- Make sure both frontend (port 3000) and backend (port 3001) are running
- Check that the backend CORS configuration includes `http://localhost:3000`

### Security Notes

- Never commit your `.env` file to version control
- In production, use environment variables or secure secret management
- Store user tokens in a database instead of memory
- Use HTTPS in production
- Set up proper session management

## Production Deployment

For production deployment:

1. Update redirect URIs in Google Cloud Console to your production domain
2. Set up proper session management with a secure secret
3. Store user tokens in a database (Supabase, PostgreSQL, etc.)
4. Use HTTPS for all endpoints
5. Implement token refresh logic
6. Add rate limiting and error handling

## API Endpoints

The backend provides these Gmail-related endpoints:

- `GET /api/auth/gmail` - Get OAuth URL
- `GET /auth/gmail/callback` - OAuth callback handler
- `GET /api/auth/gmail/status` - Check connection status
- `POST /api/gmail/send` - Send email
- `POST /api/auth/gmail/disconnect` - Disconnect Gmail

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check the backend server logs
3. Verify your Google Cloud Console configuration
4. Ensure all environment variables are set correctly 