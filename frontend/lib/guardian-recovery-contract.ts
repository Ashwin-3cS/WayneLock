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

