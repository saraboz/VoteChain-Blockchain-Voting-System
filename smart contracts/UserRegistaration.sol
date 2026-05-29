// UserRegistration.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UserRegistration {
    // Mapping from UUID to wallet address - simplifies the struct
    mapping(string => address) public uuidToWallet;
    // Mapping from wallet to UUID
    mapping(address => string) public walletToUuid;
    // Mapping to track registered status directly
    mapping(string => bool) public isRegistered;

    event UserRegistered(string indexed uuid, address indexed wallet);

    function registerUser(string calldata uuid) external {
        require(bytes(uuid).length > 0, "UUID cannot be empty");
        require(!isRegistered[uuid], "User already registered");
        require(bytes(walletToUuid[msg.sender]).length == 0, "Wallet already registered");

        // Set mappings directly instead of using a struct
        uuidToWallet[uuid] = msg.sender;
        walletToUuid[msg.sender] = uuid;
        isRegistered[uuid] = true;

        emit UserRegistered(uuid, msg.sender);
    }

    function isUserRegistered(string calldata uuid) external view returns (bool) {
        return isRegistered[uuid];
    }

    function isWalletRegistered(address wallet) external view returns (bool) {
        return bytes(walletToUuid[wallet]).length > 0;
    }
}