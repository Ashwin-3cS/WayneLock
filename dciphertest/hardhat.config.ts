import { defineConfig } from "hardhat/config";
import hardhatIgnitionViem from "@nomicfoundation/hardhat-ignition-viem";
import * as dotenv from "dotenv";

dotenv.config();

const FILECOIN_CALIBRATION_RPC_URL =
  process.env.FILECOIN_CALIBRATION_RPC_URL ??
  "https://api.calibration.node.glif.io/rpc/v1";

const PRIVATE_KEY = process.env.PRIVATE_KEY;

export default defineConfig({
  solidity: {
    version: "0.8.21",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    filecoinCalibration: {
      type: "http",
      chainType: "l1",
      url: FILECOIN_CALIBRATION_RPC_URL,
      chainId: 314159,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  plugins: [hardhatIgnitionViem],
});
