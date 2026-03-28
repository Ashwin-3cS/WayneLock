"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Copy, Trash2, Download, Loader2, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { decryptBlobWithDek } from "@/lib/password-encrypt";
import { DEFAULT_LIT_CHAIN, litDecryptDek } from "@/lib/lit-recovery";
import {
  readEntryUids,
  readEntry,
  removeEntryOnChain,
  readIsVaultInitialized,
  DEFAULT_GUARDIAN_CONTRACT,
} from "@/lib/guardian-recovery-contract";
import type { Address } from "viem";
import { fetchVaultBlob } from "@/lib/fwss";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useWalletClient } from "wagmi";

interface EntryData {
  uid: string;
  metadataJson: string;
  createdAt: bigint;
  decryptedPassword?: string;
}

export default function VaultPage() {
  const [isVisible, setIsVisible] = useState(false);
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVaultInit, setIsVaultInit] = useState<boolean | null>(null);
  const [decryptingUid, setDecryptingUid] = useState<string | null>(null);
  const [removingUid, setRemovingUid] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => setIsVisible(true), []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const loadEntries = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setStatusMsg("");
    setEntries([]);
    try {
      const initialized = await readIsVaultInitialized({
        contractAddress: DEFAULT_GUARDIAN_CONTRACT,
        owner: address,
      });
      setIsVaultInit(initialized);
      if (!initialized) {
        setStatusMsg("No vault found for this address. Create one first.");
        return;
      }

      const uids = await readEntryUids({
        contractAddress: DEFAULT_GUARDIAN_CONTRACT,
        owner: address,
      });

      const loaded: EntryData[] = [];
      for (const uid of uids) {
        const entry = await readEntry({
          contractAddress: DEFAULT_GUARDIAN_CONTRACT,
          owner: address,
          uid,
        });
        if (entry.exists) {
          loaded.push({
            uid,
            metadataJson: entry.metadataJson,
            createdAt: entry.createdAt,
          });
        }
      }
      setEntries(loaded);
      setStatusMsg(`Found ${loaded.length} entr${loaded.length === 1 ? "y" : "ies"}.`);
    } catch (err: any) {
      console.error("Load entries failed:", err);
      setStatusMsg("Failed to load entries: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Auto-load entries when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      loadEntries();
    } else {
      setEntries([]);
      setIsVaultInit(null);
      setStatusMsg("");
    }
  }, [isConnected, address, loadEntries]);

  const handleDecryptEntry = async (uid: string) => {
    if (!address) return;
    setDecryptingUid(uid);
    try {
      const entry = entries.find((e) => e.uid === uid);
      if (!entry) throw new Error("Entry not found");

      const payload = JSON.parse(entry.metadataJson);

      const evmContractConditions = [
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
      ];

      const blobBytes = await fetchVaultBlob(payload.pieceCid, payload.serviceURL);
      const encryptedBlob = new TextDecoder().decode(blobBytes).replace(/\0/g, "");

      const dekBytes = await litDecryptDek({
        ciphertext: payload.litCiphertext,
        dataToEncryptHash: payload.litDataHash,
        evmContractConditions: evmContractConditions as any,
        chain: DEFAULT_LIT_CHAIN,
      });
      const dekB64 = btoa(String.fromCharCode(...dekBytes));
      const plain = await decryptBlobWithDek(encryptedBlob, dekB64);

      setEntries((prev) =>
        prev.map((e) => (e.uid === uid ? { ...e, decryptedPassword: plain } : e))
      );
    } catch (err: any) {
      console.error(`Decrypt "${uid}" failed:`, err);
      setStatusMsg(`Decrypt "${uid}" failed (guardian threshold may not be met yet).`);
    } finally {
      setDecryptingUid(null);
    }
  };

  const handleRemoveEntry = async (uid: string) => {
    if (!confirm(`Remove entry "${uid}"? This cannot be undone.`)) return;
    setRemovingUid(uid);
    try {
      await removeEntryOnChain({
        contractAddress: DEFAULT_GUARDIAN_CONTRACT,
        uid,
        walletClient: walletClient ?? undefined,
        account: address,
      });
      setEntries((prev) => prev.filter((e) => e.uid !== uid));
      setStatusMsg(`Entry "${uid}" removed.`);
    } catch (err: any) {
      console.error(`Remove "${uid}" failed:`, err);
      setStatusMsg(`Remove "${uid}" failed: ` + err.message);
    } finally {
      setRemovingUid(null);
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
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/create" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Add entry
            </Link>
            <Link href="/recovery/owner" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Recovery
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
            Password vault
          </span>
          <h1 className="text-4xl lg:text-6xl font-display tracking-tight">
            Your vault.
            <br />
            <span className="text-muted-foreground">All entries in one place.</span>
          </h1>
        </div>

        <div className="max-w-3xl space-y-6">
          {!isConnected && (
            <Card className="border-foreground/10">
              <CardContent className="py-12 text-center space-y-4">
                <p className="text-muted-foreground">Connect your wallet to view stored password entries.</p>
                <ConnectButton />
              </CardContent>
            </Card>
          )}

          {isConnected && isLoading && (
            <Card className="border-foreground/10">
              <CardContent className="py-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
                <p className="text-muted-foreground">Loading entries...</p>
              </CardContent>
            </Card>
          )}

          {isConnected && statusMsg && !isLoading && (
            <div className="text-sm text-foreground font-mono break-all bg-foreground/5 p-3 rounded-lg border border-foreground/10">
              {statusMsg}
            </div>
          )}

          {isConnected && entries.length > 0 && (
            <Card className="border-foreground/10">
              <CardHeader>
                <CardTitle className="font-display text-2xl">Stored entries</CardTitle>
                <CardDescription>{entries.length} password{entries.length !== 1 ? "s" : ""} in your vault</CardDescription>
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
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 rounded-full border-foreground/20"
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
                              Retrieve
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleRemoveEntry(entry.uid)}
                          disabled={removingUid === entry.uid}
                          aria-label="Remove entry"
                        >
                          {removingUid === entry.uid ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {isConnected && isVaultInit === false && !isLoading && (
            <Card className="border-foreground/10">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No vault found for this address.</p>
                <Button asChild className="rounded-full">
                  <Link href="/create">Create your first entry</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
