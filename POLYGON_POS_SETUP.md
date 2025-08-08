# Polygon PoS Setup Guide for AgentHub

This guide will help you deploy AgentHub on **Polygon PoS (Proof of Stake)** mainnet for production use.

## 🚀 Quick Start

### 1. Environment Variables Setup

Create a `.env` file in the `frontend` directory with the following variables:

```bash
# Polygon PoS Mainnet Configuration
REACT_APP_POLYGON_ALCHEMY_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/KvgxbeQcXDRQgnsXOMUdX
REACT_APP_PRIVATE_KEY=KvgxbeQcXDRQgnsXOMUdX
REACT_APP_CONTRACT_ADDRESS=0x3baccfd0dfbb444580190eb4b34234c9b2851fd9

# Optional: Alternative RPC (if not using Alchemy)
REACT_APP_POLYGON_POS_RPC_URL=https://polygon-rpc.com

# For contract verification
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

### 2. Required Accounts & Services

#### A. Alchemy Account (Recommended)
1. Sign up at [Alchemy](https://alchemy.com)
2. Create a new app for **Polygon Mainnet**
3. Copy your HTTP endpoint URL
4. Replace `YOUR_ALCHEMY_KEY` in the environment variable

#### B. Polygon Wallet
1. Create a wallet (MetaMask, etc.)
2. Add Polygon Mainnet to your wallet:
   - **Network Name**: Polygon Mainnet
   - **RPC URL**: `https://polygon-rpc.com`
   - **Chain ID**: `137`
   - **Currency Symbol**: `MATIC`
   - **Block Explorer**: `https://polygonscan.com`

3. Fund your wallet with MATIC for gas fees (recommend at least 10 MATIC)

#### C. PolygonScan API Key (Optional)
1. Sign up at [PolygonScan](https://polygonscan.com)
2. Get your API key for contract verification

### 3. Deploy Smart Contract

```bash
cd frontend

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy to Polygon PoS mainnet
npx hardhat run contracts/deploy.js --network polygon
```

### 4. Update Environment Variables

After deployment, update your `.env` file with the deployed contract address:

```bash
REACT_APP_CONTRACT_ADDRESS=0x... # Your deployed contract address
```

### 5. Verify Contract (Optional)

```bash
npx hardhat verify --network polygon DEPLOYED_CONTRACT_ADDRESS
```

## 🔧 Configuration Details

### Polygon PoS Network Information
- **Chain ID**: 137
- **Currency**: MATIC
- **Block Time**: ~2 seconds
- **Gas Limit**: 30M
- **Block Explorer**: [PolygonScan](https://polygonscan.com)

### Gas Optimization
The contract is optimized for Polygon PoS:
- Uses efficient gas estimation
- Includes 20% gas buffer for reliability
- Supports EIP-1559 gas pricing

### Security Features
- Owner-only functions for contract management
- Activity hash verification
- Duplicate activity prevention
- Event emission for transparency

## 🧪 Testing

### Test on Mumbai Testnet First
```bash
# Deploy to Mumbai testnet
npx hardhat run contracts/deploy.js --network mumbai

# Test functionality
npm start
```

### Production Deployment
```bash
# Deploy to Polygon PoS mainnet
npx hardhat run contracts/deploy.js --network polygon

# Start production app
npm start
```

## 📊 Monitoring

### Transaction Tracking
- All activities are logged to Polygon PoS blockchain
- Transaction hashes are displayed in the UI
- Click "View on PolygonScan" to see transaction details
- Gas usage and costs are tracked

### Activity Verification
- Each activity generates a unique hash
- Activities can be verified on-chain
- Contract events are indexed on PolygonScan

## 🔍 Troubleshooting

### Common Issues

1. **"No private key configured"**
   - Ensure `REACT_APP_PRIVATE_KEY` is set in `.env`
   - Private key should start with `0x`

2. **"Contract not deployed"**
   - Verify `REACT_APP_CONTRACT_ADDRESS` is correct
   - Ensure contract was deployed to Polygon PoS mainnet

3. **"Insufficient gas"**
   - Fund your wallet with more MATIC
   - Check current gas prices on [PolygonScan](https://polygonscan.com)

4. **"RPC connection failed"**
   - Verify your Alchemy API key
   - Check network connectivity
   - Try alternative RPC endpoints

### Gas Costs
- **Activity Logging**: ~50,000 - 100,000 gas
- **Current MATIC Price**: Check [CoinGecko](https://coingecko.com/en/coins/polygon)
- **Estimated Cost**: ~$0.01 - $0.05 per activity

## 🚀 Production Checklist

- [ ] Environment variables configured
- [ ] Smart contract deployed to Polygon PoS
- [ ] Contract address updated in `.env`
- [ ] Wallet funded with MATIC
- [ ] Alchemy account set up
- [ ] Contract verified on PolygonScan (optional)
- [ ] Test transactions completed
- [ ] Gas costs calculated
- [ ] Monitoring set up

## 📈 Benefits of Polygon PoS

1. **Low Gas Costs**: ~$0.01 per transaction
2. **Fast Confirmations**: ~2 second block time
3. **Ethereum Compatibility**: Same tooling and standards
4. **High Throughput**: 65,000+ TPS
5. **Established Network**: $8B+ TVL, 200M+ transactions
6. **Security**: Validated by 100+ validators

## 🔗 Useful Links

- [Polygon Documentation](https://docs.polygon.technology/)
- [PolygonScan](https://polygonscan.com)
- [Alchemy Polygon](https://alchemy.com/polygon)
- [Polygon Gas Tracker](https://polygonscan.com/gastracker)
- [MATIC Token](https://polygonscan.com/token/0x0000000000000000000000000000000000001010)

## 🆘 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify all environment variables are set
3. Ensure sufficient MATIC balance
4. Check Polygon network status
5. Review transaction details on PolygonScan

---

**AgentHub on Polygon PoS** - Secure, transparent, and cost-effective real estate activity logging on the blockchain! 🏠⛓️ 