const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy VaultRegistry
    const VaultRegistry = await hre.ethers.getContractFactory("VaultRegistry");
    const vaultRegistry = await VaultRegistry.deploy();
    await vaultRegistry.waitForDeployment();
    const vaultRegistryAddress = await vaultRegistry.getAddress();
    console.log("VaultRegistry deployed to:", vaultRegistryAddress);

    // 2. Deploy VaultEscrowAdmin
    const USDFC_ADDRESS = "0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0";
    const FILECOIN_PAY_ROUTER = "0x000000000000000000000000000000000000dEaD"; // dummy for now

    const VaultEscrowAdmin = await hre.ethers.getContractFactory("VaultEscrowAdmin");
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
