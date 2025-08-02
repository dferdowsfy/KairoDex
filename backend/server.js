const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
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
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3004'],
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
    const { contract, instruction, clientId } = req.body;
    const userId = req.user.userId;

    if (!contract || !instruction || !clientId) {
      return res.status(400).json({
        success: false,
        error: 'contract, instruction, and clientId are required'
      });
    }

    // Create the prompt for OpenAI
    const prompt = `You are a contract amendment assistant. Given the following contract and instruction, return an updated version with only the changed sections. Make changed text bold using Markdown.

Contract:
${contract}

Instruction:
${instruction}

Please return only the amended contract with changes marked in **bold**. Do not include any explanations or additional text.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional contract amendment assistant. You make precise changes to contracts based on instructions and mark all changes in bold using Markdown syntax."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 4000
    });

    const amendedContract = completion.choices[0].message.content;

    // Log the amendment request (optional - don't fail if tables don't exist)
    try {
      const { error: logError } = await supabase
        .from('contract_amendments')
        .insert([
          {
            agent_id: userId,
            client_id: clientId,
            original_contract: contract,
            instruction: instruction,
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
      data: {
        amendedContract: amendedContract
      }
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
    const { clientId, originalContract, amendedContract, instruction } = req.body;
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 