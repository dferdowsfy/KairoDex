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

## Customizing Contract Templates

The application includes contract templates for all US states and territories. You can customize these templates to include state-specific legal requirements, inspection periods, and disclosure requirements.

### Location
Contract templates are located in: `frontend/src/statesData.js`

### How to Modify Templates

#### 1. **Add Custom Templates for Specific States**

The file contains a `customTemplates` object where you can add state-specific contracts:

```javascript
const customTemplates = {
  'California': {
    'Residential Purchase Agreement': `CALIFORNIA RESIDENTIAL PURCHASE AGREEMENT
    // Your custom California contract here
    `,
    'Seller Disclosure': `CALIFORNIA SELLER'S DISCLOSURE STATEMENT
    // Your custom California disclosure here
    `,
    'Addendum': `ADDENDUM TO CALIFORNIA RESIDENTIAL PURCHASE AGREEMENT
    // Your custom California addendum here
    `
  },
  'Texas': {
    // Texas-specific templates
  }
};
```

#### 2. **Available Document Types**

Each state can have these document types:
- **Residential Purchase Agreement** - Main purchase contract
- **Seller Disclosure** - Property condition disclosure
- **Addendum** - Additional terms and conditions

#### 3. **State-Specific Customizations**

You can customize:
- **Inspection periods** (e.g., California's 17 days vs standard 10 days)
- **Legal compliance** (state-specific codes and requirements)
- **Additional clauses** (state-specific contingencies)
- **Disclosure requirements** (state-specific disclosure items)
- **Timing requirements** (state-specific deadlines)

#### 4. **Example: Adding Florida**

```javascript
'Florida': {
  'Residential Purchase Agreement': `FLORIDA RESIDENTIAL PURCHASE AGREEMENT

This agreement is between:

BUYER: _________________ (the "Buyer")
SELLER: _________________ (the "Seller")

PROPERTY: _________________ (the "Property")

PURCHASE PRICE: $_________________ (the "Purchase Price")

EARNEST MONEY: $_________________ (the "Earnest Money")

CLOSING DATE: _________________ (the "Closing Date")

TERMS AND CONDITIONS:

1. EARNEST MONEY: Buyer shall pay the Earnest Money to the escrow agent.

2. TITLE: Seller shall deliver marketable title to the Property at closing.

3. INSPECTION PERIOD: Buyer shall have 15 days to complete inspections (Florida requirement).

4. FINANCING: This contract is contingent upon Buyer obtaining financing.

5. CLOSING COSTS: Buyer and Seller shall pay their respective closing costs.

6. POSSESSION: Buyer shall receive possession of the Property at closing.

7. DEFAULT: If Buyer defaults, Seller may retain the Earnest Money. If Seller defaults, Buyer may recover the Earnest Money plus costs.

8. TITLE INSURANCE: Seller shall provide and pay for a title insurance policy.

9. SURVEY: Seller shall furnish a survey of the Property.

10. PROPERTY CONDITION: The Property is sold in its present condition.

11. FLORIDA SPECIFIC: This contract complies with Florida Statute requirements.

Dated: _________________`
}
```

#### 5. **How It Works**

1. **Custom templates** are checked first for specific states
2. **Standard template** is used for states without custom templates
3. **Dynamic content** is inserted (state name, dates, etc.)
4. **State-specific requirements** can be included

#### 6. **Updating Existing States**

To modify an existing state's templates:
1. Find the state in the `customTemplates` object
2. Update the content within the template strings
3. Save the file
4. The changes will automatically appear in the application

#### 7. **Best Practices**

- **Keep legal compliance**: Ensure templates meet state legal requirements
- **Use clear formatting**: Maintain consistent structure across templates
- **Include placeholders**: Use `_________________` for fillable fields
- **Add state-specific clauses**: Include relevant state laws and requirements
- **Test thoroughly**: Verify templates work correctly in the application

#### 8. **Template Variables**

You can use these dynamic variables in templates:
- `${stateName}` - The state name
- `_________________` - Fillable fields for users
- `□` - Checkboxes for disclosures

### Database Schema for Contracts

The application stores contracts in the `amended_contracts` table:

```sql
CREATE TABLE amended_contracts (
    id SERIAL PRIMARY KEY,
    agent_id UUID REFERENCES auth.users(id),
    client_id TEXT NOT NULL,
    original_contract TEXT NOT NULL,
    amended_contract TEXT NOT NULL,
    instruction TEXT NOT NULL,
    jurisdiction TEXT,
    document TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Troubleshooting Contract Save Issues

If the "Save Contract" button is not working:

1. **Check Browser Console**: Open Developer Tools (F12) and look for error messages
2. **Verify Authentication**: Ensure you're logged in and have a valid token
3. **Check Database Schema**: Run the database setup script to ensure tables exist
4. **Verify API Endpoint**: Test the save endpoint directly:

```bash
curl -X POST http://localhost:3001/api/save-amended-contract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "clientId": "test",
    "originalContract": "Test contract",
    "amendedContract": "Amended test contract",
    "instruction": "Test instruction"
  }'
```

5. **Check Backend Logs**: Look for errors in the backend console
6. **Database Connection**: Verify Supabase connection and credentials

Common Issues:
- **Missing database tables**: Run the database setup script
- **Invalid API key**: Check OpenAI API key in `.env`
- **Authentication errors**: Ensure proper login and token
- **CORS issues**: Check if frontend and backend are on correct ports

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License 