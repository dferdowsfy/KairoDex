// Dashboard navigation fix
export const handleDashboardClick = () => {
  setActiveTab('dashboard');
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
  // Load recent activity
  loadRecentActivity();
};

// Enhanced activity saving with blockchain
export const saveActivityWithBlockchain = async (activityType, activityData) => {
  try {
    // Log to blockchain
    const activityText = `${activityType} for client ${clientId}: ${JSON.stringify(activityData).substring(0, 100)}...`;
    const blockchainResult = await logToBlockchain(activityText, activityType);
    
    // Add to recent activity with blockchain info
    const newActivity = {
      id: Date.now(),
      type: activityType,
      client_id: clientId,
      date: new Date().toISOString(),
      ...activityData,
      blockchainTx: blockchainResult.success ? blockchainResult.txHash : null,
      blockchainTimestamp: blockchainResult.timestamp
    };
    
    setRecentActivity(prev => [newActivity, ...prev]);
    
    return newActivity;
  } catch (error) {
    console.error('Error saving activity with blockchain:', error);
    return null;
  }
};
