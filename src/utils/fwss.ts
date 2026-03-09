/**
 * Vault storage layer using @filoz/synapse-core warm storage.
 *
 * This replaces the old AWS S3/FWSS shim. Encrypted vault blobs are uploaded
 * as Filecoin Pieces to a registered warm storage provider automatically
 * discovered from the on-chain Service Registry on Calibration Testnet.
 *
 * Real Contract Addresses (Calibration):
 *   Filecoin Pay:       0x85e366Cf9DD2c0aE37E963d9556F5f4718d6417C
 *   USDFC Token:        0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0
 *   Service Registry:   0x839e5c9988e4e9977d40708d0094103c0839Ac9D
 */
import * as piece from '@filoz/synapse-core/piece';
import * as sp from '@filoz/synapse-core/sp';
import { getPDPProvider } from '@filoz/synapse-core/sp-registry';
import { publicClient } from './synapse';

import { createSynapseWalletClient } from './synapse';

/**
 * Uploads an encrypted vault blob (Uint8Array) to a warm storage provider.
 * Returns an object containing the pieceCid (for retrieval) and the serviceURL.
 */
export async function uploadVaultBlob(
    encryptedBlob: Uint8Array,
    userAddress: string
): Promise<{ pieceCid: string; serviceURL: string }> {
    // 1. Pick first available warm-storage provider from the on-chain registry
    const provider = await getPDPProvider(publicClient, { providerId: 2n });
    const serviceURL = provider.pdp.serviceURL;

    // 2. Calculate the Piece CID from the raw blob
    const pieceCid = piece.calculate(encryptedBlob);

    // 3. Upload to the provider's HTTP API
    await sp.uploadPiece({ data: encryptedBlob, pieceCid, serviceURL });

    // 4. Poll until the provider confirms receipt
    await sp.findPiece({ pieceCid, serviceURL, retry: true });

    // 5. Create a data set and add the piece on-chain
    if (!window.ethereum) throw new Error("Wallet required for on-chain storage");
    const walletClient = createSynapseWalletClient(window.ethereum, userAddress as `0x${string}`);

    const result = await sp.createDataSetAndAddPieces(walletClient as any, {
        serviceURL,
        payee: provider.payee,
        cdn: false,
        pieces: [{ pieceCid }],
    });

    // 6. Wait for the provider to confirm the transaction
    await sp.waitForCreateDataSetAddPieces({
        statusUrl: result.statusUrl,
    });

    return { pieceCid: pieceCid.toString(), serviceURL };
}

/**
 * Downloads a vault blob from the provider using a stored pieceCid.
 */
export async function fetchVaultBlob(
    pieceCidStr: string,
    serviceURL: string
): Promise<Uint8Array> {
    const data = await piece.downloadAndValidate({
        url: `${serviceURL}/piece`,
        expectedPieceCid: pieceCidStr,
    });
    return data;
}
