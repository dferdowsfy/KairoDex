const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("🔍 Checking MATIC balance with multiple methods...\n");
  
  const privateKey = process.env.PRIVATE_KEY || process.env.REACT_APP_PRIVATE_KEY;
  const alchemyApiKey = process.env.REACT_APP_ALCHEMY_API_KEY;
  
  if (!privateKey) {
    console.error("❌ No private key found in .env file");
    return;
  }
  
  const address = "0x3BACcfd0DFBB444580190Eb4B34234C9b2851FD9";
  
  // Try multiple RPC endpoints
  const rpcEndpoints = [
    `https://polygon-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
    "https://polygon-rpc.com",
    "https://rpc-mainnet.maticvigil.com",
    "https://polygon.llamarpc.com"
  ];
  
  for (let i = 0; i < rpcEndpoints.length; i++) {
    const rpcUrl = rpcEndpoints[i];
    console.log(`🔗 Trying RPC ${i + 1}: ${rpcUrl.split('/')[2]}...`);
    
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const balance = await provider.getBalance(address);
      const maticBalance = ethers.formatEther(balance);
      
      console.log(`✅ Balance: ${maticBalance} MATIC`);
      console.log(`💵 USD Value: $${(parseFloat(maticBalance) * 0.237).toFixed(2)}`);
      
      if (parseFloat(maticBalance) > 0) {
        console.log("🎉 Found MATIC balance! Ready to deploy.");
        return;
      }
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
    console.log("");
  }
  
  console.log("❌ All RPC endpoints failed or showed 0 balance");
  console.log("💡 This might be a network issue. Let's try deploying anyway...");
}

main().catch(console.error);
