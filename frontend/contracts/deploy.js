const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying ActivityLogger contract...");

  // Get the contract factory
  const ActivityLogger = await ethers.getContractFactory("ActivityLogger");
  
  // Deploy the contract
  const activityLogger = await ActivityLogger.deploy();
  
  // Wait for deployment to finish
  await activityLogger.waitForDeployment();
  
  const address = await activityLogger.getAddress();
  
  console.log("ActivityLogger deployed to:", address);
  console.log("Contract address for environment variable:", address);
  
  // Verify the deployment
  console.log("Verifying deployment...");
  const deployedContract = await ethers.getContractAt("ActivityLogger", address);
  const owner = await deployedContract.owner();
  console.log("Contract owner:", owner);
  
  console.log("Deployment completed successfully!");
  console.log("Add this to your .env file:");
  console.log(`REACT_APP_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 