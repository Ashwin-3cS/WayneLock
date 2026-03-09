import { useState } from 'react';
import { FundingUI } from './components/FundingUI';
import { useVaultStorage } from './hooks/useVaultStorage';
import { ethers } from 'ethers';
import './index.css';

function App() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [address, setAddress] = useState<string>('');

  // States for testing the vault storage without Lit Protocol yet
  const [vaultData, setVaultData] = useState<string>('');
  const [savedUri, setSavedUri] = useState<string>('');

  // Custom hook initialized for friend's future use.
  const vaultStorageProps = useVaultStorage(provider);
  // Expose to window for easy debugging/integration by friend
  if (typeof window !== 'undefined') {
    (window as any).vaultStorage = vaultStorageProps;
  }
  const { saveVault, loadVault, isProcessing, error } = vaultStorageProps;

  const connectWallet = async () => {
    if (window.ethereum) {
      const web3Provider = new ethers.BrowserProvider(window.ethereum as any);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      setAddress(accounts[0]);
    }
  };

  const handleSaveVault = async () => {
    try {
      // Mocking the Lit Protocol encryption by just converting string to bytes
      // Filecoin warm storage requires a minimum piece size of 127 bytes
      const paddedData = vaultData.padEnd(127, ' ');
      const dummyEncryptedBlob = ethers.toUtf8Bytes(paddedData);
      const uri = await saveVault(dummyEncryptedBlob);
      setSavedUri(uri);
      alert('Vault saved successfully!');
    } catch (err: any) {
      console.error(err);
      alert('Failed to save vault: ' + err.message);
    }
  };

  const handleLoadVault = async () => {
    try {
      const blob = await loadVault();
      if (blob) {
        // Mocking the Lit Protocol decryption by converting bytes back to string
        const decodedString = ethers.toUtf8String(blob);
        // Remove the 127-byte padding we added during upload
        setVaultData(decodedString.trimEnd());
        alert('Vault loaded successfully!');
      } else {
        alert('No vault found for this address.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to load vault: ' + err.message);
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
        <section className="vault-actions" style={{ padding: '20px', borderTop: '1px solid #ccc', marginTop: '20px' }}>
          <h3>Test Vault Storage (Pre-Lit Integration)</h3>
          <p><em>Type some secrets here to test writing to Filecoin Warm Storage:</em></p>

          <textarea
            value={vaultData}
            onChange={(e) => setVaultData(e.target.value)}
            placeholder="My secret password is..."
            style={{ width: '100%', height: '80px', marginBottom: '10px' }}
            disabled={!address || isProcessing}
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSaveVault} disabled={!address || isProcessing || !vaultData}>
              Save to FWSS Vault
            </button>
            <button onClick={handleLoadVault} disabled={!address || isProcessing}>
              Load from FWSS Vault
            </button>
          </div>

          {savedUri && (
            <div style={{ marginTop: '10px', fontSize: '12px', background: '#f5f5f5', padding: '10px' }}>
              <strong>Saved Synapse URI:</strong><br />
              <code style={{ wordBreak: 'break-all' }}>{savedUri}</code>
            </div>
          )}

          {error && <p className="error" style={{ color: 'red' }}>{error}</p>}
          {isProcessing && <p style={{ color: 'blue' }}>Processing on Filecoin Network...</p>}
        </section>
      </main>
    </div>
  );
}

export default App;
