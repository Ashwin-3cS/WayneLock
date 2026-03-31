"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Copy, ArrowRight, Shield, Hash, Shuffle, KeyRound, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { generatePassword } from "@/lib/password-generator";
import { decryptBlobWithDek, encryptPasswordForLit } from "@/lib/password-encrypt";
import { DEFAULT_LIT_CHAIN, litDecryptDek, litEncryptDek } from "@/lib/lit-recovery";
import { registerVaultAndAddEntryOnChain, addEntryOnChain, readIsVaultInitialized, DEFAULT_GUARDIAN_CONTRACT } from "@/lib/guardian-recovery-contract";
import type { Address } from "viem";
import { FundingUI } from "@/components/funding-ui";
import { uploadVaultBlob } from "@/lib/fwss";
import { createSynapseWalletClient } from "@/lib/synapse";
import { useAccount, useWalletClient } from "wagmi";
import { AppSiteHeader } from "@/components/app-site-header";

const createPageNavLinks = [
  { href: "/", label: "Home" },
  { href: "/vault", label: "My vault" },
  { href: "/recovery/owner", label: "Owner recovery" },
  { href: "/recovery/guardian", label: "Guardian approval" },
];

const pipelineSteps = [
  { id: "entropy", label: "Device entropy", icon: Shield },
  { id: "hash", label: "Hashing", icon: Hash },
  { id: "drand", label: "drand randomness", icon: Shuffle },
  { id: "password", label: "Password", icon: KeyRound },
];

export default function CreatePage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [password, setPassword] = useState("");
  const [length, setLength] = useState([20]);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [encryptedBlob, setEncryptedBlob] = useState("");
  const [litCiphertext, setLitCiphertext] = useState("");
  const [litDataHash, setLitDataHash] = useState("");
  const [entryUid, setEntryUid] = useState("");
  const [guardianContract, setGuardianContract] = useState(DEFAULT_GUARDIAN_CONTRACT as string);
  const [vaultCid, setVaultCid] = useState("");
  const [guardiansInput, setGuardiansInput] = useState("");
  const [threshold, setThreshold] = useState(2);
  const [isRegistering, setIsRegistering] = useState(false);
  const [vaultRegistered, setVaultRegistered] = useState(false);
  const [registerTx, setRegisterTx] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [decryptedPassword, setDecryptedPassword] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [evmContractConditions, setEvmContractConditions] = useState<any[] | null>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleCopy = (text: string, id: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setPassword("");
    setEncryptedBlob("");
    setLitCiphertext("");
    setLitDataHash("");
    setDecryptedPassword("");
    setVaultRegistered(false);
    setRegisterTx("");
    setActiveStep(0);

    const steps = [0, 1, 2, 3];
    const stepInterval = 600;
    steps.forEach((step, i) => {
      setTimeout(() => setActiveStep(step), i * stepInterval);
    });

    try {
      const result = await generatePassword({
        length: length[0] ?? 20,
        uppercase,
        lowercase,
        numbers,
        symbols,
      });
      setPassword(result.password);
      console.log("Password generation metadata:", result.metadata);

      const { encryptedBlob, dekB64 } = await encryptPasswordForLit(result.password);
      setEncryptedBlob(encryptedBlob);

      if (!guardianContract) {
        console.warn("Lit step skipped: guardian contract address not set yet.");
        return;
      }

      const dekBytes = Uint8Array.from(atob(dekB64), (c) => c.charCodeAt(0));
      const litRes = await litEncryptDek({
        dekBytes,
        contractAddress: guardianContract,
        chain: DEFAULT_LIT_CHAIN,
      });

      setLitCiphertext(litRes.ciphertext);
      setLitDataHash(litRes.dataToEncryptHash);
      setEvmContractConditions(litRes.evmContractConditions);
      // Per current spec: store the Lit ciphertext string in the contract's `ipfsCid` field (temporary until IPFS).
      setVaultCid(litRes.ciphertext);
      console.log("✅ Lit encrypted DEK (ciphertext + dataToEncryptHash) ready.");
    } catch (err) {
      console.error("Password generation or encryption failed:", err);
      setPassword("");
      setEncryptedBlob("");
      setLitCiphertext("");
      setLitDataHash("");
      setEvmContractConditions(null);
      setVaultCid("");
    } finally {
      setActiveStep(null);
      setIsGenerating(false);
    }
  };

  const parseGuardians = (): Address[] => {
    const parts = guardiansInput
      .split(/[\n,]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
    return parts as Address[];
  };

  const handleRegisterVault = async () => {
    setIsRegistering(true);
    setVaultRegistered(false);
    setRegisterTx("");
    try {
      const guardians = parseGuardians();
      if (!guardianContract) throw new Error("Guardian contract address missing");
      if (!encryptedBlob) throw new Error("Encrypted vault blob missing. Generate & Lit-encrypt first.");
      if (!litCiphertext || !litDataHash) throw new Error("Lit metadata missing. Generate password first.");
      if (!entryUid.trim()) throw new Error("Entry label (UID) is required, e.g. 'google', 'facebook'");
      if (!isConnected || !address) throw new Error("Connect your wallet first");
      if (guardians.length === 0) throw new Error("Provide at least 1 guardian address");
      if (threshold <= 0 || threshold > guardians.length) {
        throw new Error("Threshold must be between 1 and number of guardians");
      }

      setStatusMsg("Uploading encrypted vault to Filecoin network via Synapse Core...");

      const ethereum = (globalThis as any).ethereum;
      const synapseWalletClient = createSynapseWalletClient(ethereum, address);

      // 1. Upload to Filecoin Warm Storage
      const { pieceCid, serviceURL } = await uploadVaultBlob(
          encryptedBlob,
          address,
          synapseWalletClient
      );

      // 2. Serialize piece metadata & Lit metadata
      const metadataJson = JSON.stringify({
        pieceCid,
        serviceURL,
        litCiphertext,
        litDataHash
      });

      // 3. Check if vault is already initialized
      const isInitialized = await readIsVaultInitialized({
        contractAddress: guardianContract as Address,
        owner: address,
      });

      if (!isInitialized) {
        // First time: single call for vault init + entry
        setStatusMsg("Registering vault & storing entry on-chain...");
        const { hash } = await registerVaultAndAddEntryOnChain({
          contractAddress: guardianContract as Address,
          cid: "",
          guardians,
          threshold,
          uid: entryUid.trim(),
          metadataJson,
          walletClient: walletClient ?? undefined,
          account: address,
        });
        setRegisterTx(hash);
      } else {
        // Subsequent: just add entry
        setStatusMsg(`Storing entry "${entryUid}" on-chain...`);
        const { hash } = await addEntryOnChain({
          contractAddress: guardianContract as Address,
          uid: entryUid.trim(),
          metadataJson,
          walletClient: walletClient ?? undefined,
          account: address,
        });
        setRegisterTx(hash);
      }

      setVaultRegistered(true);
      console.log(`✅ Entry "${entryUid}" stored on-chain`);
    } catch (err) {
      console.error("registerVault failed:", err);
      setVaultRegistered(false);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDecryptWithLit = async () => {
    if (!encryptedBlob || !litCiphertext || !litDataHash || !evmContractConditions) return;
    setIsDecrypting(true);
    setDecryptedPassword("");
    try {
      const dekBytes = await litDecryptDek({
        ciphertext: litCiphertext,
        dataToEncryptHash: litDataHash,
        evmContractConditions: evmContractConditions as any,
        chain: DEFAULT_LIT_CHAIN,
      });
      const dekB64 = btoa(String.fromCharCode(...dekBytes));
      const plain = await decryptBlobWithDek(encryptedBlob, dekB64);
      setDecryptedPassword(plain);
      console.log("✅ Decrypted password via Lit-gated DEK");
    } catch (err) {
      console.error("Lit decrypt failed (likely ACC not satisfied yet):", err);
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay">
      {/* Subtle grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.04]">
        {[...Array(8)].map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute h-px bg-foreground"
            style={{
              top: `${12.5 * (i + 1)}%`,
              left: 0,
              right: 0,
            }}
          />
        ))}
        {[...Array(12)].map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute w-px bg-foreground"
            style={{
              left: `${8.33 * (i + 1)}%`,
              top: 0,
              bottom: 0,
            }}
          />
        ))}
      </div>

      <AppSiteHeader links={createPageNavLinks} />

      <div className="relative z-10 w-full px-6 lg:px-12 py-16 lg:py-24">
        <div className="flex flex-col lg:flex-row lg:items-start gap-12 lg:gap-16">
          {/* Left: Title, pipeline, note */}
          <div className="min-w-0 lg:max-w-[580px]">
            {/* Page title */}
            <div
              className={cn(
                "mb-10 lg:mb-12 transition-all duration-700",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
            >
              <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
                <span className="w-8 h-px bg-foreground/30" />
                Password generator
              </span>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-display tracking-tight mb-6">
                Generate your password
                <br />
                <span className="text-muted-foreground">locally.</span>
              </h1>
              <p className="text-lg lg:text-xl text-muted-foreground max-w-xl leading-relaxed">
                Your password is built on this device using device entropy, hashing methods, and verifiable randomness from drand. Nothing is sent to any server.
              </p>
            </div>

            {/* Pipeline visual */}
            <div
              className={cn(
                "mb-10 lg:mb-12 transition-all duration-700 delay-100",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
            >
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-6">
                Generation pipeline
              </p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
                {pipelineSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 hover-lift",
                        activeStep === index
                          ? "border-foreground bg-foreground/5"
                          : "border-foreground/10 bg-card"
                      )}
                    >
                      <step.icon className="w-5 h-5 text-foreground/70 shrink-0" />
                      <span className="font-mono text-sm">{step.label}</span>
                    </div>
                    {index < pipelineSteps.length - 1 && (
                      <ArrowRight className="w-4 h-4 mx-2 text-foreground/20 hidden sm:block flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer note */}
            <p
              className={cn(
                "text-sm text-muted-foreground max-w-xl transition-all duration-700 delay-300",
                isVisible ? "opacity-100" : "opacity-0"
              )}
            >
              <span className="font-mono text-foreground/70">Note:</span> R1 and R2 use verifiable randomness from the drand beacon network (latest and previous round).
            </p>
          </div>

          {/* Right: Generator card - pushed to the very right */}
          <div
            className={cn(
              "w-full lg:w-[460px] lg:min-w-[460px] lg:shrink-0 lg:ml-auto lg:sticky lg:top-28 transition-all duration-700 delay-200",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <Card className="border-foreground/10 shadow-sm overflow-hidden w-full">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-display">Your password</CardTitle>
                <CardDescription>
                  Generated locally. Copy and store it securely.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Password output */}
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={password}
                    className="font-mono text-lg h-14 bg-muted/50 border-foreground/10"
                    placeholder="Click Generate to create a password"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-14 w-14 shrink-0 border-foreground/10"
                    onClick={() => handleCopy(password, "password")}
                    disabled={!password}
                    aria-label="Copy password"
                  >
                    {copied === "password" ? (
                      <span className="text-xs font-mono text-green-600">OK</span>
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </Button>
                </div>

                {/* Encrypted output (Lit flow) */}
                {(encryptedBlob || litCiphertext || litDataHash) && (
                  <div className="space-y-4 p-4 rounded-lg border border-foreground/10 bg-muted/30">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                      Encrypted output
                    </p>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-mono text-muted-foreground">Encrypted blob</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            readOnly
                            value={encryptedBlob}
                            className="font-mono text-xs h-10 bg-background border-foreground/10"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 shrink-0"
                            onClick={() => handleCopy(encryptedBlob, "blob")}
                            aria-label="Copy blob"
                          >
                            {copied === "blob" ? <span className="text-xs text-green-600">OK</span> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-mono text-muted-foreground">Lit ciphertext (encrypted key)</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            readOnly
                            value={litCiphertext}
                            className="font-mono text-xs h-10 bg-background border-foreground/10"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 shrink-0"
                            onClick={() => handleCopy(litCiphertext, "litCiphertext")}
                            aria-label="Copy Lit ciphertext"
                          >
                            {copied === "litCiphertext" ? <span className="text-xs text-green-600">OK</span> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-mono text-muted-foreground">dataToEncryptHash</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            readOnly
                            value={litDataHash}
                            className="font-mono text-xs h-10 bg-background border-foreground/10"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 shrink-0"
                            onClick={() => handleCopy(litDataHash, "litHash")}
                            aria-label="Copy data hash"
                          >
                            {copied === "litHash" ? <span className="text-xs text-green-600">OK</span> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Lit releases the key only when access conditions pass (guardian contract threshold met).
                        </p>
                      </div>
                      <div className="flex flex-col gap-3">
                        <Button
                          variant="outline"
                          className="w-full h-11 rounded-full border-foreground/20"
                          onClick={handleDecryptWithLit}
                          disabled={isDecrypting || !litCiphertext || !litDataHash || !evmContractConditions}
                        >
                          {isDecrypting ? "Decrypting via Lit…" : "Test decrypt via Lit"}
                        </Button>
                        {decryptedPassword && (
                          <div className="p-3 rounded-lg border border-foreground/10 bg-background">
                            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
                              Decrypted (demo)
                            </p>
                            <div className="font-mono text-sm break-all">{decryptedPassword}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Length */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-mono">Length</Label>
                    <span className="font-mono text-sm text-muted-foreground">
                      {length[0]} characters
                    </span>
                  </div>
                  <Slider
                    value={length}
                    onValueChange={setLength}
                    min={12}
                    max={32}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Options */}
                <div className="space-y-4">
                  <Label className="text-sm font-mono">Character set</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 p-4 rounded-lg border border-foreground/10 hover:border-foreground/20 transition-colors cursor-pointer">
                      <Checkbox
                        checked={uppercase}
                        onCheckedChange={(v) => setUppercase(!!v)}
                      />
                      <span className="text-sm">Uppercase (A–Z)</span>
                    </label>
                    <label className="flex items-center gap-3 p-4 rounded-lg border border-foreground/10 hover:border-foreground/20 transition-colors cursor-pointer">
                      <Checkbox
                        checked={lowercase}
                        onCheckedChange={(v) => setLowercase(!!v)}
                      />
                      <span className="text-sm">Lowercase (a–z)</span>
                    </label>
                    <label className="flex items-center gap-3 p-4 rounded-lg border border-foreground/10 hover:border-foreground/20 transition-colors cursor-pointer">
                      <Checkbox
                        checked={numbers}
                        onCheckedChange={(v) => setNumbers(!!v)}
                      />
                      <span className="text-sm">Numbers (0–9)</span>
                    </label>
                    <label className="flex items-center gap-3 p-4 rounded-lg border border-foreground/10 hover:border-foreground/20 transition-colors cursor-pointer">
                      <Checkbox
                        checked={symbols}
                        onCheckedChange={(v) => setSymbols(!!v)}
                      />
                      <span className="text-sm">Symbols (!@#$…)</span>
                    </label>
                  </div>
                </div>

                {/* Filecoin Storage Funding */}
                <FundingUI />

                {/* On-chain attestation (registerVault) */}
                <div className="space-y-3 p-4 rounded-lg border border-foreground/10 bg-foreground/[0.01]">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                    On-chain attestation
                  </p>
                  <div className="space-y-2">
                    <Label className="text-xs font-mono text-muted-foreground">Entry label (UID)</Label>
                    <Input
                      value={entryUid}
                      onChange={(e) => setEntryUid(e.target.value)}
                      className="font-mono text-xs h-10 bg-background border-foreground/10"
                      placeholder="e.g. google, facebook, ssh-key"
                    />
                    <p className="text-xs text-muted-foreground">
                      A unique label to identify this password in your vault.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-mono text-muted-foreground">Guardians (comma or newline separated)</Label>
                    <Input
                      value={guardiansInput}
                      onChange={(e) => setGuardiansInput(e.target.value)}
                      className="font-mono text-xs h-10 bg-background border-foreground/10"
                      placeholder="0xabc..., 0xdef..., 0x123..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-mono text-muted-foreground">Threshold</Label>
                    <Input
                      type="number"
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                      className="font-mono text-xs h-10 bg-background border-foreground/10"
                      min={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Example: 3-of-5 guardians must approve for recovery.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full h-11 rounded-full border-foreground/20"
                    onClick={handleRegisterVault}
                    disabled={isRegistering || !encryptedBlob || !entryUid.trim() || !isConnected}
                  >
                    {isRegistering ? statusMsg || "Processing..." : vaultRegistered ? `Entry "${entryUid}" stored ✓` : "Upload to Filecoin & Store Entry"}
                  </Button>
                  {registerTx && (
                    <p className="text-xs text-muted-foreground font-mono break-all text-green-600">
                      success! tx: {registerTx}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Flow: upload encrypted blob to Filecoin Warm Storage via Synapse → register pieces → save piece metadata & guardians on-chain.
                  </p>
                </div>

                {/* Generate CTA */}
                <Button
                  size="lg"
                  className="w-full h-14 text-base rounded-full bg-foreground text-background hover:bg-foreground/90 group"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      Generate password
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
