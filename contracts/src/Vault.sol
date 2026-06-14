// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Vault
/// @notice Holds all USDC (1e6) and is the sole counterparty to every position.
/// User collateral lives in `balanceOf`; the house pool is seeded by the
/// deployer via `provideHouse`. On open, OnionFutures locks `margin` from the
/// user AND reserves an equal `margin` from the house, so the max payout
/// (2*margin) is always pre-funded — PnL is bounded to ±margin upstream, so
/// solvency is trivial and there is no liquidation engine.
///
/// Invariant: usdc.balanceOf(this) == Σ balanceOf + houseLiquidity
///                                     + lockedMargin + reservedProfit
contract Vault {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public futures;
    address public owner;

    mapping(address => uint256) public balanceOf; // free user collateral
    uint256 public houseLiquidity; // free house pool
    uint256 public lockedMargin; // user margin across open positions
    uint256 public reservedProfit; // house funds earmarked for max payouts

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event HouseProvided(uint256 amount);
    event HouseWithdrawn(uint256 amount);
    event MarginLocked(address indexed user, uint256 margin);
    event PositionSettled(address indexed user, uint256 margin, int256 pnl, uint256 payout);
    event FuturesSet(address indexed futures);

    error NotOwner();
    error NotFutures();
    error FuturesAlreadySet();
    error InsufficientBalance();
    error InsufficientHouse();
    error ZeroAmount();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyFutures() {
        if (msg.sender != futures) revert NotFutures();
        _;
    }

    constructor(IERC20 _usdc) {
        usdc = _usdc;
        owner = msg.sender;
    }

    function setFutures(address _futures) external onlyOwner {
        if (futures != address(0)) revert FuturesAlreadySet();
        futures = _futures;
        emit FuturesSet(_futures);
    }

    // ---------------------------------------------------------------- funding

    function deposit(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        balanceOf[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }

    /// @notice One-tap deposit: EIP-2612 permit + pull, in a single tx. Permit
    /// is best-effort (a front-run permit would otherwise revert this call), so
    /// failure is swallowed and we fall back to the existing allowance.
    function depositWithPermit(uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        if (amount == 0) revert ZeroAmount();
        try IERC20Permit(address(usdc)).permit(msg.sender, address(this), amount, deadline, v, r, s) {} catch {}
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        balanceOf[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();
        balanceOf[msg.sender] -= amount;
        usdc.safeTransfer(msg.sender, amount);
        emit Withdraw(msg.sender, amount);
    }

    function provideHouse(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        houseLiquidity += amount;
        emit HouseProvided(amount);
    }

    /// @notice Owner reclaims FREE house liquidity (never touches lockedMargin or
    /// reservedProfit, so open positions stay fully solvent). The inverse of provideHouse.
    function withdrawHouse(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        if (amount > houseLiquidity) revert InsufficientHouse();
        houseLiquidity -= amount;
        usdc.safeTransfer(owner, amount);
        emit HouseWithdrawn(amount);
    }

    // ----------------------------------------------------------- futures-only

    function lockMargin(address user, uint256 margin) external onlyFutures {
        if (balanceOf[user] < margin) revert InsufficientBalance();
        if (houseLiquidity < margin) revert InsufficientHouse();
        balanceOf[user] -= margin;
        lockedMargin += margin;
        houseLiquidity -= margin;
        reservedProfit += margin;
        emit MarginLocked(user, margin);
    }

    /// @param pnl bounded to [-margin, margin] by the caller, so payout ∈ [0, 2*margin]
    function settle(address user, uint256 margin, int256 pnl) external onlyFutures {
        int256 signed = int256(margin) + pnl;
        uint256 payout = signed < 0 ? 0 : uint256(signed);
        lockedMargin -= margin;
        reservedProfit -= margin;
        balanceOf[user] += payout;
        houseLiquidity += (2 * margin - payout); // reverts if pnl > margin (safe)
        emit PositionSettled(user, margin, pnl, payout);
    }
}
