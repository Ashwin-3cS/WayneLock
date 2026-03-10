// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { RandomnessReceiverBase } from "randomness-solidity/src/RandomnessReceiverBase.sol";

contract PassGenRandomConsumer is RandomnessReceiverBase {
    uint256 public requestId;
    bytes32 public randomValue;

    event RandomnessRequested(uint256 indexed requestId);
    event RandomnessFulfilled(uint256 indexed requestId, bytes32 randomValue);

    constructor(address randomnessSender, address owner) RandomnessReceiverBase(randomnessSender, owner) {}

    /// @notice Request randomness with direct native payment (send ETH with the call)
    function getRandomnessDirect(uint32 callbackGasLimit) external payable returns (uint256, uint256) {
        (uint256 id, uint256 price) = _requestRandomnessPayInNative(callbackGasLimit);
        requestId = id;
        emit RandomnessRequested(requestId);
        return (id, price);
    }

    /// @notice Request randomness using subscription (subscriptionId must be set and funded first)
    function getRandomnessSubscription(uint32 callbackGasLimit) external returns (uint256) {
        requestId = _requestRandomnessWithSubscription(callbackGasLimit);
        emit RandomnessRequested(requestId);
        return requestId;
    }

    /// @notice Called by the randomnessSender to fulfill the request    
    function onRandomnessReceived(uint256 requestID, bytes32 _randomness) internal override {
        require(requestId == requestID, "Request ID mismatch");
        randomValue = _randomness;
        
        emit RandomnessFulfilled(requestID, _randomness);
        // You can add any logic to consume randomness value here.
    }
}
