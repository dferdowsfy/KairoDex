const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("🔍 Checking all tokens in wallet...\n");
  
  const privateKey = process.env.PRIVATE_KEY || process.env.REACT_APP_PRIVATE_KEY;
  const alchemyApiKey = process.env.REACT_APP_ALCHEMY_API_KEY;
  
  if (!privateKey) {
    console.error("❌ No private key found in .env file");
    return;
  }
  
  try {
    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(`https://polygon-mainnet.g.alchemy.com/v2/${alchemyApiKey}`);
    const wallet = new ethers.Wallet(privateKey, provider);
    const address = wallet.address;
    
    console.log("📍 Wallet address:", address);
    console.log("🔗 Network: Polygon Mainnet");
    console.log("🔑 Private key (first 10 chars):", privateKey.substring(0, 12) + "...\n");
    
    // Check native MATIC balance
    const maticBalance = await provider.getBalance(address);
    console.log("💰 Native MATIC Balance:", ethers.formatEther(maticBalance), "MATIC");
    console.log("💵 MATIC in USD (approx):", "$" + (parseFloat(ethers.formatEther(maticBalance)) * 0.22).toFixed(2));
    
    if (maticBalance > 0) {
      console.log("✅ Wallet has MATIC - ready to deploy!");
    } else {
      console.log("❌ No MATIC found - need to add MATIC for gas fees");
      console.log("💡 You can buy MATIC from exchanges or transfer from another wallet");
    }
    
    // Check if there are any ERC-20 tokens
    console.log("\n🔍 Checking for other tokens...");
    console.log("💡 The $14.96 you see in MetaMask might be from other tokens (USDC, USDT, etc.)");
    console.log("💡 You need MATIC specifically for gas fees on Polygon");
    
  } catch (error) {
    console.error("❌ Error checking tokens:", error.message);
  }
}

main().catch(console.error);
