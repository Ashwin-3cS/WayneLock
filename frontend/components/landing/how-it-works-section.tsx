"use client";

import { useEffect, useRef, useState } from "react";
import { Shield, Cloud, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    number: "I",
    title: "Generate & encrypt",
    description:
      "Combine device entropy, your secret, and drand randomness. Passwords are generated and hardened in a multi-layer crypto pipeline.",
  },
  {
    number: "II",
    title: "Store on IPFS & Filecoin",
    description:
      "The encrypted vault is stored on IPFS and persisted through Filecoin. No central server ever holds your plaintext.",
  },
  {
    number: "III",
    title: "Recover with guardians",
    description:
      "Access is controlled by Lit Protocol. Recovery uses guardian approvals tracked on FVM smart contracts.",
  },
];

function StepVisual({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="relative min-h-[280px] w-full flex items-center justify-center p-8 overflow-hidden">
      {/* Step I — layered shield + orbit */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-6 transition-all duration-700 ease-out",
          stepIndex === 0 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        <div className="relative flex h-52 w-52 items-center justify-center">
          <span className="hiw-orbit absolute inset-2 rounded-full border border-background/20" />
          <span className="hiw-orbit-reverse absolute inset-6 rounded-full border border-background/15" />
          <span className="hiw-ring-pulse absolute inset-10 rounded-full border border-background/20 bg-background/5" />
          <Shield
            className="relative z-10 h-20 w-20 text-background/95"
            strokeWidth={1.15}
            aria-hidden
          />
        </div>
        <p className="text-center text-xs font-mono text-background/45">
          Entropy · drand · secret
        </p>
      </div>

      {/* Step II — floating storage layers */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-8 transition-all duration-700 ease-out",
          stepIndex === 1 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <Cloud
            className="hiw-float-a h-16 w-16 text-background/85"
            strokeWidth={1.1}
            aria-hidden
          />
          <div className="hiw-float-b flex flex-col items-center gap-2">
            {[72, 88, 104].map((w, i) => (
              <div
                key={w}
                className="hiw-layer-bar h-2.5 rounded-full bg-background/25"
                style={{ width: w, animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
        </div>
        <p className="text-center text-xs font-mono text-background/45">
          IPFS · Filecoin · durable
        </p>
      </div>

      {/* Step III — keys + guardian nodes */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-8 transition-all duration-700 ease-out",
          stepIndex === 2 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        <div className="flex items-center gap-6">
          <KeyRound
            className="hiw-key h-16 w-16 shrink-0 text-background/90"
            strokeWidth={1.1}
            aria-hidden
          />
          <div className="flex flex-col gap-3">
            <span className="hiw-dash h-px w-12 bg-gradient-to-r from-background/50 to-transparent" />
            <div className="flex gap-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="hiw-node flex h-9 w-9 items-center justify-center rounded-full border border-background/25 bg-background/10 text-[10px] font-mono text-background/50"
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  G{i + 1}
                </span>
              ))}
            </div>
            <span className="hiw-dash h-px w-12 bg-gradient-to-r from-transparent to-background/50" />
          </div>
        </div>
        <p className="text-center text-xs font-mono text-background/45">
          Lit · FVM · threshold
        </p>
      </div>
    </div>
  );
}

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-foreground text-background overflow-hidden"
    >
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 40px,
            currentColor 40px,
            currentColor 41px
          )`,
          }}
        />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="mb-16 lg:mb-24">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-background/50 mb-6">
            <span className="w-8 h-px bg-background/30" />
            How it works
          </span>
          <h2
            className={`text-4xl lg:text-6xl font-display tracking-tight transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            From vault to recovery.
            <br />
            <span className="text-background/50">No central trust.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          <div className="space-y-0">
            {steps.map((step, index) => (
              <button
                key={step.number}
                type="button"
                onClick={() => setActiveStep(index)}
                className={`w-full text-left py-8 border-b border-background/10 transition-all duration-500 group ${
                  activeStep === index ? "opacity-100" : "opacity-40 hover:opacity-70"
                }`}
              >
                <div className="flex items-start gap-6">
                  <span className="font-display text-3xl text-background/30">{step.number}</span>
                  <div className="flex-1">
                    <h3 className="text-2xl lg:text-3xl font-display mb-3 group-hover:translate-x-2 transition-transform duration-300">
                      {step.title}
                    </h3>
                    <p className="text-background/60 leading-relaxed">{step.description}</p>

                    {activeStep === index && (
                      <div className="mt-4 h-px bg-background/20 overflow-hidden">
                        <div
                          className="h-full bg-background w-0 hiw-progress"
                          key={activeStep}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="lg:sticky lg:top-32 self-start">
            <div className="border border-background/10 overflow-hidden bg-background/[0.04]">
              <div className="px-6 py-4 border-b border-background/10 flex items-center justify-between">
                <div className="flex gap-2" aria-hidden>
                  <div className="w-3 h-3 rounded-full bg-background/20" />
                  <div className="w-3 h-3 rounded-full bg-background/20" />
                  <div className="w-3 h-3 rounded-full bg-background/20" />
                </div>
                <span className="text-xs font-mono text-background/40">Live pipeline</span>
              </div>

              <StepVisual stepIndex={activeStep} />

              <div className="px-6 py-4 border-t border-background/10 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-mono text-background/40">Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes hiw-progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        .hiw-progress {
          animation: hiw-progress 5s linear forwards;
        }
        @keyframes hiw-spin {
          to {
            transform: rotate(360deg);
          }
        }
        .hiw-orbit {
          animation: hiw-spin 14s linear infinite;
        }
        .hiw-orbit-reverse {
          animation: hiw-spin 22s linear infinite reverse;
        }
        @keyframes hiw-ring-glow {
          0%,
          100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.03);
          }
        }
        .hiw-ring-pulse {
          animation: hiw-ring-glow 3s ease-in-out infinite;
        }
        @keyframes hiw-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        .hiw-float-a {
          animation: hiw-float 3s ease-in-out infinite;
        }
        .hiw-layer-bar {
          animation: hiw-float 2.5s ease-in-out infinite;
        }
        @keyframes hiw-pulse-line {
          0%,
          100% {
            opacity: 0.35;
          }
          50% {
            opacity: 1;
          }
        }
        .hiw-dash {
          animation: hiw-pulse-line 2s ease-in-out infinite;
        }
        @keyframes hiw-node-pop {
          0%,
          100% {
            transform: scale(1);
            border-color: rgba(255, 255, 255, 0.2);
          }
          50% {
            transform: scale(1.06);
            border-color: rgba(74, 222, 128, 0.5);
          }
        }
        .hiw-node {
          animation: hiw-node-pop 2.4s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
