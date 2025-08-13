require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { generateAssistantPlan } = require('./chat-intent');
const OpenAI = require('openai');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const mammoth = require('mammoth');
const { 
  hashPassword, 
  verifyPassword, 
  generateToken, 
  authenticateToken,
  validateRegistration,
  validateLogin,
  validatePasswordChange
} = require('./auth');
const { createDocuSignClient, DOCUSIGN_CONFIG, generateConsentUrl } = require('./docusign-config');
const { MockDocuSignClient } = require('./docusign-mock');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowed = ['http://localhost:3000', 'http://localhost:3004'];
    // Allow requests from Chrome extensions and same-origin/undefined (like curl, Postman)
    const isExtension = typeof origin === 'string' && origin.startsWith('chrome-extension://');
    // Be more permissive in development
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (!origin || isExtension || allowed.includes(origin) || (isDevelopment && origin?.includes('localhost'))) {
      return callback(null, true);
    }
    console.warn('CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Gmail OAuth Configuration
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Gmail API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Store user tokens (in production, use a database)
const userTokens = new Map();

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// --- New Endpoint: Follow-up generation from Google Sheet (Column Y) ---
app.get('/api/followup/from-sheet', authenticateToken, async (req, res) => {
  try {
    const { clientName } = req.query;
    if (!clientName) return res.status(400).json({ success: false, error: 'clientName query param required' });
    const rows = await fetchSheetValues();
    const { notes, city, meta } = extractFollowUpNotes(rows, clientName);
    if (!notes) return res.status(404).json({ success: false, error: 'No follow-up notes found for client', meta });
    if (!openai) {
      return res.json({ success: true, subject: `Following up, ${clientName}`, body: notes, rawNotes: notes, city, meta, fallback: true });
    }
    const systemPrompt = 'You are a friendly, professional real estate agent assistant. Turn internal raw follow-up notes into a concise, personable email (2-3 short paragraphs) with a clear next step. Maintain factual accuracy. Include ONE brief sentence referencing current market conditions in the client\'s city if provided (inventory trend, days-on-market, pricing direction) WITHOUT fabricating numbers. Avoid the exact phrase "Let me know what you would like to do next." and instead offer a specific next action.';
    const cityLine = city ? `Client City: ${city}` : 'Client City: (not provided)';
    const userPrompt = `Client Name: ${clientName}\n${cityLine}\nRaw Internal Follow-Up Notes:\n"""\n${notes}\n"""\n\nReturn ONLY valid JSON with keys subject and body.`;
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
      messages: [ { role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt } ],
      temperature: 0.65,
      max_tokens: 500
    });
    let subject = `Follow up, ${clientName}`;
    let body = notes;
    try {
      const raw = completion.choices?.[0]?.message?.content || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      subject = parsed.subject || subject;
      body = parsed.body || body;
    } catch (e) {
      body = completion.choices?.[0]?.message?.content || body;
    }
  body = sanitizeFollowUp(body);
  res.json({ success: true, subject, body, rawNotes: notes, city, meta });
  } catch (error) {
    console.error('followup/from-sheet error:', error);
    const hint = /Missing GOOGLE_SHEETS_SHEET_ID/i.test(error.message) || /No Google Sheets credentials/i.test(error.message)
      ? 'Add GOOGLE_SHEETS_SHEET_ID and either GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (with escaped newlines) or GOOGLE_SHEETS_API_KEY to backend .env then restart.'
      : '';
    res.status(500).json({ success: false, error: 'Failed to generate follow-up from sheet', details: error.message, hint });
  }
});

// Refine previously generated follow-up email with an instruction (e.g., "make it more professional")
app.post('/api/followup/refine', authenticateToken, async (req, res) => {
  try {
    const { currentBody, instruction } = req.body;
    if (!currentBody || !instruction) return res.status(400).json({ success: false, error: 'currentBody and instruction required' });
    if (!openai) return res.json({ success: true, refinedBody: currentBody, note: 'AI disabled' });
    const systemPrompt = 'You are a real estate agent email editor. Apply the user instruction to adjust tone/style while preserving factual content and client specifics. Do NOT introduce new facts. Never end with the exact phrase "Let me know what you would like to do next."';
    const userPrompt = `Original Email Body:\n"""\n${currentBody}\n"""\n\nInstruction: ${instruction}\n\nReturn ONLY the revised email body (no JSON).`;
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
      messages: [ { role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt } ],
      temperature: 0.5,
      max_tokens: 500
    });
  let refined = completion.choices?.[0]?.message?.content?.trim() || currentBody;
  refined = sanitizeFollowUp(refined);
  res.json({ success: true, refinedBody: refined });
  } catch (error) {
    console.error('followup/refine error:', error);
    res.status(500).json({ success: false, error: 'Failed to refine follow-up', details: error.message });
  }
});

// Helper: fetch Google Sheet values (A:Y) using either service account or API key
async function fetchSheetValues() {
  const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
  if (!sheetId) throw new Error('Missing GOOGLE_SHEETS_SHEET_ID');
  // Extend default range to AC to include city (Column AC)
  const range = process.env.GOOGLE_SHEETS_RANGE || 'Sheet1!A:AC';

  // Prefer service account credentials if provided
  const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const saKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n');
  if (saEmail && saKey) {
    const jwt = new google.auth.JWT(saEmail, null, saKey, ['https://www.googleapis.com/auth/spreadsheets.readonly']);
    await jwt.authorize();
    const sheets = google.sheets({ version: 'v4', auth: jwt });
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
    return resp.data.values || [];
  }

  // Fallback to simple API key access (public sheet required)
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) throw new Error('No Google Sheets credentials (service account or GOOGLE_SHEETS_API_KEY) provided');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
  const { data } = await axios.get(url);
  return data.values || [];
}

// Helper: extract follow-up notes for a given client name (case-insensitive) from Column Y
function extractFollowUpNotes(rows, clientName) {
  if (!Array.isArray(rows) || rows.length === 0) return { notes: null, meta: { reason: 'empty_sheet' } };
  const header = rows[0].map(h => (h || '').toString().trim());
  const firstNameIdx = header.findIndex(h => /^name_first$/i.test(h));
  const lastNameIdx = header.findIndex(h => /^name_last$/i.test(h));
  const fullNameIdx = header.findIndex(h => /^name$/i.test(h));
  const notesIdx = header.findIndex(h => /^notes$/i.test(h));
  const cityIdx = header.findIndex(h => /^city$/i.test(h));
  const targetName = clientName.toLowerCase();
  let matchedRow = null;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const first = (row[firstNameIdx] || '').toString().trim();
    const last = (row[lastNameIdx] || '').toString().trim();
    const combined = (first && last) ? `${first} ${last}` : (row[fullNameIdx] || '').toString().trim();
    if (combined && combined.toLowerCase().includes(targetName)) {
      matchedRow = row;
      break;
    }
  }
  if (!matchedRow) return { notes: null, meta: { reason: 'client_not_found', searched: clientName } };
  const notes = notesIdx !== -1 ? (matchedRow[notesIdx] || '').toString().trim() : '';
  const city = cityIdx !== -1 ? (matchedRow[cityIdx] || '').toString().trim() : '';
  return { notes: notes || null, city: city || null, meta: { firstNameIdx, lastNameIdx, fullNameIdx, notesIdx, cityIdx } };
}

// Post-process follow-up email body: remove generic closing phrase and enforce a more specific CTA
function sanitizeFollowUp(text) {
  if (!text) return text;
  let cleaned = text.replace(/Let me know what you would like to do next\.?/gi, '').trim();
  // Collapse extra blank lines created by removal
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  // If no obvious call-to-action remains, append one
  const hasCTA = /(schedule|call|tour|see|review|chat|update|next step)/i.test(cleaned);
  if (!hasCTA) {
    cleaned += `\n\nWould you like to schedule a quick call this week to review options or set up showings?`;
  }
  return cleaned.trim();
}

// Build a key-value mapping for a row by header names
function mapRow(header, row) {
  const obj = {};
  header.forEach((h, i) => {
    const key = (h || '').toString().trim();
    if (key) obj[key] = row[i] || '';
  });
  return obj;
}

// Find full sheet row for a client
function findClientSheetRow(rows, clientName) {
  if (!Array.isArray(rows) || rows.length < 2) return null;
  const header = rows[0].map(h => (h || '').toString().trim());
  const firstNameIdx = header.findIndex(h => /^name_first$/i.test(h));
  const lastNameIdx = header.findIndex(h => /^name_last$/i.test(h));
  const fullNameIdx = header.findIndex(h => /^name$/i.test(h));
  const targetLower = clientName.toLowerCase();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const first = (row[firstNameIdx] || '').toString().trim();
    const last = (row[lastNameIdx] || '').toString().trim();
    const combined = (first && last) ? `${first} ${last}` : (row[fullNameIdx] || '').toString().trim();
    if (combined && combined.toLowerCase() === targetLower) {
      return { header, rowObject: mapRow(header, row) };
    }
  }
  // fallback contains
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const first = (row[firstNameIdx] || '').toString().trim();
    const last = (row[lastNameIdx] || '').toString().trim();
    const combined = (first && last) ? `${first} ${last}` : (row[fullNameIdx] || '').toString().trim();
    if (combined && combined.toLowerCase().includes(targetLower)) {
      return { header, rowObject: mapRow(header, row) };
    }
  }
  return null;
}

// Client-specific QA endpoint using Google Sheet row context
app.post('/api/client/qa', authenticateToken, async (req, res) => {
  try {
    const { clientName, question, history = [] } = req.body;
    if (!clientName || !question) return res.status(400).json({ success: false, error: 'clientName and question required' });
    if (!openai) return res.json({ success: true, reply: 'AI unavailable (missing OPENAI_API_KEY).' });
    const rows = await fetchSheetValues();
    const match = findClientSheetRow(rows, clientName);
    if (!match) return res.status(404).json({ success: false, error: 'Client not found in sheet' });
    const { rowObject } = match;
    const redacted = { ...rowObject };
    // Optionally redact PII fields if needed later
    const contextLines = Object.entries(redacted)
      .filter(([k,v]) => v && typeof v === 'string')
      .map(([k,v]) => `${k}: ${v}`)
      .join('\n');
    const systemPrompt = `You are a real estate assistant. Answer questions ONLY about this single client using the provided structured data and notes. If the answer is not present, say you don't have that information. Be concise.`;
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `CLIENT DATA:\n${contextLines}\n\nQUESTION: ${question}` }
    ];
    // Include short history (last 3 Q/A pairs) for continuity
    history.slice(-6).forEach(m => {
      if (m.role === 'user' || m.role === 'assistant') messages.push({ role: m.role, content: m.content });
    });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.89,
      max_tokens: 400
    });
    const reply = completion.choices?.[0]?.message?.content?.trim() || 'No response';
    res.json({ success: true, reply });
  } catch (error) {
    console.error('client/qa error:', error);
    res.status(500).json({ success: false, error: 'Client QA failed', details: error.message });
  }
});

// Hybrid client chat endpoint: answer ANY questions about or for the client using sheet data as grounding, falling back to general real estate knowledge while tailoring to the client.
app.post('/api/client/chat', authenticateToken, async (req, res) => {
  try {
    const { clientName, question, history = [] } = req.body;
    if (!clientName || !question) return res.status(400).json({ success: false, error: 'clientName and question required' });
    if (!openai) return res.json({ success: true, reply: 'AI unavailable (missing OPENAI_API_KEY).' });
    const rows = await fetchSheetValues();
    const match = findClientSheetRow(rows, clientName);
    const contextObj = match ? match.rowObject : {};
    const contextLines = Object.entries(contextObj)
      .filter(([k,v]) => v && typeof v === 'string')
      .map(([k,v]) => `${k}: ${v}`)
      .join('\n');
    // -------- Intent Detection (simple heuristic) --------
    const lowerQ = question.toLowerCase();
    const intents = [];
    if (/(draft|write|prepare).*offer/.test(lowerQ) || /offer draft/.test(lowerQ)) intents.push('DRAFT_OFFER');
    if (/next steps?|what should i do|plan|strategy/.test(lowerQ)) intents.push('NEXT_STEPS');
    if (/follow[- ]?up/.test(lowerQ) && !/(generate|latest)/.test(lowerQ)) intents.push('FOLLOW_UP_EMAIL');
    if (/checklist|list of tasks|to-?do/.test(lowerQ)) intents.push('CHECKLIST');
    if (/refine|improve|more professional|friendlier|shorter|longer|more detailed/.test(lowerQ)) intents.push('REFINEMENT');

    // Extract possible offer fields from question (very lightweight parsing)
    const priceMatch = question.match(/\$?([0-9]{3,}(?:[,0-9]{3})*(?:\.[0-9]{1,2})?)/);
    const earnestMatch = question.match(/earnest[^0-9$]*\$?([0-9]{2,}(?:[,0-9]{3})*)/i);
    const closingDateMatch = question.match(/closing (?:on |date |by )?(\w+ \d{1,2}, \d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2})/i);
    const contingencies = [];
    if (/finance|financing/i.test(question)) contingencies.push('Financing');
    if (/inspection/i.test(question)) contingencies.push('Inspection');
    if (/appraisal/i.test(question)) contingencies.push('Appraisal');
    if (/sale of (?:current|existing) home/i.test(question)) contingencies.push('Sale of current home');

    const offerData = {
      price: priceMatch ? priceMatch[1] : null,
      earnestMoney: earnestMatch ? earnestMatch[1] : null,
      closingDate: closingDateMatch ? closingDateMatch[1] : null,
      contingencies
    };
    const missingOfferFields = [];
    if (intents.includes('DRAFT_OFFER')) {
      ['price','earnestMoney','closingDate'].forEach(f => { if (!offerData[f]) missingOfferFields.push(f); });
    }

  const systemPrompt = `ROLE: You are an advanced, strategic real estate copilot helping an agent with one specific client. Provide COMPLETE, USEFUL, PROACTIVE answers – not just terse facts. Always add thoughtful, actionable insight while staying within factual boundaries.\n\nCORE CAPABILITIES:\n1. Direct factual answers from CLIENT_DATA\n2. Strategic guidance & next steps planning\n3. Offer drafting (skeletal or detailed) with placeholders when data missing\n4. Checklists & process frameworks\n5. Follow-up email drafting & refinement\n6. Risk / issue spotting and mitigation suggestions\n7. Summarization + insight extraction from prior turns (if provided)\n\nDATA RELIABILITY RULES:\n- Cite only exact known client facts from CLIENT_DATA.\n- If a detail is missing (budget, city, timeline, etc.) explicitly note it and use a placeholder like ALL_CAPS_PLACEHOLDER.\n- Market commentary must remain qualitative unless user provides numbers. Do NOT fabricate statistics.\n\nOUTPUT FRAME (adapt as relevant – omit empty sections):\n**Direct Answer** – Clear, specific response to the immediate user request.\n**Context / Reasoning** – (1–3 short sentences) Why this matters or how it ties to client situation.\n**Recommended Next Steps** – Numbered (max 5) if action is implied.\n**Offer Draft** – If drafting an offer (include Summary, Key Terms, Contingencies, Open Inputs). Use ALL_CAPS placeholders where data missing.\n**Checklist** – Grouped (Preparation / Documentation / Communication) when a list is requested.\n**Email Draft** – For follow-up email requests: 2 short paragraphs + a single, specific CTA. NEVER use the phrase "Let me know what you would like to do next."\n**Missing Info Needed** – List only if gaps block precision.\n\nINTENT RULES:\n- DRAFT_OFFER: Provide list of missing required fields FIRST if any, then skeleton with placeholders.\n- NEXT_STEPS: Provide prioritized numbered list (max 5).\n- CHECKLIST: Actionable bullets grouped.\n- FOLLOW_UP_EMAIL: Friendly, professional, personalized; city market note only if city known.\n- REFINEMENT: State change applied then revised content.\n\nSTYLE & TONE:\n- Professional, warm, efficient. Provide value-added strategic reasoning.\n- Prefer specificity over vagueness.\n- Never instruct to "log an event".\n- Use placeholders over guessing (ALL_CAPS).\n- If producing a draft that could be construed as legal, add: "(Non-binding draft – agent/legal review required)."\n\nFAIL-SAFE:\nIf the request is ambiguous, briefly state assumptions and proceed rather than asking an immediate clarifying question—unless executing without clarity risks a major misunderstanding (e.g., contract legal terms).\n`;
    let dynamicInstruction = '';
    if (intents.length) {
      dynamicInstruction += `INTENTS DETECTED: ${intents.join(', ')}\n`;
    }
    if (intents.includes('DRAFT_OFFER')) {
      dynamicInstruction += `OFFER_DATA_PARSED: ${JSON.stringify(offerData)}\n`;
      if (missingOfferFields.length) {
        dynamicInstruction += `MISSING_OFFER_FIELDS: ${missingOfferFields.join(', ')}\n`;
      }
    }

    const taskUserBlock = `${dynamicInstruction}USER_REQUEST:\n${question}`;
    const messages = [ { role: 'system', content: systemPrompt } ];
    if (contextLines) messages.push({ role: 'system', content: `CLIENT_DATA\n${contextLines}` });
    history.slice(-8).forEach(m => {
      if (m.role === 'user' || m.role === 'assistant') messages.push({ role: m.role, content: m.content });
    });
    messages.push({ role: 'user', content: taskUserBlock });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.6,
      max_tokens: 650
    });
    let reply = completion.choices?.[0]?.message?.content?.trim() || 'No response';
    reply = reply.replace(/Let me know what you would like to do next\.?/gi, '').trim();
    res.json({ success: true, reply, usedContext: Boolean(contextLines), intents, missingOfferFields });
  } catch (error) {
    console.error('client/chat error:', error);
    res.status(500).json({ success: false, error: 'Client chat failed', details: error.message });
  }
});

// --- New Endpoint: General AI Chat (ChatGPT-like) ---
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'messages array required' });
    }
    if (!openai) return res.json({ success: true, reply: 'AI unavailable (missing OPENAI_API_KEY).' });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
  messages: [ { role: 'system', content: 'You are an expert real estate copilot. Understand ambiguous or shorthand user input, ask for clarification only when essential, and provide concise, accurate, context-aware answers. If user asks about follow-up, you may suggest using the follow-up button but DO NOT fabricate sheet data.' }, ...messages ],
      temperature: 0.7,
      max_tokens: 600
    });
    const reply = completion.choices?.[0]?.message?.content || 'No response';
    res.json({ success: true, reply });
  } catch (error) {
    console.error('ai/chat error:', error);
    res.status(500).json({ success: false, error: 'Chat failed', details: error.message });
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .txt, .pdf, .doc, .docx, .csv files are allowed.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Initialize Supabase client (prefer service role key server-side)
const supabaseUrl = process.env.SUPABASE_URL || 'https://invadbpskztiooidhyui.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
if (!supabaseKey) {
  console.warn('⚠️  No Supabase key found (SUPABASE_SERVICE_ROLE_KEY / SUPABASE_KEY / SUPABASE_ANON_KEY). Database features will fail.');
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI client
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} else {
  console.log('⚠️  OpenAI API key not configured. AI features will be disabled.');
}

// Helper function to get latest client note
async function getLatestClientNote(clientId) {
  try {
    const { data, error } = await supabase
      .from('client_notes')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    return data[0] || null;
  } catch (error) {
    console.error('Error fetching client note:', error);
    throw error;
  }
}

// Helper function to get agent messages
async function getAgentMessages(agentId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('agent_messages')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching agent messages:', error);
    throw error;
  }
}

// Helper function to log generated message
async function logGeneratedMessage(agentId, clientId, message) {
  try {
    const { data, error } = await supabase
      .from('generated_messages')
      .insert([
        {
          agent_id: agentId,
          client_id: clientId,
          message: message,
          timestamp: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error logging generated message:', error);
    throw error;
  }
}

// Generate follow-up message using OpenAI
async function generateFollowUpMessage(clientNote, agentMessages) {
  try {
    // Check if OpenAI is available
    if (!openai) {
      return `Hi there! I wanted to follow up on your recent inquiry. I've reviewed your information and would love to discuss how I can help you with your real estate needs. Please let me know when would be a good time to connect, or if you have any specific questions about the current market. I'm here to help make your real estate journey as smooth as possible!`;
    }

    // Extract key details from client note for more specific prompting
    const clientDetails = extractClientDetails(clientNote);
    
    const systemPrompt = `You are an expert real estate agent assistant. Your job is to generate highly personalized, specific follow-up messages that demonstrate deep understanding of the client's situation.

CRITICAL REQUIREMENTS:
1. You MUST use the exact client details provided below
2. You MUST reference specific information from their notes
3. You MUST use their actual names when provided
4. You MUST mention their specific budget, timeline, and requirements
5. You MUST address their exact motivations and preferences
6. Do NOT use generic language or placeholder text
7. Do NOT use "Miller Family" if their actual names are provided
8. Make the message feel like it was written specifically for this exact client

The message should be highly personalized and show you've read their detailed notes.`;

    const userPrompt = `Generate a personalized follow-up message using ONLY the information provided below:

EXTRACTED CLIENT DETAILS:
${clientDetails}

AGENT'S PREVIOUS MESSAGES (for tone/style reference):
${agentMessages.map(msg => `- ${msg.message}`).join('\n')}

FULL CLIENT NOTE:
${clientNote.content}

INSTRUCTIONS:
- Use the EXACT names, budget, timeline, and requirements from the extracted details above
- Reference specific details from their full note
- Address their exact situation (renting, first-time buyers, family size, etc.)
- Mention their specific preferences and motivations
- Include actionable next steps based on their timeline
- Make it highly specific to this client's unique situation

DO NOT use generic examples or placeholder text. Use ONLY the actual information provided.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini-2025-04-14",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 600,
      temperature: 0.8
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating follow-up message:', error);
    // Return a fallback message if OpenAI fails
    return `Hi there! I wanted to follow up on your recent inquiry. I've reviewed your information and would love to discuss how I can help you with your real estate needs. Please let me know when would be a good time to connect, or if you have any specific questions about the current market. I'm here to help make your real estate journey as smooth as possible!`;
  }
}

// Helper function to extract key client details from notes
function extractClientDetails(clientNote) {
  if (!clientNote || !clientNote.content) return "No client details available";
  
  const noteContent = clientNote.content;
  const details = [];
  
  // Extract names - more comprehensive pattern matching
  const namePatterns = [
    /(?:The\s+)?([A-Z][a-z]+(?:\s+and\s+[A-Z][a-z]+)?)\s+(?:family|are|is)/i,
    /([A-Z][a-z]+(?:\s+and\s+[A-Z][a-z]+)?)\s+(?:are\s+a\s+married\s+couple)/i,
    /([A-Z][a-z]+(?:\s+and\s+[A-Z][a-z]+)?)\s+(?:in\s+their\s+early\s+\d+s)/i
  ];
  
  for (const pattern of namePatterns) {
    const nameMatch = noteContent.match(pattern);
    if (nameMatch) {
      details.push(`Names: ${nameMatch[1]}`);
      break;
    }
  }
  
  // Extract family situation
  const familyMatch = noteContent.match(/(\d+)\s+(?:young\s+)?children?/i);
  if (familyMatch) {
    details.push(`Children: ${familyMatch[1]} kids`);
  }
  
  // Extract ages of children
  const childAgesMatch = noteContent.match(/ages?\s+(\d+)\s+and\s+(\d+)/i);
  if (childAgesMatch) {
    details.push(`Child ages: ${childAgesMatch[1]} and ${childAgesMatch[2]} years old`);
  }
  
  // Extract budget - multiple patterns
  const budgetPatterns = [
    /\$([0-9,]+)\s*-\s*\$([0-9,]+)/,
    /budget[:\s]*\$([0-9,]+)\s*-\s*\$([0-9,]+)/i,
    /(\$[0-9,]+)\s*-\s*(\$[0-9,]+)/
  ];
  
  for (const pattern of budgetPatterns) {
    const budgetMatch = noteContent.match(pattern);
    if (budgetMatch) {
      details.push(`Budget: $${budgetMatch[1]} - $${budgetMatch[2]}`);
      break;
    }
  }
  
  // Extract timeline
  const timelineMatch = noteContent.match(/(\d+)\s*-\s*(\d+)\s*months?/i);
  if (timelineMatch) {
    details.push(`Timeline: ${timelineMatch[1]}-${timelineMatch[2]} months to move`);
  }
  
  // Extract property requirements
  const bedroomMatch = noteContent.match(/(\d+)\s*bedrooms?/i);
  if (bedroomMatch) {
    details.push(`Required bedrooms: ${bedroomMatch[1]}+`);
  }
  
  // Extract current situation
  if (noteContent.includes('renting')) {
    const rentMatch = noteContent.match(/\$([0-9,]+)\/month/);
    if (rentMatch) {
      details.push(`Current situation: Renting $${rentMatch[1]}/month`);
    } else {
      details.push(`Current situation: Renting`);
    }
  }
  
  if (noteContent.includes('first-time')) {
    details.push(`Experience: First-time buyers`);
  }
  
  // Extract specific property requirements
  const requirements = [];
  if (noteContent.includes('backyard')) requirements.push('backyard');
  if (noteContent.includes('school')) requirements.push('good schools');
  if (noteContent.includes('neighborhood')) requirements.push('family-friendly neighborhood');
  if (noteContent.includes('garage')) requirements.push('garage');
  if (noteContent.includes('kitchen')) requirements.push('modern kitchen');
  if (noteContent.includes('office')) requirements.push('home office space');
  if (noteContent.includes('move-in ready')) requirements.push('move-in ready');
  
  if (requirements.length > 0) {
    details.push(`Property requirements: ${requirements.join(', ')}`);
  }
  
  // Extract availability preferences
  const availability = [];
  if (noteContent.includes('weekday evenings')) availability.push('weekday evenings after 5 PM');
  if (noteContent.includes('weekends')) availability.push('weekends');
  
  if (availability.length > 0) {
    details.push(`Availability: ${availability.join(', ')}`);
  }
  
  // Extract motivations
  const motivations = [];
  if (noteContent.includes('more space')) motivations.push('more space for family');
  if (noteContent.includes('equity')) motivations.push('build equity');
  if (noteContent.includes('growing family')) motivations.push('growing family needs');
  if (noteContent.includes('gut feeling')) motivations.push('emotional connection to home');
  if (noteContent.includes('investment')) motivations.push('good return on investment');
  
  if (motivations.length > 0) {
    details.push(`Motivations: ${motivations.join(', ')}`);
  }
  
  // Extract communication preferences
  if (noteContent.includes('email') && noteContent.includes('phone')) {
    details.push(`Communication: Email for updates, phone for urgent matters`);
  }
  
  // Extract specific concerns
  const concerns = [];
  if (noteContent.includes('nervous')) concerns.push('nervous about first-time buying');
  if (noteContent.includes('trustworthy')) concerns.push('looking for trustworthy agent');
  if (noteContent.includes('knowledgeable')) concerns.push('need knowledgeable guidance');
  
  if (concerns.length > 0) {
    details.push(`Concerns: ${concerns.join(', ')}`);
  }
  
  return details.join('\n');
}

// ===== AUTHENTICATION ROUTES =====

// User registration
app.post('/api/auth/register', validateRegistration, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash: hashedPassword,
          first_name: firstName,
          last_name: lastName,
          created_at: new Date().toISOString()
        }
      ])
      .select('id, email, first_name, last_name, created_at')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    // Create default theme settings
    await supabase
      .from('user_settings')
      .insert([
        {
          user_id: user.id,
          theme_colors: {
            background: '#0B1F33',
            cardBackground: 'rgba(255, 255, 255, 0.1)',
            cardBorder: 'rgba(255, 255, 255, 0.2)',
            primaryButton: '#1E85F2',
            secondaryButton: '#10B981',
            textPrimary: '#F8EEDB',
            textSecondary: '#9CA3AF'
          },
          text_sizes: {
            emailBody: '14px',
            subject: '16px',
            labels: '12px'
          },
          preferences: {
            autoSave: true,
            emailNotifications: true
          }
        }
      ]);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// User login
app.post('/api/auth/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user with password hash
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, first_name, last_name')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, created_at')
      .eq('id', req.user.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          createdAt: user.created_at
        }
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Update user profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .update({
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.userId)
      .select('id, email, first_name, last_name')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        }
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Change password
app.post('/api/auth/change-password', authenticateToken, validatePasswordChange, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get current user with password hash
    const { data: user, error } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashedNewPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.userId);

    if (updateError) {
      console.error('Supabase error:', updateError);
      throw updateError;
    }

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get user settings
app.get('/api/auth/settings', authenticateToken, async (req, res) => {
  try {
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', req.user.userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Supabase error:', error);
      throw error;
    }

    // Return default settings if none exist
    const defaultSettings = {
      theme_colors: {
        background: '#0B1F33',
        cardBackground: 'rgba(255, 255, 255, 0.1)',
        cardBorder: 'rgba(255, 255, 255, 0.2)',
        primaryButton: '#1E85F2',
        secondaryButton: '#10B981',
        textPrimary: '#F8EEDB',
        textSecondary: '#9CA3AF'
      },
      text_sizes: {
        emailBody: '14px',
        subject: '16px',
        labels: '12px'
      },
      preferences: {
        autoSave: true,
        emailNotifications: true
      }
    };

    res.json({
      success: true,
      data: settings || defaultSettings
    });

  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Update user settings
app.put('/api/auth/settings', authenticateToken, async (req, res) => {
  try {
    const { theme_colors, text_sizes, preferences } = req.body;

    // First, check if settings exist for this user
    const { data: existingSettings, error: checkError } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Supabase error checking existing settings:', checkError);
      throw checkError;
    }

    let result;
    if (existingSettings) {
      // Update existing settings
      const { data: settings, error } = await supabase
        .from('user_settings')
        .update({
          theme_colors,
          text_sizes,
          preferences,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', req.user.userId)
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating settings:', error);
        throw error;
      }
      result = settings;
    } else {
      // Insert new settings
      const { data: settings, error } = await supabase
        .from('user_settings')
        .insert([
          {
            user_id: req.user.userId,
            theme_colors,
            text_sizes,
            preferences,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Supabase error inserting settings:', error);
        throw error;
      }
      result = settings;
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get user activity (notes, messages, etc.)
app.get('/api/auth/activity', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get user's client notes
    const { data: notes, error: notesError } = await supabase
      .from('client_notes')
      .select('*')
      .eq('agent_id', req.user.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (notesError) {
      console.error('Notes error:', notesError);
      throw notesError;
    }

    // Get user's generated messages
    const { data: messages, error: messagesError } = await supabase
      .from('generated_messages')
      .select('*')
      .eq('agent_id', req.user.userId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (messagesError) {
      console.error('Messages error:', messagesError);
      throw messagesError;
    }

    // Combine and sort activities
    const activities = [
      ...notes.map(note => ({
        ...note,
        type: 'note',
        date: note.created_at
      })),
      ...messages.map(message => ({
        ...message,
        type: 'message',
        date: message.timestamp
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: activities.length
        }
      }
    });

  } catch (error) {
    console.error('Activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Main automation endpoint
app.post('/api/generate-followup', authenticateToken, async (req, res) => {
  try {
    const { client_name, client_email, follow_up_notes, client_stage, agent_name } = req.body;

    if (!client_name || !follow_up_notes) {
      return res.status(400).json({
        status: 'error',
        message: 'client_name and follow_up_notes are required'
      });
    }

    // Check if OpenAI is available
    if (!openai) {
      return res.status(500).json({
        status: 'error',
        message: 'OpenAI API is not configured'
      });
    }

    console.log('🔍 Generating follow-up email for:', client_name);

    // Generate follow-up email using OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a professional real estate agent assistant. Generate a personalized follow-up email based on the client's notes. The email should be:
- Professional but warm and friendly
- Specific to the client's situation and needs
- Include a clear call to action
- Reference specific details from their notes
- Be concise but comprehensive (2-3 paragraphs)

Return the response in this exact JSON format:
{
  "subject": "email subject line",
  "body": "email body content"
}`
        },
        {
          role: 'user',
          content: `Generate a follow-up email for:
Client: ${client_name}
Email: ${client_email}
Stage: ${client_stage || 'Not specified'}
Agent: ${agent_name || 'Real Estate Agent'}

Follow-up Notes (Column Y):
${follow_up_notes}

Please create a personalized email that references the specific information in their notes.`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const response = completion.choices[0].message.content;
    console.log('🤖 OpenAI response received');

    // Parse the JSON response
    let emailData;
    try {
      emailData = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      // Fallback: extract subject and body manually
      const lines = response.split('\n').filter(line => line.trim());
      emailData = {
        subject: `Follow-up regarding your real estate needs`,
        body: response
      };
    }

    res.json({
      status: 'success',
      subject: emailData.subject,
      body: emailData.body,
      client_name: client_name,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in generate-followup:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate follow-up email',
      details: error.message
    });
  }
});

// Add client note endpoint
app.post('/api/client-notes', authenticateToken, async (req, res) => {
  try {
    const { clientId, note } = req.body;

    if (!clientId || !note) {
      return res.status(400).json({
        success: false,
        error: 'clientId and note are required'
      });
    }

    // Use authenticated user's ID as agentId
    const userId = req.user.userId;

    const { data, error } = await supabase
      .from('client_notes')
      .insert([
        {
          agent_id: userId,
          client_id: clientId,
          content: note,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    res.json({
      success: true,
      data: data[0]
    });

  } catch (error) {
    console.error('Error adding client note:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Accept structured extract from extension and upload to Supabase Storage
app.post('/api/extension/extract', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const payload = req.body;
    if (!payload || !payload.fields || !Array.isArray(payload.fields)) {
      return res.status(400).json({ success: false, error: 'Invalid payload' });
    }
    const path = `extracts/${userId}/${Date.now()}.json`;
    const file = new Blob([JSON.stringify({ ...payload, userId, source: 'chrome-extension' }, null, 2)], { type: 'application/json' });
    const { error } = await supabase.storage.from('agenthub-extracts').upload(path, file, {
      contentType: 'application/json', upsert: false
    });
    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.json({ success: true, path });
  } catch (e) {
    console.error('Extension extract error:', e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Add agent message endpoint
app.post('/api/agent-messages', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required'
      });
    }

    // Use authenticated user's ID as agentId
    const userId = req.user.userId;

    const { data, error } = await supabase
      .from('agent_messages')
      .insert([
        {
          agent_id: userId,
          message: message,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    res.json({
      success: true,
      data: data[0]
    });

  } catch (error) {
    console.error('Error adding agent message:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Upload client note file endpoint
app.post('/api/upload-client-note', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { clientId } = req.body;
    const file = req.file;

    if (!clientId || !file) {
      return res.status(400).json({
        success: false,
        error: 'clientId and file are required'
      });
    }

    // Use authenticated user's ID as agentId
    const userId = req.user.userId;

    // Extract text content from file
    let content = '';
    const filePath = file.path;
    const fileExtension = path.extname(file.originalname).toLowerCase();

    try {
      if (fileExtension === '.txt' || fileExtension === '.csv') {
        // Read text files directly
        content = fs.readFileSync(filePath, 'utf8');
      } else if (fileExtension === '.pdf') {
        // For PDF files, we'll use a simple approach (you might want to add pdf-parse library)
        content = `[PDF File: ${file.originalname}] - Content extraction not implemented yet. Please add pdf-parse library for full PDF support.`;
      } else if (fileExtension === '.doc' || fileExtension === '.docx') {
        // For Word documents, use mammoth for .docx files
        try {
          if (fileExtension === '.docx') {
            // First, check if the file is actually a valid .docx by reading the first few bytes
            const fileBuffer = fs.readFileSync(filePath);
            
            console.log(`Processing .docx file: ${file.originalname}, size: ${fileBuffer.length} bytes`);
            console.log(`First few bytes: ${fileBuffer.slice(0, 10).toString('hex')}`);
            
            // .docx files are ZIP files, so they should start with PK (ZIP header)
            if (fileBuffer.length < 4 || fileBuffer[0] !== 0x50 || fileBuffer[1] !== 0x4B) {
              console.log('File does not appear to be a valid .docx (missing ZIP header)');
              content = `[Word Document: ${file.originalname}] - This file doesn't appear to be a valid .docx document. Please ensure the file is saved in .docx format and not corrupted.`;
            } else {
              console.log('File appears to be a valid .docx, attempting mammoth extraction...');
              // Try to extract text using mammoth
              const result = await mammoth.extractRawText({ path: filePath });
              content = result.value;
              
              console.log(`Mammoth extraction result: ${content ? content.length : 0} characters`);
              
              // Check if we got meaningful content
              if (!content || content.trim().length === 0) {
                content = `[Word Document: ${file.originalname}] - No text content could be extracted. This may be due to:
1. Empty document
2. Password protection
3. Complex formatting that mammoth cannot process

Please copy and paste the contract content directly into the text area.`;
              } else if (content.length < 50) {
                // Very short content might indicate extraction issues
                content = `[Word Document: ${file.originalname}] - Very little text was extracted (${content.length} characters). This may indicate extraction issues. Please copy and paste the contract content directly into the text area.`;
              }
            }
          } else {
            // For .doc files (older format), provide message to copy/paste
            content = `[Word Document: ${file.originalname}] - .doc files are not supported. Please save as .docx format or copy and paste the contract content directly into the text area.`;
          }
        } catch (textError) {
          console.error('Error extracting text from Word document:', textError);
          
          // Try a fallback approach - read as text and see if we get anything useful
          try {
            const fallbackContent = fs.readFileSync(filePath, 'utf8');
            if (fallbackContent && fallbackContent.length > 100 && !fallbackContent.includes('PK')) {
              content = fallbackContent;
            } else {
              content = `[Word Document: ${file.originalname}] - Error extracting text: ${textError.message}. Please copy and paste the contract content directly into the text area.`;
            }
          } catch (fallbackError) {
            content = `[Word Document: ${file.originalname}] - Error extracting text: ${textError.message}. Please copy and paste the contract content directly into the text area.`;
          }
        }
      } else {
        content = `[File: ${file.originalname}] - Unsupported file type.`;
      }
    } catch (readError) {
      console.error('Error reading file:', readError);
      content = `[File: ${file.originalname}] - Error reading file content. Please copy and paste the content directly.`;
    }

    // Save to Supabase
    const { data, error } = await supabase
      .from('client_notes')
      .insert([
        {
          agent_id: userId,
          client_id: clientId,
          content: content,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (unlinkError) {
      console.error('Error deleting uploaded file:', unlinkError);
    }

    res.json({
      success: true,
      content: content,
      data: {
        ...data[0],
        originalFileName: file.originalname,
        fileSize: file.size
      }
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get all data for frontend
app.get('/api/data', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.query;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        error: 'clientId is required'
      });
    }

    // Use authenticated user's ID as agentId
    const userId = req.user.userId;

    // Get client notes
    const { data: clientNotes, error: notesError } = await supabase
      .from('client_notes')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (notesError) throw notesError;

    // Get agent messages
    const { data: agentMessages, error: messagesError } = await supabase
      .from('agent_messages')
      .select('*')
      .eq('agent_id', userId)
      .order('created_at', { ascending: false });

    if (messagesError) throw messagesError;

    // Get generated messages
    const { data: generatedMessages, error: generatedError } = await supabase
      .from('generated_messages')
      .select('*')
      .eq('client_id', clientId)
      .eq('agent_id', userId)
      .order('timestamp', { ascending: false });

    if (generatedError) throw generatedError;

    res.json({
      success: true,
      data: {
        clientNotes,
        agentMessages,
        generatedMessages
      }
    });

  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Setup database tables endpoint
app.post('/api/setup/chat-tables', async (req, res) => {
  try {
    console.log('Checking chat tables...');
    
    let results = {
      success: true,
      message: 'Chat tables status checked',
      tables: {}
    };

    // Check if chat_messages table exists by trying to query it
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id')
        .limit(1);
      
      if (error) {
        if (error.code === 'PGRST116') {
          results.tables.chat_messages = 'Table does not exist - needs manual creation';
          results.success = false;
        } else {
          results.tables.chat_messages = `Error: ${error.message}`;
        }
      } else {
        results.tables.chat_messages = 'Table exists and accessible';
      }
    } catch (err) {
      results.tables.chat_messages = `Error checking table: ${err.message}`;
    }

    // Check if chat_actions table exists
    try {
      const { data, error } = await supabase
        .from('chat_actions')
        .select('id')
        .limit(1);
      
      if (error) {
        if (error.code === 'PGRST116') {
          results.tables.chat_actions = 'Table does not exist - needs manual creation';
          results.success = false;
        } else {
          results.tables.chat_actions = `Error: ${error.message}`;
        }
      } else {
        results.tables.chat_actions = 'Table exists and accessible';
      }
    } catch (err) {
      results.tables.chat_actions = `Error checking table: ${err.message}`;
    }

    // Provide SQL for manual creation if needed
    if (!results.success) {
      results.sql_to_run_manually = {
        chat_messages: `
          CREATE TABLE public.chat_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            agent_id UUID NOT NULL,
            client_id UUID NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
            content TEXT NOT NULL,
            mode TEXT DEFAULT 'GUIDED',
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
          CREATE INDEX chat_messages_agent_client_idx ON public.chat_messages(agent_id, client_id, created_at DESC);
        `,
        chat_actions: `
          CREATE TABLE public.chat_actions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
            agent_id UUID NOT NULL,
            client_id UUID NOT NULL,
            action_type TEXT NOT NULL,
            parameters JSONB DEFAULT '{}'::jsonb,
            executed BOOLEAN DEFAULT FALSE,
            executed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
          CREATE INDEX chat_actions_agent_client_idx ON public.chat_actions(agent_id, client_id, created_at DESC);
        `
      };
    }

    res.json(results);
  } catch (error) {
    console.error('Database setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check chat tables',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ================= CHAT / COPILOT ENDPOINTS =================
app.post('/api/chat/message', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { clientId, message, mode } = req.body;
    if (!clientId || !message) {
      return res.status(400).json({ success: false, error: 'clientId and message are required' });
    }
    let userMsgId = null;
    try {
      const { data, error } = await supabase.from('chat_messages').insert([
        { agent_id: userId, client_id: clientId, role: 'user', content: message, mode: mode || 'GUIDED', created_at: new Date().toISOString() }
      ]).select('id').single();
      if (error) console.warn('chat_messages insert error:', error.message);
      userMsgId = data?.id || null;
    } catch (e) { console.warn('chat_messages table missing:', e.message); }
    const plan = generateAssistantPlan({ message, mode: mode || 'GUIDED', clientContext: {}, clientId });
    let assistantMsgId = null;
    try {
      const { data, error } = await supabase.from('chat_messages').insert([
        { agent_id: userId, client_id: clientId, role: 'assistant', content: plan.response_text, mode: plan.mode, created_at: new Date().toISOString() }
      ]).select('id').single();
      if (error) console.warn('assistant message insert error:', error.message);
      assistantMsgId = data?.id || null;
      if (assistantMsgId && Array.isArray(plan.chips)) {
        const rows = plan.chips.map(c => ({ message_id: assistantMsgId, agent_id: userId, client_id: clientId, action_type: c.action_type, parameters: c.parameters, executed: false, created_at: new Date().toISOString() }));
        const { error: actErr } = await supabase.from('chat_actions').insert(rows);
        if (actErr) console.warn('chat_actions insert error:', actErr.message);
      }
    } catch (e) { console.warn('assistant persistence skipped:', e.message); }
    res.json({ success: true, data: { plan, userMessageId: userMsgId, assistantMessageId: assistantMsgId } });
  } catch (e) {
    console.error('chat message error:', e);
    res.status(500).json({ success: false, error: 'Internal server error', details: e.message });
  }
});

app.post('/api/chat/action/execute', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { action_type, parameters = {}, clientId } = req.body;
    if (!action_type || !clientId) return res.status(400).json({ success: false, error: 'action_type and clientId are required' });
    
    let executionResult = { status: 'queued', detail: 'Processing action...', message: '' };
    
    // Fetch client details for context
    let clientData = {};
    try {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('agent_id', userId)
        .single();
      
      if (clientError) throw clientError;
    } catch (e) {
      console.warn('Could not fetch client data for action:', e.message);
    }
    
    // Execute different action types
    switch (action_type) {
      case 'COMM_FOLLOW_UP_SEND':
      case 'FOLLOW_UP_SEND':
        try {
          // Get comprehensive client context including notes, interactions, and preferences
          const { data: notes } = await supabase
            .from('client_notes')
            .select('*')
            .eq('client_id', clientId)
            .eq('agent_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

          const { data: recentInteractions } = await supabase
            .from('interactions')
            .select('*')
            .eq('client_id', clientId)
            .eq('agent_id', userId)
            .order('created_at', { ascending: false })
            .limit(3);

          // Build context-rich follow-up content
          let contextSummary = '';
          if (notes && notes.length > 0) {
            const recentNote = notes[0];
            contextSummary += `Recent notes: ${recentNote.content.substring(0, 150)}...`;
          }
          
          const followUpContent = `Follow-up for ${clientData.full_name || clientData.first_name || 'client'}: Thank you for your continued interest. 

Based on our recent conversations and your preferences:
• Budget: ${clientData.preferences?.budget_max || clientData.preferences?.budget || 'TBD'}
• Property Type: ${clientData.preferences?.property_type || 'TBD'}  
• Location: ${clientData.preferences?.location || clientData.state || 'TBD'}
• Bedrooms: ${clientData.preferences?.beds_min || 'TBD'}+

${contextSummary}

I've identified some new opportunities that might interest you. Let's schedule a call to discuss these options and address any questions you may have.`;
          
          // Store as interaction and client note for full context
          const { error: noteError } = await supabase.from('client_notes').insert([{ 
            agent_id: userId, 
            client_id: clientId, 
            content: `Generated Follow-up: ${followUpContent}`, 
            created_at: new Date().toISOString() 
          }]);

          const { error: interactionError } = await supabase.from('interactions').insert([{
            client_id: clientId,
            agent_id: userId,
            channel: 'ai',
            subject: 'AI-Generated Follow-up',
            body_text: followUpContent,
            metadata: { action_type: 'FOLLOW_UP_SEND', context_notes_count: notes?.length || 0 },
            created_at: new Date().toISOString()
          }]);
          
          if (noteError || interactionError) throw (noteError || interactionError);
          
          executionResult = {
            status: 'success',
            detail: `Follow-up generated with ${notes?.length || 0} recent notes context`,
            message: `📧 Context-rich follow-up created for ${clientData.full_name || clientData.first_name || 'client'}. Includes recent notes and full client preferences.`
          };
        } catch (error) {
          executionResult = {
            status: 'failed',
            detail: `Failed to generate follow-up: ${error.message}`,
            message: '❌ Failed to generate follow-up'
          };
        }
        break;
        
      case 'SHOWING_SCHEDULE':
        try {
          // Get comprehensive client context including notes, interactions, and showing history
          const { data: notes } = await supabase
            .from('client_notes')
            .select('*')
            .eq('client_id', clientId)
            .eq('agent_id', userId)
            .order('created_at', { ascending: false })
            .limit(3);

          const { data: previousShowings } = await supabase
            .from('showings')
            .select('*')
            .eq('client_id', clientId)
            .eq('agent_id', userId)
            .order('start_time', { ascending: false })
            .limit(3);

          const { data: propertyInterests } = await supabase
            .from('client_properties')
            .select('*, property_listings(*)')
            .eq('client_id', clientId)
            .eq('agent_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

          // Build detailed showing context
          let clientContext = '';
          if (notes && notes.length > 0) {
            clientContext += `Recent client notes: ${notes[0].content.substring(0, 100)}...\n`;
          }
          
          if (propertyInterests && propertyInterests.length > 0) {
            clientContext += `Properties of interest: ${propertyInterests.map(p => p.property_listings?.address || 'Address TBD').join(', ')}\n`;
          }

          const showingNote = `🏠 SHOWING SCHEDULED for ${clientData.full_name || clientData.first_name || 'client'}

CLIENT PREFERENCES:
• Budget: ${clientData.preferences?.budget_max || clientData.preferences?.budget || 'TBD'}
• Property Type: ${clientData.preferences?.property_type || 'TBD'}
• Bedrooms: ${clientData.preferences?.beds_min || 'TBD'}+
• Location: ${clientData.preferences?.location || clientData.state || 'TBD'}

${clientContext}

Previous showings: ${previousShowings?.length || 0}
Action: Schedule confirmation and prepare showing materials.`;
          
          // Store comprehensive showing record
          const { error: noteError } = await supabase.from('client_notes').insert([{ 
            agent_id: userId, 
            client_id: clientId, 
            content: showingNote, 
            created_at: new Date().toISOString() 
          }]);

          const { error: interactionError } = await supabase.from('interactions').insert([{
            client_id: clientId,
            agent_id: userId,
            channel: 'note',
            subject: 'Showing Scheduled',
            body_text: showingNote,
            metadata: { 
              action_type: 'SHOWING_SCHEDULE', 
              notes_count: notes?.length || 0,
              previous_showings: previousShowings?.length || 0,
              interested_properties: propertyInterests?.length || 0
            },
            created_at: new Date().toISOString()
          }]);
          
          if (noteError || interactionError) throw (noteError || interactionError);
          
          executionResult = {
            status: 'success',
            detail: `Showing scheduled with full client context (${notes?.length || 0} notes, ${propertyInterests?.length || 0} property interests)`,
            message: `🏠 Property showing scheduled for ${clientData.full_name || clientData.first_name || 'client'}. Complete context and history recorded.`
          };
        } catch (error) {
          executionResult = {
            status: 'failed',
            detail: `Failed to schedule showing: ${error.message}`,
            message: '❌ Failed to schedule showing'
          };
        }
        break;
        
      case 'CONTRACT_AMEND':
        try {
          // Get comprehensive contract context including notes, contract history, and client status
          const { data: notes } = await supabase
            .from('client_notes')
            .select('*')
            .eq('client_id', clientId)
            .eq('agent_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

          const { data: contracts } = await supabase
            .from('contracts')
            .select('*')
            .eq('client_id', clientId)
            .eq('agent_id', userId)
            .order('created_at', { ascending: false })
            .limit(3);

          const { data: contractEvents } = await supabase
            .from('contract_events')
            .select('*')
            .eq('agent_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

          // Build comprehensive contract context
          let contractContext = '';
          if (notes && notes.length > 0) {
            const contractRelatedNotes = notes.filter(note => 
              note.content.toLowerCase().includes('contract') || 
              note.content.toLowerCase().includes('offer') ||
              note.content.toLowerCase().includes('amendment')
            );
            if (contractRelatedNotes.length > 0) {
              contractContext += `Recent contract-related notes: ${contractRelatedNotes[0].content.substring(0, 150)}...\n`;
            }
          }

          if (contracts && contracts.length > 0) {
            const currentContract = contracts[0];
            contractContext += `Current contract status: ${currentContract.status} (${currentContract.contract_type})\n`;
            contractContext += `DocuSign ID: ${currentContract.docusign_envelope_id || 'Not set'}\n`;
          }

          const contractNote = `📋 CONTRACT AMENDMENT REQUEST for ${clientData.full_name || clientData.first_name || 'client'}

CLIENT DETAILS:
• Full Name: ${clientData.full_name || clientData.first_name || 'TBD'}
• Email: ${clientData.email || 'TBD'}
• Phone: ${clientData.phone || 'TBD'}
• State: ${clientData.state || 'TBD'}

CONTRACT STATUS & CONTEXT:
${contractContext}

AMENDMENT REQUIRED:
• Review current contract terms
• Identify specific amendments needed
• Prepare documentation for legal review
• Schedule client consultation

Active contracts: ${contracts?.length || 0}
Recent contract events: ${contractEvents?.length || 0}`;
          
          // Store comprehensive amendment record
          const { error: noteError } = await supabase.from('client_notes').insert([{ 
            agent_id: userId, 
            client_id: clientId, 
            content: contractNote, 
            created_at: new Date().toISOString() 
          }]);

          const { error: interactionError } = await supabase.from('interactions').insert([{
            client_id: clientId,
            agent_id: userId,
            channel: 'note',
            subject: 'Contract Amendment Request',
            body_text: contractNote,
            metadata: { 
              action_type: 'CONTRACT_AMEND',
              active_contracts: contracts?.length || 0,
              recent_events: contractEvents?.length || 0,
              client_status: contracts?.[0]?.status || 'unknown'
            },
            created_at: new Date().toISOString()
          }]);
          
          if (noteError || interactionError) throw (noteError || interactionError);
          
          executionResult = {
            status: 'success',
            detail: `Contract amendment logged with full context (${contracts?.length || 0} contracts, ${contractEvents?.length || 0} events)`,
            message: `📋 Contract amendment request created for ${clientData.full_name || clientData.first_name || 'client'}. Complete contract history and context recorded.`
          };
        } catch (error) {
          executionResult = {
            status: 'failed',
            detail: `Failed to log contract amendment: ${error.message}`,
            message: '❌ Failed to create contract amendment request'
          };
        }
        break;
        
      case 'LISTING_SHARE':
        try {
          // Get comprehensive property and client context for intelligent listing sharing
          const { data: notes } = await supabase
            .from('client_notes')
            .select('*')
            .eq('client_id', clientId)
            .eq('agent_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

          const { data: propertyInterests } = await supabase
            .from('client_properties')
            .select('*, property_listings(*)')
            .eq('client_id', clientId)
            .eq('agent_id', userId)
            .order('created_at', { ascending: false });

          const { data: availableListings } = await supabase
            .from('property_listings')
            .select('*')
            .eq('agent_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(10);

          // Build intelligent listing context
          let propertyContext = '';
          if (notes && notes.length > 0) {
            const propertyNotes = notes.filter(note => 
              note.content.toLowerCase().includes('property') || 
              note.content.toLowerCase().includes('house') ||
              note.content.toLowerCase().includes('listing') ||
              note.content.toLowerCase().includes('showing')
            );
            if (propertyNotes.length > 0) {
              propertyContext += `Recent property discussions: ${propertyNotes[0].content.substring(0, 150)}...\n`;
            }
          }

          const listingNote = `🔍 INTELLIGENT LISTING SHARE for ${clientData.full_name || clientData.first_name || 'client'}

CLIENT SEARCH CRITERIA:
• Budget: ${clientData.preferences?.budget_max || clientData.preferences?.budget || 'TBD'}
• Property Type: ${clientData.preferences?.property_type || 'TBD'}
• Bedrooms: ${clientData.preferences?.beds_min || clientData.preferences?.bedrooms || 'TBD'}+
• Bathrooms: ${clientData.preferences?.baths_min || clientData.preferences?.bathrooms || 'TBD'}+
• Location: ${clientData.preferences?.location || clientData.state || 'TBD'}

CLIENT CONTEXT:
${propertyContext}

PROPERTY TRACKING:
• Previously viewed properties: ${propertyInterests?.length || 0}
• Available matching listings: ${availableListings?.length || 0}
• Property interests tracked: ${propertyInterests?.map(p => p.interest_level).join(', ') || 'None'}

RECOMMENDED ACTIONS:
• Filter listings by client criteria
• Review property interest history
• Prepare personalized property recommendations
• Schedule follow-up to discuss options`;
          
          // Store comprehensive listing record
          const { error: noteError } = await supabase.from('client_notes').insert([{ 
            agent_id: userId, 
            client_id: clientId, 
            content: listingNote, 
            created_at: new Date().toISOString() 
          }]);

          const { error: interactionError } = await supabase.from('interactions').insert([{
            client_id: clientId,
            agent_id: userId,
            channel: 'note',
            subject: 'Intelligent Listing Share',
            body_text: listingNote,
            metadata: { 
              action_type: 'LISTING_SHARE',
              property_interests: propertyInterests?.length || 0,
              available_listings: availableListings?.length || 0,
              search_criteria: {
                budget: clientData.preferences?.budget_max || clientData.preferences?.budget,
                property_type: clientData.preferences?.property_type,
                beds: clientData.preferences?.beds_min || clientData.preferences?.bedrooms,
                baths: clientData.preferences?.baths_min || clientData.preferences?.bathrooms,
                location: clientData.preferences?.location || clientData.state
              }
            },
            created_at: new Date().toISOString()
          }]);
          
          if (noteError || interactionError) throw (noteError || interactionError);
          
          executionResult = {
            status: 'success',
            detail: `Intelligent listing share created with full context (${propertyInterests?.length || 0} interests, ${availableListings?.length || 0} available)`,
            message: `🔍 Intelligent listing share created for ${clientData.full_name || clientData.first_name || 'client'}. Complete property context and recommendations ready.`
          };
        } catch (error) {
          executionResult = {
            status: 'failed',
            detail: `Failed to create listing task: ${error.message}`,
            message: '❌ Failed to create listing sharing task'
          };
        }
        break;
        
      case 'LEDGER_LOG_EVENT':
        try {
          const { error } = await supabase.from('client_notes').insert([{ 
            agent_id: userId, 
            client_id: clientId, 
            content: `Ledger Event: ${parameters.summary || '[Event logged]'}`, 
            created_at: new Date().toISOString() 
          }]);
          
          if (error) throw error;
          
          executionResult = {
            status: 'success',
            detail: 'Event logged successfully',
            message: `📝 Event logged for ${clientData.first_name || 'client'}.`
          };
        } catch (error) {
          executionResult = {
            status: 'failed',
            detail: `Failed to log event: ${error.message}`,
            message: '❌ Failed to log event'
          };
        }
        break;

      case 'FOLLOW_UP_CHECK_LAST':
        try {
          // Get last correspondence from interactions
          const { data: lastInteraction, error: intError } = await supabase
            .from('interactions')
            .select('*')
            .eq('client_id', clientId)
            .eq('agent_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          let message = `📧 **Last Correspondence with ${clientData.first_name || 'Client'}:**\n\n`;
          
          if (intError || !lastInteraction) {
            message += "No previous correspondence found in the system.";
          } else {
            const date = new Date(lastInteraction.created_at).toLocaleDateString();
            message += `**Date:** ${date}\n**Channel:** ${lastInteraction.channel}\n`;
            if (lastInteraction.subject) message += `**Subject:** ${lastInteraction.subject}\n`;
            if (lastInteraction.body_text) {
              message += `**Content:** ${lastInteraction.body_text.substring(0, 200)}${lastInteraction.body_text.length > 200 ? '...' : ''}`;
            }
          }

          executionResult = {
            status: 'success',
            detail: 'Last correspondence retrieved',
            message: message
          };
        } catch (error) {
          executionResult = {
            status: 'failed',
            detail: `Failed to retrieve correspondence: ${error.message}`,
            message: '❌ Failed to retrieve last correspondence'
          };
        }
        break;

      case 'FOLLOW_UP_CLIENT_DETAILS':
        try {
          let message = `👤 **Client Details for ${clientData.first_name || 'Client'}:**\n\n`;
          
          if (clientData.email) message += `📧 **Email:** ${clientData.email}\n`;
          if (clientData.phone) message += `📱 **Phone:** ${clientData.phone}\n`;
          if (clientData.state) message += `📍 **State:** ${clientData.state}\n`;
          
          if (clientData.preferences) {
            message += `\n**Preferences:**\n`;
            if (typeof clientData.preferences === 'object') {
              Object.entries(clientData.preferences).forEach(([key, value]) => {
                message += `• ${key.replace(/_/g, ' ')}: ${value}\n`;
              });
            } else {
              message += `${clientData.preferences}\n`;
            }
          }
          
          if (clientData.last_interaction_at) {
            const lastDate = new Date(clientData.last_interaction_at).toLocaleDateString();
            message += `\n🕒 **Last Interaction:** ${lastDate}`;
          }

          executionResult = {
            status: 'success',
            detail: 'Client details retrieved',
            message: message
          };
        } catch (error) {
          executionResult = {
            status: 'failed',
            detail: `Failed to retrieve client details: ${error.message}`,
            message: '❌ Failed to retrieve client details'
          };
        }
        break;

      case 'FOLLOW_UP_SEARCH_HISTORY':
        try {
          let message = `🔍 **Client History Summary for ${clientData.first_name || 'Client'}:**\n\n`;
          
          // Get recent notes directly from database
          try {
            const { data: notes } = await supabase
              .from('client_notes')
              .select('*')
              .eq('client_id', clientId)
              .eq('agent_id', userId)
              .order('created_at', { ascending: false })
              .limit(3);
            
            if (notes && notes.length > 0) {
              message += `📝 **Recent Notes (${notes.length}):**\n`;
              notes.forEach(note => {
                const date = new Date(note.created_at).toLocaleDateString();
                message += `• ${date}: ${note.content?.substring(0, 100)}${note.content?.length > 100 ? '...' : ''}\n`;
              });
              message += '\n';
            } else {
              message += `📝 **Recent Notes:** No notes found\n\n`;
            }
          } catch (e) {
            message += `📝 **Recent Notes:** Error retrieving notes\n\n`;
          }

          // Get recent interactions
          try {
            const { data: interactions } = await supabase
              .from('interactions')
              .select('*')
              .eq('client_id', clientId)
              .eq('agent_id', userId)
              .order('created_at', { ascending: false })
              .limit(2);
            
            if (interactions && interactions.length > 0) {
              message += `💬 **Recent Interactions (${interactions.length}):**\n`;
              interactions.forEach(int => {
                const date = new Date(int.created_at).toLocaleDateString();
                message += `• ${date} (${int.channel}): ${int.subject || 'No subject'}\n`;
              });
              message += '\n';
            } else {
              message += `💬 **Recent Interactions:** No interactions found\n\n`;
            }
          } catch (e) {
            message += `💬 **Recent Interactions:** Error retrieving interactions\n\n`;
          }

          // Get contracts
          try {
            const { data: contracts } = await supabase
              .from('contracts')
              .select('*')
              .eq('client_id', clientId)
              .eq('agent_id', userId)
              .order('created_at', { ascending: false })
              .limit(3);
            
            if (contracts && contracts.length > 0) {
              message += `📋 **Contracts (${contracts.length}):** ${contracts.map(c => c.status).join(', ')}\n`;
            } else {
              message += `📋 **Contracts:** No contracts found\n`;
            }
          } catch (e) {
            message += `📋 **Contracts:** Error retrieving contracts\n`;
          }

          // Get showings
          try {
            const { data: showings } = await supabase
              .from('showings')
              .select('*')
              .eq('client_id', clientId)
              .eq('agent_id', userId)
              .order('created_at', { ascending: false })
              .limit(3);
            
            if (showings && showings.length > 0) {
              message += `🏠 **Showings (${showings.length}):** Recent property viewings scheduled\n`;
            } else {
              message += `🏠 **Showings:** No showings found\n`;
            }
          } catch (e) {
            message += `🏠 **Showings:** Error retrieving showings\n`;
          }

          executionResult = {
            status: 'success',
            detail: 'Client history retrieved',
            message: message
          };
        } catch (error) {
          executionResult = {
            status: 'failed',
            detail: `Failed to search history: ${error.message}`,
            message: '❌ Failed to search client history'
          };
        }
        break;

      case 'FOLLOW_UP_GENERATE':
        try {
          // Get comprehensive client context for AI-powered follow-up generation
          const { data: notes } = await supabase
            .from('client_notes')
            .select('*')
            .eq('client_id', clientId)
            .eq('agent_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

          const { data: recentInteractions } = await supabase
            .from('interactions')
            .select('*')
            .eq('client_id', clientId)
            .eq('agent_id', userId)
            .order('created_at', { ascending: false })
            .limit(3);

          const { data: propertyInterests } = await supabase
            .from('client_properties')
            .select('*, property_listings(*)')
            .eq('client_id', clientId)
            .eq('agent_id', userId)
            .order('created_at', { ascending: false })
            .limit(3);

          // Generate AI-powered follow-up content using comprehensive context
          let followUpContent = '';
          
          if (openai) {
            // Build rich context for AI
            let contextString = `Client: ${clientData.full_name || clientData.first_name || 'Client'}\nEmail: ${clientData.email || 'N/A'}\nPhone: ${clientData.phone || 'N/A'}\nState: ${clientData.state || 'Unknown'}\nPreferences: ${JSON.stringify(clientData.preferences || {})}`;

            if (notes && notes.length > 0) {
              contextString += `\n\nRecent Client Notes:\n${notes.map(note => `• ${note.content.substring(0, 200)}`).join('\n')}`;
            }

            if (recentInteractions && recentInteractions.length > 0) {
              contextString += `\n\nRecent Interactions:\n${recentInteractions.map(int => `• ${int.channel}: ${int.subject || ''} - ${int.body_text?.substring(0, 100) || ''}`).join('\n')}`;
            }

            if (propertyInterests && propertyInterests.length > 0) {
              contextString += `\n\nProperty Interests:\n${propertyInterests.map(p => `• ${p.property_listings?.address || 'Property'} (${p.interest_level})`).join('\n')}`;
            }
            
            const completion = await openai.chat.completions.create({
              model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: 'You are a professional real estate agent assistant. Generate a personalized, warm follow-up message for this client based on their comprehensive information including recent notes, interactions, and property interests. Reference specific details from their history to show you remember their preferences and concerns. Keep it professional but friendly, under 550 words.'
                },
                {
                  role: 'user',
                  content: `Generate a personalized follow-up message using this comprehensive client context:\n\n${contextString}`
                }
              ],
              max_tokens: 400,
              temperature: 0.7
            });
            
            followUpContent = completion.choices[0]?.message?.content || 'Thank you for your continued interest in finding your dream home. I wanted to follow up and see how I can best assist you in your home search.';
          } else {
            // Fallback content with basic personalization
            let personalizedContent = `Hi ${clientData.first_name || 'there'},\n\nI hope you're doing well! I wanted to follow up on your home search and see if there's anything new I can help you with.`;
            
            if (notes && notes.length > 0) {
              personalizedContent += ` Based on our recent conversations, I've been keeping an eye on properties that match your interests.`;
            }
            
            personalizedContent += `\n\nLet me know if you'd like to schedule a time to discuss your current needs or if you have any questions.\n\nBest regards`;
            followUpContent = personalizedContent;
          }
          
          // Store comprehensive follow-up record
          const { error: noteError } = await supabase.from('client_notes').insert([{ 
            agent_id: userId, 
            client_id: clientId, 
            content: `AI-Generated Follow-up: ${followUpContent}`, 
            created_at: new Date().toISOString() 
          }]);

          const { error: interactionError } = await supabase.from('interactions').insert([{
            client_id: clientId,
            agent_id: userId,
            channel: 'ai',
            subject: 'AI-Generated Follow-up Message',
            body_text: followUpContent,
            metadata: { 
              action_type: 'FOLLOW_UP_GENERATE',
              context_notes: notes?.length || 0,
              context_interactions: recentInteractions?.length || 0,
              context_properties: propertyInterests?.length || 0,
              ai_generated: !!openai
            },
            created_at: new Date().toISOString()
          }]);
          
          if (noteError || interactionError) throw (noteError || interactionError);
          
          executionResult = {
            status: 'success',
            detail: `AI follow-up generated with comprehensive context (${notes?.length || 0} notes, ${recentInteractions?.length || 0} interactions, ${propertyInterests?.length || 0} properties)`,
            message: `✉️ **Generated Follow-up for ${clientData.full_name || clientData.first_name || 'Client'}:**\n\n${followUpContent}\n\n*Context: ${notes?.length || 0} notes, ${recentInteractions?.length || 0} interactions, ${propertyInterests?.length || 0} property interests*`
          };
        } catch (error) {
          executionResult = {
            status: 'failed',
            detail: `Failed to generate follow-up: ${error.message}`,
            message: '❌ Failed to generate follow-up'
          };
        }
        break;
        
      case 'trigger_follow_up_workflow':
        try {
          // Generate the initial follow-up workflow message with 4 follow-up options
          const baseMessage = `🔄 **Follow-up Options for ${clientData.first_name || 'Client'}**\n\nChoose your next action:`;
          
          const followUpOptions = [
            { action: 'FOLLOW_UP_CHECK_LAST', text: '📋 Check Last Interaction', description: 'Review their most recent activity' },
            { action: 'FOLLOW_UP_SEARCH_HISTORY', text: '🔍 Search Client History', description: 'Get comprehensive client background' },
            { action: 'FOLLOW_UP_GENERATE', text: '✉️ Generate Follow-up Message', description: 'Create personalized follow-up content' },
            { action: 'FOLLOW_UP_CLIENT_DETAILS', text: '👤 Client Details', description: 'Review client information and preferences' }
          ];
          
          // Create the interactive message with clickable options
          let message = baseMessage + '\n\n';
          followUpOptions.forEach((option, index) => {
            message += `**${index + 1}. ${option.text}**\n${option.description}\n\n`;
          });
          
          executionResult = {
            status: 'success',
            detail: 'Follow-up workflow initiated',
            message: message,
            interactive: true,
            options: followUpOptions
          };
        } catch (error) {
          executionResult = {
            status: 'failed',
            detail: `Failed to trigger follow-up workflow: ${error.message}`,
            message: '❌ Failed to start follow-up workflow'
          };
        }
        break;
        
      default:
        executionResult = {
          status: 'pending',
          detail: 'Action type not yet implemented',
          message: `⏳ ${action_type} action is queued for processing.`
        };
    }
    
    // Log the action execution
    try {
      const { error } = await supabase.from('chat_actions').insert([{ 
        agent_id: userId, 
        client_id: clientId, 
        action_type, 
        parameters, 
        executed: executionResult.status === 'success', 
        executed_at: executionResult.status === 'success' ? new Date().toISOString() : null, 
        created_at: new Date().toISOString() 
      }]);
      if (error) console.warn('chat_actions execute insert error:', error.message);
    } catch (e) { 
      console.warn('chat_actions exec persistence skipped:', e.message); 
    }
    
    res.json({ 
      success: true, 
      data: { 
        action_type, 
        result: executionResult,
        message: executionResult.message || executionResult.detail
      } 
    });
  } catch (e) {
    console.error('action execute error:', e);
    res.status(500).json({ success: false, error: 'Internal server error', details: e.message });
  }
});

app.get('/api/chat/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { clientId, limit = 30 } = req.query;
    if (!clientId) return res.status(400).json({ success: false, error: 'clientId is required' });
    let messages = [];
    try {
      const { data, error } = await supabase.from('chat_messages').select('*').eq('agent_id', userId).eq('client_id', clientId).order('created_at', { ascending: false }).limit(parseInt(limit, 10));
      if (error) console.warn('chat history fetch error:', error.message);
      messages = data || [];
    } catch (e) { console.warn('chat_messages table missing:', e.message); }
    res.json({ success: true, data: { messages: messages.reverse() } });
  } catch (e) {
    console.error('chat history error:', e);
    res.status(500).json({ success: false, error: 'Internal server error', details: e.message });
  }
});

// Client data RAG search endpoint
app.get('/api/client/search', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { clientId, query, type = 'all' } = req.query;
    
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId is required' });
    }

    const results = {
      client_info: null,
      recent_notes: [],
      interactions: [],
      messages: [],
      contracts: [],
      showings: []
    };

    // Get client basic info
    if (type === 'all' || type === 'client_info') {
      try {
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .eq('agent_id', userId)
          .single();
        if (!clientError && client) results.client_info = client;
      } catch (e) { console.warn('Client info fetch error:', e.message); }
    }

    // Get recent notes
    if (type === 'all' || type === 'notes') {
      try {
        const { data: notes, error: notesError } = await supabase
          .from('client_notes')
          .select('*')
          .eq('client_id', clientId)
          .eq('agent_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        if (!notesError) results.recent_notes = notes || [];
      } catch (e) { console.warn('Notes fetch error:', e.message); }
    }

    // Get recent interactions
    if (type === 'all' || type === 'interactions') {
      try {
        const { data: interactions, error: intError } = await supabase
          .from('interactions')
          .select('*')
          .eq('client_id', clientId)
          .eq('agent_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);
        if (!intError) results.interactions = interactions || [];
      } catch (e) { console.warn('Interactions fetch error:', e.message); }
    }

    // Get recent chat messages
    if (type === 'all' || type === 'messages') {
      try {
        const { data: messages, error: msgError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('client_id', clientId)
          .eq('agent_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        if (!msgError) results.messages = messages || [];
      } catch (e) { console.warn('Messages fetch error:', e.message); }
    }

    // Get contracts
    if (type === 'all' || type === 'contracts') {
      try {
        const { data: contracts, error: contractError } = await supabase
          .from('contracts')
          .select('*')
          .eq('client_id', clientId)
          .eq('agent_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);
        if (!contractError) results.contracts = contracts || [];
      } catch (e) { console.warn('Contracts fetch error:', e.message); }
    }

    // Get showings
    if (type === 'all' || type === 'showings') {
      try {
        const { data: showings, error: showError } = await supabase
          .from('showings')
          .select('*')
          .eq('client_id', clientId)
          .eq('agent_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);
        if (!showError) results.showings = showings || [];
      } catch (e) { console.warn('Showings fetch error:', e.message); }
    }

    res.json({ success: true, data: results });
  } catch (e) {
    console.error('Client search error:', e);
    res.status(500).json({ success: false, error: 'Internal server error', details: e.message });
  }
});

// Test endpoint without authentication for debugging
app.post('/api/chat/action/execute/test', async (req, res) => {
  try {
    const { action_type, parameters = {}, clientId } = req.body;
    if (!action_type || !clientId) return res.status(400).json({ success: false, error: 'action_type and clientId are required' });
    
    // Use a test user ID
    const userId = 'test-user-id';
    let executionResult = { status: 'queued', detail: 'Processing action...', message: '' };
    
    // Fetch client details for context
    let clientData = {};
    try {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      
      if (!clientError && client) {
        clientData = client;
      }
    } catch (e) {
      console.warn('Could not fetch client data for action:', e.message);
    }
    
    // Execute different action types
    switch (action_type) {
      case 'COMM_FOLLOW_UP_SEND':
      case 'FOLLOW_UP_SEND':
        try {
          const followUpContent = `Follow-up for ${clientData.first_name || 'client'}: Thank you for your continued interest. Based on your preferences, I've identified some new opportunities.`;
          
          executionResult = {
            status: 'success',
            detail: 'Follow-up generated and ready to send',
            message: `📧 Follow-up created for ${clientData.first_name || 'client'}. Test mode - no authentication required.`
          };
        } catch (error) {
          executionResult = {
            status: 'failed',
            detail: `Failed to generate follow-up: ${error.message}`,
            message: '❌ Failed to generate follow-up'
          };
        }
        break;

      case 'FOLLOW_UP_CHECK_LAST':
        try {
          // Simulate checking last correspondence
          executionResult = {
            status: 'success',
            detail: 'Last correspondence retrieved',
            message: `📧 **Last Correspondence with ${clientData.first_name || 'Client'}:**\n\nNo previous correspondence found in test mode. This would normally show the last email/call/message with this client.`
          };
        } catch (error) {
          executionResult = {
            status: 'failed',
            detail: `Failed to retrieve correspondence: ${error.message}`,
            message: '❌ Failed to retrieve last correspondence'
          };
        }
        break;

      case 'FOLLOW_UP_CLIENT_DETAILS':
        try {
          let message = `👤 **Client Details for ${clientData.first_name || 'Client'}:**\n\n`;
          
          if (clientData.email) message += `📧 **Email:** ${clientData.email}\n`;
          if (clientData.phone) message += `📱 **Phone:** ${clientData.phone}\n`;
          if (clientData.state) message += `📍 **State:** ${clientData.state}\n`;
          
          if (clientData.preferences) {
            message += `\n**Preferences:**\n`;
            if (typeof clientData.preferences === 'object') {
              Object.entries(clientData.preferences).forEach(([key, value]) => {
                message += `• ${key.replace(/_/g, ' ')}: ${value}\n`;
              });
            } else {
              message += `${clientData.preferences}\n`;
            }
          }
          
          message += `\n*Test mode - showing available client data*`;

          executionResult = {
            status: 'success',
            detail: 'Client details retrieved',
            message: message
          };
        } catch (error) {
          executionResult = {
            status: 'failed',
            detail: `Failed to retrieve client details: ${error.message}`,
            message: '❌ Failed to retrieve client details'
          };
        }
        break;

      case 'FOLLOW_UP_SEARCH_HISTORY':
        try {
          let message = `🔍 **Client History Summary for ${clientData.first_name || 'Client'}:**\n\n`;
          message += `📝 **Recent Notes:** No notes available in test mode\n`;
          message += `💬 **Recent Interactions:** No interactions available in test mode\n`;
          message += `📋 **Contracts:** No contracts available in test mode\n`;
          message += `🏠 **Showings:** No showings available in test mode\n\n`;
          message += `*In production mode, this would show comprehensive client history*`;

          executionResult = {
            status: 'success',
            detail: 'Client history retrieved',
            message: message
          };
        } catch (error) {
          executionResult = {
            status: 'failed',
            detail: `Failed to search history: ${error.message}`,
            message: '❌ Failed to search client history'
          };
        }
        break;

      case 'FOLLOW_UP_GENERATE':
        try {
          const followUpContent = `Hi ${clientData.first_name || 'there'},\n\nI hope you're doing well! I wanted to follow up on your home search and see if there's anything new I can help you with. Based on your preferences, I've been keeping an eye on the market for opportunities that might interest you.\n\nLet me know if you'd like to schedule a time to discuss your current needs or if you have any questions.\n\nBest regards`;
          
          executionResult = {
            status: 'success',
            detail: 'Follow-up generated successfully',
            message: `✉️ **Generated Follow-up for ${clientData.first_name || 'Client'}:**\n\n${followUpContent}\n\n*This is a test-generated message. In production, this would be saved to client notes.*`
          };
        } catch (error) {
          executionResult = {
            status: 'failed',
            detail: `Failed to generate follow-up: ${error.message}`,
            message: '❌ Failed to generate follow-up'
          };
        }
        break;
        
      case 'SHOWING_SCHEDULE':
        try {
          executionResult = {
            status: 'success',
            detail: 'Showing scheduled successfully',
            message: `🏠 Showing scheduled for ${clientData.first_name || 'client'}. Test mode - no authentication required.`
          };
        } catch (error) {
          executionResult = {
            status: 'failed',
            detail: `Failed to schedule showing: ${error.message}`,
            message: '❌ Failed to schedule showing'
          };
        }
        break;
        
      case 'CONTRACT_AMEND':
        try {
          executionResult = {
            status: 'success',
            detail: 'Contract amendment request logged',
            message: `📋 Contract amendment request created for ${clientData.first_name || 'client'}. Test mode - no authentication required.`
          };
        } catch (error) {
          executionResult = {
            status: 'failed',
            detail: `Failed to log contract amendment: ${error.message}`,
            message: '❌ Failed to create contract amendment request'
          };
        }
        break;
        
      case 'LISTING_SHARE':
        try {
          executionResult = {
            status: 'success',
            detail: 'Listings prepared for sharing',
            message: `🏡 Listings prepared for ${clientData.first_name || 'client'}. Test mode - no authentication required.`
          };
        } catch (error) {
          executionResult = {
            status: 'failed',
            detail: `Failed to prepare listings: ${error.message}`,
            message: '❌ Failed to prepare listings for sharing'
          };
        }
        break;
        
      default:
        return res.status(400).json({ success: false, error: `Unsupported action type: ${action_type}` });
    }
    
    // Log action execution for debugging
    console.log(`Test Action executed: ${action_type} for client ${clientId}`, executionResult);
    
    res.json({ 
      success: true, 
      data: { 
        result: executionResult,
        message: executionResult.message
      } 
    });
    
  } catch (error) {
    console.error('Test action execution error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during test action execution',
      details: error.message 
    });
  }
});

// Test clients endpoint without authentication (must be before parameterized routes)
// DISABLED - Using frontend static data only
/*
app.get('/api/clients/test', async (req, res) => {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .limit(20);
      
    if (error) throw error;
    
    // Transform client data for frontend
    const transformedClients = clients.map(client => ({
      id: client.id,
      name: `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown Client',
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      budget: client.budget || 'Not specified',
      timeline: client.timeline || 'Not specified',
      status: client.status || 'Active',
      preferences: client.preferences,
      state: client.state || 'VA'
    }));
    
    res.json({ 
      success: true, 
      data: transformedClients 
    });
    
  } catch (error) {
    console.error('Error fetching test clients:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching clients',
      details: error.message 
    });
  }
});
*/

// Test client details endpoint without authentication
// DISABLED - Using frontend static data only  
/*
app.get('/api/clients/test/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    
    // Transform client data for frontend
    const transformedClient = {
      id: client.id,
      name: `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown Client',
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      budget: client.budget || 'Not specified',
      timeline: client.timeline || 'Not specified',
      status: client.status || 'Active',
      preferences: client.preferences,
      state: client.state || 'VA'
    };
    
    res.json({ 
      success: true, 
      data: transformedClient 
    });
    
  } catch (error) {
    console.error('Error fetching test client details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching client details',
      details: error.message 
    });
  }
});
*/

// Get individual client details for copilot
app.get('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    // Fetch specific client from Supabase
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('agent_id', userId)
      .single();
    
    if (error) {
      console.error('Client fetch error:', error);
      return res.status(404).json({ 
        success: false, 
        error: 'Client not found',
        details: error.message 
      });
    }
    
    res.json({ 
      success: true, 
      data: data || {} 
    });
  } catch (e) {
    console.error('Client details API error:', e);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error', 
      details: e.message 
    });
  }
});

// Fetch clients for copilot client management
app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Fetch clients from Supabase
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('agent_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Clients fetch error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch clients',
        details: error.message 
      });
    }
    
    res.json({ 
      success: true, 
      data: data || [] 
    });
  } catch (e) {
    console.error('Clients API error:', e);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error', 
      details: e.message 
    });
  }
});

// Lightweight contracts templates API (optional DB-backed; returns [] if not configured)
app.get('/api/contracts/templates', authenticateToken, async (req, res) => {
  try {
    const state = req.query.state;
    if (!state) {
      return res.status(400).json({ success: false, error: 'state is required' });
    }
    try {
      const { data, error } = await supabase
        .from('contracts_templates_current')
        .select('state, document_type, template_id, templates:template_id (content, version, source)')
        .eq('state', state)
        .order('document_type', { ascending: true });
      if (error) {
        console.warn('Supabase templates error:', error.message);
        return res.json({ success: true, data: [] });
      }
      const docs = (data || []).map((row) => ({
        name: row.document_type.replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
        content: row.templates?.content || '',
        version: row.templates?.version || 'v1',
        source: row.templates?.source || undefined
      }));
      res.json({ success: true, data: docs });
    } catch (dbErr) {
      console.warn('Templates endpoint fallback:', dbErr.message);
      res.json({ success: true, data: [] });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: 'Internal server error', details: e.message });
  }
});

// Generate a full set of residential real estate documents for a state
app.get('/api/contracts/generate', authenticateToken, async (req, res) => {
  try {
    const state = (req.query.state || '').toString();
    const yearBuiltRaw = req.query.yearBuilt;
    if (!state) {
      return res.status(400).json({ success: false, error: 'state is required' });
    }

    const yearBuilt = yearBuiltRaw ? parseInt(yearBuiltRaw, 10) : undefined;
    const includeLead = Number.isInteger(yearBuilt) ? yearBuilt < 1978 : undefined;

    const docs = buildStateContracts(state, includeLead);

    res.json({ success: true, data: docs });
  } catch (e) {
    console.error('Error generating state contracts:', e);
    res.status(500).json({ success: false, error: 'Internal server error', details: e.message });
  }
});

function buildStateContracts(state, includeLead) {
  const s = state.trim();
  const tone = getStatePhrasing(s);

  const purchaseAgreement = buildDocument(
    `${s} Residential Real Estate Purchase Agreement`,
    `This agreement sets forth the terms for the purchase and sale of residential real property located in ${s}.` ,
    [
      section('Parties', `This agreement (the "Agreement") is entered into on [Date] by and between [Buyer Name] ("Buyer") and [Seller Name] ("Seller").`),
      section('Property Description', `The real property commonly known as [Property Address], ${s}, together with all improvements and appurtenances (the "Property"). Legal description (if available): [Legal Description].`),
      section('Purchase Price and Earnest Money', `The total purchase price is $[Purchase Price]. Buyer shall deposit earnest money in the amount of $[Earnest Money] with [Escrow/Title Company] within [X] business days of acceptance. ${tone.earnestMoneyHandling}`),
      section('Financing', `${tone.financing}`),
      section('Inspections and Due Diligence', `${tone.inspectionPeriod}`),
      section('Disclosures', `${tone.disclosures}`),
      section('Title and Closing', `${tone.titleAndClosing}`),
      section('Risk of Loss and Possession', `${tone.possession}`),
      section('Default and Remedies', `${tone.defaultRemedies}`),
      section('Additional Terms', `Addenda incorporated by reference: [List Applicable Addenda]. Any handwritten or typed additions control over pre-printed text to the extent of conflict.`),
      section('Governing Law', `This Agreement shall be governed by and construed in accordance with the laws of the State of ${s}. ${tone.lawReference}`),
      section('Signatures', `Buyer: ____________________ Date: ________\nSeller: ____________________ Date: ________`)
    ]
  );

  const sellerDisclosure = buildDocument(
    `${s} Seller Property Disclosure`,
    `This disclosure is provided by the Seller regarding known material facts about the Property located in ${s}.`,
    [
      section('Seller Information', `Seller Name(s): [Seller]. Property Address: [Property Address], ${s}.`),
      section('Structural/Systems', `To the best of Seller's knowledge, indicate known conditions or defects: foundation, roof, plumbing, electrical, HVAC, appliances, pool/spa (if any), and other systems. Attach reports if available.`),
      section('Environmental/Health', `Known environmental conditions: mold/moisture, radon, asbestos, underground tanks, soil or drainage issues. ${tone.environmental}`),
      section('Legal/Title Matters', `Encroachments, easements, zoning issues, HOA governing documents, assessments, pending litigation or notices affecting the Property.`),
      section('Repairs/Improvements', `Known repairs or improvements made during Seller's ownership, including permits if applicable.`),
      section('Utilities/Septic/Water', `Water source, sewer/septic system details, known leaks or backups, utility providers.`),
      section('Disclosure Acknowledgment', `Seller certifies the information is true and correct to the best of Seller’s knowledge as of the date signed. Buyer acknowledges receipt and is advised to conduct independent inspections.`),
      section('Signatures', `Seller: ____________________ Date: ________\nBuyer: ____________________ Date: ________`)
    ]
  );

  const leadDisclosure = buildDocument(
    `Lead-Based Paint Disclosure (${s})`,
    `Federal law requires disclosure of known lead-based paint and/or lead-based paint hazards for residential property built before 1978.`,
    [
      section('Applicability', includeLead === undefined
        ? `This disclosure applies if the residential dwelling was constructed prior to 1978. If the Property was built in 1978 or later, this disclosure is not required.`
        : includeLead
          ? `The Property was constructed prior to 1978; this disclosure is required.`
          : `The Property was constructed in 1978 or later; this disclosure is provided for completeness but is not required.`),
      section('Seller Disclosure', `Seller has (check one): [ ] knowledge of lead-based paint and/or hazards; [ ] no knowledge of lead-based paint and/or hazards. Explain: [Explanation].`),
      section('Records/Reports', `Seller has provided Buyer with all available records and reports pertaining to lead-based paint and/or hazards: [List or N/A].`),
      section('Buyer Acknowledgment', `Buyer acknowledges receipt of this disclosure and the EPA pamphlet "Protect Your Family From Lead in Your Home." Buyer had a [10]-day opportunity to conduct a lead-based paint inspection or risk assessment.`),
      section('Signatures', `Seller: ____________________ Date: ________\nBuyer: ____________________ Date: ________`)
    ]
  );

  const agencyDisclosure = buildDocument(
    `${s} Agency Disclosure`,
    `This disclosure describes the brokerage relationships offered and the duties owed by real estate licensees in ${s}.`,
    [
      section('Brokerage Relationships', `${tone.agencyIntro}`),
      section('Duties Owed', `${tone.dutiesOwed}`),
      section('Consent and Acknowledgment', `Buyer and Seller acknowledge they have read and understand this Agency Disclosure and consent to the selected representation.`),
      section('Signatures', `Buyer: ____________________ Date: ________\nSeller: ____________________ Date: ________\nBroker/Licensee: ____________________ Date: ________`)
    ]
  );

  const addenda = buildDocument(
    `${s} State-Required Addenda`,
    `This document compiles state-required and common addenda that may apply to the transaction in ${s}. Complete sections as applicable.`,
    [
      section('HOA/Common Interest Community Addendum', `${tone.hoa}`),
      section('Flood Zone Notice', `${tone.flood}`),
      section('Wire Fraud Advisory', `${tone.wireFraud}`),
      section('Water/Septic/Well Disclosures (If Applicable)', `If the Property is served by well or septic, provide disclosures, tests, permits and maintenance records as required in ${s}.`),
      section('Other State/Local Addenda', `Insert any additional ${s}-specific or local disclosures (e.g., airport influence, coastal hazards, seismic/earthquake, wood-destroying organism reports) as applicable.`),
      section('Signatures', `Buyer: ____________________ Date: ________\nSeller: ____________________ Date: ________`)
    ]
  );

  const docs = [
    { name: 'Residential Purchase Agreement', content: purchaseAgreement },
    { name: 'Seller Property Disclosure', content: sellerDisclosure },
    // Lead disclosure included if applicable or left with conditional language when not specified
    ...(includeLead === undefined || includeLead === true
      ? [{ name: 'Lead-Based Paint Disclosure', content: leadDisclosure }]
      : []),
    { name: 'Agency Disclosure', content: agencyDisclosure },
    { name: 'State-Required Addenda', content: addenda }
  ];

  return docs;
}

function buildDocument(title, purpose, sections) {
  const header = `Document: ${title}`;
  const purposeText = `${purpose}`;
  const body = sections.map(({ heading, text }, idx) => `${idx + 1}. ${heading}\n${text}`).join('\n\n');
  return `${header}\n\n${purposeText}\n\n${body}`;
}

function section(heading, text) {
  return { heading, text };
}

function getStatePhrasing(state) {
  const generic = {
    lawReference: 'The parties acknowledge obligations under applicable federal and state statutes and regulations.',
    earnestMoneyHandling: 'Earnest money shall be held in escrow and applied to the purchase price at closing unless otherwise provided.',
    financing: 'This Agreement is [ ] cash; [ ] contingent upon Buyer obtaining financing on terms acceptable to Buyer within [X] days. Buyer shall act diligently to obtain such financing.',
    inspectionPeriod: 'Buyer shall have an inspection/due diligence period of [10] days to conduct all desired inspections and reviews. Buyer may cancel prior to expiration if dissatisfied, in which case earnest money shall be returned, subject to the terms herein.',
    disclosures: 'Seller shall provide all disclosures required by law in the State, including but not limited to property condition disclosures and any local disclosures.',
    titleAndClosing: 'Seller shall convey marketable title by [Warranty/Grant] Deed subject only to permitted exceptions. Closing shall occur on or before [Closing Date] at a place/time mutually agreed by the parties.',
    possession: 'Possession shall be delivered to Buyer upon closing and funding unless otherwise agreed in writing.',
    defaultRemedies: 'If Buyer defaults, Seller may pursue contract remedies and/or retain earnest money as liquidated damages if so provided. If Seller defaults, Buyer may pursue contract remedies including specific performance or return of earnest money.',
    agencyIntro: 'Licensees may act as Buyer’s agent, Seller’s agent, or under limited/dual representation where permitted by law with informed written consent.',
    dutiesOwed: 'Licensees owe fiduciary duties where applicable, and in all cases, duties of honesty, fair dealing, reasonable care, and disclosure of material facts. Confidential information shall be protected consistent with law.',
    hoa: 'If the Property is within a common interest community/HOA, Buyer acknowledges receipt (or timely delivery) of governing documents, CC&Rs, bylaws, rules, assessments, transfer fees, and disclosure summaries as required by law. Buyer shall have a review period after receipt to cancel as permitted.',
    flood: 'Buyer is advised to determine flood hazard status through FEMA or local authorities, obtain flood insurance quotes where indicated, and review any required state/local flood disclosures.',
    wireFraud: 'All parties acknowledge the risk of wire fraud. Parties agree to independently verify wiring instructions with the escrow/title company using verified contact methods before transmitting funds. Parties shall not rely solely on emailed instructions.'
  };

  const map = {
    Arizona: {
      ...generic,
      lawReference: 'References include the Arizona Revised Statutes and applicable administrative rules.',
      inspectionPeriod: 'Buyer shall have a standard inspection period of [10] days (or as otherwise agreed) to complete inspections and due diligence. Failure to timely cancel constitutes acceptance of the Property condition as provided.',
      financing: 'This Agreement is [ ] cash; [ ] contingent upon Buyer obtaining a loan approval on terms acceptable to Buyer within [X] days. Buyer will diligently pursue loan application and provide necessary documentation.'
    },
    California: {
      ...generic,
      lawReference: 'References include the California Civil Code and related real estate regulations.',
      inspectionPeriod: 'Buyer shall have an inspection period of [17] days (unless otherwise agreed) to complete inspections and investigations. Buyer may request repairs or cancel as permitted under the Agreement.',
      financing: 'This Agreement is [ ] cash; [ ] contingent upon Buyer obtaining financing within [X] days, including appraisal satisfactory to lender if applicable.'
    },
    Texas: {
      ...generic,
      lawReference: 'References include the Texas Property Code and TREC rules where applicable.',
      inspectionPeriod: 'Buyer may negotiate an Option Period of [10] days for unrestricted termination in exchange for an Option Fee, during which inspections and negotiations may occur.',
      financing: 'This Agreement is [ ] cash; [ ] contingent upon Buyer obtaining third-party financing approval within [X] days pursuant to a Third Party Financing Addendum if used.'
    },
    Florida: {
      ...generic,
      lawReference: 'References include the Florida Statutes and Florida Administrative Code, where applicable.',
      inspectionPeriod: 'Buyer shall have an inspection period of [10-15] days or as agreed to conduct inspections and cancel or proceed consistent with contract terms.',
      financing: 'This Agreement is [ ] cash; [ ] contingent upon Buyer obtaining financing within [X] days. Time is of the essence where stated.'
    },
    'New York': {
      ...generic,
      lawReference: 'References include the New York General Obligations Law and relevant regulations.',
      inspectionPeriod: 'Buyer may complete inspections prior to contract signing or within [X] days as negotiated. Attorney review periods may apply depending on local practice.',
      financing: 'Where a mortgage contingency is used, Buyer shall obtain a commitment within [X] days on terms acceptable to Buyer or may cancel in accordance with the contingency.'
    }
  };

  return map[state] || generic;
}

// Gmail OAuth Endpoints

// 1. Initiate Gmail OAuth flow
app.get('/api/auth/gmail', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  
  res.json({
    success: true,
    authUrl: authUrl
  });
});

// 2. Handle OAuth callback
app.get('/auth/gmail/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.redirect('http://localhost:3000?error=no_code');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // Get user info
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const userInfo = await gmail.users.getProfile({ userId: 'me' });
    
    // Store tokens (in production, save to database)
    const userId = userInfo.data.emailAddress;
    userTokens.set(userId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      email: userId
    });

    // Redirect back to frontend with success
    res.redirect(`http://localhost:3000?gmail_connected=true&email=${userId}`);
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('http://localhost:3000?error=oauth_failed');
  }
});

// 3. Check Gmail connection status
app.get('/api/auth/gmail/status', (req, res) => {
  const { email } = req.query;
  
  if (!email) {
    return res.json({
      success: false,
      connected: false,
      error: 'Email parameter required'
    });
  }

  const userToken = userTokens.get(email);
  
  if (!userToken) {
    return res.json({
      success: true,
      connected: false
    });
  }

  // Check if token is expired
  if (userToken.expiry_date && Date.now() > userToken.expiry_date) {
    userTokens.delete(email);
    return res.json({
      success: true,
      connected: false,
      error: 'Token expired'
    });
  }

  res.json({
    success: true,
    connected: true,
    email: userToken.email
  });
});

// 4. Send email via Gmail
app.post('/api/gmail/send', authenticateToken, async (req, res) => {
  const { email, to, subject, body } = req.body;
  
  if (!email || !to || !subject || !body) {
    return res.status(400).json({
      success: false,
      error: 'Email, to, subject, and body are required'
    });
  }

  const userToken = userTokens.get(email);
  if (!userToken) {
    return res.status(401).json({
      success: false,
      error: 'Gmail not connected. Please authenticate first.'
    });
  }

  try {
    // Set credentials
    oauth2Client.setCredentials({
      access_token: userToken.access_token,
      refresh_token: userToken.refresh_token
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Create email message
    const message = [
      `From: ${email}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      body
    ].join('\n');

    // Encode message
    const encodedMessage = Buffer.from(message).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    res.json({
      success: true,
      messageId: response.data.id,
      threadId: response.data.threadId
    });

  } catch (error) {
    console.error('Gmail send error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      details: error.message
    });
  }
});

// 5. Disconnect Gmail
app.post('/api/auth/gmail/disconnect', authenticateToken, (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email parameter required'
    });
  }

  userTokens.delete(email);
  
  res.json({
    success: true,
    message: 'Gmail disconnected successfully'
  });
});

// Contract amendment endpoint
app.post('/api/contract-amendment', authenticateToken, async (req, res) => {
  try {
    const { contractContent, amendmentInstruction, jurisdiction, clientId } = req.body;
    const userId = req.user.userId;

    if (!contractContent || !amendmentInstruction || !clientId) {
      return res.status(400).json({
        success: false,
        error: 'contractContent, amendmentInstruction, and clientId are required'
      });
    }

    // Create the prompt for OpenAI
    const prompt = `You are a contract amendment assistant for real estate contracts. Given the following contract and modification instruction, return a complete updated version of the contract with the requested changes applied.

Jurisdiction: ${jurisdiction || 'Not specified'}

Original Contract:
${contractContent}

Modification Instruction:
${amendmentInstruction}

Please return the complete amended contract with all changes applied. Make any modified sections bold using **Markdown syntax**. Ensure the contract remains legally sound and follows standard real estate contract formatting.`;

    let amendedContract;
    
    // Check if OpenAI is available
    if (!openai) {
      amendedContract = `**CONTRACT AMENDMENT NOTICE**

**AI Contract Amendment Service Temporarily Unavailable**

The contract amendment service requires an OpenAI API key to function. Please add a valid OpenAI API key to your .env file to enable AI-powered contract amendments.

**Original Contract:**
${contractContent}

**Requested Amendment:**
${amendmentInstruction}

**To enable AI contract amendments:**
1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Add it to your .env file: OPENAI_API_KEY=your_actual_key_here
3. Restart the server

For now, please manually review and amend the contract based on the instruction provided.`;
    } else {
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini-2025-04-14",
        messages: [
          {
            role: "system",
            content: "You are a professional real estate contract amendment assistant with expertise in real estate law and contract drafting. You make precise, legally sound changes to contracts based on instructions and mark all changes in bold using Markdown syntax. Always ensure the contract remains legally valid and follows standard real estate contract formatting."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      });

      amendedContract = completion.choices[0].message.content;
    }

    // Log the amendment request (optional - don't fail if tables don't exist)
    try {
      const { error: logError } = await supabase
        .from('contract_amendments')
        .insert([
          {
            agent_id: userId,
            client_id: clientId,
            original_contract: contractContent,
            instruction: amendmentInstruction,
            jurisdiction: jurisdiction || null,
            document: contractDocument || null,
            amended_contract: amendedContract,
            created_at: new Date().toISOString()
          }
        ]);

      if (logError) {
        console.error('Error logging contract amendment:', logError);
        // Don't fail the request if logging fails
      }
    } catch (dbError) {
      console.error('Database logging failed (tables may not exist):', dbError.message);
      // Continue with the response even if database logging fails
    }

    res.json({
      success: true,
      amendedContract: amendedContract
    });

  } catch (error) {
    console.error('Error processing contract amendment:', error);
    
    // Check if it's a database table error
    if (error.message && error.message.includes('relation "contract_amendments" does not exist')) {
      res.status(500).json({
        success: false,
        error: 'Database tables not set up. Please run the database setup script first.',
        details: 'Run the SQL commands in database_setup.sql in your Supabase SQL editor'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }
});

// Save amended contract endpoint
app.post('/api/save-amended-contract', authenticateToken, async (req, res) => {
  try {
    const { clientId, originalContract, amendedContract, instruction, jurisdiction, document } = req.body;
    const userId = req.user.userId;

    if (!clientId || !originalContract || !amendedContract || !instruction) {
      return res.status(400).json({
        success: false,
        error: 'clientId, originalContract, amendedContract, and instruction are required'
      });
    }

    // Save to Supabase (optional - don't fail if tables don't exist)
    try {
      const { data, error } = await supabase
        .from('amended_contracts')
        .insert([
          {
            agent_id: userId,
            client_id: clientId,
            original_contract: originalContract,
            amended_contract: amendedContract,
            instruction: instruction,
            jurisdiction: jurisdiction || null,
            document: document || null,
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        // Don't fail the request if database save fails
      }

      res.json({
        success: true,
        data: data ? data[0] : { message: 'Amended contract processed successfully' }
      });

    } catch (dbError) {
      console.error('Database save failed (tables may not exist):', dbError.message);
      // Return success even if database save fails
      res.json({
        success: true,
        data: { message: 'Amended contract processed successfully' }
      });
    }

  } catch (error) {
    console.error('Error saving amended contract:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get contract history endpoint
app.get('/api/contract-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { clientId } = req.query;

    // Get contracts from Supabase (optional - don't fail if tables don't exist)
    try {
      let query = supabase
        .from('amended_contracts')
        .select('*')
        .eq('agent_id', userId)
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        // Return empty array if database query fails
        res.json({
          success: true,
          data: []
        });
        return;
      }

      res.json({
        success: true,
        data: data || []
      });

    } catch (dbError) {
      console.error('Database query failed (tables may not exist):', dbError.message);
      // Return empty array if database query fails
      res.json({
        success: true,
        data: []
      });
    }

  } catch (error) {
    console.error('Error getting contract history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Upload client notes endpoint
app.post('/api/upload-client-notes', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { clientId } = req.body;
    const userId = req.user.userId;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        error: 'clientId is required'
      });
    }

    let content = '';

    // Extract text content based on file type
    if (req.file.mimetype === 'text/plain') {
      content = fs.readFileSync(req.file.path, 'utf8');
    } else if (req.file.mimetype === 'application/pdf') {
      // For PDF files, you might want to use a PDF parsing library
      // For now, we'll return a placeholder
      content = `PDF file uploaded: ${req.file.originalname}. Content extraction not implemented yet.`;
    } else if (req.file.mimetype.includes('wordprocessingml.document') || req.file.mimetype === 'application/msword') {
      // Extract text from Word documents
      try {
        const result = await mammoth.extractRawText({ path: req.file.path });
        content = result.value;
      } catch (mammothError) {
        console.error('Error extracting text from Word document:', mammothError);
        content = `Word document uploaded: ${req.file.originalname}. Text extraction failed.`;
      }
    } else {
      content = `File uploaded: ${req.file.originalname}. Content extraction not supported for this file type.`;
    }

    // Save to database (optional - don't fail if tables don't exist)
    try {
      const { data, error } = await supabase
        .from('client_notes')
        .insert([
          {
            agent_id: userId,
            client_id: clientId,
            file_path: req.file.path,
            content: content,
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        // Don't fail the request if database save fails
      }
    } catch (dbError) {
      console.error('Database save failed (tables may not exist):', dbError.message);
      // Continue with the response even if database save fails
    }

    res.json({
      success: true,
      content: content,
      fileName: req.file.originalname
    });

  } catch (error) {
    console.error('Error uploading client notes:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get authentication status
app.get('/api/auth/status', authenticateToken, async (req, res) => {
  try {
    // If authenticateToken middleware passes, the user is authenticated
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', req.user.userId)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      isAuthenticated: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      }
    });
  } catch (error) {
    // This will catch errors if the token is valid but the user is not in the DB
    // Or if there's a DB connection issue.
    console.error('Auth status error:', error);
    res.status(404).json({
      success: false,
      isAuthenticated: false,
      error: 'User not found or database error',
      details: error.message
    });
  }
});
  
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});