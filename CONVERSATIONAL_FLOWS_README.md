# 🤖 AgentHub Conversational Flows

A sophisticated AI-powered real estate agent assistant that enables natural language interactions for contract amendments, client follow-ups, and showing scheduling.

## ✨ Features Overview

### Flow 1: Contract Amendment
- **Natural Language Processing**: Describe contract changes in plain English
- **Smart Parsing**: AI converts instructions into structured contract data
- **DocuSign Integration**: Seamlessly send amended contracts for signature
- **Version Control**: Track all contract changes with detailed history
- **Blockchain Logging**: Optional immutable audit trail

### Flow 2: Follow-Up Generation  
- **Intelligent Context**: AI analyzes client history and preferences
- **Personalized Messaging**: Generate tailored follow-ups based on last interactions
- **Multi-Channel Support**: Send via email, SMS, or schedule for later
- **Voice Input**: Record voice notes for more natural message generation
- **Smart Scheduling**: Automatic follow-up reminders and sequences

### Flow 3: Showing Scheduling
- **Calendar Integration**: Check agent availability in real-time
- **Property Autocomplete**: Quick property search and selection
- **Client Coordination**: Automatic notifications to all parties
- **Time Optimization**: Suggest optimal showing slots based on preferences
- **Conflict Prevention**: Avoid double-bookings with intelligent scheduling

## 🛠️ Technical Architecture

### Backend APIs
```
POST /api/flows/load_last_correspondence    # Load client interaction history
POST /api/flows/send_email                  # Send email follow-ups
POST /api/flows/send_sms                    # Send SMS messages
POST /api/flows/schedule_message            # Schedule future messages
POST /api/flows/suggest_showing_slots       # Find available showing times
POST /api/flows/book_showing                # Book property showings
POST /api/flows/select_contract_type        # Load contract templates
POST /api/flows/parse_nl_changes            # Parse natural language changes
```

### Database Schema
- **clients**: Client information and preferences
- **interactions**: All communications (email, SMS, calls, notes)
- **contracts**: Contract data and DocuSign integration
- **contract_events**: Audit trail of all contract changes
- **showings**: Property showing bookings
- **scheduled_messages**: Queued follow-up messages
- **agent_calendar**: Agent availability and events

### AI Integration
- **OpenAI GPT-3.5/4**: Natural language processing and generation
- **Smart Parsing**: Convert plain English to structured contract data
- **Context Awareness**: Generate personalized messages based on client history
- **Intelligent Scheduling**: Optimize showing times based on preferences

## 🚀 Quick Start

### 1. Database Setup
```bash
# Run the enhanced database schema
./setup_conversational_flows.sh
```

### 2. Environment Configuration
Add to your `.env` file:
```env
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Start the Application
```bash
# Backend
cd backend && npm start

# Frontend (new terminal)
cd frontend && npm start
```

### 4. Access the Flows
1. Login to your AgentHub dashboard
2. Click the new **"AI Flows"** tab
3. Choose your desired workflow:
   - 📄 Amend Contract
   - 💬 Generate Follow-Up  
   - 🏠 Schedule Showing

## 📋 Usage Examples

### Contract Amendment Flow
```
User: "Change the purchase price to $450,000 and set earnest money to $5,000"
AI: Parses → { purchase_price: 450000, earnest_money: 5000 }
System: Updates contract → Sends to DocuSign → Logs to blockchain
```

### Follow-Up Generation Flow
```
Context: Client viewed 3 properties last week, interested in downtown condos
AI: "Hi Sarah! Following up on the downtown condos we viewed. The market is moving fast - shall we schedule a second showing for the 15th floor unit you loved?"
```

### Showing Scheduling Flow
```
Input: Property "123 Main St", Date "2025-08-18", Time "Afternoon"
System: Checks calendar → Suggests available slots → Books showing → Sends notifications
```

## 🏗️ Architecture Patterns

### Event-Driven Actions
Each user interaction triggers backend events that update multiple systems:
```javascript
{
  "action": "send_email",
  "params": {
    "client_id": "<UUID>",
    "subject": "Follow-up",
    "body_text": "Generated message"
  }
}
```

### Chip-Based UI Navigation
Users navigate through flows using contextual action chips:
```javascript
{
  "id": "send_email",
  "label": "Send Email",
  "action": "send_email",
  "params": { "channel": "email" }
}
```

### Smart Context Management
The system maintains conversation context across interactions:
- Client preferences and history
- Property interests and viewing history
- Previous communications and sentiment
- Agent calendar and availability

## 🔒 Security & Compliance

### Data Protection
- **Row Level Security (RLS)**: Agents can only access their own data
- **JWT Authentication**: Secure API access with token validation
- **Encrypted Storage**: Sensitive data encrypted at rest
- **Audit Logging**: Complete activity trail for compliance

### Privacy Controls
- **Data Minimization**: Only collect necessary client information
- **Retention Policies**: Automatic cleanup of old interactions
- **Consent Management**: Clear opt-in/opt-out for communications
- **GDPR Compliance**: Right to access, modify, and delete data

## 🎯 Future Enhancements

### Advanced AI Features
- [ ] Multi-language support for diverse clients
- [ ] Sentiment analysis for client communications
- [ ] Predictive client needs and preferences
- [ ] Market trend integration for messaging

### Integration Expansions
- [ ] MLS integration for real-time property data
- [ ] CRM system synchronization
- [ ] Video conferencing integration for virtual showings
- [ ] Document storage and e-signature platforms

### Workflow Automations
- [ ] Smart lead scoring and qualification
- [ ] Automated drip campaigns
- [ ] Market update notifications
- [ ] Client milestone celebrations

## 🛟 Support & Troubleshooting

### Common Issues

**Issue**: API calls failing with 401 Unauthorized
```bash
Solution: Check your JWT token is valid and not expired
```

**Issue**: Database connection errors
```bash
Solution: Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set correctly
```

**Issue**: AI responses not generating
```bash
Solution: Confirm OPENAI_API_KEY is valid and has sufficient credits
```

### Debug Mode
Enable detailed logging in development:
```javascript
// In your .env file
NODE_ENV=development
DEBUG=agentHub:*
```

### Database Reset
If you need to reset the enhanced schema:
```sql
-- Run in Supabase SQL Editor
DROP TABLE IF EXISTS scheduled_messages CASCADE;
DROP TABLE IF EXISTS contract_events CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS showings CASCADE;
DROP TABLE IF EXISTS client_properties CASCADE;
DROP TABLE IF EXISTS property_listings CASCADE;
DROP TABLE IF EXISTS interactions CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS agent_calendar CASCADE;
```

## 📞 Support

For questions or issues:
1. Check the troubleshooting section above
2. Review the database schema and API documentation
3. Ensure all environment variables are properly set
4. Test with sample data before production use

## 🏆 Best Practices

### Client Data Management
- Regularly update client preferences
- Maintain detailed interaction history
- Use consistent naming conventions
- Archive inactive client records

### Message Generation
- Review AI-generated content before sending
- Personalize messages with specific details
- Maintain professional tone and branding
- Track message performance and engagement

### Showing Coordination
- Confirm property access before booking
- Send reminder notifications 24 hours prior
- Keep backup time slots for rescheduling
- Document showing outcomes and feedback

---

Built with ❤️ for real estate professionals who want to leverage AI to better serve their clients.
