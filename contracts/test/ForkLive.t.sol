// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Vault} from "../src/Vault.sol";
import {OnionFutures} from "../src/OnionFutures.sol";
import {OnionOracle} from "../src/OnionOracle.sol";

/// Forks LIVE Base Sepolia and exercises the full money flow against the actually
/// deployed contracts (deal() gives the test user real USDC). Proves deposit →
/// open → close(profit) → withdraw works on-chain, end to end.
/// Run: forge test --match-contract ForkLive -vvv
contract ForkLiveTest is Test {
    address constant ORACLE = 0x4AD251093AF5F76358b0D3c22Ec36C1848d90556;
    address constant VAULT = 0x1F3d578902767F5F9bD64389Fe925c901cBa392E;
    address constant FUTURES = 0x493Fc2D0c7E90C834De3d78A39Dd7e15f065f046;
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    Vault vault = Vault(VAULT);
    OnionFutures futures = OnionFutures(FUTURES);
    OnionOracle oracle = OnionOracle(ORACLE);

    function setUp() public {
        vm.createSelectFork("https://sepolia.base.org");
    }

    function test_LiveDepositOpenCloseWithdraw() public {
        address user = makeAddr("liveUser");
        deal(USDC, user, 100e6); // 100 test USDC
        emit log_named_uint("house liquidity (USDC 1e6)", vault.houseLiquidity());

        // --- deposit ---
        vm.startPrank(user);
        IERC20(USDC).approve(VAULT, 100e6);
        vault.deposit(100e6);
        assertEq(vault.balanceOf(user), 100e6, "deposit credited collateral");

        // --- open long: 5 margin, 2x (notional 10), well within live house ---
        uint256 id = futures.open(futures.LONG(), 5e6, 2, uint64(block.timestamp) + 1 days);
        vm.stopPrank();
        assertEq(vault.balanceOf(user), 95e6, "margin locked");

        // --- bump mark +10% as the on-chain keeper ---
        (uint64 mark,) = oracle.getMark();
        require(mark > 0, "no mark");
        vm.prank(oracle.keeper());
        oracle.setMark(uint64((uint256(mark) * 110) / 100), uint64(block.timestamp));
        int256 pnl = futures.markPnl(id);
        emit log_named_int("mark PnL (USDC 1e6)", pnl);
        assertGt(pnl, 0, "long is in profit after +10%");

        // --- close ---
        vm.prank(user);
        futures.close(id);
        uint256 collateral = vault.balanceOf(user);
        assertGt(collateral, 100e6, "got margin back + profit");
        emit log_named_uint("collateral after close (USDC 1e6)", collateral);

        // --- withdraw everything back to the wallet ---
        vm.prank(user);
        vault.withdraw(collateral);
        assertEq(vault.balanceOf(user), 0, "fully withdrawn");
        assertGt(IERC20(USDC).balanceOf(user), 100e6, "wallet net positive (profit realized)");
        emit log_named_uint("final wallet USDC (1e6)", IERC20(USDC).balanceOf(user));
    }
}
