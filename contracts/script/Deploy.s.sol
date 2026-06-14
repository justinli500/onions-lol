// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {OnionOracle} from "../src/OnionOracle.sol";
import {Vault} from "../src/Vault.sol";
import {OnionFutures} from "../src/OnionFutures.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IOnionOracle} from "../src/interfaces/IOnionOracle.sol";
import {IVault} from "../src/interfaces/IVault.sol";

/// Deploys OnionOracle + Vault + OnionFutures, wires them, optionally seeds the
/// house pool. USDC defaults per chainid (Base mainnet 8453 -> canonical Circle
/// USDC; Base Sepolia -> the Phase-1 spike-confirmed token) and is overridable
/// via the USDC_ADDRESS env var. The contracts are immutable, so this guard
/// prevents a mainnet deploy from being wired to a Sepolia token.
contract Deploy is Script {
    address constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant BASE_MAINNET_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address keeper = vm.envOr("KEEPER_ADDRESS", vm.addr(pk));
        address defaultUsdc = block.chainid == 8453 ? BASE_MAINNET_USDC : BASE_SEPOLIA_USDC;
        address usdc = vm.envOr("USDC_ADDRESS", defaultUsdc);
        uint256 houseSeed = vm.envOr("HOUSE_SEED_USDC", uint256(0));

        vm.startBroadcast(pk);
        OnionOracle oracle = new OnionOracle(keeper);
        Vault vault = new Vault(IERC20(usdc));
        OnionFutures futures = new OnionFutures(IOnionOracle(address(oracle)), IVault(address(vault)));
        vault.setFutures(address(futures));

        if (houseSeed > 0) {
            IERC20(usdc).approve(address(vault), houseSeed);
            vault.provideHouse(houseSeed);
        }
        vm.stopBroadcast();

        console.log("OnionOracle :", address(oracle));
        console.log("Vault       :", address(vault));
        console.log("OnionFutures:", address(futures));
        console.log("USDC        :", usdc);
        console.log("keeper      :", keeper);
        console.log("houseSeed   :", houseSeed);
    }
}
