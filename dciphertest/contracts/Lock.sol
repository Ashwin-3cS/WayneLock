// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

contract Lock {
    uint public unlockTime;

    constructor(uint _unlockTime) {
        unlockTime = _unlockTime;
    }
}
