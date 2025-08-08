const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying ActivityLogger contract...");

  // Get the contract factory
  const ActivityLogger = await hre.ethers.getContractFactory("ActivityLogger");
  
  // Deploy the contract
  const activityLogger = await ActivityLogger.deploy();
  
  // Wait for deployment to complete
  await activityLogger.waitForDeployment();
  
  // Get the deployed contract address
  const address = await activityLogger.getAddress();
  
  console.log("✅ ActivityLogger deployed to:", address);
  console.log("\n📋 Next steps:");
  console.log("1. Copy this address to your .env file:");
  console.log(`   REACT_APP_CONTRACT_ADDRESS=${address}`);
  console.log("2. Restart your frontend server");
  console.log("3. Test blockchain functionality");
  
  return address;
}

// Handle errors
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
