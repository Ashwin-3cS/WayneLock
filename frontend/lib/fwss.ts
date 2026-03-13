/**
 * Vault storage layer using @filoz/synapse-core warm storage.
 *
 * Mirrors the working test/src/utils/fwss.ts implementation.
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

// Use provider ID 2 (known-working provider on Calibration testnet)
const PROVIDER_ID = 2n;

// Filecoin minimum piece size (fr32 padded) — blobs smaller than this are rejected
const MIN_PIECE_SIZE = 127;

/**
 * Uploads an encrypted vault blob (string or Uint8Array) to a warm storage provider.
 * Returns an object containing the pieceCid (for retrieval) and the serviceURL.
 */
export async function uploadVaultBlob(
    encryptedBlob: string | Uint8Array,
    userAddress: string,
    walletClient: any
): Promise<{ pieceCid: string; serviceURL: string }> {
    // 1. Get the specific warm-storage provider from the on-chain registry
    const provider = await getPDPProvider(publicClient, { providerId: PROVIDER_ID });
    const serviceURL = provider.pdp.serviceURL;
    console.log(`📡 Using FWSS Provider ${PROVIDER_ID} at ${serviceURL}`);

    // 2. Encode the blob to Uint8Array if it's a string
    let blobData = typeof encryptedBlob === 'string'
        ? new TextEncoder().encode(encryptedBlob)
        : encryptedBlob;

    // 3. Pad to Filecoin's minimum piece size if necessary
    if (blobData.length < MIN_PIECE_SIZE) {
        const padded = new Uint8Array(MIN_PIECE_SIZE);
        padded.set(blobData);
        blobData = padded;
        console.log(`📦 Padded blob to ${MIN_PIECE_SIZE} bytes (was ${blobData.length} bytes)`);
    }

    // 4. Calculate the Piece CID from the raw blob
    const pieceCid = piece.calculate(blobData);
    console.log('🔢 Calculated pieceCid:', pieceCid.toString());

    // 4. Upload to the provider's HTTP API
    await sp.uploadPiece({ data: blobData, pieceCid, serviceURL });
    console.log('✅ fwss: Uploaded piece to SP');

    // 5. Poll until the provider confirms receipt
    await sp.findPiece({ pieceCid, serviceURL, retry: true });
    console.log('✅ fwss: Piece confirmed by SP');

    // 6. Create a data set and add the piece on-chain
    const result = await sp.createDataSetAndAddPieces(walletClient, {
        serviceURL,
        payee: provider.payee,
        cdn: false,
        pieces: [{ pieceCid }],
    });
    console.log('✅ fwss: DataSet created on-chain, statusUrl:', result.statusUrl);

    // 7. Wait for the provider to confirm the transaction
    await sp.waitForCreateDataSetAddPieces({ statusUrl: result.statusUrl });
    console.log('✅ fwss: On-chain confirmation complete');

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
        url: `${serviceURL}/piece/${pieceCidStr}`,
        expectedPieceCid: pieceCidStr,
    });
    return data;
}
