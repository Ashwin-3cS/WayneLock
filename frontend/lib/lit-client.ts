import { createLitClient } from "@lit-protocol/lit-client";
import { nagaDev } from "@lit-protocol/networks";

let litClientPromise: Promise<Awaited<ReturnType<typeof createLitClient>>> | null =
  null;

/**
 * Lit Client (naga-dev).
 * Singleton initializer so we only create/handshake once per session.
 */
export function getLitClient() {
  if (!litClientPromise) {
    litClientPromise = createLitClient({ network: nagaDev }).then((client) => {
      console.log("🔥 Lit client ready (network: naga-dev)");
      return client;
    });
  }
  return litClientPromise;
}

