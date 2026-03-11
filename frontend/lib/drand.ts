/**
 * drand randomness for WayneLock password generation.
 * Fetches two beacons (latest + previous round) for R1 and R2.
 */

import {
  FastestNodeClient,
  fetchBeacon,
  HttpCachingChain,
  HttpChainClient,
} from "drand-client";

const chainHash =
  "8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce";
const publicKey =
  "868f005eb8e6e4ca0a47c8a77ceaa5309a47978a7c71bc5cce96366b5d7a569937c529eeda66c7293784a9402801af31";

const options = {
  disableBeaconVerification: false,
  noCache: false,
  chainVerificationParams: { chainHash, publicKey },
};

/** Parse hex string to Uint8Array (32 bytes = 64 hex chars) */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Get drand randomness from a single node (api.drand.sh) */
async function getRandomnessSingleNode(): Promise<{ r1: Uint8Array; r2: Uint8Array }> {
  const chain = new HttpCachingChain("https://api.drand.sh", options);
  const client = new HttpChainClient(chain, options);

  const beacon1 = await fetchBeacon(client);
  const beacon2 = await fetchBeacon(client, beacon1.round - 1);

  const r1 = hexToBytes(beacon1.randomness);
  const r2 = hexToBytes(beacon2.randomness);

  console.log("🎲 drand: R1 from round", beacon1.round, "R2 from round", beacon2.round);
  return { r1, r2 };
}

/** Get drand randomness using fastest node (api.drand.sh + cloudflare) */
async function getRandomnessFastestNode(): Promise<{ r1: Uint8Array; r2: Uint8Array }> {
  const urls = ["https://api.drand.sh", "https://drand.cloudflare.com"];
  const client = new FastestNodeClient(urls, options);
  client.start();

  try {
    const beacon1 = await fetchBeacon(client);
    const beacon2 = await fetchBeacon(client, beacon1.round - 1);

    const r1 = hexToBytes(beacon1.randomness);
    const r2 = hexToBytes(beacon2.randomness);

    console.log("🎲 drand (fastest node): R1 round", beacon1.round, "R2 round", beacon2.round);
    return { r1, r2 };
  } finally {
    client.stop();
  }
}

/**
 * Fetch two 32-byte randomness values from drand for R1 and R2.
 * Uses fastest node by default; falls back to single node on error.
 */
export async function getDrandRandomness(): Promise<{
  r1: Uint8Array;
  r2: Uint8Array;
}> {
  try {
    return await getRandomnessFastestNode();
  } catch (err) {
    console.warn("🎲 drand fastest node failed, falling back to api.drand.sh:", err);
    return await getRandomnessSingleNode();
  }
}
