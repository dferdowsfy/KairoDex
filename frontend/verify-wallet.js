const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("🔍 Verifying wallet configuration...\n");
  
  const privateKey = process.env.PRIVATE_KEY || process.env.REACT_APP_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error("❌ No private key found in .env file");
    return;
  }
  
  try {
    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey);
    const address = wallet.address;
    
    console.log("✅ Private key is valid");
    console.log("📍 Wallet address:", address);
    console.log("🔑 Private key (first 10 chars):", privateKey.substring(0, 12) + "...");
    
    // Check if this matches what we expect
    if (address === "0x3BACcfd0DFBB444580190Eb4B34234C9b2851FD9") {
      console.log("✅ Wallet address matches expected address");
    } else {
      console.log("⚠️  Wallet address doesn't match expected address");
      console.log("   Expected: 0x3BACcfd0DFBB444580190Eb4B34234C9b2851FD9");
      console.log("   Actual:   ", address);
    }
    
    console.log("\n💡 If the addresses don't match, update your .env file with the private key from the wallet that has your MATIC funds");
    
  } catch (error) {
    console.error("❌ Error verifying wallet:", error.message);
  }
}

main().catch(console.error);
