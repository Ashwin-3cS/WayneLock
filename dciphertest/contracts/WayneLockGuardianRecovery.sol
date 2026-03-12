// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/**
 * WayneLockGuardianRecovery
 *
 * Stores an encrypted vault pointer (e.g. IPFS CID) and a guardian set for an owner.
 * Recovery is a simple on-chain approval flow: owner starts a recovery round; guardians approve;
 * once approvals reach threshold, the owner is considered "recovery approved".
 *
 * This contract is designed to be used by Lit access control conditions:
 * - Lit checks `isRecoveryApprovedForOwner(owner)` before allowing decryption of the wrapped key.
 */
contract WayneLockGuardianRecovery {
    error NotOwner();
    error VaultNotInitialized();
    error InvalidThreshold();
    error InvalidGuardian();
    error DuplicateGuardian();
    error NotGuardian();
    error RecoveryNotActive();
    error AlreadyApproved();

    event VaultRegistered(address indexed owner, string ipfsCid, uint8 threshold, address[] guardians);
    event VaultCidUpdated(address indexed owner, string ipfsCid);
    event RecoveryStarted(address indexed owner, uint256 indexed recoveryId);
    event RecoveryApproved(address indexed owner, uint256 indexed recoveryId, address indexed guardian, uint256 approvals);
    event RecoveryFinalized(address indexed owner, uint256 indexed recoveryId);

    struct VaultConfig {
        string ipfsCid; // pointer to encrypted blob / metadata (e.g. JSON on IPFS)
        uint8 threshold; // approvals required
        uint256 recoveryId; // current active recovery round (0 means none started yet)
        uint256 approvals; // approvals count for current recoveryId
        uint256 recoveryStart; // block timestamp when current recovery round started
        bool initialized;
        bool recoveryActive;
    }

    mapping(address => VaultConfig) private vaults; // owner => config
    mapping(address => address[]) private guardians; // owner => guardians list
    mapping(address => mapping(address => bool)) private isGuardian; // owner => guardian => bool

    // For each owner and recovery round, track if a guardian has approved.
    mapping(address => mapping(uint256 => mapping(address => bool))) private approved;

    // 5 minute recovery window per session
    uint256 public constant RECOVERY_WINDOW = 5 minutes;

    modifier onlyOwner(address owner) {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyInitialized(address owner) {
        if (!vaults[owner].initialized) revert VaultNotInitialized();
        _;
    }

    modifier onlyGuardian(address owner) {
        if (!isGuardian[owner][msg.sender]) revert NotGuardian();
        _;
    }

    /**
     * Register a vault for msg.sender with a CID, guardians, and a threshold.
     * This overwrites any previous guardian set and resets recovery state.
     */
    function registerVault(
        string calldata ipfsCid,
        address[] calldata newGuardians,
        uint8 threshold
    ) external {
        if (newGuardians.length == 0) revert InvalidGuardian();
        if (threshold == 0 || threshold > newGuardians.length) revert InvalidThreshold();

        // Clear previous guardians mapping (if any)
        address owner = msg.sender;
        address[] storage old = guardians[owner];
        for (uint256 i = 0; i < old.length; i++) {
            isGuardian[owner][old[i]] = false;
        }
        delete guardians[owner];

        // Set new guardians with uniqueness checks
        for (uint256 i = 0; i < newGuardians.length; i++) {
            address g = newGuardians[i];
            if (g == address(0) || g == owner) revert InvalidGuardian();
            if (isGuardian[owner][g]) revert DuplicateGuardian();
            isGuardian[owner][g] = true;
            guardians[owner].push(g);
        }

        VaultConfig storage v = vaults[owner];
        v.ipfsCid = ipfsCid;
        v.threshold = threshold;
        v.recoveryId = 0;
        v.approvals = 0;
        v.initialized = true;
        v.recoveryActive = false;

        emit VaultRegistered(owner, ipfsCid, threshold, guardians[owner]);
    }

    /** Update the CID pointer for msg.sender. */
    function updateVaultCid(string calldata ipfsCid) external onlyInitialized(msg.sender) {
        vaults[msg.sender].ipfsCid = ipfsCid;
        emit VaultCidUpdated(msg.sender, ipfsCid);
    }

    /**
     * Start a new recovery round.
     * Resets approval count and opens approvals for the new recoveryId.
     */
    function startRecovery() external onlyInitialized(msg.sender) {
        VaultConfig storage v = vaults[msg.sender];
        v.recoveryId += 1;
        v.approvals = 0;
        v.recoveryActive = true;
        v.recoveryStart = block.timestamp;
        emit RecoveryStarted(msg.sender, v.recoveryId);
    }

    /**
     * Guardian approves the current active recovery round for `owner`.
     */
    function approveRecovery(address owner) external onlyInitialized(owner) onlyGuardian(owner) {
        VaultConfig storage v = vaults[owner];
        if (!v.recoveryActive || v.recoveryId == 0) revert RecoveryNotActive();
        // Enforce 5 minute window; if expired, owner must start a new recovery session.
        if (block.timestamp > v.recoveryStart + RECOVERY_WINDOW) {
            v.recoveryActive = false;
            revert RecoveryNotActive();
        }

        if (approved[owner][v.recoveryId][msg.sender]) revert AlreadyApproved();
        approved[owner][v.recoveryId][msg.sender] = true;
        v.approvals += 1;

        emit RecoveryApproved(owner, v.recoveryId, msg.sender, v.approvals);
    }

    /**
     * Owner finalizes the recovery round (optional).
     * This does not change whether recovery was approved; it just closes the round.
     */
    function finalizeRecovery() external onlyInitialized(msg.sender) {
        VaultConfig storage v = vaults[msg.sender];
        if (!v.recoveryActive || v.recoveryId == 0) revert RecoveryNotActive();
        // Clean current session approvals so future rounds don't see stale approvals.
        address[] storage gs = guardians[msg.sender];
        for (uint256 i = 0; i < gs.length; i++) {
            approved[msg.sender][v.recoveryId][gs[i]] = false;
        }
        v.approvals = 0;
        v.recoveryActive = false;
        emit RecoveryFinalized(msg.sender, v.recoveryId);
    }

    // --------
    // Views (for UI + Lit ACC)
    // --------

    function getVaultCid(address owner) external view returns (string memory) {
        return vaults[owner].ipfsCid;
    }

    function getGuardians(address owner) external view returns (address[] memory) {
        return guardians[owner];
    }

    function getThreshold(address owner) external view returns (uint8) {
        return vaults[owner].threshold;
    }

    function getRecoveryStatus(address owner)
        external
        view
        returns (uint256 recoveryId, bool active, uint256 approvals, uint8 threshold)
    {
        VaultConfig storage v = vaults[owner];
        return (v.recoveryId, v.recoveryActive, v.approvals, v.threshold);
    }

    function isGuardianFor(address owner, address guardian) external view returns (bool) {
        return isGuardian[owner][guardian];
    }

    function hasApproved(address owner, uint256 recoveryId, address guardian) external view returns (bool) {
        return approved[owner][recoveryId][guardian];
    }

    /**
     * Lit-friendly: returns true if owner's CURRENT recovery round has >= threshold approvals.
     * This is what your Lit access conditions should check.
     */
    function isRecoveryApprovedForOwner(address owner) external view onlyInitialized(owner) returns (bool) {
        VaultConfig storage v = vaults[owner];
        if (!v.recoveryActive || v.recoveryId == 0) return false;
        return v.approvals >= v.threshold;
    }
}

