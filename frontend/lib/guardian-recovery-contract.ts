import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type WalletClient,
} from "viem";
import { filecoinCalibration } from "@/lib/filecoin-calibration";

export const DEFAULT_GUARDIAN_CONTRACT = "0x0d0e5142591327525A77bF7830936E31Cc4c4C55" as Address;

export const guardianRecoveryAbi = [
  {
    type: "function",
    name: "registerVault",
    stateMutability: "nonpayable",
    inputs: [
      { name: "ipfsCid", type: "string" },
      { name: "newGuardians", type: "address[]" },
      { name: "threshold", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "registerVaultAndAddEntry",
    stateMutability: "nonpayable",
    inputs: [
      { name: "ipfsCid", type: "string" },
      { name: "newGuardians", type: "address[]" },
      { name: "threshold", type: "uint8" },
      { name: "uid", type: "string" },
      { name: "metadataJson", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "startRecovery",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "approveRecovery",
    stateMutability: "nonpayable",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getRecoveryStatus",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [
      { name: "recoveryId", type: "uint256" },
      { name: "active", type: "bool" },
      { name: "approvals", type: "uint256" },
      { name: "threshold", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "isRecoveryApprovedForOwner",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getVaultCid",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "string" }],
  },
  // ---- Entry CRUD ----
  {
    type: "function",
    name: "addEntry",
    stateMutability: "nonpayable",
    inputs: [
      { name: "uid", type: "string" },
      { name: "metadataJson", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "updateEntry",
    stateMutability: "nonpayable",
    inputs: [
      { name: "uid", type: "string" },
      { name: "metadataJson", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "removeEntry",
    stateMutability: "nonpayable",
    inputs: [{ name: "uid", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getEntry",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "uid", type: "string" },
    ],
    outputs: [
      { name: "metadataJson", type: "string" },
      { name: "createdAt", type: "uint256" },
      { name: "exists", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getEntryUids",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "string[]" }],
  },
  {
    type: "function",
    name: "getEntryCount",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "isVaultInitialized",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// ---- Wallet Helpers ----

export function getCalibrationWalletClient() {
  const ethereum = (globalThis as any).ethereum;
  if (!ethereum) {
    throw new Error("No injected wallet found (window.ethereum). Install MetaMask/Brave wallet.");
  }
  return createWalletClient({
    chain: filecoinCalibration,
    transport: custom(ethereum),
  });
}

export const calibrationPublicClient = createPublicClient({
  chain: filecoinCalibration,
  transport: http(),
});

/** Get a wallet client - uses provided one or falls back to window.ethereum */
function resolveWallet(walletClient?: WalletClient) {
  return walletClient ?? getCalibrationWalletClient();
}

/** Get account - uses provided one or fetches from wallet */
async function resolveAccount(account?: Address, walletClient?: WalletClient): Promise<Address> {
  if (account) return account;
  const wc = resolveWallet(walletClient);
  await (globalThis as any).ethereum?.request({ method: "eth_requestAccounts" });
  const [addr] = await wc.getAddresses();
  if (!addr) throw new Error("No wallet account available.");
  return addr;
}

// ---- Write Functions ----

export async function registerVaultOnChain(params: {
  contractAddress: Address;
  cid: string;
  guardians: Address[];
  threshold: number;
  walletClient?: WalletClient;
  account?: Address;
}) {
  const wc = resolveWallet(params.walletClient);
  const account = await resolveAccount(params.account, wc);

  const hash = await wc.writeContract({
    chain: filecoinCalibration,
    account,
    address: params.contractAddress,
    abi: guardianRecoveryAbi,
    functionName: "registerVault",
    args: [params.cid, params.guardians, params.threshold],
  });
  const receipt = await calibrationPublicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}

export async function registerVaultAndAddEntryOnChain(params: {
  contractAddress: Address;
  cid: string;
  guardians: Address[];
  threshold: number;
  uid: string;
  metadataJson: string;
  walletClient?: WalletClient;
  account?: Address;
}) {
  const wc = resolveWallet(params.walletClient);
  const account = await resolveAccount(params.account, wc);

  const hash = await wc.writeContract({
    chain: filecoinCalibration,
    account,
    address: params.contractAddress,
    abi: guardianRecoveryAbi,
    functionName: "registerVaultAndAddEntry",
    args: [params.cid, params.guardians, params.threshold, params.uid, params.metadataJson],
  });
  const receipt = await calibrationPublicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}

export async function startRecoveryOnChain(params: {
  contractAddress: Address;
  walletClient?: WalletClient;
  account?: Address;
}) {
  const wc = resolveWallet(params.walletClient);
  const account = await resolveAccount(params.account, wc);

  const hash = await wc.writeContract({
    chain: filecoinCalibration,
    account,
    address: params.contractAddress,
    abi: guardianRecoveryAbi,
    functionName: "startRecovery",
    args: [],
  });
  const receipt = await calibrationPublicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}

export async function approveRecoveryOnChain(params: {
  contractAddress: Address;
  owner: Address;
  walletClient?: WalletClient;
  account?: Address;
}) {
  const wc = resolveWallet(params.walletClient);
  const account = await resolveAccount(params.account, wc);

  const hash = await wc.writeContract({
    chain: filecoinCalibration,
    account,
    address: params.contractAddress,
    abi: guardianRecoveryAbi,
    functionName: "approveRecovery",
    args: [params.owner],
  });
  const receipt = await calibrationPublicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}

// ---- Read Functions ----

export async function readRecoveryStatus(params: {
  contractAddress: Address;
  owner: Address;
}) {
  const [recoveryId, active, approvals, threshold] =
    await calibrationPublicClient.readContract({
      address: params.contractAddress,
      abi: guardianRecoveryAbi,
      functionName: "getRecoveryStatus",
      args: [params.owner],
    });
  return { recoveryId, active, approvals, threshold };
}

export async function readIsRecoveryApproved(params: {
  contractAddress: Address;
  owner: Address;
}) {
  return calibrationPublicClient.readContract({
    address: params.contractAddress,
    abi: guardianRecoveryAbi,
    functionName: "isRecoveryApprovedForOwner",
    args: [params.owner],
  });
}

export async function readVaultCid(params: {
  contractAddress: Address;
  owner: Address;
}) {
  return calibrationPublicClient.readContract({
    address: params.contractAddress,
    abi: guardianRecoveryAbi,
    functionName: "getVaultCid",
    args: [params.owner],
  });
}

// ---- Entry CRUD ----

export async function addEntryOnChain(params: {
  contractAddress: Address;
  uid: string;
  metadataJson: string;
  walletClient?: WalletClient;
  account?: Address;
}) {
  const wc = resolveWallet(params.walletClient);
  const account = await resolveAccount(params.account, wc);

  const hash = await wc.writeContract({
    chain: filecoinCalibration,
    account,
    address: params.contractAddress,
    abi: guardianRecoveryAbi,
    functionName: "addEntry",
    args: [params.uid, params.metadataJson],
  });
  const receipt = await calibrationPublicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}

export async function updateEntryOnChain(params: {
  contractAddress: Address;
  uid: string;
  metadataJson: string;
  walletClient?: WalletClient;
  account?: Address;
}) {
  const wc = resolveWallet(params.walletClient);
  const account = await resolveAccount(params.account, wc);

  const hash = await wc.writeContract({
    chain: filecoinCalibration,
    account,
    address: params.contractAddress,
    abi: guardianRecoveryAbi,
    functionName: "updateEntry",
    args: [params.uid, params.metadataJson],
  });
  const receipt = await calibrationPublicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}

export async function removeEntryOnChain(params: {
  contractAddress: Address;
  uid: string;
  walletClient?: WalletClient;
  account?: Address;
}) {
  const wc = resolveWallet(params.walletClient);
  const account = await resolveAccount(params.account, wc);

  const hash = await wc.writeContract({
    chain: filecoinCalibration,
    account,
    address: params.contractAddress,
    abi: guardianRecoveryAbi,
    functionName: "removeEntry",
    args: [params.uid],
  });
  const receipt = await calibrationPublicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}

export async function readEntry(params: {
  contractAddress: Address;
  owner: Address;
  uid: string;
}) {
  const [metadataJson, createdAt, exists] = await calibrationPublicClient.readContract({
    address: params.contractAddress,
    abi: guardianRecoveryAbi,
    functionName: "getEntry",
    args: [params.owner, params.uid],
  });
  return { metadataJson, createdAt, exists };
}

export async function readEntryUids(params: {
  contractAddress: Address;
  owner: Address;
}) {
  return calibrationPublicClient.readContract({
    address: params.contractAddress,
    abi: guardianRecoveryAbi,
    functionName: "getEntryUids",
    args: [params.owner],
  });
}

export async function readEntryCount(params: {
  contractAddress: Address;
  owner: Address;
}) {
  return calibrationPublicClient.readContract({
    address: params.contractAddress,
    abi: guardianRecoveryAbi,
    functionName: "getEntryCount",
    args: [params.owner],
  });
}

export async function readIsVaultInitialized(params: {
  contractAddress: Address;
  owner: Address;
}) {
  return calibrationPublicClient.readContract({
    address: params.contractAddress,
    abi: guardianRecoveryAbi,
    functionName: "isVaultInitialized",
    args: [params.owner],
  });
}
