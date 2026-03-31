"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Address } from "viem";
import { approveRecoveryOnChain, readRecoveryStatus, DEFAULT_GUARDIAN_CONTRACT } from "@/lib/guardian-recovery-contract";
import { DEFAULT_LIT_CHAIN } from "@/lib/lit-recovery";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useWalletClient } from "wagmi";
import { AppSiteHeader } from "@/components/app-site-header";

const guardianRecoveryNavLinks = [
  { href: "/", label: "Home" },
  { href: "/vault", label: "My vault" },
  { href: "/create", label: "Add entry" },
  { href: "/recovery/owner", label: "Owner recovery" },
];

export default function GuardianRecoveryPage() {
  const [isVisible, setIsVisible] = useState(false);
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [ownerAddress, setOwnerAddress] = useState("");

  const [status, setStatus] = useState<string>("");
  const [isApproving, setIsApproving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => setIsVisible(true), []);

  const handleApprove = async () => {
    setIsApproving(true);
    setStatus("");
    try {
      if (!ownerAddress) throw new Error("Owner address required");
      const { hash } = await approveRecoveryOnChain({
        contractAddress: DEFAULT_GUARDIAN_CONTRACT,
        owner: ownerAddress as Address,
        walletClient: walletClient ?? undefined,
        account: address,
      });
      setStatus(`approveRecovery tx: ${hash}`);
    } catch (err) {
      console.error(err);
      setStatus("approveRecovery failed (see console)");
    } finally {
      setIsApproving(false);
    }
  };

  const handleCheck = async () => {
    setIsChecking(true);
    setStatus("");
    try {
      if (!ownerAddress) throw new Error("Owner address required");
      const s = await readRecoveryStatus({
        contractAddress: DEFAULT_GUARDIAN_CONTRACT,
        owner: ownerAddress as Address,
      });
      setStatus(
        `recoveryId=${s.recoveryId.toString()} active=${String(s.active)} approvals=${s.approvals.toString()} threshold=${s.threshold}`
      );
    } catch (err) {
      console.error(err);
      setStatus("Status check failed (see console)");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay">
      <AppSiteHeader links={guardianRecoveryNavLinks} />

      <div className="relative z-10 w-full px-6 lg:px-12 py-16 lg:py-24">
        <div
          className={cn(
            "mb-10 transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-foreground/30" />
            Guardian approval
          </span>
          <h1 className="text-4xl lg:text-6xl font-display tracking-tight">
            Approve recovery.
            <br />
            <span className="text-muted-foreground">On-chain signatures counted.</span>
          </h1>
        </div>

        <div className="max-w-2xl space-y-6">
          {!isConnected && (
            <Card className="border-foreground/10">
              <CardContent className="py-12 text-center space-y-4">
                <p className="text-muted-foreground">Connect your guardian wallet to approve recovery requests.</p>
                <ConnectButton />
              </CardContent>
            </Card>
          )}

          {isConnected && (
            <Card className="border-foreground/10">
              <CardHeader>
                <CardTitle className="font-display text-2xl">Approve recovery</CardTitle>
                <CardDescription>Filecoin Calibration. Chain: {DEFAULT_LIT_CHAIN}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-mono">Owner address (who started recovery)</Label>
                  <Input className="font-mono" value={ownerAddress} onChange={(e) => setOwnerAddress(e.target.value)} placeholder="0x..." />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button className="rounded-full" onClick={handleApprove} disabled={isApproving || !ownerAddress}>
                    {isApproving ? "Approving…" : "Approve recovery"}
                  </Button>
                  <Button variant="outline" className="rounded-full" onClick={handleCheck} disabled={isChecking || !ownerAddress}>
                    {isChecking ? "Checking…" : "Check status"}
                  </Button>
                </div>

                {status && <div className="text-sm text-foreground font-mono break-all bg-foreground/5 p-3 rounded-lg border border-foreground/10">{status}</div>}
                <p className="text-xs text-muted-foreground">
                  Once approvals reach the threshold, Lit will allow the owner to decrypt the key.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

