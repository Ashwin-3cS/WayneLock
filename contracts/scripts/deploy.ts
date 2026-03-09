import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy VaultRegistry
    const VaultRegistry = await ethers.getContractFactory("VaultRegistry");
    const vaultRegistry = await VaultRegistry.deploy();
    await vaultRegistry.waitForDeployment();
    const vaultRegistryAddress = await vaultRegistry.getAddress();
    console.log("VaultRegistry deployed to:", vaultRegistryAddress);

    // 2. Deploy VaultEscrowAdmin
    // Calibration Addresses
    const USDFC_ADDRESS = "0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0";
    // NOTE: This is a placeholder for the official Filecoin Pay router address on Calibration. 
    // You may need to look up the exact router address from Filecoin Pay docs.
    // For testing, if it's missing, you may need to deploy a mock IFilecoinPay contract first.
    const FILECOIN_PAY_ROUTER = "0x000000000000000000000000000000000000dEaD";

    const VaultEscrowAdmin = await ethers.getContractFactory("VaultEscrowAdmin");
    const vaultEscrowAdmin = await VaultEscrowAdmin.deploy(USDFC_ADDRESS, FILECOIN_PAY_ROUTER);
    await vaultEscrowAdmin.waitForDeployment();
    const vaultEscrowAdminAddress = await vaultEscrowAdmin.getAddress();
    console.log("VaultEscrowAdmin deployed to:", vaultEscrowAdminAddress);

    console.log("\n--- PASTE THESE INTO YOUR .env FILE ---");
    console.log(`VITE_VAULT_REGISTRY_ADDRESS=${vaultRegistryAddress}`);
    console.log(`VITE_VAULT_ADMIN_ADDRESS=${vaultEscrowAdminAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
