import { useState } from 'react';
import { FundingUI } from './components/FundingUI';
import { useVaultStorage } from './hooks/useVaultStorage';
import { ethers } from 'ethers';
import './index.css';

function App() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [address, setAddress] = useState<string>('');

  // Custom hook initialized for friend's future use.
  const vaultStorageProps = useVaultStorage(provider);
  // Expose to window for easy debugging/integration by friend
  if (typeof window !== 'undefined') {
    (window as any).vaultStorage = vaultStorageProps;
  }
  const { isProcessing, error } = vaultStorageProps;

  const connectWallet = async () => {
    if (window.ethereum) {
      const web3Provider = new ethers.BrowserProvider(window.ethereum as any);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      setAddress(accounts[0]);
    }
  };

  return (
    <div className="popup-container">
      <header>
        <h1>Decentralized Vault</h1>
        {!address ? (
          <button onClick={connectWallet} className="connect-btn">Connect Wallet</button>
        ) : (
          <span className="address-badge">{address.substring(0, 6)}...{address.slice(-4)}</span>
        )}
      </header>

      <main>
        {/* User begins by funding their vault escrow for storage */}
        <section className="funding-section">
          <FundingUI />
        </section>

        {/* Lit Protocol Integration placeholder for the friend */}
        <section className="vault-actions">
          <p><em>Lit Protocol Encryption/Decryption UI goes here</em></p>
          {error && <p className="error">{error}</p>}
          {isProcessing && <p>Processing on FWSS/FEVM...</p>}
        </section>
      </main>
    </div>
  );
}

export default App;
