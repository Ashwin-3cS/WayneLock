"use client";

import { useState, useEffect } from "react";
import { pay } from "@filoz/synapse-core";
import { formatEther, parseEther } from "viem";
import { publicClient, createSynapseWalletClient } from "@/lib/synapse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Coins, ArrowRight, Loader2 } from "lucide-react";

export function FundingUI() {
    const [balance, setBalance] = useState<string>("0");
    const [address, setAddress] = useState<`0x${string}` | null>(null);
    const [amount, setAmount] = useState<string>("2");
    const [isDepositing, setIsDepositing] = useState(false);
    const [status, setStatus] = useState<string>("");

    const connectWallet = async () => {
        try {
            const ethereum = (globalThis as any).ethereum;
            if (!ethereum) throw new Error("Please install MetaMask");
            const accounts = await ethereum.request({ method: "eth_requestAccounts" });
            setAddress(accounts[0]);
            await refreshBalance(accounts[0]);
        } catch (err: any) {
            setStatus("Failed to connect: " + err.message);
        }
    };

    const refreshBalance = async (userAddr: `0x${string}`) => {
        try {
            const summary = await pay.getAccountSummary(publicClient as any, { address: userAddr });
            setBalance(formatEther(summary.availableFunds));
        } catch (err: any) {
            console.error("Failed to fetch balance", err);
        }
    };

    const handleDeposit = async () => {
        if (!address) return;
        setIsDepositing(true);
        setStatus("Processing... Please confirm the transactions in MetaMask.");
        try {
            const ethereum = (globalThis as any).ethereum;
            const synapseWallet = createSynapseWalletClient(ethereum, address);
            
            // This does both: ERC20 approve() and Filecoin Pay deposit()
            const txHash = await pay.depositAndApprove(synapseWallet as any, {
                amount: parseEther(amount),
            });
            
            setStatus(`Deposit successful! tx: ${txHash.slice(0, 10)}...`);
            await refreshBalance(address);
        } catch (err: any) {
            console.error(err);
            setStatus("Failed: " + err.message);
        } finally {
            setIsDepositing(false);
        }
    };

    return (
        <Card className="border-foreground/10 overflow-hidden w-full bg-foreground/[0.01]">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-5 h-5 text-muted-foreground" />
                    <CardTitle className="text-xl font-display">Storage Funding (Filecoin Pay)</CardTitle>
                </div>
                <CardDescription>
                    Fund your decentralized storage rail with USDFC tokens.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {!address ? (
                    <Button
                        onClick={connectWallet}
                        className="w-full h-11 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90"
                    >
                        Connect Wallet
                    </Button>
                ) : (
                    <>
                        <div className="flex justify-between items-center p-4 bg-background border border-foreground/10 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Coins className="w-4 h-4 text-primary" />
                                <span className="text-sm font-mono text-muted-foreground">Available USDFC</span>
                            </div>
                            <span className="font-mono text-lg font-medium tracking-tight">
                                {Number(balance).toFixed(2)}
                            </span>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                                Deposit more USDFC
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min="1"
                                    step="1"
                                    className="font-mono bg-background border-foreground/10"
                                />
                                <Button 
                                    onClick={handleDeposit} 
                                    disabled={isDepositing}
                                    className="shrink-0 px-6"
                                >
                                    {isDepositing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deposit"}
                                </Button>
                            </div>
                        </div>

                        {status && (
                            <p className="text-xs font-mono text-muted-foreground break-all">
                                {status}
                            </p>
                        )}
                        
                        <p className="text-xs text-muted-foreground mt-4">
                            Note: This balance acts as a streaming payment rail to your decentralized storage providers. You must have a positive balance to upload the vault.
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
