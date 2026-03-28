"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Download, KeyRound, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_LIT_CHAIN, litDecryptDek } from "@/lib/lit-recovery";
import { decryptBlobWithDek } from "@/lib/password-encrypt";
import {
  readIsRecoveryApproved,
  readRecoveryStatus,
  startRecoveryOnChain,
  readEntryUids,
  readEntry,
  DEFAULT_GUARDIAN_CONTRACT,
} from "@/lib/guardian-recovery-contract";
import { fetchVaultBlob } from "@/lib/fwss";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useWalletClient } from "wagmi";

interface RecoveryEntry {
  uid: string;
  metadataJson: string;
  createdAt: bigint;
  decryptedPassword?: string;
}

export default function OwnerRecoveryPage() {
  const [isVisible, setIsVisible] = useState(false);
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [status, setStatus] = useState<string>("");
  const [isStarting, setIsStarting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isFetchingEntries, setIsFetchingEntries] = useState(false);
  const [decryptingUid, setDecryptingUid] = useState<string | null>(null);
  const [entries, setEntries] = useState<RecoveryEntry[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => setIsVisible(true), []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const evmContractConditions = useMemo(
    () => [
      {
        conditionType: "evmContract",
        contractAddress: DEFAULT_GUARDIAN_CONTRACT,
        chain: DEFAULT_LIT_CHAIN,
        functionName: "isRecoveryApprovedForOwner",
        functionParams: [":userAddress"],
        functionAbi: {
          name: "isRecoveryApprovedForOwner",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "owner", type: "address", internalType: "address" }],
          outputs: [{ name: "", type: "bool", internalType: "bool" }],
        },
        returnValueTest: { key: "", comparator: "=", value: "true" },
      },
    ],
    []
  );

  const handleStartRecovery = async () => {
    if (!address) return;
    setIsStarting(true);
    setStatus("");
    try {
      const { hash } = await startRecoveryOnChain({
        contractAddress: DEFAULT_GUARDIAN_CONTRACT,
        walletClient: walletClient ?? undefined,
        account: address,
      });
      setStatus(`startRecovery tx: ${hash}`);
    } catch (err) {
      console.error(err);
      setStatus("startRecovery failed (see console)");
    } finally {
      setIsStarting(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!address) return;
    setIsChecking(true);
    setStatus("");
    try {
      const s = await readRecoveryStatus({ contractAddress: DEFAULT_GUARDIAN_CONTRACT, owner: address });
      const approved = await readIsRecoveryApproved({ contractAddress: DEFAULT_GUARDIAN_CONTRACT, owner: address });
      setStatus(
        `recoveryId=${s.recoveryId.toString()} active=${String(s.active)} approvals=${s.approvals.toString()} threshold=${s.threshold} approved=${String(approved)}`
      );
    } catch (err) {
      console.error(err);
      setStatus("Status check failed (see console)");
    } finally {
      setIsChecking(false);
    }
  };

  const handleFetchEntries = async () => {
    if (!address) return;
    setIsFetchingEntries(true);
    setStatus("");
    setEntries([]);
    try {
      setStatus("Reading vault entries from blockchain...");

      const uids = await readEntryUids({
        contractAddress: DEFAULT_GUARDIAN_CONTRACT,
        owner: address,
      });

      if (uids.length === 0) {
        setStatus("No entries found for this owner.");
        return;
      }

      const loaded: RecoveryEntry[] = [];
      for (const uid of uids) {
        const entry = await readEntry({
          contractAddress: DEFAULT_GUARDIAN_CONTRACT,
          owner: address,
          uid,
        });
        if (entry.exists) {
          loaded.push({ uid, metadataJson: entry.metadataJson, createdAt: entry.createdAt });
        }
      }
      setEntries(loaded);
      setStatus(`Found ${loaded.length} entr${loaded.length === 1 ? "y" : "ies"}. Decrypt individually below.`);
    } catch (err: any) {
      console.error(err);
      setStatus("Failed to fetch entries: " + err.message);
    } finally {
      setIsFetchingEntries(false);
    }
  };

  const handleDecryptEntry = async (uid: string) => {
    setDecryptingUid(uid);
    try {
      const entry = entries.find((e) => e.uid === uid);
      if (!entry) throw new Error("Entry not found");

      const payload = JSON.parse(entry.metadataJson);

      // Fetch encrypted blob from Filecoin
      const blobBytes = await fetchVaultBlob(payload.pieceCid, payload.serviceURL);
      const encryptedBlob = new TextDecoder().decode(blobBytes).replace(/\0/g, "");

      // Decrypt DEK via Lit
      const dekBytes = await litDecryptDek({
        ciphertext: payload.litCiphertext,
        dataToEncryptHash: payload.litDataHash,
        evmContractConditions: evmContractConditions as any,
        chain: DEFAULT_LIT_CHAIN,
      });
      const dekB64 = btoa(String.fromCharCode(...dekBytes));

      // Decrypt password
      const plain = await decryptBlobWithDek(encryptedBlob, dekB64);

      setEntries((prev) =>
        prev.map((e) => (e.uid === uid ? { ...e, decryptedPassword: plain } : e))
      );
      setStatus(`Decrypted "${uid}" successfully.`);
    } catch (err: any) {
      console.error(`Decrypt "${uid}" failed:`, err);
      setStatus(`Decrypt "${uid}" failed (guardian threshold may not be met yet).`);
    } finally {
      setDecryptingUid(null);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay">
      <header className="relative z-20 border-b border-foreground/10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-xl tracking-tight hover:opacity-80 transition-opacity">
            WayneLock
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/vault" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              My vault
            </Link>
            <Link href="/create" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Add entry
            </Link>
            <Link href="/recovery/guardian" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Guardian approval
            </Link>
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
          </div>
        </div>
      </header>

      <div className="relative z-10 w-full px-6 lg:px-12 py-16 lg:py-24">
        <div
          className={cn(
            "mb-10 transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-foreground/30" />
            Owner recovery
          </span>
          <h1 className="text-4xl lg:text-6xl font-display tracking-tight">
            Start recovery.
            <br />
            <span className="text-muted-foreground">Decrypt entries after approvals.</span>
          </h1>
        </div>

        <div className="max-w-3xl space-y-6">
          {!isConnected && (
            <Card className="border-foreground/10">
              <CardContent className="py-12 text-center space-y-4">
                <p className="text-muted-foreground">Connect your wallet to start the recovery process.</p>
                <ConnectButton />
              </CardContent>
            </Card>
          )}

          {isConnected && (
            <Card className="border-foreground/10">
              <CardHeader>
                <CardTitle className="font-display text-2xl">Recovery actions</CardTitle>
                <CardDescription>Filecoin Calibration. Chain: {DEFAULT_LIT_CHAIN}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button className="rounded-full" onClick={handleStartRecovery} disabled={isStarting}>
                    {isStarting ? "Starting..." : "Start recovery"}
                  </Button>
                  <Button variant="outline" className="rounded-full" onClick={handleCheckStatus} disabled={isChecking}>
                    {isChecking ? "Checking..." : "Check approvals"}
                  </Button>
                  <Button variant="outline" className="rounded-full border-foreground/30 border" onClick={handleFetchEntries} disabled={isFetchingEntries}>
                    {isFetchingEntries ? "Loading..." : "Fetch all entries"}
                  </Button>
                </div>
                {status && <div className="text-sm text-foreground font-mono break-all bg-foreground/5 p-3 rounded-lg border border-foreground/10">{status}</div>}
              </CardContent>
            </Card>
          )}

          {entries.length > 0 && (
            <Card className="border-foreground/10">
              <CardHeader>
                <CardTitle className="font-display text-2xl">Vault entries</CardTitle>
                <CardDescription>
                  {entries.length} entr{entries.length !== 1 ? "ies" : "y"} found. Decrypt individually after guardian threshold is met.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {entries.map((entry) => (
                  <div
                    key={entry.uid}
                    className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <KeyRound className="w-5 h-5 text-foreground/50" />
                        <span className="font-mono text-sm font-medium">{entry.uid}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(Number(entry.createdAt) * 1000).toLocaleDateString()}
                      </span>
                    </div>

                    {entry.decryptedPassword ? (
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={entry.decryptedPassword}
                          className="font-mono text-sm h-10 bg-background border-foreground/10"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-10 w-10 shrink-0"
                          onClick={() => handleCopy(entry.decryptedPassword!, entry.uid)}
                          aria-label="Copy password"
                        >
                          {copied === entry.uid ? (
                            <span className="text-xs text-green-600">OK</span>
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full rounded-full border-foreground/20"
                        onClick={() => handleDecryptEntry(entry.uid)}
                        disabled={decryptingUid === entry.uid}
                      >
                        {decryptingUid === entry.uid ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Decrypting...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Decrypt "{entry.uid}"
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
