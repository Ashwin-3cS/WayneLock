import { useState } from 'react';
import { ethers } from 'ethers';

const VAULT_ADMIN_ADDRESS = import.meta.env.VITE_VAULT_ADMIN_ADDRESS;
const USDFC_ADDRESS = "0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0"; // Calibration Testnet

export const FundingUI: React.FC = () => {
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [address, setAddress] = useState<string>('');
    const [amount, setAmount] = useState<string>('10'); // Default 10 USDFC
    const [duration, setDuration] = useState<string>('86400'); // Default 1 month in epochs
    const [status, setStatus] = useState<string>('');

    const connectWallet = async () => {
        if (window.ethereum) {
            const web3Provider = new ethers.BrowserProvider(window.ethereum as any);
            setProvider(web3Provider);
            const accounts = await web3Provider.send("eth_requestAccounts", []);
            setAddress(accounts[0]);
        } else {
            setStatus("Please install a Web3 wallet like MetaMask.");
        }
    };

    const initializeStream = async () => {
        if (!provider || !address) return;
        setStatus("Initializing stream...");

        try {
            const signer = await provider.getSigner();

            // Simplistic ABI for the Admin Contract and USDFC
            const adminAbi = ["function initializeVaultStream(address provider, uint256 ratePerEpoch, uint256 duration) external"];
            const erc20Abi = ["function approve(address spender, uint256 amount) external returns (bool)"];

            const usdfcContract = new ethers.Contract(USDFC_ADDRESS, erc20Abi, signer);
            const adminContract = new ethers.Contract(VAULT_ADMIN_ADDRESS, adminAbi, signer);

            // Dummy Storage Provider Address for testing
            const storageProvider = "0x000000000000000000000000000000000000dEaD";
            const ratePerEpoch = ethers.parseUnits(amount, 18) / BigInt(duration);
            const totalAmount = ethers.parseUnits(amount, 18);

            setStatus("Approving USDFC...");
            const approveTx = await usdfcContract.approve(VAULT_ADMIN_ADDRESS, totalAmount);
            await approveTx.wait();

            setStatus("Creating Payment Rail via Filecoin Pay...");
            const streamTx = await adminContract.initializeVaultStream(storageProvider, ratePerEpoch, BigInt(duration));
            await streamTx.wait();

            setStatus("Stream Successfully Initialized!");
        } catch (err: any) {
            console.error(err);
            setStatus(`Error: ${err.message}`);
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h2>Fund Decentralized Vault</h2>
            {!address ? (
                <button onClick={connectWallet}>Connect Wallet</button>
            ) : (
                <div>
                    <p>Connected: {address.substring(0, 6)}...{address.slice(-4)}</p>
                    <div style={{ marginBottom: '10px' }}>
                        <label>USDFC Amount to Lock: </label>
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label>Duration (Epochs): </label>
                        <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
                        <small style={{ display: 'block' }}>86400 epochs ≈ 1 month</small>
                    </div>
                    <button onClick={initializeStream}>Start Filecoin Pay Stream</button>
                    <p>{status}</p>
                </div>
            )}
        </div>
    );
};
