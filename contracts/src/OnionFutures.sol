// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IOnionOracle} from "./interfaces/IOnionOracle.sol";
import {IVault} from "./interfaces/IVault.sol";

/// @title OnionFutures
/// @notice Dated onion futures — true to the meme (the 1958 Act bans *futures*,
/// not perps; dated contracts also avoid funding-rate machinery). Margin is
/// collateralized from the Vault. Pre-expiry the position is valued/closed
/// against the synthetic mark; at/after expiry it cash-settles against the real
/// USDA settlement index. PnL is bounded to ±margin so the Vault stays solvent.
///
/// Units: price 1e8, margin/notional/PnL in USDC 1e6. In `pnlAt` the 1e8 in
/// (price-entry)/entry cancels, so the result is natively USDC 1e6.
contract OnionFutures {
    uint8 public constant LONG = 0;
    uint8 public constant SHORT = 1;
    uint8 public constant MAX_LEVERAGE = 10;

    struct Position {
        address owner;
        uint128 margin; // USDC 1e6
        uint128 notional; // USDC 1e6 = margin * leverage
        uint64 entryPrice; // 1e8
        uint64 openTime; // unix s
        uint64 expiry; // unix s
        uint8 side; // LONG | SHORT
        bool closed;
    }

    IOnionOracle public immutable oracle;
    IVault public immutable vault;

    uint256 public nextId;
    mapping(uint256 => Position) public positions;
    mapping(address => uint256[]) public userPositions;

    event Opened(
        uint256 indexed id,
        address indexed owner,
        uint8 side,
        uint128 margin,
        uint128 notional,
        uint64 entryPrice,
        uint64 expiry
    );
    event Closed(uint256 indexed id, uint64 exitPrice, int256 pnl, uint256 payout, bool viaSettlement);

    error InvalidSide();
    error InvalidLeverage();
    error InvalidMargin();
    error InvalidExpiry();
    error NoMark();
    error NotOwner();
    error AlreadyClosed();
    error Expired();
    error NotExpired();
    error NotSettled();

    constructor(IOnionOracle _oracle, IVault _vault) {
        oracle = _oracle;
        vault = _vault;
    }

    /// @notice Open a dated future. Entry = current mark; locks `margin` via Vault.
    function open(uint8 side, uint128 margin, uint8 leverage, uint64 expiry) external returns (uint256 id) {
        if (side != LONG && side != SHORT) revert InvalidSide();
        if (leverage == 0 || leverage > MAX_LEVERAGE) revert InvalidLeverage();
        if (margin == 0) revert InvalidMargin();
        if (expiry <= block.timestamp) revert InvalidExpiry();
        (uint64 mark,) = oracle.getMark();
        if (mark == 0) revert NoMark();

        uint128 notional = margin * uint128(leverage);
        vault.lockMargin(msg.sender, margin);

        id = nextId++;
        positions[id] = Position({
            owner: msg.sender,
            margin: margin,
            notional: notional,
            entryPrice: mark,
            openTime: uint64(block.timestamp),
            expiry: expiry,
            side: side,
            closed: false
        });
        userPositions[msg.sender].push(id);
        emit Opened(id, msg.sender, side, margin, notional, mark, expiry);
    }

    /// @notice Close before expiry against the synthetic mark.
    function close(uint256 id) external {
        Position storage p = positions[id];
        if (p.owner != msg.sender) revert NotOwner();
        if (p.closed) revert AlreadyClosed();
        if (block.timestamp >= p.expiry) revert Expired(); // use settle() after expiry
        (uint64 mark,) = oracle.getMark();
        if (mark == 0) revert NoMark();
        _close(id, p, mark, false);
    }

    /// @notice Settle at/after expiry against the real USDA settlement index.
    /// Permissionless — anyone can settle an expired position to its owner.
    function settle(uint256 id) external {
        Position storage p = positions[id];
        if (p.closed) revert AlreadyClosed();
        if (block.timestamp < p.expiry) revert NotExpired();
        uint64 price = oracle.getSettlement(p.expiry);
        if (price == 0) revert NotSettled();
        _close(id, p, price, true);
    }

    function _close(uint256 id, Position storage p, uint64 price, bool viaSettlement) internal {
        int256 pnl = _pnl(p, price);
        p.closed = true;
        uint256 before = vault.balanceOf(p.owner);
        vault.settle(p.owner, p.margin, pnl);
        uint256 payout = vault.balanceOf(p.owner) - before;
        emit Closed(id, price, pnl, payout, viaSettlement);
    }

    // -------------------------------------------------------------- views

    function pnlAt(uint256 id, uint64 price) external view returns (int256) {
        return _pnl(positions[id], price);
    }

    function markPnl(uint256 id) external view returns (int256) {
        (uint64 mark,) = oracle.getMark();
        return _pnl(positions[id], mark);
    }

    function getUserPositions(address user) external view returns (uint256[] memory) {
        return userPositions[user];
    }

    function _pnl(Position memory p, uint64 price) internal pure returns (int256) {
        if (p.entryPrice == 0) return 0;
        int256 entry = int256(uint256(p.entryPrice));
        int256 raw = (int256(uint256(p.notional)) * (int256(uint256(price)) - entry)) / entry;
        if (p.side == SHORT) raw = -raw;
        int256 cap = int256(uint256(p.margin));
        if (raw > cap) raw = cap;
        if (raw < -cap) raw = -cap;
        return raw;
    }
}
