// Core custom hook bridging Lit Protocol processing, Synapse storage, and VaultRegistry
import { useState } from 'react';
import { ethers } from 'ethers';
import { uploadVaultBlob, fetchVaultBlob } from '../utils/fwss';

const VAULT_REGISTRY_ADDRESS = import.meta.env.VITE_VAULT_REGISTRY_ADDRESS;

// VaultRegistry stores a JSON string: { pieceCid, serviceURL }
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

            // 1. Upload the raw blob to Synapse warm storage
            const { pieceCid, serviceURL } = await uploadVaultBlob(encryptedBlob, userAddress);
            const synapseUri = JSON.stringify({ pieceCid, serviceURL });

            // 2. Transact with the VaultRegistry SC to store the URI
            const registryAbi = ["function setVault(string calldata uri) external"];
            const registryContract = new ethers.Contract(VAULT_REGISTRY_ADDRESS, registryAbi, signer);

            const tx = await registryContract.setVault(synapseUri);
            await tx.wait();

            return synapseUri;
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

            // 1. Query the contract for the user's URI JSON
            const registryAbi = ["function userVaults(address) external view returns (string memory)"];
            const registryContract = new ethers.Contract(VAULT_REGISTRY_ADDRESS, registryAbi, provider);

            const synapseUri = await registryContract.userVaults(userAddress);
            if (!synapseUri || synapseUri === "") return null;

            // 2. Parse the stored JSON to extract pieceCid + serviceURL
            const { pieceCid, serviceURL } = JSON.parse(synapseUri);

            // 3. Download the blob from Synapse warm storage
            const blob = await fetchVaultBlob(pieceCid, serviceURL);
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
