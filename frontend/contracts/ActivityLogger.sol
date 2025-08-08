// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ActivityLogger
 * @dev A simple contract for logging real estate activities on the blockchain
 * @author AgentHub
 */
contract ActivityLogger {
    
    // Event emitted when an activity is logged
    event ActivityLogged(
        string indexed activityHash,
        string activityType,
        uint256 timestamp,
        address indexed sender
    );
    
    // Mapping to store activity details
    mapping(string => Activity) public activities;
    
    // Struct to store activity information
    struct Activity {
        string activityHash;
        string activityType;
        uint256 timestamp;
        address sender;
        bool exists;
    }
    
    // Owner of the contract
    address public owner;
    
    // Modifier to restrict access to owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    /**
     * @dev Constructor sets the contract owner
     */
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Log an activity to the blockchain
     * @param activityHash The hash of the activity content
     * @param activityType The type of activity (e.g., "contract_modification", "message_generation")
     * @param timestamp The timestamp when the activity occurred
     */
    function logActivity(
        string memory activityHash,
        string memory activityType,
        uint256 timestamp
    ) public {
        // Ensure the activity doesn't already exist
        require(!activities[activityHash].exists, "Activity already logged");
        
        // Create the activity record
        Activity memory newActivity = Activity({
            activityHash: activityHash,
            activityType: activityType,
            timestamp: timestamp,
            sender: msg.sender,
            exists: true
        });
        
        // Store the activity
        activities[activityHash] = newActivity;
        
        // Emit the event
        emit ActivityLogged(activityHash, activityType, timestamp, msg.sender);
    }
    
    /**
     * @dev Get activity details by hash
     * @param activityHash The hash of the activity
     * @return The activity details
     */
    function getActivity(string memory activityHash) public view returns (Activity memory) {
        require(activities[activityHash].exists, "Activity not found");
        return activities[activityHash];
    }
    
    /**
     * @dev Check if an activity exists
     * @param activityHash The hash of the activity
     * @return True if the activity exists, false otherwise
     */
    function activityExists(string memory activityHash) public view returns (bool) {
        return activities[activityHash].exists;
    }
    
    /**
     * @dev Transfer ownership of the contract
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
    
    /**
     * @dev Emergency function to pause contract (if needed)
     * This is a placeholder for future implementation
     */
    function emergencyPause() public onlyOwner {
        // Implementation for emergency pause functionality
        // This could be used to temporarily disable logging
    }
} 