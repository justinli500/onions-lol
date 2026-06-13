// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title OnionOracle
/// @notice Keeper-pushed prices for the onion futures exchange. There is no
/// Chainlink onion feed — by design. Stores three things, all scaled 1e8:
///  - `mark`: the synthetic intraday price (drives live valuation / close)
///  - `anchor`: the latest USDA daily anchor (single on-chain source the
///    off-chain deterministic mark generator and price API both read, so a
///    keeper restart can't cause a price step)
///  - `settlementIndex[expiry]`: the real USDA price a dated contract settles to
contract OnionOracle {
    uint64 public markPrice; // 1e8
    uint64 public markTimestamp; // unix seconds
    uint64 public anchorPrice; // 1e8
    uint64 public anchorEffectiveTs; // unix seconds the anchor became effective
    mapping(uint64 => uint64) public settlementIndex; // expiry => 1e8 price

    address public keeper;
    address public owner;

    event MarkUpdated(uint64 price, uint64 timestamp);
    event AnchorUpdated(uint64 price, uint64 effectiveTs);
    event Settled(uint64 indexed expiry, uint64 price);
    event KeeperChanged(address indexed keeper);

    error NotKeeper();
    error NotOwner();
    error AlreadySettled();
    error ZeroPrice();

    modifier onlyKeeper() {
        if (msg.sender != keeper) revert NotKeeper();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _keeper) {
        owner = msg.sender;
        keeper = _keeper;
        emit KeeperChanged(_keeper);
    }

    function setMark(uint64 price, uint64 timestamp) external onlyKeeper {
        if (price == 0) revert ZeroPrice();
        markPrice = price;
        markTimestamp = timestamp;
        emit MarkUpdated(price, timestamp);
    }

    function setAnchor(uint64 price, uint64 effectiveTs) external onlyKeeper {
        if (price == 0) revert ZeroPrice();
        anchorPrice = price;
        anchorEffectiveTs = effectiveTs;
        emit AnchorUpdated(price, effectiveTs);
    }

    /// @dev One-shot per expiry so a settled contract can never be re-priced.
    function setSettlement(uint64 expiry, uint64 price) external onlyKeeper {
        if (price == 0) revert ZeroPrice();
        if (settlementIndex[expiry] != 0) revert AlreadySettled();
        settlementIndex[expiry] = price;
        emit Settled(expiry, price);
    }

    function setKeeper(address _keeper) external onlyOwner {
        keeper = _keeper;
        emit KeeperChanged(_keeper);
    }

    function getMark() external view returns (uint64, uint64) {
        return (markPrice, markTimestamp);
    }

    function getAnchor() external view returns (uint64, uint64) {
        return (anchorPrice, anchorEffectiveTs);
    }

    function getSettlement(uint64 expiry) external view returns (uint64) {
        return settlementIndex[expiry];
    }
}
