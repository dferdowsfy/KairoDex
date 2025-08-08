# Blockchain Integration Setup Guide

This guide explains how to set up the Polygon blockchain integration for AgentHub's audit trail functionality.

## Overview

The blockchain integration provides an immutable, verifiable audit trail for key activities in AgentHub:
- Contract modifications
- Follow-up message generation
- Note creation

Each activity is logged to the Polygon Mumbai testnet with a unique hash, creating a tamper-proof record.

## Prerequisites

1. **MetaMask Wallet**: Install MetaMask browser extension
2. **Polygon Mumbai Testnet**: Add Mumbai testnet to MetaMask
3. **Test MATIC**: Get test MATIC from Mumbai faucet
4. **Alchemy Account**: Create free account at [Alchemy](https://www.alchemy.com/)

## Setup Steps

### 1. Environment Variables

Create a `.env` file in the frontend directory:

```bash
# Blockchain Configuration
REACT_APP_PRIVATE_KEY=your_private_key_here
REACT_APP_CONTRACT_ADDRESS=deployed_contract_address
REACT_APP_ALCHEMY_API_KEY=your_alchemy_api_key

# Hardhat Configuration (for deployment)
MUMBAI_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/your_api_key
PRIVATE_KEY=your_private_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

### 2. Get Test MATIC

1. Visit [Mumbai Faucet](https://faucet.polygon.technology/)
2. Enter your wallet address
3. Request test MATIC (you'll need ~0.1 MATIC for deployment and transactions)

### 3. Deploy Smart Contract

```bash
# Install Hardhat dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv

# Deploy to Mumbai testnet
npx hardhat run contracts/deploy.js --network mumbai
```

### 4. Update Environment Variables

After deployment, update your `.env` file with the deployed contract address.

### 5. Start the Application

```bash
npm start
```

## Smart Contract Details

### ActivityLogger Contract

The `ActivityLogger.sol` contract provides:

- **logActivity()**: Logs activities with hash, type, and timestamp
- **getActivity()**: Retrieves activity details by hash
- **activityExists()**: Checks if an activity has been logged
- **ActivityLogged Event**: Emitted when activities are logged

### Contract Functions

```solidity
function logActivity(
    string memory activityHash,
    string memory activityType,
    uint256 timestamp
) public
```

### Activity Types

- `contract_modification`: Contract amendments and changes
- `message_generation`: Follow-up message creation
- `note_creation`: Client note creation

## Usage

### Automatic Logging

Activities are automatically logged to the blockchain when:

1. **Contract Modification**: Saving an amended contract
2. **Message Generation**: Creating a follow-up message
3. **Note Creation**: Saving client notes

### Blockchain Verification

Each activity displays:
- Transaction hash
- Activity type
- Timestamp
- Link to PolygonScan explorer
- Transaction details (block number, gas used, etc.)

### Demo Mode

When blockchain credentials aren't configured, the system operates in demo mode:
- Generates mock transaction hashes
- Shows demo indicators
- Provides setup instructions

## Security Considerations

### Private Key Management

⚠️ **IMPORTANT**: Never commit private keys to version control

- Use environment variables for all sensitive data
- Consider using a dedicated wallet for the application
- Regularly rotate keys in production

### Gas Optimization

- The contract is optimized for minimal gas usage
- Each transaction costs ~50,000-100,000 gas
- Monitor gas costs on Mumbai testnet

### Access Control

- Only the contract owner can transfer ownership
- All users can log activities (public function)
- Consider implementing role-based access for production

## Troubleshooting

### Common Issues

1. **"Failed to initialize blockchain"**
   - Check private key format (should start with 0x)
   - Verify contract address is correct
   - Ensure sufficient MATIC balance

2. **"Insufficient funds"**
   - Get more test MATIC from faucet
   - Check wallet balance on Mumbai testnet

3. **"Contract not found"**
   - Verify contract deployment was successful
   - Check contract address in environment variables

### Debug Mode

Enable debug logging by adding to your browser console:

```javascript
localStorage.setItem('debug', 'blockchain:*');
```

## Production Deployment

For production deployment:

1. **Mainnet Deployment**: Deploy to Polygon mainnet
2. **Gas Optimization**: Optimize contract for mainnet gas costs
3. **Security Audit**: Conduct professional security audit
4. **Monitoring**: Set up transaction monitoring
5. **Backup**: Implement backup verification systems

## API Reference

### Blockchain Utility Functions

```javascript
import { logToBlockchain, getTransactionDetails } from './utils/blockchain';

// Log activity
const result = await logToBlockchain(activityText, activityType);

// Get transaction details
const details = await getTransactionDetails(txHash);
```

### BlockchainInfo Component

```jsx
<BlockchainInfo
  txHash={transactionHash}
  activityType="contract_modification"
  timestamp={timestamp}
  customColors={customColors}
/>
```

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review browser console for error messages
3. Verify environment variable configuration
4. Test with Mumbai testnet faucet

## License

This blockchain integration is part of AgentHub and follows the same license terms. 