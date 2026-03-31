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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import {
  Copy,
  ArrowRight,
  Shield,
  Hash,
  Shuffle,
  KeyRound,
  Loader2,
  ChevronDown,
  Lock,
  HardDrive,
} from "lucide-react";
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
  const [payloadsOpen, setPayloadsOpen] = useState(false);

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

  const hasEncryptedPayload =
    Boolean(encryptedBlob || litCiphertext || litDataHash);

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

      <div className="relative z-10 w-full px-6 lg:px-10 py-10 lg:py-14">
        <div
          className={cn(
            "mx-auto max-w-6xl transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          {/* Intro — compact */}
          <header className="mb-8 lg:mb-10">
            <span className="inline-flex items-center gap-3 text-xs font-mono text-muted-foreground mb-3">
              <span className="w-6 h-px bg-foreground/30" />
              Create vault entry
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display tracking-tight text-balance">
              Generate locally,{" "}
              <span className="text-muted-foreground">then store.</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
              Entropy and drand on-device first; ciphertext and Filecoin upload follow in order below.
            </p>
          </header>

          {/* Step rail */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-8 text-[11px] sm:text-xs font-mono uppercase tracking-wider text-muted-foreground border-b border-foreground/10 pb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background px-3 py-1 text-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] text-background">
                1
              </span>
              Generate
            </span>
            <ArrowRight className="hidden sm:block w-3 h-3 opacity-40" />
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1",
                hasEncryptedPayload
                  ? "border-foreground/15 bg-background text-foreground"
                  : "border-transparent opacity-70"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                  hasEncryptedPayload
                    ? "bg-foreground text-background"
                    : "bg-foreground/10 text-muted-foreground"
                )}
              >
                2
              </span>
              Encrypted
            </span>
            <ArrowRight className="hidden sm:block w-3 h-3 opacity-40" />
            <span className="inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-1 opacity-70">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/10 text-[10px] text-muted-foreground">
                3
              </span>
              Store
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8 items-start">
            {/* —— Step 1: Generate —— */}
            <Card className="border-foreground/10 shadow-sm overflow-hidden order-1">
              <CardHeader className="space-y-1 pb-4 border-b border-foreground/5 bg-muted/20">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <KeyRound className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] font-mono uppercase tracking-widest">
                    Step 1
                  </span>
                </div>
                <CardTitle className="text-xl font-display">Password generation</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Configure length and character set, then generate. Nothing leaves your browser until you store.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
                    Pipeline
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {pipelineSteps.map((step, index) => (
                      <div key={step.id} className="flex items-center">
                        <div
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition-colors",
                            activeStep === index
                              ? "border-foreground/40 bg-foreground/5"
                              : "border-foreground/10 bg-card"
                          )}
                        >
                          <step.icon className="w-3.5 h-3.5 text-foreground/60 shrink-0" />
                          <span className="font-mono text-[11px] leading-none">{step.label}</span>
                        </div>
                        {index < pipelineSteps.length - 1 && (
                          <ArrowRight className="w-3 h-3 mx-1 text-foreground/15 hidden sm:inline" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <Label className="text-xs font-mono">Length</Label>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {length[0]} chars
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

                <div className="space-y-2">
                  <Label className="text-xs font-mono">Character set</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { checked: uppercase, set: setUppercase, label: "A–Z" },
                      { checked: lowercase, set: setLowercase, label: "a–z" },
                      { checked: numbers, set: setNumbers, label: "0–9" },
                      { checked: symbols, set: setSymbols, label: "Symbols" },
                    ].map((row) => (
                      <label
                        key={row.label}
                        className="flex items-center gap-2 rounded-lg border border-foreground/10 px-2.5 py-2 hover:border-foreground/20 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          checked={row.checked}
                          onCheckedChange={(v) => row.set(!!v)}
                        />
                        <span className="text-xs">{row.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full h-11 sm:h-12 text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 group"
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
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>

                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-mono text-muted-foreground">Output</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={password}
                      className="font-mono text-sm h-11 bg-muted/40 border-foreground/10"
                      placeholder="Generated password appears here"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-11 w-11 shrink-0 border-foreground/10"
                      onClick={() => handleCopy(password, "password")}
                      disabled={!password}
                      aria-label="Copy password"
                    >
                      {copied === "password" ? (
                        <span className="text-[10px] font-mono text-green-600">OK</span>
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-snug">
                  <span className="font-mono text-foreground/70">Drand:</span> uses latest and previous beacon rounds for verifiable randomness.
                </p>
              </CardContent>
            </Card>

            {/* —— Column 2: Steps 2 & 3 —— */}
            <div className="flex flex-col gap-6 order-2">
              <Card className="border-foreground/10 shadow-sm overflow-hidden">
                <CardHeader className="space-y-1 pb-3 border-b border-foreground/5 bg-muted/20">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span className="text-[11px] font-mono uppercase tracking-widest">
                      Step 2
                    </span>
                  </div>
                  <CardTitle className="text-xl font-display">Encrypted payload</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Lit-wrapped key material after generation. Expand to copy full values.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {!hasEncryptedPayload ? (
                    <div className="rounded-xl border border-dashed border-foreground/15 bg-muted/20 px-4 py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        Run <span className="font-mono text-foreground/80">Generate password</span>{" "}
                        to produce the blob and Lit fields.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded-lg border border-foreground/10 bg-background px-3 py-2">
                          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                            Blob
                          </p>
                          <p className="font-mono text-[11px] truncate mt-0.5" title={encryptedBlob}>
                            {encryptedBlob ? `${encryptedBlob.slice(0, 18)}…` : "—"}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 mt-1 px-0 text-xs text-foreground/70"
                            onClick={() => handleCopy(encryptedBlob, "blob")}
                            disabled={!encryptedBlob}
                          >
                            Copy
                          </Button>
                        </div>
                        <div className="rounded-lg border border-foreground/10 bg-background px-3 py-2">
                          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                            Lit ciphertext
                          </p>
                          <p className="font-mono text-[11px] truncate mt-0.5" title={litCiphertext}>
                            {litCiphertext ? `${litCiphertext.slice(0, 18)}…` : "—"}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 mt-1 px-0 text-xs text-foreground/70"
                            onClick={() => handleCopy(litCiphertext, "litCiphertext")}
                            disabled={!litCiphertext}
                          >
                            Copy
                          </Button>
                        </div>
                        <div className="rounded-lg border border-foreground/10 bg-background px-3 py-2 sm:col-span-1">
                          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                            Hash
                          </p>
                          <p className="font-mono text-[11px] truncate mt-0.5" title={litDataHash}>
                            {litDataHash ? `${litDataHash.slice(0, 18)}…` : "—"}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 mt-1 px-0 text-xs text-foreground/70"
                            onClick={() => handleCopy(litDataHash, "litHash")}
                            disabled={!litDataHash}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>

                      <Collapsible open={payloadsOpen} onOpenChange={setPayloadsOpen}>
                        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-foreground/10 bg-muted/30 px-3 py-2 text-left text-xs font-mono text-muted-foreground hover:bg-muted/50 transition-colors">
                          <span>Full payloads &amp; demo decrypt</span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 transition-transform duration-200",
                              payloadsOpen && "rotate-180"
                            )}
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 pt-3 overflow-hidden">
                          {[
                            { label: "Encrypted blob", value: encryptedBlob, id: "blob" as const },
                            { label: "Lit ciphertext", value: litCiphertext, id: "litCiphertext" as const },
                            { label: "dataToEncryptHash", value: litDataHash, id: "litHash" as const },
                          ].map((row) => (
                            <div key={row.id}>
                              <Label className="text-[10px] font-mono text-muted-foreground">{row.label}</Label>
                              <div className="flex gap-1.5 mt-1">
                                <Input
                                  readOnly
                                  value={row.value}
                                  className="font-mono text-[11px] h-9 bg-background border-foreground/10"
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => handleCopy(row.value, row.id)}
                                  aria-label={`Copy ${row.label}`}
                                >
                                  {copied === row.id ? (
                                    <span className="text-[10px] text-green-600">OK</span>
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                          <p className="text-[11px] text-muted-foreground">
                            Lit releases the DEK when guardian contract conditions are satisfied.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full h-9 rounded-full border-foreground/20 text-xs"
                            onClick={handleDecryptWithLit}
                            disabled={isDecrypting || !litCiphertext || !litDataHash || !evmContractConditions}
                          >
                            {isDecrypting ? "Decrypting via Lit…" : "Test decrypt via Lit"}
                          </Button>
                          {decryptedPassword && (
                            <div className="rounded-lg border border-foreground/10 bg-background p-3">
                              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                                Decrypted (demo)
                              </p>
                              <p className="font-mono text-xs break-all">{decryptedPassword}</p>
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-foreground/10 shadow-sm overflow-hidden">
                <CardHeader className="space-y-1 pb-3 border-b border-foreground/5 bg-muted/20">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <HardDrive className="w-4 h-4 shrink-0" />
                    <span className="text-[11px] font-mono uppercase tracking-widest">
                      Step 3
                    </span>
                  </div>
                  <CardTitle className="text-xl font-display">Store &amp; attest</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Fund storage, then upload the encrypted blob and record metadata on-chain.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-5">
                  <FundingUI compact />

                  <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4 space-y-4">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                      On-chain attestation
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-[10px] font-mono text-muted-foreground">Entry label (UID)</Label>
                        <Input
                          value={entryUid}
                          onChange={(e) => setEntryUid(e.target.value)}
                          className="font-mono text-xs h-9 bg-background border-foreground/10"
                          placeholder="e.g. google, ssh-key"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-[10px] font-mono text-muted-foreground">Guardian addresses</Label>
                        <Textarea
                          value={guardiansInput}
                          onChange={(e) => setGuardiansInput(e.target.value)}
                          className="font-mono text-xs min-h-[72px] resize-y bg-background border-foreground/10"
                          placeholder="0x…, one per line or comma-separated"
                          rows={3}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-mono text-muted-foreground">Threshold</Label>
                        <Input
                          type="number"
                          value={threshold}
                          onChange={(e) => setThreshold(Number(e.target.value))}
                          className="font-mono text-xs h-9 bg-background border-foreground/10"
                          min={1}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      className="w-full h-11 rounded-full bg-foreground text-background text-sm hover:bg-foreground/90"
                      onClick={handleRegisterVault}
                      disabled={isRegistering || !encryptedBlob || !entryUid.trim() || !isConnected}
                    >
                      {isRegistering
                        ? statusMsg || "Processing…"
                        : vaultRegistered
                          ? `Stored “${entryUid}” ✓`
                          : "Upload to Filecoin & store entry"}
                    </Button>
                    {registerTx && (
                      <p className="text-[11px] font-mono text-green-600 break-all">{registerTx}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Synapse upload → piece metadata + Lit fields written with your vault contract.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
