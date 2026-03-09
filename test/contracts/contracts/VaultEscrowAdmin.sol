// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title VaultEscrowAdmin
 * @dev Simplified vault contract that accepts USDFC deposits.
 *      The Filecoin Pay deposit and rail creation is now handled
 *      directly from the frontend using the filoz/synapse-core SDK,
 *      which calls the real Filecoin Pay contract at:
 *      0x85e366Cf9DD2c0aE37E963d9556F5f4718d6417C (Calibration Testnet)
 */
contract VaultEscrowAdmin {
    IERC20 public immutable usdfc;

    // Filecoin Pay contract on Calibration Testnet
    address public constant FILECOIN_PAY =
        0x85e366Cf9DD2c0aE37E963d9556F5f4718d6417C;

    event VaultFunded(address indexed user, uint256 amount, uint256 timestamp);

    constructor(address _usdfc) {
        usdfc = IERC20(_usdfc);
    }

    /**
     * @dev Records that a user has funded their vault.
     *      The actual Filecoin Pay deposit happens via the frontend SDK.
     *      This tx emits an on-chain event for auditability.
     */
    function recordVaultFunding(uint256 amount) external {
        emit VaultFunded(msg.sender, amount, block.timestamp);
    }
}
