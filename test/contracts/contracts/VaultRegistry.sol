// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VaultRegistry {
    mapping(address => string) public userVaults;

    event VaultUpdated(address indexed user, string uri);

    function setVault(string calldata uri) external {
        userVaults[msg.sender] = uri;
        emit VaultUpdated(msg.sender, uri);
    }

    function getVault(address user) external view returns (string memory) {
        return userVaults[user];
    }
}
