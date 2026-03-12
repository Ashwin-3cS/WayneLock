import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
} from "viem";
import { filecoinCalibration } from "@/lib/filecoin-calibration";

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
] as const;

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

export async function registerVaultOnChain(params: {
  contractAddress: Address;
  cid: string;
  guardians: Address[];
  threshold: number;
}) {
  const walletClient = getCalibrationWalletClient();
  await (globalThis as any).ethereum.request({ method: "eth_requestAccounts" });

  const [account] = await walletClient.getAddresses();
  if (!account) throw new Error("No wallet account available.");

  const hash = await walletClient.writeContract({
    account,
    address: params.contractAddress,
    abi: guardianRecoveryAbi,
    functionName: "registerVault",
    args: [params.cid, params.guardians, params.threshold],
  });

  const receipt = await calibrationPublicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}

export async function startRecoveryOnChain(params: {
  contractAddress: Address;
}) {
  const walletClient = getCalibrationWalletClient();
  await (globalThis as any).ethereum.request({ method: "eth_requestAccounts" });

  const [account] = await walletClient.getAddresses();
  if (!account) throw new Error("No wallet account available.");

  const hash = await walletClient.writeContract({
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
}) {
  const walletClient = getCalibrationWalletClient();
  await (globalThis as any).ethereum.request({ method: "eth_requestAccounts" });

  const [account] = await walletClient.getAddresses();
  if (!account) throw new Error("No wallet account available.");

  const hash = await walletClient.writeContract({
    account,
    address: params.contractAddress,
    abi: guardianRecoveryAbi,
    functionName: "approveRecovery",
    args: [params.owner],
  });

  const receipt = await calibrationPublicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}

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

