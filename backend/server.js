const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
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
    if (!origin || isExtension || allowed.includes(origin)) {
      return callback(null, true);
    }
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
    const { clientId } = req.body;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        error: 'clientId is required'
      });
    }

    // Use authenticated user's ID as agentId
    const userId = req.user.userId;

    // Step 1: Get latest client note
    const clientNote = await getLatestClientNote(clientId);
    if (!clientNote) {
      return res.status(404).json({
        success: false,
        error: 'No client note found'
      });
    }

    // Step 2: Get agent's previous messages
    const agentMessages = await getAgentMessages(userId);

    // Step 3: Generate follow-up message
    const generatedMessage = await generateFollowUpMessage(clientNote, agentMessages);

    // Step 4: Log the generated message
    const loggedMessage = await logGeneratedMessage(userId, clientId, generatedMessage);

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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

// Test DocuSign configuration endpoint
app.get('/api/docusign/test-config', async (req, res) => {
  try {
    console.log('🧪 Testing DocuSign configuration...');
    
    // Test JWT creation
    const { createJwtAssertion } = require('./docusign-config');
    const jwt = createJwtAssertion();
    console.log('✅ JWT created successfully');
    
    // Test access token
    const { getAccessToken } = require('./docusign-config');
    const accessToken = await getAccessToken();
    console.log('✅ Access token received:', accessToken ? 'YES' : 'NO');
    
    // Test client creation
    const { createDocuSignClient } = require('./docusign-config');
    const apiClient = await createDocuSignClient();
    console.log('✅ DocuSign client created successfully');
    
    res.json({
      success: true,
      message: 'DocuSign configuration is working correctly',
      hasAccessToken: !!accessToken,
      hasClient: !!apiClient
    });
  } catch (error) {
    console.error('❌ DocuSign configuration test failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'DocuSign configuration test failed',
      details: error.message
    });
  }
});

// ===== DOCUSIGN INTEGRATION ENDPOINTS =====

// Get DocuSign consent URL
app.get('/api/docusign/consent', authenticateToken, (req, res) => {
  try {
    const consentUrl = generateConsentUrl();
    res.json({
      success: true,
      data: {
        consentUrl: consentUrl
      }
    });
  } catch (error) {
    console.error('Error generating consent URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate consent URL',
      details: error.message
    });
  }
});

// DocuSign consent callback
app.get('/api/docusign/consent-callback', (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    // Send error message to parent window
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>DocuSign Authorization</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'DOCUSIGN_CONSENT_ERROR',
                error: 'Authorization code is required'
              }, 'http://localhost:3000');
              window.close();
            } else {
              window.location.href = 'http://localhost:3000/dashboard?error=consent_failed';
            }
          </script>
          <p>Authorization failed. Redirecting...</p>
        </body>
      </html>
    `;
    return res.send(errorHtml);
  }
  
  // In a real implementation, you would exchange the code for an access token
  // For now, we'll send a success message to the parent window
  const successHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>DocuSign Authorization</title>
      </head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'DOCUSIGN_CONSENT_SUCCESS',
              code: '${code}'
            }, 'http://localhost:3000');
            window.close();
          } else {
            window.location.href = 'http://localhost:3000/dashboard?consent=success&code=${code}';
          }
        </script>
        <p>Authorization successful! Closing window...</p>
      </body>
    </html>
  `;
  
  res.send(successHtml);
});

// Create DocuSign envelope with modified contract
app.post('/api/docusign/create-envelope', authenticateToken, async (req, res) => {
  try {
    const { contractContent, clientName, clientEmail, subject } = req.body;
    const userId = req.user.userId;

    if (!contractContent || !clientName || !clientEmail) {
      return res.status(400).json({
        success: false,
        error: 'contractContent, clientName, and clientEmail are required'
      });
    }

    // Create DocuSign client
    let envelopesApi;
    let useMock = false;
    
    try {
      console.log('🔐 Attempting to create real DocuSign client...');
      const apiClient = await createDocuSignClient();
      envelopesApi = new (require('docusign-esign').EnvelopesApi)(apiClient);
      console.log('✅ Real DocuSign client created successfully');
    } catch (error) {
      console.error('❌ DocuSign client creation error:', error.message);
      console.error('Full error details:', error);
      
      // Check if consent is required
      if (error.message === 'consent_required') {
        return res.status(401).json({
          success: false,
          error: 'consent_required',
          message: 'DocuSign consent is required. Please authorize the application first.'
        });
      }
      
      // For now, let's force real DocuSign usage and not fall back to mock
      console.error('🚫 DocuSign authentication failed. Please check your configuration.');
      return res.status(500).json({
        success: false,
        error: 'DocuSign authentication failed',
        details: error.message,
        message: 'Please ensure DocuSign is properly configured and authorized.'
      });
      
      // Uncomment the lines below if you want to use mock for testing
      // console.log('🔧 Using mock DocuSign service for testing...');
      // const mockClient = new MockDocuSignClient();
      // envelopesApi = mockClient.envelopesApi;
      // useMock = true;
    }

    // Create document
    const document = {
      documentBase64: Buffer.from(contractContent).toString('base64'),
      name: 'Contract Document',
      fileExtension: 'txt',
      documentId: '1'
    };

    // Create recipient
    const signer = {
      email: clientEmail,
      name: clientName,
      recipientId: '1',
      routingOrder: '1'
    };

    // Create sign here tab
    const signHereTab = {
      anchorString: '/sn1/',
      anchorUnits: 'pixels',
      anchorYOffset: '10',
      anchorXOffset: '20'
    };

    // Create recipient view
    // Prepare sender view (embedded sending) so the agent can place fields and send
    const returnUrlRequest = {
      returnUrl: 'http://localhost:3000/dashboard?envelopeId={envelopeId}'
    };

    // Create envelope definition
    const envelopeDefinition = {
      emailSubject: subject || 'Contract for Signature - AgentHub',
      documents: [document],
      recipients: {
        signers: [signer]
      },
      status: 'created'
    };

    // Create envelope
    const envelope = await envelopesApi.createEnvelope(DOCUSIGN_CONFIG.account_id, {
      envelopeDefinition: envelopeDefinition
    });

    // Create sender view (embedded sending) for placing tabs and sending the envelope
    const senderView = await envelopesApi.createSenderView(
      DOCUSIGN_CONFIG.account_id,
      envelope.envelopeId,
      { returnUrlRequest }
    );

    // Save envelope info to database
    try {
      const { error: dbError } = await supabase
        .from('docusign_envelopes')
        .insert([
          {
            agent_id: userId,
            envelope_id: envelope.envelopeId,
            client_name: clientName,
            client_email: clientEmail,
            contract_content: contractContent,
            status: 'created',
            created_at: new Date().toISOString()
          }
        ]);

      if (dbError) {
        console.error('Error saving envelope to database:', dbError);
        // Don't fail the request if database save fails
      }
    } catch (dbError) {
      console.error('Database save failed (tables may not exist):', dbError.message);
      // Continue with the response even if database save fails
    }

    res.json({
      success: true,
      data: {
        envelopeId: envelope.envelopeId,
        senderViewUrl: senderView.url,
        status: envelope.status
      }
    });

  } catch (error) {
    console.error('Error creating DocuSign envelope:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create DocuSign envelope',
      details: error.message
    });
  }
});

// Get envelope status
app.get('/api/docusign/envelope/:envelopeId', authenticateToken, async (req, res) => {
  try {
    const { envelopeId } = req.params;
    const userId = req.user.userId;

    // Create DocuSign client (using mock for testing)
    let envelopesApi;
    try {
      const apiClient = await createDocuSignClient();
      envelopesApi = new (require('docusign-esign').EnvelopesApi)(apiClient);
    } catch (error) {
      console.log('🔧 Using mock DocuSign service for testing...');
      const mockClient = new MockDocuSignClient();
      envelopesApi = mockClient.envelopesApi;
    }

    // Get envelope status
    const envelope = await envelopesApi.getEnvelope(DOCUSIGN_CONFIG.account_id, envelopeId);

    res.json({
      success: true,
      data: {
        envelopeId: envelope.envelopeId,
        status: envelope.status,
        created: envelope.created,
        lastModified: envelope.lastModified
      }
    });

  } catch (error) {
    console.error('Error getting envelope status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get envelope status',
      details: error.message
    });
  }
});

// Get user's DocuSign envelopes
app.get('/api/docusign/envelopes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get envelopes from database (optional - don't fail if tables don't exist)
    try {
      const { data, error } = await supabase
        .from('docusign_envelopes')
        .select('*')
        .eq('agent_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
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
      res.json({
        success: true,
        data: []
      });
    }

  } catch (error) {
    console.error('Error getting envelopes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get envelopes',
      details: error.message
    });
  }
});

// Mock DocuSign signing page
app.get('/mock-docusign-signing', (req, res) => {
  const { envelopeId, clientName, clientEmail } = req.query;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DocuSign - Electronic Signature</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .signing-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 40px;
            max-width: 600px;
            width: 100%;
            text-align: center;
        }
        .logo {
            width: 120px;
            height: 40px;
            background: #0070c9;
            border-radius: 6px;
            margin: 0 auto 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 24px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
        }
        .document-preview {
            background: #f8f9fa;
            border: 2px dashed #dee2e6;
            border-radius: 8px;
            padding: 30px;
            margin: 20px 0;
            min-height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
        }
        .document-icon {
            font-size: 48px;
            color: #6c757d;
            margin-bottom: 15px;
        }
        .signature-area {
            border: 2px solid #0070c9;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            background: #f8f9ff;
        }
        .signature-input {
            width: 100%;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            margin: 10px 0;
        }
        .btn {
            background: #0070c9;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            margin: 10px;
            transition: background 0.3s;
        }
        .btn:hover {
            background: #0056b3;
        }
        .btn-secondary {
            background: #6c757d;
        }
        .btn-secondary:hover {
            background: #545b62;
        }
        .info {
            background: #e7f3ff;
            border: 1px solid #b3d9ff;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #0056b3;
        }
        .status {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #155724;
            display: none;
        }
    </style>
</head>
<body>
    <div class="signing-container">
        <div class="logo">DocuSign</div>
        <h1>Electronic Signature</h1>
        <p class="subtitle">Please review and sign the document below</p>
        
        <div class="info">
            <strong>Envelope ID:</strong> ${envelopeId}<br>
            <strong>Client:</strong> ${clientName} (${clientEmail})
        </div>
        
        <div class="document-preview">
            <div class="document-icon">📄</div>
            <h3>Contract Document</h3>
            <p>This is a mock document for testing purposes.</p>
            <p>The actual contract content would be displayed here.</p>
        </div>
        
        <div class="signature-area">
            <h3>📝 Signature Required</h3>
            <input type="text" class="signature-input" id="signature" placeholder="Type your full name to sign" />
            <input type="email" class="signature-input" id="email" placeholder="Confirm your email address" value="${clientEmail}" />
        </div>
        
        <div>
            <button class="btn" onclick="signDocument()">✅ Sign Document</button>
            <button class="btn btn-secondary" onclick="declineDocument()">❌ Decline</button>
        </div>
        
        <div class="status" id="status">
            Document signed successfully! Redirecting...
        </div>
    </div>

    <script>
        function signDocument() {
            const signature = document.getElementById('signature').value;
            const email = document.getElementById('email').value;
            
            if (!signature || !email) {
                alert('Please fill in both signature and email fields.');
                return;
            }
            
            document.getElementById('status').style.display = 'block';
            document.querySelectorAll('.btn').forEach(btn => btn.disabled = true);
            
            // Simulate signing process
            setTimeout(() => {
                alert('Document signed successfully! This is a mock signing interface.');
                // In a real implementation, this would redirect back to the main app
                window.parent.postMessage({ type: 'DOCUSIGN_SIGNED', envelopeId: '${envelopeId}' }, '*');
            }, 2000);
        }
        
        function declineDocument() {
            if (confirm('Are you sure you want to decline this document?')) {
                alert('Document declined. This is a mock signing interface.');
                window.parent.postMessage({ type: 'DOCUSIGN_DECLINED', envelopeId: '${envelopeId}' }, '*');
            }
        }
    </script>
</body>
</html>`;
  
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 