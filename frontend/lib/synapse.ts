import { createPublicClient, createWalletClient, http, custom } from 'viem';
import { calibration } from '@filoz/synapse-core/chains';

export const publicClient = createPublicClient({
    chain: calibration,
    transport: http(process.env.NEXT_PUBLIC_CALIBRATION_RPC || 'https://api.calibration.node.glif.io/rpc/v1'),
});

export function createSynapseWalletClient(ethereumProvider: any, address: `0x${string}`) {
    return createWalletClient({
        chain: calibration,
        transport: custom(ethereumProvider),
        account: address,
    });
}
