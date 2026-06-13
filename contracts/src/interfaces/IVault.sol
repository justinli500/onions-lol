// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Subset of Vault that OnionFutures calls.
interface IVault {
    function lockMargin(address user, uint256 margin) external;
    function settle(address user, uint256 margin, int256 pnl) external;
    function balanceOf(address user) external view returns (uint256);
}
