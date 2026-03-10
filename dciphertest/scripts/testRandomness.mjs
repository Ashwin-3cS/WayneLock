import "dotenv/config";
import { ethers } from "ethers";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactPath = path.join(
  __dirname,
  "../ignition/deployments/chain-314159/artifacts/RandomnessModule#PassGenRandomConsumer.json"
);
const consumerArtifact = JSON.parse(await fs.readFile(artifactPath, "utf8"));

const FILECOIN_RPC = process.env.FILECOIN_CALIBRATION_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// From deployed_addresses.json
const CONSUMER_ADDRESS = "0xdC15F3459A45f1aEA5522981b82929F446e5f226";

// RandomnessSender proxy you provided
const RANDOMNESS_SENDER_PROXY = "0x94C5774DEa83a921244BF362a98c12A5aAD18c87";

// Minimal ABI to query request price from the proxy
const RANDOMNESS_SENDER_ABI = [
  "function calculateRequestPriceNative(uint32 callbackGasLimit) view returns (uint256)"
];

async function main() {
  if (!FILECOIN_RPC || !PRIVATE_KEY) {
    throw new Error("Missing FILECOIN_CALIBRATION_RPC_URL or PRIVATE_KEY in .env");
  }

  const provider = new ethers.JsonRpcProvider(FILECOIN_RPC, 314159);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Deployer:", await wallet.getAddress());

  // Set a generous callback gas limit to cover BLS verification + your logic
  const callbackGasLimit = 1_000_000;

  // Figure out how much native token is required for a direct-funded request
  const randomnessSender = new ethers.Contract(
    RANDOMNESS_SENDER_PROXY,
    RANDOMNESS_SENDER_ABI,
    provider
  );

  const price = await randomnessSender.calculateRequestPriceNative(callbackGasLimit);
  console.log("Required request price (wei):", price.toString());

  const consumer = new ethers.Contract(
    CONSUMER_ADDRESS,
    consumerArtifact.abi,
    wallet
  );

  // Check current random value and any existing requestId
  let currentRandom = await consumer.randomValue();
  let existingRequestId = await consumer.requestId();
  console.log("Initial randomValue:", currentRandom);
  console.log("Existing requestId:", existingRequestId.toString());

  console.log("Sending getRandomnessDirect tx...");
  const tx = await consumer.getRandomnessDirect(callbackGasLimit, { value: price });
  console.log("Tx hash:", tx.hash);
  await tx.wait();
  console.log("Request tx mined. Waiting for fulfillment...");

  // Fetch the new requestId and initial in-flight status
  const newRequestId = await consumer.requestId();
  console.log("New requestId:", newRequestId.toString());
  const inFlight = await consumer.isInFlight(newRequestId);
  console.log("isInFlight(newRequestId):", inFlight);

  // Poll for fulfillment
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 15000)); // 15s
    const newRandom = await consumer.randomValue();
    console.log(`Poll ${i + 1}: randomValue = ${newRandom}`);

    if (newRandom !== currentRandom) {
      console.log("Randomness fulfilled!");
      break;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});