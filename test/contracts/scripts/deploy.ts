import { createHardhatRuntimeEnvironment } from "hardhat/hre";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import "dotenv/config";

const hre = await createHardhatRuntimeEnvironment({
    plugins: [hardhatEthers],
    solidity: "0.8.20",
    networks: {
        calibration: {
            type: "http",
            url: process.env.CALIBRATION_RPC || "https://api.calibration.node.glif.io/rpc/v1",
            chainId: 314159,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
    },
}, { network: "calibration" });

// In Hardhat v3, hardhat-ethers injects `ethers` onto the network CONNECTION object
// via the newConnection hook, so we must open a connection first
const connection = await hre.network.connect();
const ethers = connection.ethers;

const [deployer] = await ethers.getSigners();
console.log("Deploying contracts with the account:", deployer.address);

// 1. Deploy VaultRegistry
const VaultRegistry = await ethers.getContractFactory("VaultRegistry");
const vaultRegistry = await VaultRegistry.deploy();
await vaultRegistry.waitForDeployment();
const vaultRegistryAddress = await vaultRegistry.getAddress();
console.log("VaultRegistry deployed to:", vaultRegistryAddress);

// 2. Deploy VaultEscrowAdmin
const USDFC_ADDRESS = "0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0";

const VaultEscrowAdmin = await ethers.getContractFactory("VaultEscrowAdmin");
const vaultEscrowAdmin = await VaultEscrowAdmin.deploy(USDFC_ADDRESS);
await vaultEscrowAdmin.waitForDeployment();
const vaultEscrowAdminAddress = await vaultEscrowAdmin.getAddress();
console.log("VaultEscrowAdmin deployed to:", vaultEscrowAdminAddress);

console.log("\n--- PASTE THESE INTO YOUR root .env FILE ---");
console.log(`VITE_VAULT_REGISTRY_ADDRESS=${vaultRegistryAddress}`);
console.log(`VITE_VAULT_ADMIN_ADDRESS=${vaultEscrowAdminAddress}`);
