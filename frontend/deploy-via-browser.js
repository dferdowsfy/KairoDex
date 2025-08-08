// Browser-based deployment script
// Run this in your browser console with MetaMask connected

async function deployContract() {
  console.log("🚀 Deploying ActivityLogger contract via browser...");
  
  try {
    // Check if MetaMask is connected
    if (!window.ethereum) {
      throw new Error("MetaMask not found. Please install MetaMask.");
    }
    
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    
    console.log("📍 Connected account:", account);
    
    // Check if we're on Polygon
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== '0x89') { // Polygon mainnet
      throw new Error("Please switch to Polygon Mainnet in MetaMask");
    }
    
    // Get provider and signer
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    // Contract ABI and bytecode (simplified for browser)
    const contractABI = [
      "constructor()",
      "function logActivity(string activityHash, string activityType, uint256 timestamp) public",
      "function getActivity(string activityHash) public view returns (tuple(string,string,uint256,address,bool))",
      "function activityExists(string activityHash) public view returns (bool)"
    ];
    
    // This is a simplified version - you'll need the actual bytecode
    console.log("⚠️  This is a simplified deployment script");
    console.log("💡 For full deployment, use the Hardhat script with proper RPC configuration");
    
    // Check balance
    const balance = await provider.getBalance(account);
    console.log("💰 Balance:", ethers.utils.formatEther(balance), "MATIC");
    
    if (balance.isZero()) {
      throw new Error("No MATIC found in wallet");
    }
    
    console.log("✅ Ready to deploy!");
    console.log("💡 Use the Hardhat deployment script instead for full functionality");
    
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
  }
}

// Instructions for user
console.log(`
🔧 Browser Deployment Instructions:

1. Make sure MetaMask is connected to Polygon Mainnet
2. Ensure you have MATIC in your wallet
3. Run: deployContract()

Note: This is a simplified version. For full deployment, use:
npx hardhat run scripts/deploy.js --network polygon

The RPC issue might be temporary. Try again in a few minutes.
`);

// Export the function
window.deployContract = deployContract;
