// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Interface for the official Filecoin Pay router
interface IFilecoinPay {
    function createPaymentRail(
        address token,
        address payee,
        uint256 ratePerEpoch,
        uint256 durationEpochs
    ) external returns (bytes32 railId);
}

contract VaultEscrowAdmin {
    IERC20 public immutable usdfc;
    IFilecoinPay public immutable filecoinPay;

    event VaultStreamInitialized(
        address indexed user,
        address indexed provider,
        bytes32 railId,
        uint256 totalLockup
    );

    constructor(address _usdfc, address _filecoinPay) {
        usdfc = IERC20(_usdfc);
        filecoinPay = IFilecoinPay(_filecoinPay);
    }

    // User deposits/approves USDFC to initialize their vault storage stream
    function initializeVaultStream(
        address provider,
        uint256 ratePerEpoch,
        uint256 duration
    ) external {
        uint256 totalLockup = ratePerEpoch * duration;

        // Transfer USDFC from the user to this admin contract
        require(
            usdfc.transferFrom(msg.sender, address(this), totalLockup),
            "Transfer failed"
        );

        // Approve the Filecoin Pay router to spend the locked up USDFC
        require(
            usdfc.approve(address(filecoinPay), totalLockup),
            "Approve failed"
        );

        // Establishes the Filecoin Pay rail to the FWSS provider
        bytes32 railId = filecoinPay.createPaymentRail(
            address(usdfc),
            provider,
            ratePerEpoch,
            duration
        );

        emit VaultStreamInitialized(msg.sender, provider, railId, totalLockup);
    }
}
