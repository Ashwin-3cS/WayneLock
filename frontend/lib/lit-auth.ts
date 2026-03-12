// IMPORTANT: avoid importing `storage/index` which re-exports `localStorageNode` (depends on `fs`)
// Use deep imports for browser-safe storage.
import { createAuthManager } from "@lit-protocol/auth/src/lib/AuthManager/auth-manager";
import { localStorage } from "@lit-protocol/auth/src/lib/storage/localStorage";
import { createWalletClient, custom, type WalletClient } from "viem";
import type { LitClient } from "@lit-protocol/lit-client";

let authManager:
  | ReturnType<typeof createAuthManager>
  | null = null;

export function getAuthManager() {
  if (!authManager) {
    authManager = createAuthManager({
      storage: localStorage({
        appName: "waynelock",
        networkName: "naga-dev",
      }),
    });
  }
  return authManager;
}

export async function getBrowserWalletClient(litClient: Awaited<LitClient>) {
  const ethereum = (globalThis as any).ethereum;
  if (!ethereum) {
    throw new Error("No injected wallet found (window.ethereum). Install MetaMask/Brave wallet.");
  }

  // Request accounts (will prompt the user)
  await ethereum.request({ method: "eth_requestAccounts" });

  const { viemConfig } = litClient.getChainConfig();
  const walletClient = createWalletClient({
    chain: viemConfig,
    transport: custom(ethereum),
  }) as WalletClient;

  return walletClient;
}

/**
 * EOA auth context (naga-dev).
 * Required for Lit decrypt calls (will prompt the user to sign if needed).
 */
export async function getEoaAuthContext(litClient: Awaited<LitClient>) {
  const walletClient = await getBrowserWalletClient(litClient);
  const manager = getAuthManager();

  const authContext = await manager.createEoaAuthContext({
    litClient,
    config: { account: walletClient },
    authConfig: {
      resources: [["access-control-condition-decryption", "*"]],
    },
  });

  // Ensure authenticator exists (WalletClient based)
  // The adapter fills this, but we keep logs useful.
  console.log("🔑 Lit EOA auth context ready");
  return { authContext, walletClient };
}

