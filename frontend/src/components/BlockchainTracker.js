import React, { useState, useEffect } from 'react';
import { logToBlockchain, getTransactionDetails, verifyActivityOnBlockchain, getRecentBlockchainActivities } from '../utils/blockchain';

const BlockchainTracker = ({ customColors }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [blockchainStatus, setBlockchainStatus] = useState('connected');

  useEffect(() => {
    loadBlockchainActivities();
  }, []);

  const loadBlockchainActivities = async () => {
    setLoading(true);
    
    try {
      // Get real blockchain activities from storage
      const storedActivities = await getRecentBlockchainActivities(20);
      
      if (storedActivities.length === 0) {
        // Fallback to sample data if no stored activities
        const sampleActivities = [
          {
            id: 1,
            type: 'followup_generated',
            title: 'AI Follow-up Generated',
            description: 'Generated personalized follow-up message for Sarah Johnson',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            clientName: 'Sarah Johnson',
            txHash: '0x1234567890abcdef1234567890abcdef12345678',
            blockNumber: 12345678,
            gasUsed: '45000',
            status: 'confirmed',
            verified: true,
            activityHash: '0xabcdef1234567890abcdef1234567890abcdef12'
          },
          {
            id: 2,
            type: 'contract_amended',
            title: 'Contract Amendment',
            description: 'Modified purchase agreement for Mike Chen property',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            clientName: 'Mike Chen',
            txHash: '0x876543210fedcba9876543210fedcba9876543210',
            blockNumber: 12345677,
            gasUsed: '67000',
            status: 'confirmed',
            verified: true,
            activityHash: '0xfedcba0987654321fedcba0987654321fedcba09'
          }
        ];
        setActivities(sampleActivities);
      } else {
        // Transform stored activities to match component format
        const transformedActivities = storedActivities.map(activity => ({
          id: activity.id,
          type: activity.activityType,
          title: getActivityTitle(activity.activityType, activity.activityText),
          description: activity.activityText,
          timestamp: activity.timestamp,
          clientName: activity.metadata?.clientName || 'Unknown Client',
          txHash: activity.txHash,
          blockNumber: activity.blockNumber,
          gasUsed: activity.gasUsed,
          status: 'confirmed',
          verified: activity.verified,
          activityHash: activity.activityHash,
          demo: activity.demo
        }));
        setActivities(transformedActivities);
      }
    } catch (error) {
      console.error('Error loading blockchain activities:', error);
      setActivities([]);
    }
    
    setLoading(false);
  };

  const getActivityTitle = (activityType, activityText) => {
    switch (activityType) {
      case 'followup_generated':
        return 'AI Follow-up Generated';
      case 'contract_amended':
        return 'Contract Amendment';
      case 'docusign_sent':
        return 'DocuSign Envelope Sent';
      case 'reminder_added':
        return 'Reminder Added';
      case 'reminder_completed':
        return 'Reminder Completed';
      case 'note_creation':
        return 'Client Note Created';
      case 'message_generation':
        return 'Message Generated';
      default:
        return activityText.substring(0, 50) + '...';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'followup_generated':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'contract_amended':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        );
      case 'docusign_sent':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'reminder_added':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'followup_generated': return 'bg-green-500';
      case 'contract_amended': return 'bg-blue-500';
      case 'docusign_sent': return 'bg-purple-500';
      case 'reminder_added': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const viewTransactionDetails = async (activity) => {
    setSelectedActivity(activity);
    setShowDetails(true);
  };

  const verifyActivity = async (activity) => {
    try {
      const isVerified = await verifyActivityOnBlockchain(
        activity.activityHash,
        activity.type,
        new Date(activity.timestamp).getTime() / 1000
      );
      
      if (isVerified) {
        // Update activity verification status
        setActivities(activities.map(a => 
          a.id === activity.id ? { ...a, verified: true } : a
        ));
      }
    } catch (error) {
      console.error('Verification failed:', error);
    }
  };

  return (
    <div className="pt-24 pb-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold" style={{ color: customColors.textPrimary }}>
            Ledger
          </h1>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${blockchainStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="text-sm font-medium" style={{ color: customColors.textSecondary }}>
                {blockchainStatus === 'connected' ? 'Connected' : 'Demo Mode'}
              </span>
            </div>
            <button
              onClick={loadBlockchainActivities}
              disabled={loading}
              className="px-4 py-2 rounded-lg font-semibold transition-colors"
              style={{ backgroundColor: customColors.primaryButton, color: 'white' }}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
          <p className="text-lg" style={{ color: customColors.textSecondary }}>
            Track all real estate activities in your immutable ledger for transparency and verification
          </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div 
          className="backdrop-blur-md rounded-xl border p-6"
          style={{ background: customColors.gradientCardBlue, borderColor: customColors.cardBorder }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: customColors.textSecondary }}>
                Total Activities
              </p>
              <p className="text-2xl font-bold" style={{ color: customColors.textPrimary }}>
                {activities.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          className="backdrop-blur-md rounded-xl border p-6"
          style={{ background: customColors.gradientCardGreen, borderColor: customColors.cardBorder }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: customColors.textSecondary }}>
                Verified
              </p>
              <p className="text-2xl font-bold" style={{ color: customColors.textPrimary }}>
                {activities.filter(a => a.verified).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          className="backdrop-blur-md rounded-xl border p-6"
          style={{ background: customColors.gradientCardPurple, borderColor: customColors.cardBorder }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: customColors.textSecondary }}>
                Today
              </p>
              <p className="text-2xl font-bold" style={{ color: customColors.textPrimary }}>
                {activities.filter(a => {
                  const today = new Date();
                  const activityDate = new Date(a.timestamp);
                  return activityDate.toDateString() === today.toDateString();
                }).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          className="backdrop-blur-md rounded-xl border p-6"
          style={{ background: customColors.gradientCardYellow, borderColor: customColors.cardBorder }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: customColors.textSecondary }}>
                Gas Used
              </p>
              <p className="text-2xl font-bold" style={{ color: customColors.textPrimary }}>
                {activities.reduce((total, a) => total + parseInt(a.gasUsed || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Activities List */}
      <div 
        className="backdrop-blur-md rounded-xl border p-6"
        style={{ backgroundColor: customColors.cardBackground, borderColor: customColors.cardBorder }}
      >
        <h3 className="text-xl font-bold mb-6" style={{ color: customColors.textPrimary }}>
          Recent Blockchain Activities
        </h3>
        
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="p-4 rounded-lg border hover:bg-black hover:bg-opacity-20 transition-colors cursor-pointer"
              style={{ borderColor: customColors.cardBorder }}
              onClick={() => viewTransactionDetails(activity)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold" style={{ color: customColors.textPrimary }}>
                        {activity.title}
                      </h4>
                                             {activity.verified && (
                         <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                           Verified
                         </span>
                       )}
                       {activity.demo && (
                         <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                           Demo
                         </span>
                       )}
                    </div>
                    
                    <p className="text-sm mb-2" style={{ color: customColors.textSecondary }}>
                      {activity.description}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs" style={{ color: customColors.textSecondary }}>
                      <span>Client: {activity.clientName}</span>
                      <span>Time: {formatTimeAgo(activity.timestamp)}</span>
                      <span>Block: #{activity.blockNumber}</span>
                      <span>Gas: {parseInt(activity.gasUsed).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono" style={{ color: customColors.textSecondary }}>
                    {formatAddress(activity.txHash)}
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction Details Modal */}
      {showDetails && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            className="backdrop-blur-md rounded-xl border p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: customColors.cardBackground, borderColor: customColors.cardBorder }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: customColors.textPrimary }}>
                Transaction Details
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Activity Info */}
              <div>
                <h4 className="font-semibold mb-3" style={{ color: customColors.textPrimary }}>
                  Activity Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium" style={{ color: customColors.textSecondary }}>Type:</span>
                    <p style={{ color: customColors.textPrimary }}>{selectedActivity.title}</p>
                  </div>
                  <div>
                    <span className="font-medium" style={{ color: customColors.textSecondary }}>Client:</span>
                    <p style={{ color: customColors.textPrimary }}>{selectedActivity.clientName}</p>
                  </div>
                  <div>
                    <span className="font-medium" style={{ color: customColors.textSecondary }}>Description:</span>
                    <p style={{ color: customColors.textPrimary }}>{selectedActivity.description}</p>
                  </div>
                  <div>
                    <span className="font-medium" style={{ color: customColors.textSecondary }}>Timestamp:</span>
                    <p style={{ color: customColors.textPrimary }}>
                      {new Date(selectedActivity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Blockchain Info */}
              <div>
                <h4 className="font-semibold mb-3" style={{ color: customColors.textPrimary }}>
                  Blockchain Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium" style={{ color: customColors.textSecondary }}>Transaction Hash:</span>
                    <p className="font-mono text-xs break-all" style={{ color: customColors.textPrimary }}>
                      {selectedActivity.txHash}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium" style={{ color: customColors.textSecondary }}>Activity Hash:</span>
                    <p className="font-mono text-xs break-all" style={{ color: customColors.textPrimary }}>
                      {selectedActivity.activityHash}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium" style={{ color: customColors.textSecondary }}>Block Number:</span>
                    <p style={{ color: customColors.textPrimary }}>#{selectedActivity.blockNumber}</p>
                  </div>
                  <div>
                    <span className="font-medium" style={{ color: customColors.textSecondary }}>Gas Used:</span>
                    <p style={{ color: customColors.textPrimary }}>{parseInt(selectedActivity.gasUsed).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium" style={{ color: customColors.textSecondary }}>Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedActivity.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedActivity.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium" style={{ color: customColors.textSecondary }}>Verified:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedActivity.verified 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedActivity.verified ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex space-x-3 pt-4 border-t" style={{ borderColor: customColors.cardBorder }}>
                <button
                  onClick={() => verifyActivity(selectedActivity)}
                  disabled={selectedActivity.verified}
                  className="flex-1 px-4 py-2 rounded-lg font-semibold transition-colors"
                  style={{ 
                    backgroundColor: selectedActivity.verified ? '#6B7280' : customColors.primaryButton, 
                    color: 'white' 
                  }}
                >
                  {selectedActivity.verified ? 'Already Verified' : 'Verify on Blockchain'}
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 px-4 py-2 rounded-lg border font-semibold transition-colors"
                  style={{ 
                    borderColor: customColors.cardBorder,
                    color: customColors.textSecondary
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockchainTracker; 