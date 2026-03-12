import { defineChain } from "viem";

export const filecoinCalibration = defineChain({
  id: 314159,
  name: "Filecoin Calibration",
  nativeCurrency: { name: "tFIL", symbol: "tFIL", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc.ankr.com/filecoin_testnet"],
    },
  },
  blockExplorers: {
    default: { name: "Filfox", url: "https://calibration.filfox.info/en" },
  },
});

