# DocuSign Integration Guide for AgentHub

## Overview

The AgentHub platform now includes seamless DocuSign integration for electronic contract signing. This integration allows real estate agents to:

1. **Modify contracts** using natural language instructions
2. **Create DocuSign envelopes** with the modified contracts
3. **Send contracts for electronic signature** via embedded DocuSign iFrame
4. **Track signature status** and manage the signing process

## 🔐 Security Implementation

### Backend Security
- **RSA Private Key**: Stored securely in `backend/docusign-config.js`
- **JWT Authentication**: Uses DocuSign's JWT Bearer Token flow
- **Server-side processing**: All DocuSign operations happen on the backend
- **No client-side credentials**: Private keys never exposed to the browser

### Credentials Used
```javascript
// DocuSign Demo Environment
user_id: '8a69cf44-9064-4362-b1b4-693271545239'
account_id: 'feda12e6-d12e-4dc9-b4d1-d2794cbe1ad6'
base_uri: 'https://demo.docusign.net'
integration_key: '0a222076-b83d-4395-9447-99e2b315cd5a'
```

## 🚀 Implementation Details

### Backend Endpoints

#### 1. Create DocuSign Envelope
```javascript
POST /api/docusign/create-envelope
{
  "contractContent": "Modified contract text...",
  "clientName": "John Doe",
  "clientEmail": "john@example.com",
  "subject": "Contract for Signature - John Doe"
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "envelopeId": "abc123-def456",
    "recipientViewUrl": "https://demo.docusign.net/...",
    "status": "created"
  }
}
```

#### 2. Get Envelope Status
```javascript
GET /api/docusign/envelope/:envelopeId
```

#### 3. Get User's Envelopes
```javascript
GET /api/docusign/envelopes
```

### Frontend Components

#### DocuSignIntegration Component
Located at: `frontend/src/components/DocuSignIntegration.js`

**Features:**
- Client information form
- Envelope creation
- Embedded signing iFrame
- Status tracking

**Usage:**
```javascript
import DocuSignIntegration from './components/DocuSignIntegration';

<DocuSignIntegration
  amendedContract={contractText}
  onClose={handleClose}
  customColors={themeColors}
  token={authToken}
/>
```

## 📋 Workflow

### 1. Contract Modification
1. User selects "Modify a Contract" from dashboard
2. Chooses jurisdiction and document type
3. Enters natural language modification instructions
4. AI generates modified contract

### 2. DocuSign Integration
1. After saving contract, DocuSign form appears
2. Agent enters client name and email
3. System creates DocuSign envelope
4. Embedded signing iFrame opens

### 3. Electronic Signing
1. Client sees contract in DocuSign interface
2. Client can review and sign electronically
3. Agent can track signing status
4. Completed documents are stored

## 🔧 Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install docusign-esign
```

### 2. Configure DocuSign
The DocuSign configuration is already set up in `backend/docusign-config.js` with demo credentials.

### 3. Database Tables (Optional)
The system works without database tables, but you can create them for better tracking:

```sql
-- DocuSign envelopes table
CREATE TABLE docusign_envelopes (
  id SERIAL PRIMARY KEY,
  agent_id UUID REFERENCES users(id),
  envelope_id VARCHAR(255) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  contract_content TEXT,
  status VARCHAR(50) DEFAULT 'created',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Key Features

### Security Features
- ✅ JWT-based authentication
- ✅ Server-side envelope creation
- ✅ Secure credential storage
- ✅ Embedded signing (no external redirects)

### User Experience
- ✅ Seamless integration with existing workflow
- ✅ Real-time status updates
- ✅ Professional signing interface
- ✅ Mobile-responsive design

### Technical Features
- ✅ Error handling and validation
- ✅ Loading states and feedback
- ✅ Blockchain logging integration
- ✅ Modular component architecture

## 🚨 Important Notes

### Demo Environment
- Currently using DocuSign demo environment
- For production, update credentials in `docusign-config.js`
- Change `base_uri` to production URL

### Security Best Practices
- Never expose RSA private keys in frontend code
- Always use HTTPS in production
- Implement proper session management
- Regular credential rotation

### Error Handling
- Network failures are gracefully handled
- User-friendly error messages
- Fallback options for failed operations

## 🔄 Future Enhancements

### Planned Features
1. **Template Management**: Pre-configured contract templates
2. **Bulk Operations**: Send multiple contracts simultaneously
3. **Advanced Workflows**: Multi-party signing sequences
4. **Integration APIs**: Connect with other real estate tools
5. **Analytics**: Track signing completion rates

### Technical Improvements
1. **Caching**: Implement envelope status caching
2. **Webhooks**: Real-time status updates
3. **Offline Support**: Queue operations when offline
4. **Performance**: Optimize envelope creation

## 📞 Support

For technical support or questions about the DocuSign integration:

1. Check the console logs for detailed error messages
2. Verify DocuSign credentials are correct
3. Ensure network connectivity to DocuSign APIs
4. Review the DocuSign developer documentation

## 🔗 Resources

- [DocuSign Developer Center](https://developers.docusign.com/)
- [JWT Authentication Guide](https://developers.docusign.com/docs/esign-rest-api/how-to/authenticate-jwt/)
- [Embedded Signing Guide](https://developers.docusign.com/docs/esign-rest-api/how-to/request-signature-in-app/)
- [DocuSign Node.js SDK](https://github.com/docusign/docusign-esign-node)

---

**Status**: ✅ Implemented and Ready for Testing
**Environment**: Demo (Ready for Production)
**Last Updated**: Current Date 