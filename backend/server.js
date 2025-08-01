const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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

// Initialize Supabase client
const supabaseUrl = 'https://invadbpskztiooidhyui.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      model: "gpt-4o-mini",
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
    throw error;
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

// Main automation endpoint
app.post('/api/generate-followup', async (req, res) => {
  try {
    const { clientId, agentId } = req.body;

    if (!clientId || !agentId) {
      return res.status(400).json({
        success: false,
        error: 'clientId and agentId are required'
      });
    }

    // Step 1: Get latest client note
    const clientNote = await getLatestClientNote(clientId);
    if (!clientNote) {
      return res.status(404).json({
        success: false,
        error: 'No client note found'
      });
    }

    // Step 2: Get agent's previous messages
    const agentMessages = await getAgentMessages(agentId);

    // Step 3: Generate follow-up message
    const generatedMessage = await generateFollowUpMessage(clientNote, agentMessages);

    // Step 4: Log the generated message
    const loggedMessage = await logGeneratedMessage(agentId, clientId, generatedMessage);

    res.json({
      success: true,
      data: {
        message: generatedMessage,
        loggedMessage: loggedMessage,
        clientNote: clientNote,
        agentMessagesCount: agentMessages.length
      }
    });

  } catch (error) {
    console.error('Error in generate-followup:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Add client note endpoint
app.post('/api/client-notes', async (req, res) => {
  try {
    const { agentId, clientId, note } = req.body;

    if (!agentId || !clientId || !note) {
      return res.status(400).json({
        success: false,
        error: 'agentId, clientId, and note are required'
      });
    }

    const { data, error } = await supabase
      .from('client_notes')
      .insert([
        {
          agent_id: agentId,
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

// Add agent message endpoint
app.post('/api/agent-messages', async (req, res) => {
  try {
    const { agentId, message } = req.body;

    if (!agentId || !message) {
      return res.status(400).json({
        success: false,
        error: 'agentId and message are required'
      });
    }

    const { data, error } = await supabase
      .from('agent_messages')
      .insert([
        {
          agent_id: agentId,
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

// File upload endpoint for client notes
app.post('/api/upload-client-note', upload.single('file'), async (req, res) => {
  try {
    const { agentId, clientId } = req.body;
    const file = req.file;

    if (!agentId || !clientId || !file) {
      return res.status(400).json({
        success: false,
        error: 'agentId, clientId, and file are required'
      });
    }

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
        // For Word documents, we'll use a simple approach (you might want to add mammoth library)
        content = `[Word Document: ${file.originalname}] - Content extraction not implemented yet. Please add mammoth library for full Word document support.`;
      } else {
        content = `[File: ${file.originalname}] - Unsupported file type.`;
      }
    } catch (readError) {
      console.error('Error reading file:', readError);
      content = `[File: ${file.originalname}] - Error reading file content.`;
    }

    // Save to Supabase
    const { data, error } = await supabase
      .from('client_notes')
      .insert([
        {
          agent_id: agentId,
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
app.get('/api/data', async (req, res) => {
  try {
    const { agentId, clientId } = req.query;

    if (!agentId || !clientId) {
      return res.status(400).json({
        success: false,
        error: 'agentId and clientId are required'
      });
    }

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
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (messagesError) throw messagesError;

    // Get generated messages
    const { data: generatedMessages, error: generatedError } = await supabase
      .from('generated_messages')
      .select('*')
      .eq('client_id', clientId)
      .eq('agent_id', agentId)
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 