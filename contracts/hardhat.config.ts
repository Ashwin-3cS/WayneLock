import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const config: HardhatUserConfig = {
    solidity: "0.8.20",
    networks: {
        calibration: {
            url: process.env.CALIBRATION_RPC || "https://api.calibration.node.glif.io/rpc/v1",
            chainId: 314159,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
    },
};

export default config;
