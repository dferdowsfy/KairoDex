const { ethers } = require("ethers");
require("dotenv").config();

async function deployWithFallback() {
  console.log("🚀 Deploying with multiple RPC fallbacks...\n");
  
  const privateKey = process.env.PRIVATE_KEY || process.env.REACT_APP_PRIVATE_KEY;
  const alchemyApiKey = process.env.REACT_APP_ALCHEMY_API_KEY;
  
  const rpcEndpoints = [
    `https://polygon-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
    "https://polygon-rpc.com",
    "https://rpc-mainnet.matic.network",
    "https://polygon.llamarpc.com"
  ];
  
  for (let i = 0; i < rpcEndpoints.length; i++) {
    const rpcUrl = rpcEndpoints[i];
    console.log(`🔗 Trying RPC ${i + 1}: ${rpcUrl.split('/')[2]}...`);
    
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
      const address = wallet.address;
      
      // Check balance
      const balance = await provider.getBalance(address);
      const maticBalance = ethers.formatEther(balance);
      
      console.log(`💰 Balance: ${maticBalance} MATIC`);
      
      if (parseFloat(maticBalance) > 0) {
        console.log("✅ Found MATIC balance! Deploying contract...");
        
        // Deploy contract
        const ActivityLogger = await ethers.getContractFactory("ActivityLogger");
        const contract = await ActivityLogger.deploy();
        await contract.waitForDeployment();
        
        const contractAddress = await contract.getAddress();
        console.log("🎉 Contract deployed successfully!");
        console.log("📍 Contract address:", contractAddress);
        
        // Update .env file
        console.log("\n📝 Update your .env file with:");
        console.log(`REACT_APP_CONTRACT_ADDRESS=${contractAddress}`);
        
        return contractAddress;
      }
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
    console.log("");
  }
  
  console.log("❌ All RPC endpoints failed");
  console.log("💡 This might be a temporary network issue. Try again later.");
}

deployWithFallback().catch(console.error);
