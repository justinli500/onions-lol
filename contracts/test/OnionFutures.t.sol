// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {OnionOracle} from "../src/OnionOracle.sol";
import {Vault} from "../src/Vault.sol";
import {OnionFutures} from "../src/OnionFutures.sol";
import {IOnionOracle} from "../src/interfaces/IOnionOracle.sol";
import {IVault} from "../src/interfaces/IVault.sol";

contract OnionFuturesTest is Test {
    MockUSDC usdc;
    OnionOracle oracle;
    Vault vault;
    OnionFutures futures;

    address keeper = makeAddr("keeper");
    address user = makeAddr("user");

    uint64 constant ENTRY = 20e8; // $20.00 / sack, scaled 1e8
    uint128 constant USDC1 = 1e6; // $1 (uint128 so margin/notional args type-check)
    uint64 constant DAY = 1 days;

    function setUp() public {
        usdc = new MockUSDC();
        oracle = new OnionOracle(keeper);
        vault = new Vault(IERC20(address(usdc)));
        futures = new OnionFutures(IOnionOracle(address(oracle)), IVault(address(vault)));
        vault.setFutures(address(futures));

        // seed house pool
        usdc.mint(address(this), 1_000_000 * USDC1);
        usdc.approve(address(vault), type(uint256).max);
        vault.provideHouse(1_000_000 * USDC1);

        // fund the user's collateral balance
        usdc.mint(user, 10_000 * USDC1);
        vm.startPrank(user);
        usdc.approve(address(vault), type(uint256).max);
        vault.deposit(10_000 * USDC1);
        vm.stopPrank();

        // initial mark
        vm.prank(keeper);
        oracle.setMark(ENTRY, uint64(block.timestamp));
    }

    // ----------------------------------------------------------- invariant

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

    // ----------------------------------------------------------- oracle

    function test_OnlyKeeperCanSetMark() public {
        vm.expectRevert(OnionOracle.NotKeeper.selector);
        oracle.setMark(21e8, uint64(block.timestamp));
        vm.prank(keeper);
        oracle.setMark(21e8, uint64(block.timestamp));
        (uint64 m,) = oracle.getMark();
        assertEq(m, 21e8);
    }

    function test_SettlementIsOneShot() public {
        uint64 exp = uint64(block.timestamp) + DAY;
        vm.startPrank(keeper);
        oracle.setSettlement(exp, 22e8);
        vm.expectRevert(OnionOracle.AlreadySettled.selector);
        oracle.setSettlement(exp, 23e8);
        vm.stopPrank();
        assertEq(oracle.getSettlement(exp), 22e8);
    }

    function test_AnchorRoundTrip() public {
        vm.prank(keeper);
        oracle.setAnchor(19_50000000, 12345);
        (uint64 p, uint64 ts) = oracle.getAnchor();
        assertEq(p, 19_50000000);
        assertEq(ts, 12345);
    }

    // ----------------------------------------------------------- vault

    function test_DepositWithdrawConserves() public {
        uint256 balBefore = vault.balanceOf(user);
        vm.startPrank(user);
        usdc.mint(user, 500 * USDC1);
        vault.deposit(500 * USDC1);
        assertEq(vault.balanceOf(user), balBefore + 500 * USDC1);
        vault.withdraw(200 * USDC1);
        assertEq(vault.balanceOf(user), balBefore + 300 * USDC1);
        vm.stopPrank();
        _assertConservation();
    }

    function test_DepositWithPermit() public {
        uint256 ownerPk = 0xA11CE;
        address signer = vm.addr(ownerPk);
        usdc.mint(signer, 1000 * USDC1);
        uint256 amount = 750 * USDC1;
        uint256 deadline = block.timestamp + 1 hours;

        bytes32 permitTypehash =
            keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        bytes32 structHash =
            keccak256(abi.encode(permitTypehash, signer, address(vault), amount, usdc.nonces(signer), deadline));
        bytes32 digest = MessageHashUtils.toTypedDataHash(usdc.DOMAIN_SEPARATOR(), structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, digest);

        vm.prank(signer);
        vault.depositWithPermit(amount, deadline, v, r, s);
        assertEq(vault.balanceOf(signer), amount);
        assertEq(usdc.allowance(signer, address(vault)), 0, "permit allowance fully consumed");
    }

    function test_OnlyFuturesCanLockAndSettle() public {
        vm.expectRevert(Vault.NotFutures.selector);
        vault.lockMargin(user, 1 * USDC1);
        vm.expectRevert(Vault.NotFutures.selector);
        vault.settle(user, 1 * USDC1, 0);
    }

    // ----------------------------------------------------------- futures: open/close

    function test_OpenRecordsEntryAtMark() public {
        uint256 id = _open(futures.LONG(), 100 * USDC1, 5);
        (address o, uint128 margin, uint128 notional, uint64 entry,,,, bool closed) = futures.positions(id);
        assertEq(o, user);
        assertEq(margin, 100 * USDC1);
        assertEq(notional, 500 * USDC1);
        assertEq(entry, ENTRY);
        assertFalse(closed);
        assertEq(vault.lockedMargin(), 100 * USDC1);
        assertEq(vault.reservedProfit(), 100 * USDC1);
        _assertConservation();
    }

    function test_LongProfit() public {
        uint256 id = _open(futures.LONG(), 100 * USDC1, 5); // notional 500
        uint256 balAfterOpen = vault.balanceOf(user);

        // +10% -> pnl = 500 * 0.10 = 50 USDC
        vm.prank(keeper);
        oracle.setMark(22e8, uint64(block.timestamp));
        assertEq(futures.markPnl(id), int256(uint256(50 * USDC1)));

        vm.prank(user);
        futures.close(id);
        assertEq(vault.balanceOf(user), balAfterOpen + 100 * USDC1 + 50 * USDC1); // margin back + pnl
        _assertConservation();
    }

    function test_ShortProfit() public {
        uint256 id = _open(futures.SHORT(), 100 * USDC1, 5);
        uint256 balAfterOpen = vault.balanceOf(user);
        // -10% -> short pnl = +50
        vm.prank(keeper);
        oracle.setMark(18e8, uint64(block.timestamp));
        assertEq(futures.markPnl(id), int256(uint256(50 * USDC1)));
        vm.prank(user);
        futures.close(id);
        assertEq(vault.balanceOf(user), balAfterOpen + 150 * USDC1);
        _assertConservation();
    }

    function test_LongLoss() public {
        uint256 id = _open(futures.LONG(), 100 * USDC1, 5);
        uint256 balAfterOpen = vault.balanceOf(user);
        // -10% -> long pnl = -50
        vm.prank(keeper);
        oracle.setMark(18e8, uint64(block.timestamp));
        vm.prank(user);
        futures.close(id);
        assertEq(vault.balanceOf(user), balAfterOpen + 50 * USDC1); // margin 100 - 50 loss
        _assertConservation();
    }

    function test_PnlCappedAtMargin() public {
        uint256 id = _open(futures.LONG(), 100 * USDC1, 5); // notional 500
        uint256 balAfterOpen = vault.balanceOf(user);
        // +50% -> raw pnl = 250, capped to margin 100
        vm.prank(keeper);
        oracle.setMark(30e8, uint64(block.timestamp));
        assertEq(futures.markPnl(id), int256(uint256(100 * USDC1)));
        vm.prank(user);
        futures.close(id);
        assertEq(vault.balanceOf(user), balAfterOpen + 200 * USDC1); // margin + capped pnl
        _assertConservation();
    }

    function test_LossCappedAtMargin() public {
        uint256 id = _open(futures.LONG(), 100 * USDC1, 5);
        uint256 balAfterOpen = vault.balanceOf(user);
        // crash 50% -> raw -250 capped to -100 -> payout 0
        vm.prank(keeper);
        oracle.setMark(10e8, uint64(block.timestamp));
        vm.prank(user);
        futures.close(id);
        assertEq(vault.balanceOf(user), balAfterOpen); // lost the whole margin
        _assertConservation();
    }

    // ----------------------------------------------------------- expiry settlement

    function test_SettleAtExpiryUsesSettlementIndex() public {
        uint8 side = futures.LONG();
        uint64 exp = uint64(block.timestamp) + 60;
        vm.prank(user);
        uint256 id = futures.open(side, 100 * USDC1, 5, exp);
        uint256 balAfterOpen = vault.balanceOf(user);

        // cannot settle before expiry
        vm.expectRevert(OnionFutures.NotExpired.selector);
        futures.settle(id);

        vm.warp(exp + 1);
        // cannot close after expiry
        vm.prank(user);
        vm.expectRevert(OnionFutures.Expired.selector);
        futures.close(id);
        // cannot settle until USDA price is posted
        vm.expectRevert(OnionFutures.NotSettled.selector);
        futures.settle(id);

        vm.prank(keeper);
        oracle.setSettlement(exp, 24e8); // +20% -> pnl = 500*0.2 = 100 (== cap)
        futures.settle(id); // permissionless
        assertEq(vault.balanceOf(user), balAfterOpen + 200 * USDC1);
        _assertConservation();
    }

    function test_CannotDoubleClose() public {
        uint256 id = _open(futures.LONG(), 100 * USDC1, 5);
        vm.startPrank(user);
        futures.close(id);
        vm.expectRevert(OnionFutures.AlreadyClosed.selector);
        futures.close(id);
        vm.stopPrank();
    }

    // ----------------------------------------------------------- fuzz

    /// |pnl| <= margin for any price and side (the solvency guarantee)
    function testFuzz_PnlBounded(uint64 price, uint8 sideSeed, uint128 marginSeed, uint8 levSeed) public {
        uint8 side = sideSeed % 2;
        uint128 margin = uint128(bound(marginSeed, 1 * USDC1, 1000 * USDC1));
        uint8 lev = uint8(bound(levSeed, 1, futures.MAX_LEVERAGE()));
        price = uint64(bound(price, 1, 1_000_000e8));

        vm.prank(user);
        uint256 id = futures.open(side, margin, lev, uint64(block.timestamp) + DAY);
        int256 pnl = futures.pnlAt(id, price);
        assertLe(pnl, int256(uint256(margin)));
        assertGe(pnl, -int256(uint256(margin)));
    }

    /// Open then close at an arbitrary price always conserves the vault.
    function testFuzz_ConservationThroughTrade(uint64 price, uint8 sideSeed, uint128 marginSeed, uint8 levSeed)
        public
    {
        uint8 side = sideSeed % 2;
        uint128 margin = uint128(bound(marginSeed, 1 * USDC1, 1000 * USDC1));
        uint8 lev = uint8(bound(levSeed, 1, futures.MAX_LEVERAGE()));
        price = uint64(bound(price, 1, 1_000_000e8));

        vm.prank(user);
        uint256 id = futures.open(side, margin, lev, uint64(block.timestamp) + DAY);
        vm.prank(keeper);
        oracle.setMark(price, uint64(block.timestamp));
        vm.prank(user);
        futures.close(id);
        _assertConservation();
    }
}
