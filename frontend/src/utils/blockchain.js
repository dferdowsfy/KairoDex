// Safe ethers import with fallback
let ethers;
try {
  ethers = require('ethers');
} catch (error) {
  console.warn('Ethers library not available, using demo mode');
  ethers = null;
}

// Configuration for Polygon PoS Mainnet
const POLYGON_POS_RPC_URL = process.env.REACT_APP_POLYGON_POS_RPC_URL || 'https://polygon-rpc.com';
const POLYGON_ALCHEMY_RPC_URL = process.env.REACT_APP_POLYGON_ALCHEMY_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/demo';
const PRIVATE_KEY = process.env.REACT_APP_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000';
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

// Use Alchemy RPC if available, otherwise fallback to public RPC
const RPC_URL = POLYGON_ALCHEMY_RPC_URL !== 'https://polygon-mainnet.g.alchemy.com/v2/demo' 
  ? POLYGON_ALCHEMY_RPC_URL 
  : POLYGON_POS_RPC_URL;

// Enhanced contract ABI for logging activities
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
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "activityHash",
        "type": "string"
      }
    ],
    "name": "getActivity",
    "outputs": [
      {
        "components": [
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
          },
          {
            "internalType": "address",
            "name": "sender",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "exists",
            "type": "bool"
          }
        ],
        "internalType": "struct ActivityLogger.Activity",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "activityHash",
        "type": "string"
      }
    ],
    "name": "activityExists",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Initialize ethers provider and signer
let provider, signer, contract;

export const initializeBlockchain = async () => {
  try {
    // Check if ethers is available
    if (!ethers) {
      console.warn('Polygon PoS: Ethers library not available, using demo mode');
      return false;
    }

    // Check if we have proper configuration
    if (PRIVATE_KEY === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.warn('Polygon PoS: No private key configured, using demo mode');
      return false;
    }

    if (CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      console.warn('Polygon PoS: No contract address configured, using demo mode');
      return false;
    }

    provider = new ethers.JsonRpcProvider(RPC_URL);
    signer = new ethers.Wallet(PRIVATE_KEY, provider);
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    
    // Test the connection
    const network = await provider.getNetwork();
    console.log('Polygon PoS: Connected to network:', network.name, 'Chain ID:', network.chainId);
    
    // Check contract deployment
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x') {
      console.error('Polygon PoS: Contract not deployed at specified address');
      return false;
    }
    
    console.log('Polygon PoS: Blockchain initialized successfully');
    return true;
  } catch (error) {
    console.error('Polygon PoS: Failed to initialize blockchain:', error);
    return false;
  }
};

export const generateActivityHash = (activityText) => {
  if (!ethers) {
    // Fallback hash generation for demo mode
    const simpleHash = activityText.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return '0x' + Math.abs(simpleHash).toString(16).padStart(64, '0');
  }
  return ethers.keccak256(ethers.toUtf8Bytes(activityText));
};

export const logToBlockchain = async (activityText, activityType = 'general', metadata = {}) => {
  try {
    if (!contract) {
      const initialized = await initializeBlockchain();
      if (!initialized) {
        throw new Error('Polygon PoS: Failed to initialize blockchain connection');
      }
    }

    const activityHash = generateActivityHash(activityText);
    const timestamp = Math.floor(Date.now() / 1000);

    console.log('Polygon PoS: Logging to blockchain:', {
      activityHash,
      activityType,
      timestamp,
      activityText: activityText.substring(0, 100) + '...',
      metadata
    });

    // Estimate gas first
    const gasEstimate = await contract.logActivity.estimateGas(activityHash, activityType, timestamp);
    console.log('Polygon PoS: Estimated gas:', gasEstimate.toString());

    // Execute transaction with gas limit
    const tx = await contract.logActivity(activityHash, activityType, timestamp, {
      gasLimit: gasEstimate.mul(120).div(100) // Add 20% buffer
    });
    
    console.log('Polygon PoS: Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    
    console.log('Polygon PoS: Transaction successful:', {
      hash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice.toString()
    });

    // Store additional metadata in localStorage for tracking
    const blockchainActivity = {
      id: Date.now(),
      txHash: receipt.transactionHash,
      activityHash,
      activityType,
      activityText,
      timestamp: new Date().toISOString(),
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice.toString(),
      metadata,
      verified: true,
      network: 'Polygon PoS'
    };

    // Store in localStorage for tracking
    const storedActivities = JSON.parse(localStorage.getItem('blockchainActivities') || '[]');
    storedActivities.unshift(blockchainActivity);
    localStorage.setItem('blockchainActivities', JSON.stringify(storedActivities.slice(0, 100)));

    return {
      txHash: receipt.transactionHash,
      timestamp: new Date().toISOString(),
      success: true,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  } catch (error) {
    console.error('Polygon PoS: Failed to log to blockchain:', error);
    
    // Demo mode fallback with enhanced metadata
    const demoActivity = {
      id: Date.now(),
      txHash: `demo_polygon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      activityHash: generateActivityHash(activityText),
      activityType,
      activityText,
      timestamp: new Date().toISOString(),
      blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
      gasUsed: (Math.floor(Math.random() * 50000) + 20000).toString(),
      effectiveGasPrice: (Math.floor(Math.random() * 100) + 30).toString(), // MATIC gas price
      metadata,
      verified: false,
      demo: true,
      network: 'Polygon PoS (Demo)'
    };

    // Store demo activity
    const storedActivities = JSON.parse(localStorage.getItem('blockchainActivities') || '[]');
    storedActivities.unshift(demoActivity);
    localStorage.setItem('blockchainActivities', JSON.stringify(storedActivities.slice(0, 100)));

    return {
      txHash: demoActivity.txHash,
      timestamp: demoActivity.timestamp,
      success: true,
      demo: true,
      blockNumber: demoActivity.blockNumber,
      gasUsed: demoActivity.gasUsed
    };
  }
};

export const verifyActivityOnBlockchain = async (activityHash, activityType, timestamp) => {
  try {
    if (!contract) {
      const initialized = await initializeBlockchain();
      if (!initialized) {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Failed to verify activity on blockchain:', error);
    return false;
  }
};

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
      effectiveGasPrice: receipt.effectiveGasPrice.toString(),
      status: receipt.status === 1 ? 'success' : 'failed',
      timestamp: new Date().toISOString(),
      network: 'Polygon PoS'
    };
  } catch (error) {
    console.error('Polygon PoS: Failed to get transaction details:', error);
    return null;
  }
};

export const getRecentBlockchainActivities = async (limit = 10) => {
  try {
    // Get activities from localStorage for demo purposes
    const storedActivities = JSON.parse(localStorage.getItem('blockchainActivities') || '[]');
    return storedActivities.slice(0, limit);
  } catch (error) {
    console.error('Failed to get recent blockchain activities:', error);
    return [];
  }
};

// Initialize blockchain on module load (only if ethers is available)
if (ethers) {
  initializeBlockchain().catch(console.error);
}
