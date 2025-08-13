import { useState, useEffect, useRef } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import PasswordChange from './components/PasswordChange';
import BlockchainInfo from './components/BlockchainInfo';
import DocuSignConsent from './components/DocuSignConsent';
import AnimatedContractFlow from './components/AnimatedContractFlow';
import AgentDashboard from './components/AgentDashboard';
import ChatCopilot from './components/ChatCopilot';
import ContractsPage from './components/ContractsPage';
import BlockchainTracker from './components/BlockchainTracker';
import ThemeSettings from './components/ThemeSettings';
import ConversationalFlows from './components/ConversationalFlows';
import { generateJurisdictions } from './statesData';
import { logToBlockchain } from './utils/blockchain';
import { getSupabaseClient, supaGetSession, supaSignInWithPassword, supaListUserExtracts, supaDownloadJson } from './utils/supabase';

export default function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [token, setToken] = useState(null);

  // Tab management
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'clients', 'contracts', 'flows', 'ledger', 'settings'

  // App states
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [newNote, setNewNote] = useState('');
  const [savedNote, setSavedNote] = useState(null);
  const [generatedFollowUp, setGeneratedFollowUp] = useState(null);
  const [communicationHistory, setCommunicationHistory] = useState([]);
  const [contractHistory, setContractHistory] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistoryItems, setExpandedHistoryItems] = useState(new Set());
  const [clientId, setClientId] = useState('client1');
  const [scheduledTime, setScheduledTime] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  
  // Card-based interface states
  const [selectedPathway, setSelectedPathway] = useState(null);
  const [showPathwayInterface, setShowPathwayInterface] = useState(false);
  
  // Email integration states
  const [emailProvider, setEmailProvider] = useState('gmail');
  const [emailConnected, setEmailConnected] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  
  // User settings states
  const [customColors, setCustomColors] = useState({
    // Dark, refined base matching the reference
    appBackground: 'radial-gradient(1200px 600px at 10% -10%, #0B1220 0%, #0A0F1A 45%, #0A0E17 100%)',
    background: '#0A0F1A',
    cardBackground: 'rgba(255, 255, 255, 0.04)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    primaryButton: '#2563EB',
    secondaryButton: '#059669',
    textPrimary: '#E2E8F0',
    textSecondary: '#94A3B8',
    // Dark banner with light text (header-specific)
    headerBackground: 'linear-gradient(90deg, #0B1220 0%, #141E2E 50%, #0B1220 100%)',
    headerText: '#E5E7EB',
    headerBorder: 'rgba(255, 255, 255, 0.12)',
    // Dashboard card gradients (dark)
    gradientCardBlue: 'linear-gradient(135deg, #0F1F3A 0%, #0B2B5A 100%)',
    gradientCardGreen: 'linear-gradient(135deg, #0B2E2A 0%, #064E3B 100%)',
    gradientCardIndigo: 'linear-gradient(135deg, #1F1744 0%, #3B2A7C 100%)',
    gradientCardPurple: 'linear-gradient(135deg, #1F1744 0%, #3B2A7C 100%)',
    gradientCardYellow: 'linear-gradient(135deg, #3A2A0F 0%, #6B4E0B 100%)',
    gradientCardGray: 'linear-gradient(135deg, #0F172A 0%, #0B1220 100%)'
  });

  const [textSizes, setTextSizes] = useState({
    emailBody: '14px',
    subject: '16px',
    labels: '12px'
  });

  const [userPreferences, setUserPreferences] = useState({
    autoSave: true,
    emailNotifications: true
  });

  // Settings save status
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // File upload states
  const [uploadingFile, setUploadingFile] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [clientNotesFile, setClientNotesFile] = useState(null);
  const [clientNotesContent, setClientNotesContent] = useState('');
  const fileInputRef = useRef(null);
  
  // Voice notes (speech-to-text) for follow-up generation
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  // Supabase (import from extension) states
  const [supaSession, setSupaSession] = useState(null);
  const [supaEmail, setSupaEmail] = useState('');
  const [supaPassword, setSupaPassword] = useState('');
  const [supaLoading, setSupaLoading] = useState(false);
  const [supaNotes, setSupaNotes] = useState([]);

  // Contract amendment states
  const [isContractAmendment, setIsContractAmendment] = useState(false);
  const [amendmentInstruction, setAmendmentInstruction] = useState('');
  const [amendedContract, setAmendedContract] = useState(null);
  const [processingAmendment, setProcessingAmendment] = useState(false);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('');
  const [contractDocument, setContractDocument] = useState('');
  const [contractStep, setContractStep] = useState(1); // 1: jurisdiction, 2: document, 3: modification
  
  // DocuSign integration states
  const [showDocuSignForm, setShowDocuSignForm] = useState(false);
  const [showDocuSignConsent, setShowDocuSignConsent] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [docuSignUrl, setDocuSignUrl] = useState('');
  const [showDocuSignFrame, setShowDocuSignFrame] = useState(false);
  const [processingDocuSign, setProcessingDocuSign] = useState(false);
  const [envelopeId, setEnvelopeId] = useState('');

  // Copilot states
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [selectedCopilotClient, setSelectedCopilotClient] = useState(null);
  const [selectedMainClient, setSelectedMainClient] = useState('client1'); // Track main nav client selection

  // Sample clients for dropdown - Updated to match Google Sheets data
  const clients = [
    { 
      id: 'client1', 
      name: 'Sam Johnson', 
      email: 'sam.johnson@email.com',
      budget: '$400,000 - $500,000',
      stage: 'Active buyer',
      city: 'Austin',
      timeline: '3-4 months',
      preferences: 'Looking for 3-4 bedroom home with modern kitchen',
      follow_up_notes: 'Sam showed strong interest in the Lakeway property we viewed last Tuesday. He particularly liked the kitchen renovation and the backyard space. His wife Sarah seemed hesitant about the commute to downtown. Need to follow up with properties closer to the tech corridor. He mentioned budget flexibility if we find the right home. Next step: Send him listings in Cedar Park and Round Rock areas.'
    },
    { 
      id: 'client2', 
      name: 'Casey Martinez', 
      email: 'casey.martinez@email.com',
      budget: '$600,000 - $750,000',
      stage: 'Under contract',
      city: 'Dallas',
      timeline: '2-3 months',
      preferences: 'Prefers contemporary style with pool',
      follow_up_notes: 'Casey is currently under contract for the Preston Hollow property. Inspection is scheduled for next Friday. He expressed concerns about the roof condition during our last call. Recommend connecting him with our preferred roofing contractor for a pre-inspection estimate. Also need to coordinate with his lender for appraisal scheduling. His timeline is tight due to job relocation.'
    },
    { 
      id: 'client3', 
      name: 'Riley Davis', 
      email: 'riley.davis@email.com',
      budget: '$350,000 - $450,000',
      stage: 'Prospecting',
      city: 'Houston',
      timeline: '6 months',
      preferences: 'First-time buyer, needs move-in ready home',
      follow_up_notes: 'Riley just got pre-approved for $425K with excellent credit. She needs education on the home buying process and neighborhood comparisons. Very interested in Katy area for schools but concerned about flooding. Schedule a buyer consultation and send first-time buyer packet. She prefers virtual tours initially and has weekends available for showings.'
    },
    { 
      id: 'client4', 
      name: 'Taylor Patel', 
      email: 'taylor.patel@email.com',
      budget: '$800,000 - $950,000',
      stage: 'Closing',
      city: 'San Antonio',
      timeline: '1 month',
      preferences: 'Luxury home with office space',
      follow_up_notes: 'Taylor is closing on the Stone Oak luxury home next Tuesday. Final walkthrough scheduled for Monday morning. He requested recommendations for interior designers and smart home installation services. Also interested in property management options for his current home conversion to rental. Follow up with referral list and closing gift ideas.'
    },
    { 
      id: 'client5', 
      name: 'Logan Lopez', 
      email: 'logan.lopez@email.com',
      budget: '$250,000 - $350,000',
      stage: 'Qualified',
      city: 'Fort Worth',
      timeline: '4-5 months',
      preferences: 'Looking for starter home in good school district',
      follow_up_notes: 'Logan is a young professional looking for his first home. Very budget-conscious and focused on resale value. Prefers Fort Worth ISD area and needs to be within 30 minutes of downtown. He drives a lot for work so garage parking is important. Send him market analysis for targeted neighborhoods and schedule showing for this weekend.'
    }
  ];

  // All US States and Territories with contract documents
  const jurisdictions = generateJurisdictions();
        

  // Check authentication on app load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
      loadUserSettings();
    }
  }, []);

  // Sync selectedMainClient with clientId on app load
  useEffect(() => {
    if (clientId && clientId !== selectedMainClient) {
      setSelectedMainClient(clientId);
      setSelectedCopilotClient(clientId);
    }
  }, [clientId]);

  // Load contract history when switching to history tab
  useEffect(() => {
    if (activeTab === 'history' && token) {
      loadContractHistory();
    }
  }, [activeTab, token]);

  // Load recent activity when on dashboard
  useEffect(() => {
    if (activeTab === 'dashboard' && token) {
      loadRecentActivity();
    }
  }, [activeTab, token]);

  // Debug DocuSign form state
  useEffect(() => {
    console.log('DocuSign form state changed:', { showDocuSignForm, showDocuSignConsent });
  }, [showDocuSignForm, showDocuSignConsent]);

  const loadContractHistory = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/contract-history?clientId=${clientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Transform the data to match our frontend format
          const transformedContracts = result.data.map(contract => ({
            id: contract.id,
            clientId: contract.client_id,
            originalContract: contract.original_contract,
            amendedContract: contract.amended_contract,
            amendmentInstruction: contract.instruction,
            jurisdiction: contract.jurisdiction,
            document: contract.document,
            date: contract.created_at,
            type: 'contract'
          }));
          setContractHistory(transformedContracts);
        }
      } else {
        console.error('Failed to load contract history');
      }
    } catch (error) {
      console.error('Error loading contract history:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/activity', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setRecentActivity(result.data.activities || []);
        }
      } else {
        console.error('Failed to load recent activity');
      }
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  // Load user settings from backend
  const loadUserSettings = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const settings = await response.json();
        if (settings.customColors) setCustomColors(settings.customColors);
        if (settings.textSizes) setTextSizes(settings.textSizes);
        if (settings.userPreferences) setUserPreferences(settings.userPreferences);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Save user settings to backend
  const saveUserSettings = async () => {
    try {
      setIsSavingSettings(true);
      const response = await fetch('http://localhost:3001/api/auth/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customColors,
          textSizes,
          userPreferences,
        }),
      });

      if (response.ok) {
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.message };
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error.message };
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Manual save function for settings
  const handleManualSave = async () => {
    const result = await saveUserSettings();
    if (result.success) {
      console.log('Settings saved successfully');
    } else {
      console.error('Failed to save settings:', result.error);
    }
  };

  // Authentication handlers
  const handleLogin = (data) => {
    setToken(data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    loadUserSettings();
  };

  const handleRegister = (data) => {
    setToken(data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const switchToRegister = () => setShowLogin(false);
  const switchToLogin = () => setShowLogin(true);

  // Pathway selection functions
  const handlePathwaySelect = (pathway) => {
    console.log('handlePathwaySelect called with pathway:', pathway);
    console.log('Setting selectedPathway to:', pathway);
    console.log('Setting showPathwayInterface to: true');
    setSelectedPathway(pathway);
    setShowPathwayInterface(true);
    console.log('Pathway selection complete');
  };

  const handleDashboardClick = () => {
    setActiveTab('dashboard');
    setSelectedPathway(null);
    setShowPathwayInterface(false);
    setNewNote('');
    setSavedNote(null);
    setGeneratedFollowUp(null);
    setIsContractAmendment(false);
    setAmendmentInstruction('');
    setAmendedContract(null);
    setProcessingAmendment(false);
    setFileUploaded(false);
    setSelectedJurisdiction('');
    setContractDocument('');
    setContractStep(1);
    setClientNotesFile(null);
    setClientNotesContent('');
    loadRecentActivity();
  };

  const handleBackToCards = () => {
    setSelectedPathway(null);
    setShowPathwayInterface(false);
    // Reset all pathway-specific states
    setNewNote('');
    setSavedNote(null);
    setGeneratedFollowUp(null);
    setIsContractAmendment(false);
    setAmendmentInstruction('');
    setAmendedContract(null);
    setProcessingAmendment(false);
    setFileUploaded(false);
    setSelectedJurisdiction('');
    setContractDocument('');
    setContractStep(1);
    setClientNotesFile(null);
    setClientNotesContent('');
  };

  // Voice capture helpers
  const startVoiceCapture = () => {
    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Voice capture is not supported in this browser.');
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join(' ');
        setClientNotesContent(transcript);
        if (transcript && transcript.length > 10) setFileUploaded(true);
      };
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch (err) {
      console.error('Voice capture failed:', err);
      setIsRecording(false);
    }
  };

  const stopVoiceCapture = () => {
    try {
      recognitionRef.current?.stop();
    } catch (e) {}
    setIsRecording(false);
  };

  const handleActivityClick = (activity) => {
    // Handle different types of activity clicks
    if (activity.type === 'note') {
      // Show note details
      setSavedNote({
        id: activity.id,
        content: activity.content,
        clientId: activity.client_id
      });
      setClientId(activity.client_id);
      setActiveTab('dashboard');
      handlePathwaySelect('followup');
    } else if (activity.type === 'message') {
      // Show message details
      setGeneratedFollowUp(activity.message);
      setClientId(activity.client_id);
      setActiveTab('dashboard');
      handlePathwaySelect('followup');
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  };

  // Placeholder functions for the pathways
  const handleSaveNote = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/client-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId,
          note: newNote,
          isContractAmendment: selectedPathway === 'contract'
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Log to blockchain
        const activityText = `Note created for client ${clientId}: ${newNote.substring(0, 100)}...`;
        const blockchainResult = await logToBlockchain(activityText, 'note_creation');
        
        // Add blockchain info to the saved note
        const noteWithBlockchain = {
          ...result,
          blockchainTx: blockchainResult.success ? blockchainResult.txHash : null,
          blockchainTimestamp: blockchainResult.timestamp
        };
        
        setSavedNote(noteWithBlockchain);
        setNewNote('');
        setFileUploaded(false);
        
        if (selectedPathway === 'contract') {
          // For contract amendments, process the amendment
          await handleContractAmendment();
        }
      } else {
        console.error('Failed to save note');
      }
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContractAmendment = async () => {
    if (!contractDocument || !amendmentInstruction.trim()) return;
    
    setProcessingAmendment(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/contract-amendment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contractContent: contractDocument,
          amendmentInstruction,
          jurisdiction: selectedJurisdiction,
          clientId
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAmendedContract(result.amendedContract);
      } else {
        console.error('Failed to process contract amendment');
      }
    } catch (error) {
      console.error('Error processing contract amendment:', error);
    } finally {
      setProcessingAmendment(false);
    }
  };

  const handleSaveAmendedContract = async () => {
    console.log('Save button clicked!', { amendedContract: !!amendedContract });
    if (!amendedContract) {
      console.log('No amended contract to save');
      return;
    }
    
    try {
      // Use the contractDocument as the original contract content
      const originalContractContent = contractDocument || clientNotesContent || (savedNote ? savedNote.content : '') || '';
      console.log('Saving contract with data:', {
        clientId,
        hasOriginalContract: !!originalContractContent,
        hasAmendedContract: !!amendedContract,
        jurisdiction: selectedJurisdiction,
        document: contractDocument
      });
      
      const response = await fetch('http://localhost:3001/api/save-amended-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId,
          originalContract: originalContractContent,
          amendedContract,
          instruction: amendmentInstruction,
          jurisdiction: selectedJurisdiction,
          document: contractDocument
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Amended contract saved successfully', result);
        
        // Log to blockchain
        const activityText = `Contract modification for client ${clientId}: ${amendmentInstruction}`;
        const blockchainResult = await logToBlockchain(activityText, 'contract_modification');
        
        // Add to contract history with blockchain info
        const newContract = {
          id: Date.now(),
          clientId,
          originalContract: originalContractContent,
          amendedContract,
          amendmentInstruction,
          jurisdiction: selectedJurisdiction,
          document: contractDocument,
          date: new Date().toISOString(),
          type: 'contract',
          blockchainTx: blockchainResult.success ? blockchainResult.txHash : null,
          blockchainTimestamp: blockchainResult.timestamp
        };
        
        setContractHistory(prev => [newContract, ...prev]);
        
        // Show DocuSign form after saving
        console.log('Showing DocuSign form...');
        setShowDocuSignForm(true);
        
        // Pre-fill client name from the selected client
        const selectedClient = clients.find(c => c.id === clientId);
        if (selectedClient) {
          setClientName(selectedClient.name);
          console.log('Pre-filled client name:', selectedClient.name);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to save amended contract', response.status, errorData);
        alert(`Failed to save contract: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving amended contract:', error);
    }
  };

  const handleCreateDocuSignEnvelope = async () => {
    if (!amendedContract || !clientName || !clientEmail) {
      alert('Please provide client name and email');
      return;
    }

    setProcessingDocuSign(true);

    try {
      const response = await fetch('http://localhost:3001/api/docusign/create-envelope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contractContent: amendedContract,
          clientName,
          clientEmail,
          subject: `Contract for Signature - ${clientName}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('DocuSign envelope created (sender view):', result);
        
        setDocuSignUrl(result.data.senderViewUrl);
        setEnvelopeId(result.data.envelopeId);
        setShowDocuSignFrame(true);
        setShowDocuSignForm(false);
        
        // Log to blockchain
        const activityText = `DocuSign envelope created for ${clientName} (${clientEmail})`;
        await logToBlockchain(activityText, 'docusign_envelope_created');
        
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to create DocuSign envelope', response.status, errorData);
        
        if (errorData.error === 'consent_required') {
          // Show consent form instead of alert
          setShowDocuSignConsent(true);
        } else {
          alert(`Failed to create DocuSign envelope: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error creating DocuSign envelope:', error);
      alert('Error creating DocuSign envelope. Please try again.');
    } finally {
      setProcessingDocuSign(false);
    }
  };

  const handleCloseDocuSignFrame = () => {
    setShowDocuSignFrame(false);
    setDocuSignUrl('');
    setEnvelopeId('');
    setClientName('');
    setClientEmail('');
    setShowDocuSignForm(false);
    
    // Reset contract states
    setAmendedContract(null);
    setAmendmentInstruction('');
    setSavedNote(null);
    setContractStep(1);
    setSelectedJurisdiction('');
    setContractDocument('');
    setIsContractAmendment(false);
  };

  const handleDocuSignConsentGranted = () => {
    setShowDocuSignConsent(false);
    // Retry creating the envelope
    handleCreateDocuSignEnvelope();
  };

  const handleGenerateFollowUp = async () => {
    console.log('Generate follow-up clicked!', { 
      hasClientNotes: !!clientNotesContent,
      clientNotesLength: clientNotesContent?.length 
    });
    
    if (!clientNotesContent) {
      console.log('No client notes content to generate follow-up from');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('Sending request to generate follow-up...');
      const response = await fetch('http://localhost:3001/api/generate-followup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId,
          agentId: user.id,
          noteContent: clientNotesContent
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Follow-up generation response:', result);
        
        if (result.success && result.data) {
          // Log to blockchain
          const activityText = `Follow-up message generated for client ${clientId}: ${result.data.message.substring(0, 100)}...`;
          const blockchainResult = await logToBlockchain(activityText, 'message_generation');
          
          // Transform the API response to match our frontend format
          const followUp = {
            subject: `Follow-up: ${clientId}`,
            body: result.data.message,
            tone: 'Professional',
            date: new Date().toISOString(),
            blockchainTx: blockchainResult.success ? blockchainResult.txHash : null,
            blockchainTimestamp: blockchainResult.timestamp
          };
          console.log('Setting generated follow-up:', followUp);
          setGeneratedFollowUp(followUp);
        } else {
          console.error('Failed to generate follow-up: Invalid response format', result);
        }
      } else {
        console.error('Failed to generate follow-up', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error generating follow-up:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async () => {
    if (!generatedFollowUp) return;
    
    try {
      const response = await fetch('http://localhost:3001/api/gmail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId,
          subject: generatedFollowUp.subject,
          body: generatedFollowUp.body,
          scheduledTime: null // Send immediately
        })
      });

      if (response.ok) {
        console.log('Message sent successfully');
        // Add to communication history
        setCommunicationHistory(prev => [{
          id: Date.now(),
          subject: generatedFollowUp.subject,
          body: generatedFollowUp.body,
          tone: generatedFollowUp.tone,
          date: new Date().toISOString(),
          scheduled: false
        }, ...prev]);
        
        // Reset states
        setGeneratedFollowUp(null);
        setSavedNote(null);
      } else {
        console.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleCopyMessage = async () => {
    if (!generatedFollowUp && !amendedContract) return;
    
    const textToCopy = generatedFollowUp 
      ? `${generatedFollowUp.subject}\n\n${generatedFollowUp.body}`
      : amendedContract;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  // Supabase helpers for importing extension notes
  const handleSupaLogin = async () => {
    try {
      setSupaLoading(true);
      await supaSignInWithPassword(supaEmail, supaPassword);
      const session = await supaGetSession();
      setSupaSession(session);
    } catch (e) {
      console.error('Supabase login failed', e);
      alert('Supabase login failed');
    } finally {
      setSupaLoading(false);
    }
  };

  const handleSupaLoadNotes = async () => {
    try {
      setSupaLoading(true);
      const session = supaSession || (await supaGetSession());
      if (!session?.user?.id) {
        alert('Please sign in to Supabase');
        return;
      }
      const items = await supaListUserExtracts(session.user.id);
      setSupaNotes(items);
    } catch (e) {
      console.error('Load notes failed', e);
      alert('Failed to load notes from extension');
    } finally {
      setSupaLoading(false);
    }
  };

  const handleSupaUseNote = async (note) => {
    try {
      setSupaLoading(true);
      const data = await supaDownloadJson(note.path);
      // Prefer converting fields to readable text if structure matches extension
      let content = '';
      if (data && Array.isArray(data.fields)) {
        content = data.fields.map((f, i) => `${f.label || `Field ${i+1}`}:\n${f.text}\n`).join('\n');
      } else if (typeof data === 'string') {
        content = data;
      } else {
        content = JSON.stringify(data, null, 2);
      }
      setClientNotesContent(content);
      setFileUploaded(true);
      setClientNotesFile({ name: note.name });
    } catch (e) {
      console.error('Use note failed', e);
      alert('Failed to load selected note');
    } finally {
      setSupaLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (selectedPathway === 'followup') {
        handleClientNotesUpload(e.dataTransfer.files[0]);
      } else {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      if (selectedPathway === 'followup') {
        handleClientNotesUpload(e.target.files[0]);
      } else {
        handleFileUpload(e.target.files[0]);
      }
    }
  };

  const handleFileUpload = async (file) => {
    // Placeholder implementation
    console.log('Uploading file:', file.name);
  };

  const handleClientNotesUpload = async (file) => {
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId);

      const response = await fetch('http://localhost:3001/api/upload-client-notes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setClientNotesFile(file);
        setClientNotesContent(result.content);
        setFileUploaded(true);
      } else {
        console.error('Failed to upload client notes');
      }
    } catch (error) {
      console.error('Error uploading client notes:', error);
    } finally {
      setUploadingFile(false);
    }
  };

  // Show authentication screens if not authenticated
  if (!isAuthenticated) {
    return showLogin ? (
      <Login onLogin={handleLogin} onSwitchToRegister={switchToRegister} />
    ) : (
      <Register onRegister={handleRegister} onSwitchToLogin={switchToLogin} />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: customColors.appBackground }}>
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 border-b shadow-xl z-50"
           style={{ background: customColors.headerBackground, borderColor: customColors.headerBorder }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-4">
                {/* Updated Logo */}
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shadow-lg border" style={{borderColor: customColors.headerBorder}}>
                    <svg className="w-7 h-7 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: customColors.headerText }}>
                      AgentHub
                    </h1>
                    {/* Tagline removed as requested */}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Client Selection - Moved to top right */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium" style={{ color: customColors.headerText }}>
                  Client:
                </span>
                <select
                  value={selectedMainClient}
                  onChange={(e) => {
                    setSelectedMainClient(e.target.value);
                    setSelectedCopilotClient(e.target.value); // Sync with chatbot
                    setClientId(e.target.value);
                  }}
                  className="px-4 py-2 rounded-lg text-sm border shadow-sm bg-transparent"
                  style={{ 
                    backgroundColor: 'transparent',
                    borderColor: customColors.headerBorder,
                    color: customColors.headerText
                  }}
                >
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Logout Button - Icon only */}
              <button
                onClick={handleLogout}
                aria-label="Logout"
                className="p-2 rounded-lg transition-all duration-200 hover:bg-white/10"
                style={{ color: customColors.headerText }}
                title="Logout"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
            
            {/* Settings and Admin Buttons */}
            <div className="flex items-center space-x-3">
              {/* Tab Navigation */}
              <div className="flex items-center space-x-1 bg-white/5 rounded-lg p-1 border" style={{borderColor: customColors.headerBorder}}>
                <button
                  onClick={handleDashboardClick}
                  className={`px-4 py-2 rounded-md font-bold transition-all duration-200 flex items-center space-x-2 ${
                    activeTab === 'dashboard' ? 'text-white' : 'text-gray-200 hover:text-white'
                  }`}
                  style={{ 
                    backgroundColor: activeTab === 'dashboard' ? customColors.primaryButton : 'transparent'
                  }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveTab('clients')}
                  className={`px-4 py-2 rounded-md font-bold transition-all duration-200 flex items-center space-x-2 ${
                    activeTab === 'clients' ? 'text-white' : 'text-gray-200 hover:text-white'
                  }`}
                  style={{ 
                    backgroundColor: activeTab === 'clients' ? customColors.primaryButton : 'transparent'
                  }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                  </svg>
                  <span>Clients</span>
                </button>
                <button
                  onClick={() => setActiveTab('contracts')}
                  className={`px-4 py-2 rounded-md font-bold transition-all duration-200 flex items-center space-x-2 ${
                    activeTab === 'contracts' ? 'text-white' : 'text-gray-200 hover:text-white'
                  }`}
                  style={{ 
                    backgroundColor: activeTab === 'contracts' ? customColors.primaryButton : 'transparent'
                  }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Contracts</span>
                </button>
                <button
                  onClick={() => setActiveTab('flows')}
                  className={`px-4 py-2 rounded-md font-bold transition-all duration-200 flex items-center space-x-2 ${
                    activeTab === 'flows' ? 'text-white' : 'text-gray-200 hover:text-white'
                  }`}
                  style={{ 
                    backgroundColor: activeTab === 'flows' ? customColors.primaryButton : 'transparent'
                  }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187a1.993 1.993 0 00-.169-.712v-.001z" clipRule="evenodd"/>
                  </svg>
                  <span>AI Flows</span>
                </button>
                <button
                  onClick={() => setActiveTab('ledger')}
                  className={`px-4 py-2 rounded-md font-bold transition-all duration-200 flex items-center space-x-2 ${
                    activeTab === 'ledger' ? 'text-white' : 'text-gray-2 00 hover:text-white'
                  }`}
                  style={{ 
                    backgroundColor: activeTab === 'ledger' ? customColors.primaryButton : 'transparent'
                  }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm3 2h8v2H6V7zm0 4h8v2H6v-2z" clipRule="evenodd"/>
                  </svg>
                  <span>Ledger</span>
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-4 py-2 rounded-md font-bold transition-all duration-200 flex items-center space-x-2 ${
                    activeTab === 'settings' ? 'text-white' : 'text-gray-200 hover:text-white'
                  }`}
                  style={{ 
                    backgroundColor: activeTab === 'settings' ? customColors.primaryButton : 'transparent'
                  }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                  </svg>
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordChange && (
        <PasswordChange onClose={() => setShowPasswordChange(false)} />
      )}

      {/* Main Content */}
      <div className={`px-6 pb-6 transition-all duration-300 ${activeTab === 'dashboard' ? '' : 'pt-24'} ${copilotOpen ? 'mr-96' : ''}`}>
        <div className="max-w-6xl mx-auto">
          {/* Main Dashboard Tab */}
          {activeTab === 'dashboard' && !showPathwayInterface && (
            <div className="pt-44">
              {/* Welcome Message */}
              <div className="mb-8">
                <h1 className="text-5xl font-extrabold mb-2 tracking-tight" style={{ color: customColors.textPrimary }}>
                  Hello, {user?.firstName || 'User'}.
                </h1>
                <p className="text-2xl" style={{ color: customColors.textSecondary }}>
                  What would you like to do today?
                </p>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {/* Card 1: Modify a Contract */}
                <div 
                  onClick={() => handlePathwaySelect('contract')}
                  className="rounded-2xl border shadow-xl p-8 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                  style={{ 
                    background: customColors.gradientCardBlue,
                    borderColor: customColors.cardBorder 
                  }}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold mb-3" style={{ color: customColors.textPrimary }}>
                      Modify a Contract
                    </h3>
                    <p className="text-lg" style={{ color: customColors.textSecondary }}>
                      Quickly apply changes to standard real estate forms
                    </p>
                  </div>
                </div>

                {/* Card 2: Generate a Follow-Up Message */}
                <div 
                  onClick={() => handlePathwaySelect('followup')}
                  className="rounded-2xl border shadow-xl p-8 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                  style={{ 
                    background: customColors.gradientCardGreen,
                    borderColor: customColors.cardBorder 
                  }}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold mb-3" style={{ color: customColors.textPrimary }}>
                      Generate a Follow-Up Message
                    </h3>
                    <p className="text-lg" style={{ color: customColors.textSecondary }}>
                      Turn notes into an email or text for your client
                    </p>
                  </div>
                </div>

                {/* Card 3: Schedule Showing */}
                <div 
                  onClick={() => setActiveTab('clients')}
                  className="rounded-2xl border shadow-xl p-8 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                  style={{ 
                    background: customColors.gradientCardIndigo,
                    borderColor: customColors.cardBorder 
                  }}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold mb-3" style={{ color: customColors.textPrimary }}>
                      Schedule Showing
                    </h3>
                    <p className="text-lg" style={{ color: customColors.textSecondary }}>
                      Book a property showing and notify your client
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Activity Section */}
              <div className="mt-12">
                <h2 className="text-2xl font-bold mb-6" style={{ color: customColors.textPrimary }}>
                  Recent Activity
                </h2>
                <div className="space-y-3">
                  {recentActivity.length > 0 ? (
                    recentActivity.slice(0, 5).map((activity, index) => (
                      <div
                        key={`${activity.type}-${activity.id || index}`}
                        onClick={() => handleActivityClick(activity)}
                        className="p-4 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white hover:bg-opacity-10"
                        style={{ 
                          backgroundColor: customColors.cardBackground,
                          borderColor: customColors.cardBorder,
                          border: '1px solid'
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <div className="flex-1">
                            <p className="text-sm" style={{ color: customColors.textSecondary }}>
                              {activity.type === 'note' 
                                ? `You created a note for ${clients.find(c => c.id === activity.client_id)?.name || 'a client'}`
                                : `You generated a follow-up message for ${clients.find(c => c.id === activity.client_id)?.name || 'a client'}`
                              }
                            </p>
                            <p className="text-xs opacity-70" style={{ color: customColors.textSecondary }}>
                              {formatTimeAgo(activity.date)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Blockchain Info */}
                        {activity.blockchainTx && (
                          <BlockchainInfo
                            txHash={activity.blockchainTx}
                            activityType={activity.type === 'note' ? 'note_creation' : 'message_generation'}
                            timestamp={activity.blockchainTimestamp || activity.date}
                            customColors={customColors}
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8" style={{ color: customColors.textSecondary }}>
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pathway Interface */}
          {activeTab === 'dashboard' && showPathwayInterface && (
            <div className="pt-8">
              {/* Back Button */}
              <div className="mb-8">
                <button
                  onClick={handleBackToCards}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 hover:bg-white hover:bg-opacity-10"
                  style={{ color: customColors.textSecondary }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Back to AI Assistant</span>
                </button>
              </div>

              {/* Pathway-specific content */}
              {selectedPathway === 'contract' && (
                <div className="max-w-6xl mx-auto">
                  <div className="text-center mb-8">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold mb-3" style={{ color: customColors.textPrimary }}>
                      Modify a Contract
                    </h3>
                    <p className="text-lg" style={{ color: customColors.textSecondary }}>
                      Complete contract modification and signing workflow
                    </p>
                  </div>

                  {/* Animated Contract Flow */}
                  <AnimatedContractFlow
                    onClose={() => {
                      setContractDocument('');
                      setContractStep(1);
                      setSelectedJurisdiction('');
                    }}
                    customColors={customColors}
                    token={token}
                  />
                </div>
              )}

              {selectedPathway === 'followup' && (
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-8">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold mb-3" style={{ color: customColors.textPrimary }}>
                      Generate Follow-Up Message
                    </h3>
                    <p className="text-lg" style={{ color: customColors.textSecondary }}>
                      Upload your client notes and generate a personalized message
                    </p>
                  </div>

                  <div className="backdrop-blur-md rounded-2xl border shadow-2xl p-8"
                       style={{ backgroundColor: customColors.cardBackground, borderColor: customColors.cardBorder }}>
                    
                    {/* File Upload Section */}
                    <div className="mb-8">
                      <h4 className="text-xl font-bold mb-4" style={{ color: customColors.textPrimary }}>
                        Upload Client Notes
                      </h4>
                      <p className="text-sm mb-6" style={{ color: customColors.textSecondary }}>
                        Upload a file containing your client notes, meeting minutes, or any relevant information
                      </p>
                      
                      <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                          dragActive ? 'border-blue-400 bg-blue-50 bg-opacity-10' : ''
                        }`}
                        style={{ borderColor: customColors.cardBorder }}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileInput}
                          className="hidden"
                          accept=".txt,.doc,.docx,.pdf"
                        />
                        
                        {!fileUploaded ? (
                          <div>
                            <svg className="w-12 h-12 mx-auto mb-4" style={{ color: customColors.textSecondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-lg mb-2" style={{ color: customColors.textPrimary }}>
                              Drag and drop your file here, or
                            </p>
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="px-6 py-2 rounded-lg font-bold transition-all duration-200"
                              style={{ 
                                backgroundColor: customColors.primaryButton,
                                color: 'white'
                              }}
                            >
                              Browse Files
                            </button>
                            <p className="text-sm mt-2" style={{ color: customColors.textSecondary }}>
                              Supports .txt, .doc, .docx, .pdf files
                            </p>
                          </div>
                        ) : (
                          <div>
                            <svg className="w-12 h-12 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <p className="text-lg mb-2" style={{ color: customColors.textPrimary }}>
                              File uploaded successfully!
                            </p>
                            <p className="text-sm" style={{ color: customColors.textSecondary }}>
                              {clientNotesFile?.name}
                            </p>
                            <button
                              onClick={() => {
                                setFileUploaded(false);
                                setClientNotesFile(null);
                                setClientNotesContent('');
                              }}
                              className="mt-2 px-4 py-1 rounded text-sm transition-all duration-200"
                              style={{ 
                                backgroundColor: customColors.secondaryButton,
                                color: 'white'
                              }}
                            >
                              Upload Different File
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Import from Extension (Supabase) */}
                    <div className="mb-8 border rounded-lg p-4" style={{ borderColor: customColors.cardBorder }}>
                      <h4 className="text-xl font-bold mb-4" style={{ color: customColors.textPrimary }}>
                        Import from Extension
                      </h4>
                      {!supaSession ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                          <div>
                            <label className="block text-sm mb-1" style={{ color: customColors.textSecondary }}>Email</label>
                            <input
                              value={supaEmail}
                              onChange={(e) => setSupaEmail(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border bg-transparent"
                              style={{ borderColor: customColors.cardBorder, color: customColors.textPrimary }}
                              placeholder="you@company.com"
                              type="email"
                            />
                          </div>
                          <div>
                            <label className="block text-sm mb-1" style={{ color: customColors.textSecondary }}>Password</label>
                            <input
                              value={supaPassword}
                              onChange={(e) => setSupaPassword(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border bg-transparent"
                              style={{ borderColor: customColors.cardBorder, color: customColors.textPrimary }}
                              placeholder="••••••••"
                              type="password"
                            />
                          </div>
                          <div className="flex md:justify-end">
                            <button
                              onClick={handleSupaLogin}
                              disabled={supaLoading}
                              className="px-4 py-2 rounded-lg font-bold"
                              style={{ backgroundColor: customColors.primaryButton, color: 'white' }}
                            >
                              {supaLoading ? 'Signing In…' : 'Sign in'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm" style={{ color: customColors.textSecondary }}>
                              Signed in to Supabase
                            </p>
                            <button
                              onClick={handleSupaLoadNotes}
                              disabled={supaLoading}
                              className="px-3 py-2 rounded-lg font-bold"
                              style={{ backgroundColor: customColors.secondaryButton, color: 'white' }}
                            >
                              {supaLoading ? 'Loading…' : 'Load Notes'}
                            </button>
                          </div>
                          {supaNotes.length > 0 && (
                            <div className="space-y-2 max-h-48 overflow-auto">
                              {supaNotes.map((n) => (
                                <div key={n.path} className="flex items-center justify-between p-2 rounded border" style={{ borderColor: customColors.cardBorder }}>
                                  <div className="text-sm" style={{ color: customColors.textSecondary }}>{n.name}</div>
                                  <button
                                    onClick={() => handleSupaUseNote(n)}
                                    className="px-3 py-1 text-sm rounded-lg font-bold"
                                    style={{ backgroundColor: customColors.primaryButton, color: 'white' }}
                                  >
                                    Use
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Generate Follow-Up Button */}
                    <div className="text-center">
                      <button
                        onClick={handleGenerateFollowUp}
                        disabled={!fileUploaded || loading}
                        className="px-8 py-4 rounded-lg font-bold transition-all duration-200 flex items-center space-x-3 mx-auto disabled:opacity-50"
                        style={{ 
                          backgroundColor: customColors.secondaryButton,
                          color: 'white'
                        }}
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>Generate Follow-Up Message</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Generated Follow-Up Display */}
                    {generatedFollowUp && (
                      <div className="mt-8">
                        <h5 className="text-lg font-bold mb-4" style={{ color: customColors.textPrimary }}>
                          Generated Follow-Up Message:
                        </h5>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-bold mb-2" style={{ color: customColors.textSecondary }}>
                              Subject:
                            </label>
                            <div className="p-3 rounded-lg border-2"
                                 style={{ 
                                   borderColor: customColors.cardBorder,
                                   backgroundColor: customColors.cardBackground
                                 }}>
                              <p style={{ color: customColors.textPrimary }}>{generatedFollowUp.subject}</p>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-bold mb-2" style={{ color: customColors.textSecondary }}>
                              Message:
                            </label>
                            <div className="p-4 rounded-lg border-2 max-h-96 overflow-y-auto"
                                 style={{ 
                                   borderColor: customColors.cardBorder,
                                   backgroundColor: customColors.cardBackground
                                 }}>
                              <pre className="whitespace-pre-wrap text-sm" style={{ color: customColors.textPrimary }}>
                                {generatedFollowUp.body}
                              </pre>
                            </div>
                          </div>
                          <div className="flex space-x-4">
                            <button
                              onClick={handleCopyMessage}
                              className="px-4 py-2 rounded-lg font-bold transition-all duration-200 flex items-center space-x-2"
                              style={{ 
                                backgroundColor: customColors.secondaryButton,
                                color: 'white'
                              }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span>{copied ? 'Copied!' : 'Copy Message'}</span>
                            </button>
                            <button
                              onClick={handleSendNow}
                              className="px-4 py-2 rounded-lg font-bold transition-all duration-200 flex items-center space-x-2"
                              style={{ 
                                backgroundColor: customColors.primaryButton,
                                color: 'white'
                              }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span>Send Now</span>
                            </button>
                          </div>
                          
                          {/* Blockchain Info */}
                          {generatedFollowUp.blockchainTx && (
                            <BlockchainInfo
                              txHash={generatedFollowUp.blockchainTx}
                              activityType="message_generation"
                              timestamp={generatedFollowUp.blockchainTimestamp || generatedFollowUp.date}
                              customColors={customColors}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Placeholder for other pathways */}
              {(selectedPathway === 'meeting' || selectedPathway === 'documents' || selectedPathway === 'suggest') && (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-3" style={{ color: customColors.textPrimary }}>
                    Coming Soon
                  </h3>
                  <p className="text-lg" style={{ color: customColors.textSecondary }}>
                    This feature is under development
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Agent Dashboard Tab */}
          {activeTab === 'clients' && (
            <AgentDashboard
              user={user}
              customColors={customColors}
              clientId={clientId}
              setClientId={setClientId}
              clients={clients}
              onGenerateFollowUp={() => {
                console.log('onGenerateFollowUp called from App.js');
                console.log('Current activeTab:', activeTab);
                setActiveTab('dashboard');
                handlePathwaySelect('followup');
                console.log('After navigation - activeTab: dashboard, pathway: followup');
              }}
              onContractAmendment={() => {
                console.log('onContractAmendment called from App.js');
                console.log('Current activeTab:', activeTab);
                setActiveTab('dashboard');
                handlePathwaySelect('contract');
                console.log('After navigation - activeTab: dashboard, pathway: contract');
              }}
              onDocuSignCreate={() => {
                console.log('onDocuSignCreate called from App.js');
                console.log('Current showDocuSignForm:', showDocuSignForm);
                setShowDocuSignForm(true);
                console.log('After setShowDocuSignForm - showDocuSignForm:', true);
              }}
            />
          )}

          {/* Ledger Tab */}
          {activeTab === 'ledger' && (
            <BlockchainTracker
              customColors={customColors}
            />
          )}

          {/* Contracts Tab */}
          {activeTab === 'contracts' && (
            <ContractsPage
              customColors={customColors}
              token={token}
              clientId={clientId}
              onModifySelected={({ state, document, content }) => {
                // Navigate to dashboard to show the animated contract flow (which contains DocuSign step)
                setActiveTab('dashboard');
                handlePathwaySelect('contract');
                // Optionally seed the amendment instruction/contract content in the flow later
              }}
            />
          )}

          {/* AI Flows Tab */}
          {activeTab === 'flows' && (
            <ConversationalFlows
              token={token}
            />
          )}

          {/* History Tab */}
          {activeTab === 'history_disabled' && (
            <div className="backdrop-blur-md rounded-2xl border shadow-2xl p-8"
                 style={{ 
                   backgroundColor: customColors.cardBackground, 
                   borderColor: customColors.cardBorder 
                 }}>
              
              {/* Communication History Section */}
              <div className="mb-12">
                <h2 className="text-3xl font-black mb-6" style={{ color: customColors.textPrimary }}>
                  Communication History
                </h2>
                <p className="text-lg mb-6" style={{ color: customColors.textSecondary }}>
                  View all your previous correspondence and generated messages
                </p>
                
                {communicationHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-lg" style={{ color: customColors.textSecondary }}>
                      No communication history yet
                    </p>
                    <p className="text-sm mt-2" style={{ color: customColors.textSecondary }}>
                      Your sent messages and follow-ups will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {communicationHistory.map((item) => (
                      <div key={item.id} className="p-4 rounded-lg border" style={{ borderColor: customColors.cardBorder }}>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold" style={{ color: customColors.textPrimary }}>
                            {item.subject}
                          </h3>
                          <span className="text-sm" style={{ color: customColors.textSecondary }}>
                            {new Date(item.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm mb-2" style={{ color: customColors.textSecondary }}>
                          {item.body.substring(0, 150)}...
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 text-xs rounded-full" style={{ 
                            backgroundColor: customColors.primaryButton,
                            color: 'white'
                          }}>
                            {item.scheduled ? 'Scheduled' : 'Sent'}
                          </span>
                          {item.tone && (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-600 text-white">
                              {item.tone}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contracts Section */}
              <div className="border-t pt-8" style={{ borderColor: customColors.cardBorder }}>
                <h2 className="text-3xl font-black mb-6" style={{ color: customColors.textPrimary }}>
                  Contracts
                </h2>
                <p className="text-lg mb-6" style={{ color: customColors.textSecondary }}>
                  View all your amended contracts and modifications
                </p>
                
                {contractHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-lg" style={{ color: customColors.textSecondary }}>
                      No contracts yet
                    </p>
                    <p className="text-sm mt-2" style={{ color: customColors.textSecondary }}>
                      Your amended contracts will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contractHistory.map((contract) => (
                      <div key={contract.id} className="p-4 rounded-lg border" style={{ borderColor: customColors.cardBorder }}>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold" style={{ color: customColors.textPrimary }}>
                            {contract.document || 'Contract Amendment'}
                          </h3>
                          <span className="text-sm" style={{ color: customColors.textSecondary }}>
                            {new Date(contract.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mb-2">
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-600 text-white mr-2">
                            {contract.jurisdiction || 'Unknown Jurisdiction'}
                          </span>
                          <span className="px-2 py-1 text-xs rounded-full" style={{ 
                            backgroundColor: customColors.secondaryButton,
                            color: 'white'
                          }}>
                            Amended
                          </span>
                        </div>
                        <p className="text-sm mb-2" style={{ color: customColors.textSecondary }}>
                          <strong>Instruction:</strong> {contract.amendmentInstruction}
                        </p>
                        <div className="mb-3 p-3 rounded bg-gray-800 bg-opacity-50">
                          <p className="text-xs mb-1" style={{ color: customColors.textSecondary }}>
                            <strong>Contract Preview:</strong>
                          </p>
                          <p className="text-xs" style={{ color: customColors.textSecondary }}>
                            {contract.amendedContract.substring(0, 200)}...
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(contract.amendedContract);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="px-3 py-1 text-xs rounded-lg font-medium transition-all duration-200 flex items-center space-x-1"
                            style={{ 
                              backgroundColor: customColors.primaryButton,
                              color: 'white'
                            }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy</span>
                          </button>
                          <button
                            onClick={() => {
                              const blob = new Blob([contract.amendedContract], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${contract.document || 'contract'}_amended.txt`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="px-3 py-1 text-xs rounded-lg font-medium transition-all duration-200 flex items-center space-x-1"
                            style={{ 
                              backgroundColor: customColors.secondaryButton,
                              color: 'white'
                            }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Download</span>
                          </button>
                        </div>
                        
                        {/* Blockchain Info */}
                        {contract.blockchainTx && (
                          <BlockchainInfo
                            txHash={contract.blockchainTx}
                            activityType="contract_modification"
                            timestamp={contract.blockchainTimestamp || contract.date}
                            customColors={customColors}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <ThemeSettings
              customColors={customColors}
              setCustomColors={setCustomColors}
              textSizes={textSizes}
              setTextSizes={setTextSizes}
              userPreferences={userPreferences}
              setUserPreferences={setUserPreferences}
              onSave={saveUserSettings}
              onPasswordChange={() => setShowPasswordChange(true)}
            />
          )}

          {/* DocuSign iFrame Modal */}
          {showDocuSignFrame && docuSignUrl && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      📝 Electronic Signature - DocuSign
                    </h3>
                    <p className="text-sm text-gray-600">
                      Envelope ID: {envelopeId}
                    </p>
                  </div>
                  <button
                    onClick={handleCloseDocuSignFrame}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* iFrame Container */}
                <div className="flex-1 p-4">
                  <iframe 
                    src={docuSignUrl} 
                    width="100%" 
                    height="100%" 
                    frameBorder="0"
                    title="DocuSign Electronic Signature"
                    className="rounded-lg border"
                  />
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Client: {clientName} ({clientEmail})
                    </p>
                    <button
                      onClick={handleCloseDocuSignFrame}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Floating Copilot Chat */}
        {isAuthenticated && (
          <ChatCopilot 
            token={token} 
            user={user}
            clients={clients}
            clientId={clientId} 
            customColors={customColors}
            copilotOpen={copilotOpen}
            setCopilotOpen={setCopilotOpen}
            selectedMainClient={selectedMainClient}
            onClientSelect={(clientId) => {
              setSelectedMainClient(clientId);
              setSelectedCopilotClient(clientId);
              setClientId(clientId);
            }}
          />
        )}
      </div>
    </div>
  );
} 