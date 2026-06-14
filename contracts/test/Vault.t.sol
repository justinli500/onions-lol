// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {OnionOracle} from "../src/OnionOracle.sol";
import {Vault} from "../src/Vault.sol";
import {OnionFutures} from "../src/OnionFutures.sol";
import {IOnionOracle} from "../src/interfaces/IOnionOracle.sol";
import {IVault} from "../src/interfaces/IVault.sol";

/// @notice Focused coverage for the owner-only `withdrawHouse` escape hatch:
/// the inverse of `provideHouse`. It may only spend FREE house liquidity and
/// must never touch `lockedMargin` or `reservedProfit` (open-position backing).
contract VaultWithdrawHouseTest is Test {
    MockUSDC usdc;
    OnionOracle oracle;
    Vault vault;
    OnionFutures futures;

    address keeper = makeAddr("keeper");
    address user = makeAddr("user");
    address stranger = makeAddr("stranger");

    uint64 constant ENTRY = 20e8; // $20.00 / sack, scaled 1e8
    uint128 constant USDC1 = 1e6; // $1
    uint64 constant DAY = 1 days;
    uint256 constant HOUSE = 1_000_000 * USDC1; // seeded house pool

    // mirror of the contract event so vm.expectEmit can match it
    event HouseWithdrawn(uint256 amount);

    function setUp() public {
        usdc = new MockUSDC();
        oracle = new OnionOracle(keeper);
        vault = new Vault(IERC20(address(usdc))); // owner == address(this)
        futures = new OnionFutures(IOnionOracle(address(oracle)), IVault(address(vault)));
        vault.setFutures(address(futures));

        // seed house pool (this test contract is the owner/deployer)
        usdc.mint(address(this), HOUSE);
        usdc.approve(address(vault), type(uint256).max);
        vault.provideHouse(HOUSE);

        // fund a user so we can open a position in the bonus test
        usdc.mint(user, 10_000 * USDC1);
        vm.startPrank(user);
        usdc.approve(address(vault), type(uint256).max);
        vault.deposit(10_000 * USDC1);
        vm.stopPrank();

        vm.prank(keeper);
        oracle.setMark(ENTRY, uint64(block.timestamp));
    }

    /// usdc.balanceOf(vault) == Σ balances + house + locked + reserved
    function _assertConservation() internal view {
        uint256 accounted =
            vault.balanceOf(user) + vault.houseLiquidity() + vault.lockedMargin() + vault.reservedProfit();
        assertEq(usdc.balanceOf(address(vault)), accounted, "vault conservation broken");
    }

    function _open(uint8 side, uint128 margin, uint8 lev) internal returns (uint256 id) {
        vm.prank(user);
        id = futures.open(side, margin, lev, uint64(block.timestamp) + DAY);
    }

    // ----------------------------------------------------------- success

    function test_WithdrawHouseReducesLiquidityAndPaysOwner() public {
        uint256 amount = 250_000 * USDC1;
        uint256 ownerBalBefore = usdc.balanceOf(address(this));
        uint256 houseBefore = vault.houseLiquidity();

        vm.expectEmit(true, true, true, true, address(vault));
        emit HouseWithdrawn(amount);
        vault.withdrawHouse(amount);

        assertEq(vault.houseLiquidity(), houseBefore - amount, "house not reduced by amount");
        assertEq(usdc.balanceOf(address(this)), ownerBalBefore + amount, "owner not paid amount");
        _assertConservation();
    }

    function test_WithdrawHouseFullDrain() public {
        uint256 ownerBalBefore = usdc.balanceOf(address(this));
        vault.withdrawHouse(HOUSE);
        assertEq(vault.houseLiquidity(), 0, "house should be fully drained");
        assertEq(usdc.balanceOf(address(this)), ownerBalBefore + HOUSE, "owner not paid full amount");
        _assertConservation();
    }

    // ----------------------------------------------------------- reverts

    function test_WithdrawHouseRevertsForNonOwner() public {
        vm.prank(stranger);
        vm.expectRevert(Vault.NotOwner.selector);
        vault.withdrawHouse(1 * USDC1);
    }

    function test_WithdrawHouseRevertsOnInsufficientHouse() public {
        uint256 tooMuch = vault.houseLiquidity() + 1; // read before expectRevert (next-call semantics)
        vm.expectRevert(Vault.InsufficientHouse.selector);
        vault.withdrawHouse(tooMuch);
    }

    function test_WithdrawHouseRevertsOnZeroAmount() public {
        vm.expectRevert(Vault.ZeroAmount.selector);
        vault.withdrawHouse(0);
    }

    // ----------------------------------------------------------- isolation

    /// Opening a position moves `margin` from free house into `reservedProfit`.
    /// withdrawHouse must only be able to reclaim the remaining FREE house, never
    /// the reserved backing of the open position.
    function test_WithdrawHouseCannotTouchReservedProfit() public {
        uint128 margin = 100 * USDC1;
        _open(futures.LONG(), margin, 5);

        uint256 freeHouse = vault.houseLiquidity();
        assertEq(freeHouse, HOUSE - margin, "open should reserve margin from house");
        assertEq(vault.reservedProfit(), margin, "reservedProfit should equal margin");
        assertEq(vault.lockedMargin(), margin, "lockedMargin should equal margin");

        // can pull every FREE unit...
        vault.withdrawHouse(freeHouse);
        assertEq(vault.houseLiquidity(), 0, "free house fully reclaimed");

        // ...but the reserved/locked backing is untouched and unreachable
        assertEq(vault.reservedProfit(), margin, "reservedProfit must be untouched");
        assertEq(vault.lockedMargin(), margin, "lockedMargin must be untouched");
        vm.expectRevert(Vault.InsufficientHouse.selector);
        vault.withdrawHouse(1);

        _assertConservation();
    }
}
