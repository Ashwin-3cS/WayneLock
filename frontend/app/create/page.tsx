"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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

const pipelineSteps = [
  { id: "entropy", label: "Device entropy", icon: Shield },
  { id: "hash", label: "Hashing", icon: Hash },
  { id: "drand", label: "drand randomness", icon: Shuffle },
  { id: "password", label: "Password", icon: KeyRound },
];

export default function CreatePage() {
  const [password, setPassword] = useState("");
  const [length, setLength] = useState([20]);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleCopy = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setPassword("");
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
    } catch (err) {
      console.error("Password generation failed:", err);
      setPassword("");
    } finally {
      setActiveStep(null);
      setIsGenerating(false);
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

      {/* Header */}
      <header className="relative z-20 border-b border-foreground/10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-xl tracking-tight text-foreground hover:opacity-80 transition-opacity"
          >
            WayneLock
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to home
            </Link>
            <Button asChild size="sm" className="rounded-full bg-foreground text-background hover:bg-foreground/90">
              <Link href="/">Create vault</Link>
            </Button>
          </div>
        </div>
      </header>

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
                    onClick={handleCopy}
                    disabled={!password}
                    aria-label="Copy password"
                  >
                    {copied ? (
                      <span className="text-xs font-mono text-green-600">OK</span>
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </Button>
                </div>

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
