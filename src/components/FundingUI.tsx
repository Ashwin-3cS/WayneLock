import { useState } from 'react';
import * as pay from '@filoz/synapse-core/pay';
import { calibration } from '@filoz/synapse-core/chains';
import { parseUnits, formatUnits } from 'viem';
import { createSynapseWalletClient, publicClient } from '../utils/synapse';

/**
 * FundingUI — uses the real Filecoin Pay contract via @filoz/synapse-core SDK.
 *
 * Real contract addresses on Calibration Testnet (from docs.filecoin.cloud/resources/contracts):
 *   Filecoin Pay:  0x85e366Cf9DD2c0aE37E963d9556F5f4718d6417C
 *   USDFC Token:   0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0
 *
 * The SDK reads these from calibration.contracts automatically.
 */
export const FundingUI: React.FC = () => {
    const [address, setAddress] = useState<string>('');
    const [amount, setAmount] = useState<string>('2');
    const [balance, setBalance] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const connectWallet = async () => {
        if (!window.ethereum) {
            setStatus('Please install MetaMask (set network to Calibration Testnet).');
            return;
        }
        try {
            const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' });
            setAddress(accounts[0]);
            setStatus('Wallet connected! Fetching balance...');
            await loadBalance(accounts[0]);
        } catch (err: any) {
            setStatus(`Error connecting: ${err.message}`);
        }
    };

    const loadBalance = async (addr: string) => {
        try {
            const info = await pay.accounts(publicClient, {
                token: calibration.contracts.usdfc.address,
                address: addr as `0x${string}`,
            });
            setBalance(formatUnits(info.availableFunds, 18));
            setStatus('');
        } catch (_err) {
            setBalance('0');
            setStatus('');
        }
    };

    const depositFunds = async () => {
        if (!address || !window.ethereum) return;
        setIsLoading(true);

        try {
            // Pass the connected address so viem knows the signing account
            const walletClient = createSynapseWalletClient(window.ethereum, address as `0x${string}`);
            const depositAmount = parseUnits(amount, 18);

            setStatus('Step 1/2: Approving USDFC...');
            const txHash = await pay.depositAndApprove(walletClient, {
                token: calibration.contracts.usdfc.address,
                amount: depositAmount,
            });

            setStatus('Step 2/2: Waiting for confirmation...');
            await publicClient.waitForTransactionReceipt({ hash: txHash });

            setStatus(`✅ Successfully deposited ${amount} USDFC into Filecoin Pay!`);
            await loadBalance(address);
        } catch (err: any) {
            console.error(err);
            setStatus(`Error: ${err.shortMessage || err.message}`);
        } finally {
            setIsLoading(false);
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
                    {balance !== null && (
                        <p>Filecoin Pay Balance: <strong>{balance} USDFC</strong></p>
                    )}
                    <div style={{ marginBottom: '10px' }}>
                        <label>USDFC Amount to Deposit: </label>
                        <input
                            type="number"
                            value={amount}
                            min="0.01"
                            step="0.5"
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <small style={{ display: 'block', color: '#888', marginBottom: '12px' }}>
                        Deposits go to Filecoin Pay at: <code>{calibration.contracts.filecoinPay.address}</code>
                    </small>
                    <button onClick={depositFunds} disabled={isLoading}>
                        {isLoading ? 'Processing...' : 'Deposit to Filecoin Pay'}
                    </button>
                    {status && (
                        <p style={{
                            marginTop: '10px',
                            color: status.startsWith('✅') ? 'green' : status.startsWith('Error') ? 'red' : 'inherit'
                        }}>
                            {status}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
