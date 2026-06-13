// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Read interface OnionFutures uses to value positions.
interface IOnionOracle {
    /// @return price synthetic intraday mark (1e8); @return timestamp unix seconds
    function getMark() external view returns (uint64 price, uint64 timestamp);
    /// @return real USDA settlement index (1e8) for an expiry, or 0 if unset
    function getSettlement(uint64 expiry) external view returns (uint64);
    /// @return price latest USDA daily anchor (1e8); @return effectiveTs unix seconds
    function getAnchor() external view returns (uint64 price, uint64 effectiveTs);
}
