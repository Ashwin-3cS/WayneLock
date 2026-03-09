import type { HardhatUserConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import "dotenv/config";

const config: HardhatUserConfig = {
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
};

export default config;
