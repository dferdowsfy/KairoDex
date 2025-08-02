import { useState, useEffect, useRef } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import PasswordChange from './components/PasswordChange';

export default function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [token, setToken] = useState(null);

  // Tab management
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'history', 'settings'

  // App states
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [newNote, setNewNote] = useState('');
  const [savedNote, setSavedNote] = useState(null);
  const [generatedFollowUp, setGeneratedFollowUp] = useState(null);
  const [communicationHistory, setCommunicationHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistoryItems, setExpandedHistoryItems] = useState(new Set());
  const [clientId, setClientId] = useState('client1');
  const [scheduledTime, setScheduledTime] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  
  // Email integration states
  const [emailProvider, setEmailProvider] = useState('gmail');
  const [emailConnected, setEmailConnected] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  
  // User settings states
  const [customColors, setCustomColors] = useState({
    background: '#0B1F33',
    cardBackground: 'rgba(255, 255, 255, 0.1)',
    cardBorder: 'rgba(255, 255, 255, 0.2)',
    primaryButton: '#1E85F2',
    secondaryButton: '#10B981',
    textPrimary: '#F8EEDB',
    textSecondary: '#9CA3AF'
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
  const fileInputRef = useRef(null);

  // Contract amendment states
  const [isContractAmendment, setIsContractAmendment] = useState(false);
  const [amendmentInstruction, setAmendmentInstruction] = useState('');
  const [amendedContract, setAmendedContract] = useState(null);
  const [processingAmendment, setProcessingAmendment] = useState(false);

  // Sample clients for dropdown
  const clients = [
    { id: 'client1', name: 'Sarah Johnson' },
    { id: 'client2', name: 'Mike Chen' },
    { id: 'client3', name: 'Emily Rodriguez' },
    { id: 'client4', name: 'David Thompson' },
    { id: 'client5', name: 'Lisa Wang' }
  ];

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

  // Load user settings from backend
  const loadUserSettings = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setCustomColors(data.data.theme_colors);
        setTextSizes(data.data.text_sizes);
        setUserPreferences(data.data.preferences);
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  // Save user settings to backend
  const saveUserSettings = async () => {
    setIsSavingSettings(true);
    try {
      const response = await fetch('http://localhost:3001/api/auth/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme_colors: customColors,
          text_sizes: textSizes,
          preferences: userPreferences
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Settings saved successfully');
        return { success: true };
      } else {
        console.error('Failed to save settings:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Error saving user settings:', error);
      return { success: false, error: error.message };
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Manual save settings function
  const handleManualSave = async () => {
    const result = await saveUserSettings();
    if (result.success) {
      alert('✅ Settings saved successfully!');
    } else {
      alert(`❌ Failed to save settings: ${result.error}`);
    }
  };

  // Handle login
  const handleLogin = (data) => {
    setToken(data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    loadUserSettings();
  };

  // Handle registration
  const handleRegister = (data) => {
    setToken(data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    loadUserSettings();
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setShowLogin(true);
  };

  // Switch between login and register
  const switchToRegister = () => setShowLogin(false);
  const switchToLogin = () => setShowLogin(true);

  // Sample communication history
  const sampleHistory = [
    {
      id: 1,
      subject: 'Follow-up on Fremont property viewing',
      date: '2024-01-15T09:00:00',
      tone: 'Friendly',
      preview: 'Hi Sarah! I hope you had a great time viewing the Fremont property yesterday...',
      fullMessage: 'Hi Sarah! I hope you had a great time viewing the Fremont property yesterday. I wanted to follow up and see if you had any questions about the home or the neighborhood. The schools in that area are excellent, and the commute to downtown is only 25 minutes. Let me know if you\'d like to schedule another viewing or if you have any other properties in mind!'
    },
    {
      id: 2,
      subject: 'Market update for your area',
      date: '2024-01-10T14:30:00',
      tone: 'Professional',
      preview: 'Hi Sarah, I wanted to share some exciting market insights for your target area...',
      fullMessage: 'Hi Sarah, I wanted to share some exciting market insights for your target area. Home values in Fremont have increased by 8% over the last quarter, and inventory is starting to pick up. This could be a great time to make a move. I\'ve identified three new listings that match your criteria perfectly. Would you like me to schedule viewings for any of these properties?'
    }
  ];

  useEffect(() => {
    if (isAuthenticated) {
      setCommunicationHistory(sampleHistory);
      // Set default scheduled time to next morning 9:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setScheduledTime(tomorrow.toISOString().slice(0, 16));
    }
  }, [isAuthenticated]);

  // Load user settings when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      loadUserSettings();
    }
  }, [isAuthenticated, token]);

  // Load sample history data when history tab is first accessed
  useEffect(() => {
    if (activeTab === 'history' && communicationHistory.length === 0) {
      // Add some sample history data
      const sampleHistory = [
        {
          id: 1,
          subject: "Follow-up: Property Viewing Schedule",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          tone: "Professional",
          preview: "Hi Sarah, I hope you're doing well. I wanted to follow up on our conversation about the property viewing schedule...",
          fullMessage: "Hi Sarah,\n\nI hope you're doing well. I wanted to follow up on our conversation about the property viewing schedule for next week. I've identified several properties that match your criteria for a 3-bedroom home in the downtown area.\n\nWould you be available for viewings on Tuesday or Thursday afternoon? I can arrange for us to see 3-4 properties that fit your budget and requirements.\n\nLooking forward to hearing from you!\n\nBest regards,\nDarius"
        },
        {
          id: 2,
          subject: "Market Update: New Listings in Your Area",
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          tone: "Informative",
          preview: "Good morning! I wanted to share some exciting new listings that have come on the market in your preferred neighborhood...",
          fullMessage: "Good morning!\n\nI wanted to share some exciting new listings that have come on the market in your preferred neighborhood. There are currently 3 new properties that match your criteria, including one that just listed yesterday with a great price point.\n\nI've attached the details for your review. Let me know if you'd like to schedule a viewing for any of these properties.\n\nBest regards,\nDarius"
        },
        {
          id: 3,
          subject: "Thank You: Open House Visit",
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
          tone: "Friendly",
          preview: "Thank you for attending our open house yesterday! It was great to meet you and discuss your home buying goals...",
          fullMessage: "Thank you for attending our open house yesterday! It was great to meet you and discuss your home buying goals.\n\nI appreciated learning more about your timeline and preferences. Based on our conversation, I think I have a good understanding of what you're looking for in your next home.\n\nI'll be in touch soon with some personalized recommendations that match your criteria.\n\nBest regards,\nDarius"
        }
      ];
      setCommunicationHistory(sampleHistory);
    }
  }, [activeTab, communicationHistory.length]);

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    // If contract amendment toggle is on, process amendment instead of saving note
    if (isContractAmendment) {
      await handleContractAmendment();
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/client-notes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: clientId,
          note: newNote
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Simulate tone inference (backend should provide this)
        const tones = ['Empathetic', 'Professional', 'Friendly', 'Enthusiastic', 'Supportive'];
        const randomTone = tones[Math.floor(Math.random() * tones.length)];
        
        const noteData = {
          id: Date.now(),
          content: newNote,
          tone: randomTone,
          timestamp: new Date().toISOString()
        };

        setSavedNote(noteData);
        setNewNote('');
        resetContractAmendment();
      } else {
        alert('Error saving note: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Error connecting to backend. Please check if the server is running.');
    }
  };

  const handleContractAmendment = async () => {
    if (!newNote.trim() || !amendmentInstruction.trim()) {
      alert('Please provide both the contract content and amendment instructions.');
      return;
    }

    setProcessingAmendment(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/contract-amendment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contract: newNote,
          instruction: amendmentInstruction,
          clientId: clientId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAmendedContract(data.data.amendedContract);
        setCurrentStep(2);
      } else {
        alert('Error processing contract amendment: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error processing contract amendment:', error);
      alert('Error connecting to backend. Please check if the server is running.');
    } finally {
      setProcessingAmendment(false);
    }
  };

  const handleSaveAmendedContract = async () => {
    if (!amendedContract) return;

    try {
      const response = await fetch('http://localhost:3001/api/save-amended-contract', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: clientId,
          originalContract: newNote,
          amendedContract: amendedContract,
          instruction: amendmentInstruction
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Amended contract saved successfully!');
        // Reset states
        setNewNote('');
        setAmendmentInstruction('');
        setIsContractAmendment(false);
        setAmendedContract(null);
        setSavedNote(null);
        setCurrentStep(1);
      } else {
        alert('Error saving amended contract: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving amended contract:', error);
      alert('Error connecting to backend. Please check if the server is running.');
    }
  };

  const handleGenerateFollowUp = async () => {
    if (!savedNote) {
      alert('Please save a note first before generating a follow-up.');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/generate-followup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: clientId,
          note: savedNote.content,
          noteTone: savedNote.tone
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const followUp = {
          subject: data.data.subject || `Follow-up: ${savedNote.content.split(' ').slice(0, 5).join(' ')}...`,
          body: data.data.message || data.data.body,
          tone: data.data.tone || savedNote.tone,
          timestamp: new Date().toISOString()
        };
        
        setGeneratedFollowUp(followUp);
        setCurrentStep(2);
      } else {
        alert('Error generating follow-up: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating follow-up:', error);
      alert('Error connecting to backend. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async () => {
    // Add to communication history
    const newHistoryItem = {
      id: Date.now(),
      subject: generatedFollowUp.subject,
      date: new Date().toISOString(),
      tone: generatedFollowUp.tone,
      preview: generatedFollowUp.body.split('\n\n')[0],
      fullMessage: generatedFollowUp.body
    };
    
    setCommunicationHistory([newHistoryItem, ...communicationHistory]);
    
    // If Gmail is connected, send the email
    if (emailConnected && emailProvider === 'gmail') {
      try {
        const response = await fetch('http://localhost:3001/api/gmail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: emailAddress,
            to: clients.find(c => c.id === clientId)?.name || 'Client',
            subject: generatedFollowUp.subject,
            body: generatedFollowUp.body
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          alert('Follow-up sent successfully via Gmail!');
        } else {
          alert('Failed to send email: ' + (data.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error sending email:', error);
        alert('Error sending email. Please check your Gmail connection.');
      }
    } else {
      // Show success message for history addition only
      alert('Follow-up added to history. Connect Gmail to send emails automatically.');
    }
    
    setGeneratedFollowUp(null);
    setSavedNote(null);
    setCurrentStep(1);
  };

  const handleSchedule = async () => {
    // Add to communication history with scheduled time
    const newHistoryItem = {
      id: Date.now(),
      subject: generatedFollowUp.subject,
      date: scheduledTime,
      tone: generatedFollowUp.tone,
      preview: generatedFollowUp.body.split('\n\n')[0],
      fullMessage: generatedFollowUp.body,
      scheduled: true
    };
    
    setCommunicationHistory([newHistoryItem, ...communicationHistory]);
    setGeneratedFollowUp(null);
    setSavedNote(null);
    setCurrentStep(1);
    
    // Show success message
    alert(`Follow-up scheduled for ${new Date(scheduledTime).toLocaleString()}`);
  };

  const handleCopyMessage = async () => {
    if (!generatedFollowUp) return;
    
    try {
      await navigator.clipboard.writeText(generatedFollowUp.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = generatedFollowUp.body;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleHistoryItem = (itemId) => {
    const newExpanded = new Set(expandedHistoryItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedHistoryItems(newExpanded);
  };

  const handleEmailConnection = async () => {
    try {
      if (emailProvider === 'gmail') {
        // Get OAuth URL from backend
        const response = await fetch('http://localhost:3001/api/auth/gmail', {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });
        const data = await response.json();
        
        if (data.success) {
          // Open OAuth popup
          const popup = window.open(
            data.authUrl,
            'gmail_oauth',
            'width=500,height=600,scrollbars=yes,resizable=yes'
          );
          
          // Check for OAuth completion
          const checkPopup = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkPopup);
              // Check if user is connected
              checkGmailConnection();
            }
          }, 1000);
        } else {
          alert('Failed to initiate Gmail authentication');
        }
      } else {
        // For Outlook, show placeholder
        alert('Outlook integration coming soon!');
      }
    } catch (error) {
      console.error('Email connection error:', error);
      alert('Error connecting to email provider');
    }
  };

  const checkGmailConnection = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/auth/gmail/status?email=${emailAddress || 'check'}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      const data = await response.json();
      
      if (data.success && data.connected) {
        setEmailConnected(true);
        setEmailAddress(data.email);
      }
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
    }
  };

  const disconnectGmail = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/gmail/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailAddress
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEmailConnected(false);
        setEmailAddress('');
        alert('Gmail disconnected successfully');
      }
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      alert('Error disconnecting Gmail');
    }
  };

  // Check for OAuth callback on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const gmailConnected = urlParams.get('gmail_connected');
    const email = urlParams.get('email');
    const error = urlParams.get('error');
    
    if (gmailConnected === 'true' && email) {
      setEmailConnected(true);
      setEmailAddress(email);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      alert(`Gmail connection failed: ${error}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // File upload handlers
  const handleFileUpload = async (file) => {
    if (!file) return;

    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only .txt, .pdf, .doc, .docx, .csv files are allowed.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size too large. Maximum size is 10MB.');
      return;
    }

    setUploadingFile(true);
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId);

      const response = await fetch('http://localhost:3001/api/upload-client-note', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        if (!data.content) {
          alert('File was uploaded but no content could be extracted. Please copy and paste the content manually.');
          setNewNote('');
        } else {
          setNewNote(data.content);
          setFileUploaded(true);
          
          // If this is a contract amendment workflow, show a helpful message
          if (isContractAmendment) {
            console.log('File uploaded successfully for contract amendment');
          }
        }
      } else {
        alert('Error processing file: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please check if the server is running.');
    } finally {
      setUploadingFile(false);
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
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleColorChange = (key, value) => {
    setCustomColors(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleTextSizeChange = (key, value) => {
    setTextSizes(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePreferenceChange = (key, value) => {
    setUserPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Reset contract amendment states when switching workflows
  const resetContractAmendment = () => {
    setIsContractAmendment(false);
    setAmendmentInstruction('');
    setAmendedContract(null);
    setProcessingAmendment(false);
    setFileUploaded(false);
  };

  // Reset file upload state when user manually types
  useEffect(() => {
    if (newNote && !uploadingFile) {
      setFileUploaded(false);
    }
  }, [newNote, uploadingFile]);

  // Save settings when they change (with debounce)
  useEffect(() => {
    if (isAuthenticated && token) {
      const timeoutId = setTimeout(() => {
        saveUserSettings().then(result => {
          if (!result.success) {
            console.warn('Auto-save failed:', result.error);
          }
        });
      }, 2000); // Wait 2 seconds after last change before saving

      return () => clearTimeout(timeoutId);
    }
  }, [customColors, textSizes, userPreferences, isAuthenticated, token]);

  // Show authentication screens if not authenticated
  if (!isAuthenticated) {
    return showLogin ? (
      <Login onLogin={handleLogin} onSwitchToRegister={switchToRegister} />
    ) : (
      <Register onRegister={handleRegister} onSwitchToLogin={switchToLogin} />
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: customColors.background }}>
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 backdrop-blur-md border-b shadow-xl z-50" 
           style={{ backgroundColor: customColors.cardBackground, borderColor: customColors.cardBorder }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-4">
                {/* Updated Logo */}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center shadow-lg border border-slate-600">
                    <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl font-light tracking-wide" style={{ color: customColors.textPrimary }}>
                      AgentHub
                    </h1>
                    <p className="text-xs font-medium -mt-1 tracking-wider uppercase" style={{ color: customColors.textSecondary }}>
                      Real Estate Automation
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div>
                  <label className="block text-sm font-bold mb-1" style={{ color: customColors.textSecondary }}>Agent</label>
                  <div className="text-sm font-semibold" style={{ color: customColors.textPrimary }}>
                    {user?.firstName} {user?.lastName}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1" style={{ color: customColors.textSecondary }}>Client</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="border-2 backdrop-blur-sm rounded-lg px-4 py-2 text-base font-semibold focus:outline-none min-w-[200px] shadow-sm"
                    style={{ 
                      borderColor: customColors.cardBorder, 
                      backgroundColor: customColors.cardBackground,
                      color: customColors.textPrimary
                    }}
                  >
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Settings and Admin Buttons */}
            <div className="flex items-center space-x-3">
              {/* Tab Navigation */}
              <div className="flex items-center space-x-1 bg-black bg-opacity-20 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-2 rounded-md font-bold transition-all duration-200 flex items-center space-x-2 ${
                    activeTab === 'dashboard' ? 'text-white' : 'text-gray-400 hover:text-white'
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
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-2 rounded-md font-bold transition-all duration-200 flex items-center space-x-2 ${
                    activeTab === 'history' ? 'text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  style={{ 
                    backgroundColor: activeTab === 'history' ? customColors.primaryButton : 'transparent'
                  }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                  </svg>
                  <span>History</span>
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-4 py-2 rounded-md font-bold transition-all duration-200 flex items-center space-x-2 ${
                    activeTab === 'settings' ? 'text-white' : 'text-gray-400 hover:text-white'
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
              
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg font-bold transition-all duration-200 flex items-center space-x-2"
                style={{ 
                  backgroundColor: '#EF4444',
                  color: 'white'
                }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordChange && (
        <PasswordChange onClose={() => setShowPasswordChange(false)} />
      )}

      {/* Progress Indicator - Only show on Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="pt-24 px-6 pb-6">
          <div className="max-w-4xl mx-auto mb-8">
            <div className="flex items-center justify-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                currentStep >= 1 ? 'text-white' : 'text-gray-300'
              }`} style={{ backgroundColor: currentStep >= 1 ? customColors.primaryButton : '#4B5563' }}>
                1
              </div>
              <div className={`flex-1 h-1 rounded`} style={{ backgroundColor: currentStep >= 2 ? customColors.primaryButton : '#4B5563' }}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                currentStep >= 2 ? 'text-white' : 'text-gray-300'
              }`} style={{ backgroundColor: currentStep >= 2 ? customColors.primaryButton : '#4B5563' }}>
                2
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`px-6 pb-6 ${activeTab === 'dashboard' ? '' : 'pt-24'}`}>
        <div className="max-w-6xl mx-auto">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Step 1: Add Notes Panel */}
              <div className="backdrop-blur-md rounded-2xl border shadow-2xl p-8"
                   style={{ 
                     backgroundColor: customColors.cardBackground, 
                     borderColor: customColors.cardBorder 
                   }}>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-black mb-2" style={{ color: customColors.textPrimary }}>Step 1: Add Notes</h2>
                  <p className="text-lg" style={{ color: customColors.textSecondary }}>
                    Summarize what you just learned or discussed with the client
                  </p>
                </div>

                <form onSubmit={handleSaveNote} className="space-y-6">
                  <div>
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Enter new notes..."
                      className="w-full p-6 border-2 rounded-xl resize-none placeholder-gray-400 focus:outline-none backdrop-blur-sm text-lg font-medium"
                      style={{ 
                        borderColor: customColors.cardBorder, 
                        backgroundColor: customColors.cardBackground,
                        color: customColors.textPrimary
                      }}
                      rows="6"
                    />
                  </div>

                  {/* File Upload */}
                  <div className="border-t pt-6" style={{ borderColor: customColors.cardBorder }}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold" style={{ color: customColors.textSecondary }}>Or Upload a File</h4>
                      {isContractAmendment && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold"
                              style={{ 
                                backgroundColor: `${customColors.primaryButton}20`,
                                color: customColors.primaryButton
                              }}>
                          Contract Mode
                        </span>
                      )}
                    </div>
                    <div
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200`}
                      style={{ 
                        borderColor: dragActive ? customColors.primaryButton : customColors.cardBorder,
                        backgroundColor: dragActive ? `${customColors.primaryButton}20` : `${customColors.cardBackground}50`
                      }}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileInput}
                        accept=".txt,.pdf,.doc,.docx,.csv"
                        className="hidden"
                      />
                      <div className="space-y-3">
                        <p className="text-base font-semibold" style={{ color: customColors.textSecondary }}>
                          Drag and drop a file here, or{' '}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="underline font-bold"
                            style={{ color: customColors.primaryButton }}
                          >
                            click to browse
                          </button>
                        </p>
                        <p className="text-sm font-semibold" style={{ color: customColors.textSecondary }}>
                          Supported: .txt, .pdf, .doc, .docx, .csv (max 10MB)
                        </p>
                        {isContractAmendment && (
                          <p className="text-sm font-semibold" style={{ color: customColors.primaryButton }}>
                            📄 Perfect for contract amendments - AI will process your document
                          </p>
                        )}
                        {uploadingFile && (
                          <div className="space-y-2">
                            <p className="text-base font-semibold" style={{ color: customColors.primaryButton }}>
                              Processing file...
                            </p>
                            {isContractAmendment && (
                              <p className="text-xs" style={{ color: customColors.textSecondary }}>
                                Extracting text for contract amendment
                              </p>
                            )}
                          </div>
                        )}
                        {fileUploaded && !uploadingFile && (
                          <div className="space-y-2">
                            <p className="text-base font-semibold" style={{ color: customColors.secondaryButton }}>
                              ✅ File processed successfully!
                            </p>
                            {isContractAmendment && (
                              <p className="text-xs" style={{ color: customColors.textSecondary }}>
                                Ready for contract amendment
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contract Amendment Section */}
                  <div className="border-t pt-6" style={{ borderColor: customColors.cardBorder }}>
                    <div className="flex items-center justify-between mb-4">
                      <label 
                        className="text-lg font-bold cursor-pointer"
                        style={{ color: customColors.textPrimary }}
                      >
                        This is a contract amendment
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsContractAmendment(!isContractAmendment)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          isContractAmendment ? 'focus:ring-blue-500' : 'focus:ring-gray-400'
                        }`}
                        style={{ 
                          backgroundColor: isContractAmendment ? customColors.primaryButton : '#6B7280'
                        }}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                            isContractAmendment ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    {isContractAmendment && (
                      <div className="space-y-4">
                        <label className="block text-lg font-bold" style={{ color: customColors.textSecondary }}>
                          Describe the changes you want made:
                        </label>
                        <textarea
                          value={amendmentInstruction}
                          onChange={(e) => setAmendmentInstruction(e.target.value)}
                          placeholder="e.g., Change the closing date to March 15th, 2024, and increase the earnest money deposit to $10,000..."
                          className="w-full p-4 border-2 rounded-xl resize-none placeholder-gray-400 focus:outline-none backdrop-blur-sm text-base font-medium"
                          style={{ 
                            borderColor: customColors.cardBorder, 
                            backgroundColor: customColors.cardBackground,
                            color: customColors.textPrimary
                          }}
                          rows="4"
                        />
                      </div>
                    )}
                  </div>

                  {/* Dynamic Button - Transforms from Save to Generate */}
                  <div className="flex justify-center">
                    {!savedNote && !amendedContract ? (
                      <button
                        type="submit"
                        disabled={!newNote.trim() || (isContractAmendment && !amendmentInstruction.trim())}
                        className="px-12 py-4 rounded-xl transition-all duration-300 font-black text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl transform hover:scale-105"
                        style={{ 
                          backgroundColor: customColors.primaryButton,
                          color: 'white'
                        }}
                      >
                        {processingAmendment ? 'Processing Amendment...' : (isContractAmendment ? 'Make Amendments' : 'Save Note')}
                      </button>
                    ) : amendedContract ? (
                      <div className="text-center">
                        <div className="rounded-xl p-4 mb-4 border"
                             style={{ 
                               backgroundColor: customColors.cardBackground, 
                               borderColor: customColors.cardBorder 
                             }}>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold" style={{ color: customColors.textPrimary }}>Amended Contract Ready</h3>
                            <span className="px-2 py-1 rounded-full text-xs font-bold"
                                  style={{ 
                                    backgroundColor: `${customColors.secondaryButton}20`,
                                    color: customColors.secondaryButton
                                  }}>
                              AI Generated
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: customColors.textSecondary }}>
                            Contract has been updated with your requested changes
                          </p>
                        </div>
                        
                        <button
                          onClick={handleSaveAmendedContract}
                          className="px-12 py-4 rounded-xl transition-all duration-300 font-black text-lg shadow-2xl transform hover:scale-105"
                          style={{ 
                            backgroundColor: customColors.secondaryButton,
                            color: 'white'
                          }}
                        >
                          Save Amended Contract
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="rounded-xl p-4 mb-4 border"
                             style={{ 
                               backgroundColor: customColors.cardBackground, 
                               borderColor: customColors.cardBorder 
                             }}>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold" style={{ color: customColors.textPrimary }}>Saved Note</h3>
                            <span className="px-2 py-1 rounded-full text-xs font-bold"
                                  style={{ 
                                    backgroundColor: `${customColors.primaryButton}20`,
                                    color: customColors.primaryButton
                                  }}>
                              Tone: {savedNote.tone}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: customColors.textSecondary }}>
                            {savedNote.content.substring(0, 100)}...
                          </p>
                        </div>
                        
                        <button
                          onClick={handleGenerateFollowUp}
                          disabled={loading}
                          className="px-12 py-4 rounded-xl transition-all duration-300 font-black text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl transform hover:scale-105"
                          style={{ 
                            backgroundColor: customColors.secondaryButton,
                            color: 'white'
                          }}
                        >
                          {loading ? 'Generating...' : 'Generate Follow-Up'}
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              </div>

              {/* Step 2: Generated Output Panel (Animated Side Panel) */}
              <div className={`transition-all duration-500 ease-in-out ${
                (generatedFollowUp || amendedContract) ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
              }`}>
                {generatedFollowUp && (
                  <div className="backdrop-blur-md rounded-2xl border shadow-2xl p-8 h-full"
                       style={{ 
                         backgroundColor: customColors.cardBackground, 
                         borderColor: customColors.cardBorder 
                       }}>
                    <div className="text-center mb-8">
                      <h2 className="text-3xl font-black mb-2" style={{ color: customColors.textPrimary }}>Step 2: Review & Send</h2>
                      <p className="text-lg" style={{ color: customColors.textSecondary }}>
                        Here's what AgentHub generated from your notes
                      </p>
                    </div>

                    {/* Follow-up Preview Card */}
                    <div className="rounded-xl p-6 border mb-6"
                         style={{ 
                           backgroundColor: customColors.cardBackground, 
                           borderColor: customColors.cardBorder 
                         }}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold" style={{ color: customColors.textPrimary }}>Follow-up Preview</h3>
                        <span className="px-3 py-1 rounded-full text-sm font-bold"
                              style={{ 
                                backgroundColor: `${customColors.primaryButton}20`,
                                color: customColors.primaryButton
                              }}>
                          Tone: {generatedFollowUp.tone}
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-2" style={{ color: customColors.textSecondary, fontSize: textSizes.labels }}>Subject</label>
                          <p className="font-semibold" style={{ color: customColors.textPrimary, fontSize: textSizes.subject }}>{generatedFollowUp.subject}</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-bold mb-2" style={{ color: customColors.textSecondary, fontSize: textSizes.labels }}>Email Body</label>
                          <div className="p-4 rounded-lg border"
                               style={{ 
                                 backgroundColor: `${customColors.cardBackground}50`, 
                                 borderColor: customColors.cardBorder 
                               }}>
                            <p className="leading-relaxed whitespace-pre-wrap" style={{ color: customColors.textSecondary, fontSize: textSizes.emailBody }}>
                              {generatedFollowUp.body}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Scheduling */}
                    <div className="mb-6">
                      <label className="block text-lg font-bold mb-4" style={{ color: customColors.textSecondary }}>Schedule Send Time</label>
                      <input
                        type="datetime-local"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="border-2 rounded-lg px-4 py-3 text-base font-semibold focus:outline-none"
                        style={{ 
                          borderColor: customColors.cardBorder, 
                          backgroundColor: customColors.cardBackground,
                          color: customColors.textPrimary
                        }}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={handleSendNow}
                        className="px-6 py-3 rounded-xl transition-all duration-300 font-bold shadow-lg"
                        style={{ 
                          backgroundColor: customColors.secondaryButton,
                          color: 'white'
                        }}
                      >
                        Send Now
                      </button>
                      
                      <button
                        onClick={handleCopyMessage}
                        className={`px-6 py-3 rounded-xl transition-all duration-300 font-bold shadow-lg ${
                          copied ? 'bg-green-500 text-white' : ''
                        }`}
                        style={!copied ? { 
                          backgroundColor: customColors.primaryButton,
                          color: 'white'
                        } : {}}
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                      
                      <button
                        onClick={handleSchedule}
                        className="px-6 py-3 rounded-xl transition-all duration-300 font-bold shadow-lg"
                        style={{ 
                          backgroundColor: '#F59E0B',
                          color: 'white'
                        }}
                      >
                        Schedule
                      </button>
                    </div>
                  </div>
                )}

                {amendedContract && (
                  <div className="backdrop-blur-md rounded-2xl border shadow-2xl p-8 h-full"
                       style={{ 
                         backgroundColor: customColors.cardBackground, 
                         borderColor: customColors.cardBorder 
                       }}>
                    <div className="text-center mb-8">
                      <h2 className="text-3xl font-black mb-2" style={{ color: customColors.textPrimary }}>Step 2: Review Amendment</h2>
                      <p className="text-lg" style={{ color: customColors.textSecondary }}>
                        Here's your contract with the requested changes
                      </p>
                    </div>

                    {/* Amended Contract Preview Card */}
                    <div className="rounded-xl p-6 border mb-6"
                         style={{ 
                           backgroundColor: customColors.cardBackground, 
                           borderColor: customColors.cardBorder 
                         }}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold" style={{ color: customColors.textPrimary }}>Amended Contract</h3>
                        <span className="px-3 py-1 rounded-full text-sm font-bold"
                              style={{ 
                                backgroundColor: `${customColors.secondaryButton}20`,
                                color: customColors.secondaryButton
                              }}>
                          AI Generated
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-2" style={{ color: customColors.textSecondary, fontSize: textSizes.labels }}>Changes Made</label>
                          <p className="text-sm font-semibold" style={{ color: customColors.textPrimary, fontSize: textSizes.labels }}>
                            {amendmentInstruction}
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-bold mb-2" style={{ color: customColors.textSecondary, fontSize: textSizes.labels }}>Amended Contract</label>
                          <div className="p-4 rounded-lg border max-h-96 overflow-y-auto"
                               style={{ 
                                 backgroundColor: `${customColors.cardBackground}50`, 
                                 borderColor: customColors.cardBorder 
                               }}>
                            <div 
                              className="leading-relaxed whitespace-pre-wrap" 
                              style={{ color: customColors.textSecondary, fontSize: textSizes.emailBody }}
                              dangerouslySetInnerHTML={{ __html: amendedContract.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={handleSaveAmendedContract}
                        className="px-6 py-3 rounded-xl transition-all duration-300 font-bold shadow-lg"
                        style={{ 
                          backgroundColor: customColors.secondaryButton,
                          color: 'white'
                        }}
                      >
                        Save Contract
                      </button>
                      
                      <button
                        onClick={() => {
                          const textArea = document.createElement('textarea');
                          textArea.value = amendedContract.replace(/\*\*(.*?)\*\*/g, '$1');
                          document.body.appendChild(textArea);
                          textArea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textArea);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className={`px-6 py-3 rounded-xl transition-all duration-300 font-bold shadow-lg ${
                          copied ? 'bg-green-500 text-white' : ''
                        }`}
                        style={!copied ? { 
                          backgroundColor: customColors.primaryButton,
                          color: 'white'
                        } : {}}
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="backdrop-blur-md rounded-2xl border shadow-2xl p-8"
                 style={{ 
                   backgroundColor: customColors.cardBackground, 
                   borderColor: customColors.cardBorder 
                 }}>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black mb-2" style={{ color: customColors.textPrimary }}>
                  <svg className="w-8 h-8 inline-block mr-2" fill="currentColor" viewBox="0 0 20 20" style={{ color: customColors.primaryButton }}>
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                  </svg>
                  Communication History
                </h2>
                <p className="text-lg" style={{ color: customColors.textSecondary }}>
                  View all your previous correspondence and generated messages
                </p>
              </div>

              {/* Filter Buttons */}
              <div className="flex space-x-4 mb-6 justify-center">
                <button className="px-4 py-2 rounded-lg font-bold"
                        style={{ 
                          backgroundColor: `${customColors.primaryButton}20`,
                          color: customColors.primaryButton
                        }}>
                  This Week
                </button>
                <button className="px-4 py-2 rounded-lg font-bold"
                        style={{ 
                          backgroundColor: `${customColors.cardBackground}50`,
                          color: customColors.textSecondary
                        }}>
                  This Month
                </button>
                <button className="px-4 py-2 rounded-lg font-bold"
                        style={{ 
                          backgroundColor: `${customColors.cardBackground}50`,
                          color: customColors.textSecondary
                        }}>
                  All Time
                </button>
              </div>
              
              {/* History Items */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {communicationHistory.map((item) => (
                  <div key={item.id} className="rounded-xl border transition-all duration-200"
                       style={{ 
                         backgroundColor: customColors.cardBackground, 
                         borderColor: customColors.cardBorder 
                       }}>
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => toggleHistoryItem(item.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-sm" style={{ color: customColors.textPrimary }}>{item.subject}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 rounded text-xs font-bold"
                                style={{ 
                                  backgroundColor: `${customColors.primaryButton}20`,
                                  color: customColors.primaryButton
                                }}>
                            {item.tone}
                          </span>
                          <span className="text-xs" style={{ color: customColors.textSecondary }}>
                            {expandedHistoryItems.has(item.id) ? '▼' : '▶'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs mb-2" style={{ color: customColors.textSecondary }}>{item.preview}</p>
                      <p className="text-xs" style={{ color: customColors.textSecondary }}>
                        {new Date(item.date).toLocaleDateString()} at {new Date(item.date).toLocaleTimeString()}
                        {item.scheduled && ' (Scheduled)'}
                      </p>
                    </div>
                    
                    {/* Expanded Content */}
                    {expandedHistoryItems.has(item.id) && (
                      <div className="px-4 pb-4 border-t" style={{ borderColor: customColors.cardBorder }}>
                        <p className="text-sm leading-relaxed mt-3" style={{ color: customColors.textSecondary }}>
                          {item.fullMessage}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                
                {communicationHistory.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-lg" style={{ color: customColors.textSecondary }}>
                      No communication history yet. Start by generating your first follow-up message!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="backdrop-blur-md rounded-2xl border shadow-2xl p-8"
                 style={{ 
                   backgroundColor: customColors.cardBackground, 
                   borderColor: customColors.cardBorder 
                 }}>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black mb-2" style={{ color: customColors.textPrimary }}>
                  <svg className="w-8 h-8 inline-block mr-2" fill="currentColor" viewBox="0 0 20 20" style={{ color: customColors.primaryButton }}>
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                  </svg>
                  Settings
                </h2>
                <p className="text-lg" style={{ color: customColors.textSecondary }}>
                  Customize your experience and manage your account
                </p>
                {isSavingSettings && (
                  <p className="text-sm mt-2" style={{ color: customColors.primaryButton }}>
                    💾 Auto-saving your changes...
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Profile & Security */}
                <div className="space-y-6">
                  {/* User Profile */}
                  <div>
                    <h4 className="text-lg font-bold mb-4" style={{ color: customColors.textPrimary }}>Profile</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: customColors.textSecondary }}>Email</label>
                        <div className="p-3 rounded-xl border-2 font-semibold"
                             style={{ 
                               borderColor: customColors.cardBorder, 
                               backgroundColor: customColors.cardBackground,
                               color: customColors.textPrimary
                             }}>
                          {user?.email}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: customColors.textSecondary }}>Name</label>
                        <div className="p-3 rounded-xl border-2 font-semibold"
                             style={{ 
                               borderColor: customColors.cardBorder, 
                               backgroundColor: customColors.cardBackground,
                               color: customColors.textPrimary
                             }}>
                          {user?.firstName} {user?.lastName}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Password Change */}
                  <div>
                    <h4 className="text-lg font-bold mb-4" style={{ color: customColors.textPrimary }}>Security</h4>
                    <button
                      onClick={() => setShowPasswordChange(true)}
                      className="w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2"
                      style={{ 
                        backgroundColor: customColors.primaryButton,
                        color: 'white'
                      }}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                      </svg>
                      <span>Change Password</span>
                    </button>
                  </div>

                  {/* Email Integration */}
                  <div>
                    <h4 className="text-lg font-bold mb-4" style={{ color: customColors.textPrimary }}>Email Integration</h4>
                    
                    {!emailConnected ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold mb-2" style={{ color: customColors.textSecondary }}>Email Provider</label>
                          <select
                            value={emailProvider}
                            onChange={(e) => setEmailProvider(e.target.value)}
                            className="w-full p-3 rounded-xl border-2 font-semibold"
                            style={{ 
                              borderColor: customColors.cardBorder, 
                              backgroundColor: customColors.cardBackground,
                              color: customColors.textPrimary
                            }}
                          >
                            <option value="gmail">Gmail</option>
                            <option value="outlook">Outlook</option>
                          </select>
                        </div>
                        
                        <button
                          onClick={handleEmailConnection}
                          className="w-full px-6 py-3 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2"
                          style={{ 
                            backgroundColor: emailProvider === 'gmail' ? '#EA4335' : '#0078D4',
                            color: 'white'
                          }}
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                          </svg>
                          <span>{emailProvider === 'gmail' ? 'Connect Gmail' : 'Connect Outlook'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl border"
                             style={{ 
                               backgroundColor: customColors.cardBackground, 
                               borderColor: customColors.cardBorder 
                             }}>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-semibold" style={{ color: customColors.textPrimary }}>{emailAddress}</p>
                              <p className="text-sm" style={{ color: customColors.textSecondary }}>Connected to {emailProvider}</p>
                            </div>
                            <span className="px-2 py-1 rounded-full text-xs font-bold"
                                  style={{ 
                                    backgroundColor: '#10B981',
                                    color: 'white'
                                  }}>
                              Connected
                            </span>
                          </div>
                          
                          <button
                            onClick={disconnectGmail}
                            className="w-full px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-105"
                            style={{ 
                              backgroundColor: '#EF4444',
                              color: 'white'
                            }}
                          >
                            Disconnect Gmail
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Preferences */}
                  <div>
                    <h4 className="text-lg font-bold mb-4" style={{ color: customColors.textPrimary }}>Preferences</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold" style={{ color: customColors.textSecondary }}>Auto-save notes</span>
                        <button
                          onClick={() => handlePreferenceChange('autoSave', !userPreferences.autoSave)}
                          className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${
                            userPreferences.autoSave ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform duration-200 ${
                            userPreferences.autoSave ? 'left-6' : 'left-0.5'
                          }`}></div>
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold" style={{ color: customColors.textSecondary }}>Email notifications</span>
                        <button
                          onClick={() => handlePreferenceChange('emailNotifications', !userPreferences.emailNotifications)}
                          className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${
                            userPreferences.emailNotifications ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform duration-200 ${
                            userPreferences.emailNotifications ? 'left-6' : 'left-0.5'
                          }`}></div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Theme Customization */}
                <div className="space-y-6">
                  <h4 className="text-lg font-bold mb-4 flex items-center space-x-2" style={{ color: customColors.textPrimary }}>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" style={{ color: customColors.primaryButton }}>
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                    </svg>
                    <span>Theme Customization</span>
                  </h4>
                  
                  {/* Background Colors */}
                  <div>
                    <label className="block text-lg font-bold mb-3" style={{ color: customColors.textPrimary }}>Background Colors</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: customColors.textSecondary }}>Main Background</label>
                        <input
                          type="color"
                          value={customColors.background}
                          onChange={(e) => handleColorChange('background', e.target.value)}
                          className="w-full h-12 rounded-xl border-2 cursor-pointer"
                          style={{ borderColor: customColors.cardBorder }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: customColors.textSecondary }}>Card Background</label>
                        <input
                          type="color"
                          value={customColors.cardBackground}
                          onChange={(e) => handleColorChange('cardBackground', e.target.value)}
                          className="w-full h-12 rounded-xl border-2 cursor-pointer"
                          style={{ borderColor: customColors.cardBorder }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Button Colors */}
                  <div>
                    <label className="block text-lg font-bold mb-3" style={{ color: customColors.textPrimary }}>Button Colors</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: customColors.textSecondary }}>Primary Button</label>
                        <input
                          type="color"
                          value={customColors.primaryButton}
                          onChange={(e) => handleColorChange('primaryButton', e.target.value)}
                          className="w-full h-12 rounded-xl border-2 cursor-pointer"
                          style={{ borderColor: customColors.cardBorder }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: customColors.textSecondary }}>Secondary Button</label>
                        <input
                          type="color"
                          value={customColors.secondaryButton}
                          onChange={(e) => handleColorChange('secondaryButton', e.target.value)}
                          className="w-full h-12 rounded-xl border-2 cursor-pointer"
                          style={{ borderColor: customColors.cardBorder }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Text Colors */}
                  <div>
                    <label className="block text-lg font-bold mb-3" style={{ color: customColors.textPrimary }}>Text Colors</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: customColors.textSecondary }}>Primary Text</label>
                        <input
                          type="color"
                          value={customColors.textPrimary}
                          onChange={(e) => handleColorChange('textPrimary', e.target.value)}
                          className="w-full h-12 rounded-xl border-2 cursor-pointer"
                          style={{ borderColor: customColors.cardBorder }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: customColors.textSecondary }}>Secondary Text</label>
                        <input
                          type="color"
                          value={customColors.textSecondary}
                          onChange={(e) => handleColorChange('textSecondary', e.target.value)}
                          className="w-full h-12 rounded-xl border-2 cursor-pointer"
                          style={{ borderColor: customColors.cardBorder }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Text Sizes */}
                  <div>
                    <label className="block text-lg font-bold mb-3" style={{ color: customColors.textPrimary }}>Text Sizes</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: customColors.textSecondary }}>Email Body</label>
                        <input
                          type="text"
                          value={textSizes.emailBody}
                          onChange={(e) => handleTextSizeChange('emailBody', e.target.value)}
                          className="w-full p-3 rounded-xl border-2 font-semibold"
                          style={{ 
                            borderColor: customColors.cardBorder, 
                            backgroundColor: customColors.cardBackground,
                            color: customColors.textPrimary
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: customColors.textSecondary }}>Subject</label>
                        <input
                          type="text"
                          value={textSizes.subject}
                          onChange={(e) => handleTextSizeChange('subject', e.target.value)}
                          className="w-full p-3 rounded-xl border-2 font-semibold"
                          style={{ 
                            borderColor: customColors.cardBorder, 
                            backgroundColor: customColors.cardBackground,
                            color: customColors.textPrimary
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: customColors.textSecondary }}>Labels</label>
                        <input
                          type="text"
                          value={textSizes.labels}
                          onChange={(e) => handleTextSizeChange('labels', e.target.value)}
                          className="w-full p-3 rounded-xl border-2 font-semibold"
                          style={{ 
                            borderColor: customColors.cardBorder, 
                            backgroundColor: customColors.cardBackground,
                            color: customColors.textPrimary
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preset Themes */}
                  <div>
                    <label className="block text-lg font-bold mb-3" style={{ color: customColors.textPrimary }}>Quick Themes</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setCustomColors({
                          background: '#0B1F33',
                          cardBackground: 'rgba(255, 255, 255, 0.1)',
                          cardBorder: 'rgba(255, 255, 255, 0.2)',
                          primaryButton: '#1E85F2',
                          secondaryButton: '#10B981',
                          textPrimary: '#F8EEDB',
                          textSecondary: '#9CA3AF'
                        })}
                        className="px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105"
                        style={{ 
                          backgroundColor: '#0B1F33',
                          color: '#F8EEDB',
                          border: '2px solid #1E85F2'
                        }}
                      >
                        🌙 Dark Blue
                      </button>
                      <button
                        onClick={() => setCustomColors({
                          background: '#1F2937',
                          cardBackground: 'rgba(255, 255, 255, 0.05)',
                          cardBorder: 'rgba(255, 255, 255, 0.1)',
                          primaryButton: '#8B5CF6',
                          secondaryButton: '#EC4899',
                          textPrimary: '#F9FAFB',
                          textSecondary: '#D1D5DB'
                        })}
                        className="px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105"
                        style={{ 
                          backgroundColor: '#1F2937',
                          color: '#F9FAFB',
                          border: '2px solid #8B5CF6'
                        }}
                      >
                        💜 Purple
                      </button>
                      <button
                        onClick={() => setCustomColors({
                          background: '#064E3B',
                          cardBackground: 'rgba(255, 255, 255, 0.08)',
                          cardBorder: 'rgba(255, 255, 255, 0.15)',
                          primaryButton: '#059669',
                          secondaryButton: '#10B981',
                          textPrimary: '#ECFDF5',
                          textSecondary: '#A7F3D0'
                        })}
                        className="px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105"
                        style={{ 
                          backgroundColor: '#064E3B',
                          color: '#ECFDF5',
                          border: '2px solid #059669'
                        }}
                      >
                        🌿 Emerald
                      </button>
                      <button
                        onClick={() => setCustomColors({
                          background: '#7C2D12',
                          cardBackground: 'rgba(255, 255, 255, 0.08)',
                          cardBorder: 'rgba(255, 255, 255, 0.15)',
                          primaryButton: '#EA580C',
                          secondaryButton: '#F59E0B',
                          textPrimary: '#FEF3C7',
                          textSecondary: '#FDE68A'
                        })}
                        className="px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105"
                        style={{ 
                          backgroundColor: '#7C2D12',
                          color: '#FEF3C7',
                          border: '2px solid #EA580C'
                        }}
                      >
                        🧡 Sunset
                      </button>
                    </div>
                  </div>

                  {/* Reset Button */}
                  <div className="pt-4 border-t" style={{ borderColor: customColors.cardBorder }}>
                    <div className="space-y-3">
                      <button
                        onClick={handleManualSave}
                        disabled={isSavingSettings}
                        className="w-full px-6 py-3 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        style={{ 
                          backgroundColor: customColors.primaryButton,
                          color: 'white'
                        }}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        <span>{isSavingSettings ? 'Saving...' : 'Save Settings'}</span>
                      </button>
                      <button
                        onClick={() => setCustomColors({
                          background: '#0B1F33',
                          cardBackground: 'rgba(255, 255, 255, 0.1)',
                          cardBorder: 'rgba(255, 255, 255, 0.2)',
                          primaryButton: '#1E85F2',
                          secondaryButton: '#10B981',
                          textPrimary: '#F8EEDB',
                          textSecondary: '#9CA3AF'
                        })}
                        className="w-full px-6 py-3 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2"
                        style={{ 
                          backgroundColor: '#EF4444',
                          color: 'white'
                        }}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
                        </svg>
                        <span>Reset to Default</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 