// Viem client setup for @filoz/synapse-core
// The calibration chain config from synapse-core has all contract addresses pre-configured,
// including the real Filecoin Pay router: 0x85e366Cf9DD2c0aE37E963d9556F5f4718d6417C
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { calibration } from '@filoz/synapse-core/chains';

export const publicClient = createPublicClient({
    chain: calibration,
    transport: http('https://api.calibration.node.glif.io/rpc/v1'),
});

/**
 * Creates a wallet client from a browser EIP-1193 provider (e.g. MetaMask).
 * address must be pre-fetched from window.ethereum before calling this.
 */
export function createSynapseWalletClient(ethereumProvider: any, address: `0x${string}`) {
    return createWalletClient({
        account: address,
        chain: calibration,
        transport: custom(ethereumProvider),
    });
}
