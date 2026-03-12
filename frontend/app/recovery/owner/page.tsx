"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Address } from "viem";
import { DEFAULT_LIT_CHAIN, litDecryptDek } from "@/lib/lit-recovery";
import { decryptBlobWithDek } from "@/lib/password-encrypt";
import { readIsRecoveryApproved, readRecoveryStatus, startRecoveryOnChain } from "@/lib/guardian-recovery-contract";

const DEFAULT_CONTRACT = "0x62efFe14a218032f57Df28f10DD730cE9507ca7C";

export default function OwnerRecoveryPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT);
  const [ownerAddress, setOwnerAddress] = useState("");

  const [ciphertext, setCiphertext] = useState("");
  const [dataHash, setDataHash] = useState("");
  const [encryptedBlob, setEncryptedBlob] = useState("");
  const [evmContractConditions] = useState<any[]>([
    {
      conditionType: "evmContract",
      contractAddress: DEFAULT_CONTRACT,
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
  ]);

  const [status, setStatus] = useState<string>("");
  const [isStarting, setIsStarting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedPassword, setDecryptedPassword] = useState("");

  useEffect(() => setIsVisible(true), []);

  const conds = useMemo(() => {
    const next = [...evmContractConditions];
    next[0] = { ...next[0], contractAddress };
    return next;
  }, [contractAddress, evmContractConditions]);

  const handleStartRecovery = async () => {
    setIsStarting(true);
    setStatus("");
    try {
      const { hash } = await startRecoveryOnChain({ contractAddress: contractAddress as Address });
      setStatus(`startRecovery tx: ${hash}`);
    } catch (err) {
      console.error(err);
      setStatus("startRecovery failed (see console)");
    } finally {
      setIsStarting(false);
    }
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setStatus("");
    try {
      if (!ownerAddress) throw new Error("Owner address required");
      const s = await readRecoveryStatus({ contractAddress: contractAddress as Address, owner: ownerAddress as Address });
      const approved = await readIsRecoveryApproved({ contractAddress: contractAddress as Address, owner: ownerAddress as Address });
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

  const handleDecrypt = async () => {
    setIsDecrypting(true);
    setDecryptedPassword("");
    setStatus("");
    try {
      const dekBytes = await litDecryptDek({
        ciphertext,
        dataToEncryptHash: dataHash,
        evmContractConditions: conds as any,
        chain: DEFAULT_LIT_CHAIN,
      });
      const dekB64 = btoa(String.fromCharCode(...dekBytes));
      const plain = await decryptBlobWithDek(encryptedBlob, dekB64);
      setDecryptedPassword(plain);
      setStatus("Decrypted successfully (Lit conditions satisfied).");
    } catch (err) {
      console.error(err);
      setStatus("Decrypt failed (likely guardians threshold not met yet).");
    } finally {
      setIsDecrypting(false);
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
            <Link href="/create" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Back to create
            </Link>
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
            <span className="text-muted-foreground">Decrypt only after approvals.</span>
          </h1>
        </div>

        <div className="max-w-3xl space-y-6">
          <Card className="border-foreground/10">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Recovery contract</CardTitle>
              <CardDescription>Filecoin Calibration. Chain: {DEFAULT_LIT_CHAIN}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-mono">Contract address</Label>
                <Input className="font-mono" value={contractAddress} onChange={(e) => setContractAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-mono">Owner address (for status checks)</Label>
                <Input className="font-mono" value={ownerAddress} onChange={(e) => setOwnerAddress(e.target.value)} placeholder="0x..." />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button className="rounded-full" onClick={handleStartRecovery} disabled={isStarting}>
                  {isStarting ? "Starting…" : "startRecovery()"}
                </Button>
                <Button variant="outline" className="rounded-full" onClick={handleCheckStatus} disabled={isChecking}>
                  {isChecking ? "Checking…" : "Check approvals"}
                </Button>
              </div>
              {status && <div className="text-sm text-muted-foreground font-mono break-all">{status}</div>}
            </CardContent>
          </Card>

          <Card className="border-foreground/10">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Decrypt with Lit</CardTitle>
              <CardDescription>Paste values from the create flow (ciphertext/hash/blob).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-mono">Lit ciphertext</Label>
                <Input className="font-mono text-xs" value={ciphertext} onChange={(e) => setCiphertext(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-mono">dataToEncryptHash</Label>
                <Input className="font-mono text-xs" value={dataHash} onChange={(e) => setDataHash(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-mono">Encrypted blob</Label>
                <Input className="font-mono text-xs" value={encryptedBlob} onChange={(e) => setEncryptedBlob(e.target.value)} />
              </div>
              <Button
                className="w-full rounded-full"
                onClick={handleDecrypt}
                disabled={isDecrypting || !ciphertext || !dataHash || !encryptedBlob}
              >
                {isDecrypting ? "Decrypting…" : "Decrypt (requires guardian threshold)"}
              </Button>
              {decryptedPassword && (
                <div className="p-4 rounded-lg border border-foreground/10 bg-background">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Decrypted</p>
                  <div className="font-mono break-all">{decryptedPassword}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

