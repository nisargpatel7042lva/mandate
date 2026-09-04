// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title PermissionMirror
 * @notice Mirrors the canonical ENSv2 permission record onto the execution chain
 *         so MandateGate can read it synchronously during swap execution.
 *
 * Architecture:
 *   - The canonical permission record lives in ENSv2 text records on Sepolia
 *     (mandate.permissions key on the agent's ENS subname).
 *   - A backend relayer watches for ENSv2 record changes and calls sync() here.
 *   - MandateGate reads permissions from this contract, not from ENS, to keep
 *     enforcement as a single same-chain on-chain read at execution time.
 *
 * NOTE: Logic is intentionally minimal in Phase 1 — MandateGate is Phase 2 work.
 */
contract PermissionMirror {
    // ─── Types ───────────────────────────────────────────────────────────────

    struct PermissionScope {
        // Bitmask of allowed protocol IDs (1 bit per protocol, defined off-chain)
        uint256 allowedProtocols;
        // Bitmask of allowed position types (spot=bit0, lp=bit1, perp=bit2, …)
        uint8 allowedPositionTypes;
        // Maximum single position size in USDC (6 decimals)
        uint128 maxPositionSizeUsdc;
        // Maximum total spend per UTC day in USDC (6 decimals)
        uint128 maxDailySpendUsdc;
        // Unix timestamp after which this permission record is invalid
        uint64 expiry;
        // The ENSv2 namehash of the agent's subname — used as the canonical key
        bytes32 ensNode;
        // Block number at which this permission was last synced
        uint64 syncedAtBlock;
    }

    // ─── State ───────────────────────────────────────────────────────────────

    // Address authorized to call sync() — set to the relayer EOA or contract
    address public relayer;

    // agent address → current permission scope
    mapping(address agent => PermissionScope) private _permissions;

    // ─── Events ──────────────────────────────────────────────────────────────

    event PermissionSynced(
        address indexed agent,
        bytes32 indexed ensNode,
        uint64 syncedAtBlock
    );

    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);

    // ─── Errors ──────────────────────────────────────────────────────────────

    error OnlyRelayer();
    error PermissionExpired(address agent, uint64 expiry);

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(address _relayer) {
        relayer = _relayer;
    }

    // ─── Relayer-only write ───────────────────────────────────────────────────

    /**
     * @notice Sync the permission scope for an agent from the ENSv2 record.
     *         Called by the backend relayer whenever the ENSv2 text record changes.
     * @param agent   The agent's execution wallet address (msg.sender of trades)
     * @param scope   The decoded permission scope from the ENSv2 text record
     */
    function sync(address agent, PermissionScope calldata scope) external {
        if (msg.sender != relayer) revert OnlyRelayer();
        _permissions[agent] = scope;
        _permissions[agent].syncedAtBlock = uint64(block.number);
        emit PermissionSynced(agent, scope.ensNode, uint64(block.number));
    }

    // ─── Public reads (called by MandateGate) ────────────────────────────────

    /**
     * @notice Get the full permission scope for an agent.
     */
    function getPermissions(address agent) external view returns (PermissionScope memory) {
        return _permissions[agent];
    }

    /**
     * @notice Quick validity check — returns false if the scope is expired or unset.
     *         MandateGate calls this to gate swap execution.
     */
    function isAuthorized(address agent) external view returns (bool) {
        PermissionScope storage scope = _permissions[agent];
        if (scope.expiry == 0) return false;
        if (scope.expiry < block.timestamp) return false;
        return true;
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    function setRelayer(address _relayer) external {
        if (msg.sender != relayer) revert OnlyRelayer();
        emit RelayerUpdated(relayer, _relayer);
        relayer = _relayer;
    }
}
