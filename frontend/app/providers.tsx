"use client";

import { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { filecoinCalibration } from "@/lib/filecoin-calibration";
import { waynelockRainbowKitTheme } from "@/lib/rainbowkit-theme";
import "@rainbow-me/rainbowkit/styles.css";

const config = getDefaultConfig({
  appName: "WayneLock",
  projectId: "waynelock-vault", // WalletConnect project ID (placeholder for dev)
  chains: [filecoinCalibration as any],
  transports: {
    [filecoinCalibration.id]: http("https://api.calibration.node.glif.io/rpc/v1"),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={waynelockRainbowKitTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
