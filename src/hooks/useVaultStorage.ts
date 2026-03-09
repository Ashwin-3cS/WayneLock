// Core custom hook bridging Lit Protocol processing, FWSS, and VaultRegistry
import { useState } from 'react';
import { ethers } from 'ethers';
import { uploadVaultBlob, fetchVaultBlob } from '../utils/fwss';

const VAULT_REGISTRY_ADDRESS = import.meta.env.VITE_VAULT_REGISTRY_ADDRESS;

export function useVaultStorage(provider: ethers.BrowserProvider | null) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Called by your friend's Lit Protocol logic AFTER encryption
    const saveVault = async (encryptedBlob: Uint8Array): Promise<string> => {
        if (!provider) throw new Error("Wallet not connected");
        setIsProcessing(true);
        setError(null);

        try {
            const signer = await provider.getSigner();
            const userAddress = await signer.getAddress();

            // 1. Upload the raw blob to FWSS S3
            const fwssUri = await uploadVaultBlob(encryptedBlob, userAddress);

            // 2. Transact with the VaultRegistry SC to store the URI
            const registryAbi = ["function setVault(string calldata uri) external"];
            const registryContract = new ethers.Contract(VAULT_REGISTRY_ADDRESS, registryAbi, signer);

            const tx = await registryContract.setVault(fwssUri);
            await tx.wait(); // Wait for confirmation on the FEVM

            return fwssUri;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsProcessing(false);
        }
    };

    // Called BEFORE giving ciphertext to Lit Protocol for decryption
    const loadVault = async (): Promise<Uint8Array | null> => {
        if (!provider) throw new Error("Wallet not connected");
        setIsProcessing(true);
        setError(null);

        try {
            const signer = await provider.getSigner();
            const userAddress = await signer.getAddress();

            // 1. Query the contract for the user's URI
            const registryAbi = ["function getVault(address user) external view returns (string memory)"];
            const registryContract = new ethers.Contract(VAULT_REGISTRY_ADDRESS, registryAbi, provider);

            const fwssUri = await registryContract.getVault(userAddress);

            if (!fwssUri || fwssUri === "") return null;

            // 2. Fetch the actual blob data down from FWSS
            const blob = await fetchVaultBlob(fwssUri);
            return blob;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsProcessing(false);
        }
    };

    return { saveVault, loadVault, isProcessing, error };
}
