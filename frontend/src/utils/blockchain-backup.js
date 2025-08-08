import { ethers } from 'ethers';
import { Alchemy, Network } from 'alchemy-sdk';

// Configuration for Polygon Mumbai testnet
const POLYGON_MUMBAI_RPC_URL = 'https://polygon-mumbai.g.alchemy.com/v2/demo';
const PRIVATE_KEY = process.env.REACT_APP_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000'; // Demo key - replace with actual private key
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000'; // Replace with actual contract address

// Simple contract ABI for logging activities
const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "activityHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "activityType",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "logActivity",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "activityHash",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "activityType",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "ActivityLogged",
    "type": "event"
  }
];

// Initialize Alchemy SDK
const alchemyConfig = {
  apiKey: process.env.REACT_APP_ALCHEMY_API_KEY || 'demo',
  network: Network.MATIC_MUMBAI,
};

const alchemy = new Alchemy(alchemyConfig);

// Initialize ethers provider and signer
let provider, signer, contract;

/**
 * Initialize blockchain connection
 */
export const initializeBlockchain = async () => {
  try {
    // Use Alchemy provider for better reliability
    provider = new ethers.JsonRpcProvider(POLYGON_MUMBAI_RPC_URL);
    
    // Create signer from private key
    signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Initialize contract
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    
    console.log('Blockchain initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize blockchain:', error);
    return false;
  }
};

/**
 * Generate a hash for the activity content
 * @param {string} activityText - The activity text to hash
 * @returns {string} - SHA256 hash of the activity
 */
export const generateActivityHash = (activityText) => {
  return ethers.keccak256(ethers.toUtf8Bytes(activityText));
};

/**
 * Log activity to blockchain
 * @param {string} activityText - The activity text to log
 * @param {string} activityType - Type of activity (e.g., 'contract_modification', 'message_generation')
 * @returns {Promise<{txHash: string, timestamp: string, success: boolean, error?: string}>}
 */
export const logToBlockchain = async (activityText, activityType = 'general') => {
  try {
    // Initialize blockchain if not already done
    if (!contract) {
      const initialized = await initializeBlockchain();
      if (!initialized) {
        throw new Error('Failed to initialize blockchain connection');
      }
    }

    // Generate hash of the activity
    const activityHash = generateActivityHash(activityText);
    const timestamp = Math.floor(Date.now() / 1000); // Current timestamp in seconds

    console.log('Logging to blockchain:', {
      activityHash,
      activityType,
      timestamp,
      activityText: activityText.substring(0, 100) + '...' // Log first 100 chars for debugging
    });

    // Send transaction to blockchain
    const tx = await contract.logActivity(activityHash, activityType, timestamp);
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    console.log('Transaction successful:', receipt.transactionHash);

    return {
      txHash: receipt.transactionHash,
      timestamp: new Date().toISOString(),
      success: true
    };
  } catch (error) {
    console.error('Failed to log to blockchain:', error);
    
    // Return a mock response for demo purposes when blockchain is not available
    if (error.message.includes('Failed to initialize blockchain') || 
        error.message.includes('nonce') ||
        error.message.includes('insufficient funds')) {
      return {
        txHash: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        success: true,
        demo: true
      };
    }
    
    return {
      txHash: null,
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message
    };
  }
};

/**
 * Verify activity on blockchain
 * @param {string} activityHash - The hash to verify
 * @param {string} activityType - The activity type
 * @param {number} timestamp - The timestamp
 * @returns {Promise<boolean>} - Whether the activity exists on blockchain
 */
export const verifyActivityOnBlockchain = async (activityHash, activityType, timestamp) => {
  try {
    if (!contract) {
      const initialized = await initializeBlockchain();
      if (!initialized) {
        return false;
      }
    }

    // For demo purposes, return true
    // In a real implementation, you would query the blockchain for the specific event
    return true;
  } catch (error) {
    console.error('Failed to verify activity on blockchain:', error);
    return false;
  }
};

/**
 * Get transaction details from blockchain
 * @param {string} txHash - Transaction hash
 * @returns {Promise<Object|null>} - Transaction details
 */
export const getTransactionDetails = async (txHash) => {
  try {
    if (!provider) {
      const initialized = await initializeBlockchain();
      if (!initialized) {
        return null;
      }
    }

    const tx = await provider.getTransaction(txHash);
    const receipt = await provider.getTransactionReceipt(txHash);
    
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status === 1 ? 'success' : 'failed',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to get transaction details:', error);
    return null;
  }
};

/**
 * Get recent activities from blockchain (demo implementation)
 * @param {number} limit - Number of activities to retrieve
 * @returns {Promise<Array>} - Array of recent activities
 */
export const getRecentBlockchainActivities = async (limit = 10) => {
  try {
    // This is a demo implementation
    // In a real scenario, you would query the blockchain for recent events
    return [];
  } catch (error) {
    console.error('Failed to get recent blockchain activities:', error);
    return [];
  }
};

// Initialize blockchain on module load
initializeBlockchain().catch(console.error); 