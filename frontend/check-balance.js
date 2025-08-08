const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("🔍 Checking wallet configuration...");
    
    // Get the signer
    const [signer] = await ethers.getSigners();
    
    if (!signer) {
      console.error("❌ No signer found. Check your PRIVATE_KEY in .env file");
      return;
    }
    
    const address = await signer.getAddress();
    const balance = await signer.provider.getBalance(address);
    
    console.log("✅ Account address:", address);
    console.log("💰 Balance:", ethers.formatEther(balance), "MATIC");
    console.log("💵 Balance in USD (approx):", "$" + (parseFloat(ethers.formatEther(balance)) * 0.22).toFixed(2));
    
    if (balance > 0) {
      console.log("✅ Account has funds - ready to deploy!");
    } else {
      console.log("❌ Account has no funds - need to add MATIC");
      console.log("💡 Get free MATIC from: https://faucet.polygon.technology/");
    }
  } catch (error) {
    console.error("❌ Error checking balance:", error.message);
    console.log("💡 Make sure your PRIVATE_KEY is set correctly in .env file");
  }
}

main().catch(console.error);
