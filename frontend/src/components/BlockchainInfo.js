import React, { useState, useEffect } from 'react';
import { getTransactionDetails } from '../utils/blockchain';

const BlockchainInfo = ({ txHash, activityType, timestamp, customColors }) => {
  const [txDetails, setTxDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (txHash && !txHash.startsWith('demo_')) {
      loadTransactionDetails();
    }
  }, [txHash]);

  const loadTransactionDetails = async () => {
    if (!txHash || txHash.startsWith('demo_')) return;
    
    setLoading(true);
    try {
      const details = await getTransactionDetails(txHash);
      setTxDetails(details);
    } catch (error) {
      console.error('Failed to load transaction details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatHash = (hash) => {
    if (!hash) return '';
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };

  const getActivityTypeColor = (type) => {
    switch (type) {
      case 'contract_modification':
        return 'bg-blue-500';
      case 'message_generation':
        return 'bg-green-500';
      case 'note_creation':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getActivityTypeLabel = (type) => {
    switch (type) {
      case 'contract_modification':
        return 'Contract Modified';
      case 'message_generation':
        return 'Message Generated';
      case 'note_creation':
        return 'Note Created';
      default:
        return 'Activity Logged';
    }
  };

  if (!txHash) {
    return null;
  }

  return (
    <div className="mt-3 p-3 rounded-lg border-2" 
         style={{ 
           borderColor: customColors.cardBorder,
           backgroundColor: 'rgba(59, 130, 246, 0.05)'
         }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span className="text-xs font-semibold" style={{ color: customColors.textSecondary }}>
            Blockchain Verified
          </span>
          {txHash.startsWith('demo_') && (
            <span className="px-2 py-1 text-xs rounded-full bg-yellow-500 text-white">
              Demo
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs hover:underline"
          style={{ color: customColors.textSecondary }}
        >
          {expanded ? 'Hide' : 'Show'} Details
        </button>
      </div>

      <div className="mt-2">
        <div className="flex items-center space-x-2 mb-1">
          <span className={`px-2 py-1 text-xs rounded-full text-white ${getActivityTypeColor(activityType)}`}>
            {getActivityTypeLabel(activityType)}
          </span>
          <span className="text-xs" style={{ color: customColors.textSecondary }}>
            {new Date(timestamp).toLocaleString()}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono" style={{ color: customColors.textSecondary }}>
            TX: {formatHash(txHash)}
          </span>
          {!txHash.startsWith('demo_') && (
            <a
              href={`https://mumbai.polygonscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs hover:underline"
              style={{ color: customColors.primaryButton }}
            >
              View on Explorer
            </a>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: customColors.cardBorder }}>
          {txHash.startsWith('demo_') ? (
            <div className="text-xs" style={{ color: customColors.textSecondary }}>
              <p>This is a demo transaction hash. In production, this would be a real blockchain transaction.</p>
              <p className="mt-1">To enable real blockchain logging, configure your environment variables:</p>
              <ul className="mt-1 ml-4 list-disc">
                <li>REACT_APP_PRIVATE_KEY</li>
                <li>REACT_APP_CONTRACT_ADDRESS</li>
                <li>REACT_APP_ALCHEMY_API_KEY</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-xs" style={{ color: customColors.textSecondary }}>
                    Loading transaction details...
                  </span>
                </div>
              ) : txDetails ? (
                <div className="space-y-1 text-xs" style={{ color: customColors.textSecondary }}>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`font-semibold ${txDetails.status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                      {txDetails.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Block:</span>
                    <span className="font-mono">{txDetails.blockNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gas Used:</span>
                    <span className="font-mono">{txDetails.gasUsed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>From:</span>
                    <span className="font-mono">{formatHash(txDetails.from)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>To:</span>
                    <span className="font-mono">{formatHash(txDetails.to)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs" style={{ color: customColors.textSecondary }}>
                  Unable to load transaction details
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BlockchainInfo; 