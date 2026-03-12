import type { EvmContractAcc } from "@lit-protocol/access-control-conditions-schemas";
import { getLitClient } from "@/lib/lit-client";
import { getEoaAuthContext } from "@/lib/lit-auth";

export const DEFAULT_LIT_CHAIN: EvmContractAcc["chain"] =
  "filecoinCalibrationTestnet";

export function buildGuardianRecoveryContractCondition(params: {
  contractAddress: string;
  chain?: EvmContractAcc["chain"];
}): EvmContractAcc {
  const chain = params.chain ?? DEFAULT_LIT_CHAIN;
  return {
    conditionType: "evmContract",
    contractAddress: params.contractAddress,
    chain,
    functionName: "isRecoveryApprovedForOwner",
    functionParams: [":userAddress"],
    functionAbi: {
      name: "isRecoveryApprovedForOwner",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "owner", type: "address", internalType: "address" }],
      outputs: [{ name: "", type: "bool", internalType: "bool" }],
    },
    returnValueTest: { key: "", comparator: "=", value: "true" },
  };
}

export async function litEncryptDek(params: {
  dekBytes: Uint8Array;
  contractAddress: string;
  chain?: EvmContractAcc["chain"];
}) {
  const litClient = await getLitClient();
  const evmContractConditions = [
    buildGuardianRecoveryContractCondition({
      contractAddress: params.contractAddress,
      chain: params.chain,
    }),
  ];

  const res = await litClient.encrypt({
    dataToEncrypt: params.dekBytes,
    evmContractConditions,
    chain: params.chain ?? DEFAULT_LIT_CHAIN,
    metadata: { dataType: "uint8array" },
  });

  console.log("🧩 Lit encrypt result:", res);
  return { ...res, evmContractConditions };
}

export async function litDecryptDek(params: {
  ciphertext: string;
  dataToEncryptHash: string;
  evmContractConditions: EvmContractAcc[];
  chain?: EvmContractAcc["chain"];
}) {
  const litClient = await getLitClient();
  const { authContext } = await getEoaAuthContext(litClient);

  const res = await litClient.decrypt({
    ciphertext: params.ciphertext,
    dataToEncryptHash: params.dataToEncryptHash,
    evmContractConditions: params.evmContractConditions,
    chain: params.chain ?? DEFAULT_LIT_CHAIN,
    authContext,
  });

  console.log("🧩 Lit decrypt result:", res);
  return res.decryptedData;
}

