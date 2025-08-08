import { useState, useEffect, useRef } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import PasswordChange from './components/PasswordChange';
import BlockchainInfo from './components/BlockchainInfo';
import { generateJurisdictions } from './statesData';
import { logToBlockchain } from './utils/blockchain';

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
  const [clientNotesFile, setClientNotesFile] = useState(null);
  const [clientNotesContent, setClientNotesContent] = useState('');
  const fileInputRef = useRef(null);

  // Contract amendment states
  const [isContractAmendment, setIsContractAmendment] = useState(false);
  const [amendmentInstruction, setAmendmentInstruction] = useState('');
  const [amendedContract, setAmendedContract] = useState(null);
  const [processingAmendment, setProcessingAmendment] = useState(false);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('');
  const [contractDocument, setContractDocument] = useState('');
  const [contractStep, setContractStep] = useState(1); // 1: jurisdiction, 2: document, 3: modification

  // Sample clients for dropdown
  const clients = [
    { id: 'client1', name: 'Sarah Johnson' },
    { id: 'client2', name: 'Mike Chen' },
    { id: 'client3', name: 'Emily Rodriguez' },
    { id: 'client4', name: 'David Thompson' },
    { id: 'client5', name: 'Lisa Wang' }
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
    setSelectedPathway(pathway);
    setShowPathwayInterface(true);
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
        
        // Reset states
        setAmendedContract(null);
        setAmendmentInstruction('');
        setSavedNote(null);
        setContractStep(1);
        setSelectedJurisdiction('');
        setContractDocument('');
        setIsContractAmendment(false);
        
        // Show success message
        alert('Contract saved successfully! Check the History tab to view it.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to save amended contract', response.status, errorData);
        alert(`Failed to save contract: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving amended contract:', error);
    }
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

      {/* Main Content */}
      <div className={`px-6 pb-6 ${activeTab === 'dashboard' ? '' : 'pt-24'}`}>
        <div className="max-w-6xl mx-auto">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && !showPathwayInterface && (
            <div className="pt-44">
              {/* Welcome Message */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2" style={{ color: customColors.textPrimary }}>
                  Hello, {user?.firstName || 'User'}.
                </h1>
                <p className="text-xl" style={{ color: customColors.textSecondary }}>
                  What would you like to do today?
                </p>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                {/* Card 1: Modify a Contract */}
                <div 
                  onClick={() => handlePathwaySelect('contract')}
                  className="backdrop-blur-md rounded-2xl border shadow-2xl p-8 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-3xl"
                  style={{ 
                    backgroundColor: customColors.cardBackground, 
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
                  className="backdrop-blur-md rounded-2xl border shadow-2xl p-8 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-3xl"
                  style={{ 
                    backgroundColor: customColors.cardBackground, 
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
                      Select jurisdiction and modify documents with natural language
                    </p>
                  </div>

                  <div className="backdrop-blur-md rounded-2xl border shadow-2xl p-8"
                       style={{ backgroundColor: customColors.cardBackground, borderColor: customColors.cardBorder }}>
                    
                    {/* Progress Steps */}
                    <div className="flex items-center justify-center mb-8">
                      <div className="flex items-center space-x-4">
                        <div className={`flex items-center space-x-2 ${contractStep >= 1 ? 'text-blue-500' : 'text-gray-400'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            contractStep >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
                          }`}>
                            1
                          </div>
                          <span className="text-sm font-semibold">Jurisdiction</span>
                        </div>
                        <div className="w-8 h-0.5 bg-gray-300"></div>
                        <div className={`flex items-center space-x-2 ${contractStep >= 2 ? 'text-blue-500' : 'text-gray-400'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            contractStep >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
                          }`}>
                            2
                          </div>
                          <span className="text-sm font-semibold">Document</span>
                        </div>
                        <div className="w-8 h-0.5 bg-gray-300"></div>
                        <div className={`flex items-center space-x-2 ${contractStep >= 3 ? 'text-blue-500' : 'text-gray-400'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            contractStep >= 3 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
                          }`}>
                            3
                          </div>
                          <span className="text-sm font-semibold">Modify</span>
                        </div>
                      </div>
                    </div>

                    {/* Step 1: Jurisdiction Selection */}
                    {contractStep === 1 && (
                      <div>
                        <h4 className="text-xl font-bold mb-6 text-center" style={{ color: customColors.textPrimary }}>
                          Select Jurisdiction
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {jurisdictions.map((jurisdiction) => (
                            <button
                              key={jurisdiction.id}
                              onClick={() => {
                                setSelectedJurisdiction(jurisdiction.id);
                                setContractStep(2);
                              }}
                              className="p-6 rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg text-left"
                              style={{ 
                                borderColor: customColors.cardBorder,
                                backgroundColor: customColors.cardBackground
                              }}
                            >
                              <h5 className="text-lg font-bold mb-2" style={{ color: customColors.textPrimary }}>
                                {jurisdiction.name}
                              </h5>
                              <p className="text-sm" style={{ color: customColors.textSecondary }}>
                                {jurisdiction.documents.length} document types available
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step 2: Document Selection */}
                    {contractStep === 2 && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-xl font-bold" style={{ color: customColors.textPrimary }}>
                            Select Document Type
                          </h4>
                          <button
                            onClick={() => setContractStep(1)}
                            className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 hover:bg-white hover:bg-opacity-10"
                            style={{ color: customColors.textSecondary }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span>Back</span>
                          </button>
                        </div>
                        
                        <div className="mb-6">
                          <p className="text-sm mb-4" style={{ color: customColors.textSecondary }}>
                            Selected: <span className="font-semibold" style={{ color: customColors.textPrimary }}>
                              {jurisdictions.find(j => j.id === selectedJurisdiction)?.name}
                            </span>
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {jurisdictions.find(j => j.id === selectedJurisdiction)?.documents.map((document, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                setContractDocument(document.content);
                                setContractStep(3);
                              }}
                              className="p-6 rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg text-left"
                              style={{ 
                                borderColor: customColors.cardBorder,
                                backgroundColor: customColors.cardBackground
                              }}
                            >
                              <h5 className="text-lg font-bold mb-2" style={{ color: customColors.textPrimary }}>
                                {document.name}
                              </h5>
                              <p className="text-sm" style={{ color: customColors.textSecondary }}>
                                Standard form for {jurisdictions.find(j => j.id === selectedJurisdiction)?.name}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step 3: Contract Modification */}
                    {contractStep === 3 && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-xl font-bold" style={{ color: customColors.textPrimary }}>
                            Modify Contract
                          </h4>
                          <button
                            onClick={() => setContractStep(2)}
                            className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 hover:bg-white hover:bg-opacity-10"
                            style={{ color: customColors.textSecondary }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span>Back</span>
                          </button>
                        </div>
                        
                        <div className="mb-6 p-4 rounded-lg border-2"
                             style={{ 
                               borderColor: customColors.cardBorder,
                               backgroundColor: 'rgba(59, 130, 246, 0.1)'
                             }}>
                          <div className="flex items-center space-x-4">
                            <div className="flex-1">
                              <p className="text-sm" style={{ color: customColors.textSecondary }}>
                                <span className="font-semibold">Jurisdiction:</span> 
                                <span className="ml-2" style={{ color: customColors.textPrimary }}>
                                  {jurisdictions.find(j => j.id === selectedJurisdiction)?.name}
                                </span>
                              </p>
                                                             <p className="text-sm mt-1" style={{ color: customColors.textSecondary }}>
                                 <span className="font-semibold">Document:</span> 
                                 <span className="ml-2" style={{ color: customColors.textPrimary }}>
                                   {jurisdictions.find(j => j.id === selectedJurisdiction)?.documents.find(d => d.content === contractDocument)?.name || 'Selected Document'}
                                 </span>
                               </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-bold mb-2" style={{ color: customColors.textSecondary }}>
                              Describe your modifications in natural language:
                            </label>
                            <textarea
                              value={amendmentInstruction}
                              onChange={(e) => setAmendmentInstruction(e.target.value)}
                              placeholder="e.g., Add a 30-day inspection period, change the closing date to March 15th, include a home warranty..."
                              className="w-full p-4 rounded-lg border-2 resize-none"
                              rows={4}
                              style={{ 
                                borderColor: customColors.cardBorder,
                                backgroundColor: customColors.cardBackground,
                                color: customColors.textPrimary
                              }}
                            />
                          </div>

                          <div className="flex space-x-4">
                            <button
                              onClick={handleContractAmendment}
                              disabled={!amendmentInstruction.trim() || processingAmendment}
                              className="px-6 py-3 rounded-lg font-bold transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
                              style={{ 
                                backgroundColor: customColors.primaryButton,
                                color: 'white'
                              }}
                            >
                              {processingAmendment ? (
                                <>
                                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span>Processing...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                  <span>Generate Modified Contract</span>
                                </>
                              )}
                            </button>
                          </div>

                          {amendedContract && (
                            <div className="mt-8">
                              <h5 className="text-lg font-bold mb-4" style={{ color: customColors.textPrimary }}>
                                Modified Contract:
                              </h5>
                              <div className="p-4 rounded-lg border-2 max-h-96 overflow-y-auto"
                                   style={{ 
                                     borderColor: customColors.cardBorder,
                                     backgroundColor: customColors.cardBackground
                                   }}>
                                <pre className="whitespace-pre-wrap text-sm" style={{ color: customColors.textPrimary }}>
                                  {amendedContract}
                                </pre>
                              </div>
                              <div className="flex space-x-4 mt-4">
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
                                  <span>{copied ? 'Copied!' : 'Copy Contract'}</span>
                                </button>
                                <button
                                  onClick={handleSaveAmendedContract}
                                  disabled={!amendedContract}
                                  className="px-4 py-2 rounded-lg font-bold transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                                  style={{ 
                                    backgroundColor: amendedContract ? customColors.primaryButton : '#6B7280',
                                    color: 'white',
                                    cursor: amendedContract ? 'pointer' : 'not-allowed'
                                  }}
                                  title={amendedContract ? 'Save the amended contract' : 'Generate a contract first'}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>{amendedContract ? 'Save Contract' : 'Save Contract (Disabled)'}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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

          {/* History Tab */}
          {activeTab === 'history' && (
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
            <div className="backdrop-blur-md rounded-2xl border shadow-2xl p-8"
                 style={{ 
                   backgroundColor: customColors.cardBackground, 
                   borderColor: customColors.cardBorder 
                 }}>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black mb-2" style={{ color: customColors.textPrimary }}>
                  Settings
                </h2>
                <p className="text-lg" style={{ color: customColors.textSecondary }}>
                  Customize your AgentHub experience
                </p>
              </div>
              
              <div className="text-center py-12">
                <p className="text-lg" style={{ color: customColors.textSecondary }}>
                  Settings interface coming soon
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 