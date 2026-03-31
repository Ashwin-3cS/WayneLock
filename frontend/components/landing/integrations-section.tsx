"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const integrations = [
  { name: "IPFS", category: "Storage", logo: "/integrations/ipfs.svg" },
  { name: "Filecoin", category: "Persistence", logo: "/integrations/filecoin.svg" },
  { name: "drand", category: "Randomness", logo: "/drand-logo.png" },
  { name: "Lit Protocol", category: "Keys", logo: "/png_thumbnail.webp" },
  { name: "FVM", category: "Smart contracts", logo: "/integrations/fvm.svg" },
  { name: "WalletConnect", category: "Wallets", logo: "/integrations/walletconnect.svg" },
  { name: "MetaMask", category: "Wallets", logo: "/integrations/metamask.svg" },
  { name: "Brave", category: "Browser", logo: "/integrations/brave.svg" },
  { name: "Chrome", category: "Browser", logo: "/integrations/googlechrome.svg" },
  { name: "Firefox", category: "Browser", logo: "/integrations/firefox.svg" },
  { name: "Ledger", category: "Hardware", logo: "/integrations/ledger.svg" },
  { name: "Web3Auth", category: "Auth", logo: "/integrations/web3auth.png" },
] as const;

function IntegrationTile({
  item,
  className,
}: {
  item: (typeof integrations)[number];
  className?: string;
}) {
  const wideLogo = item.name === "Ledger";

  return (
    <div
      className={cn(
        "shrink-0 flex items-center gap-4 pl-4 pr-6 py-4 min-w-[240px] sm:min-w-[260px]",
        "rounded-2xl border border-foreground/10 bg-background/40 backdrop-blur-sm",
        "hover:border-foreground/25 hover:bg-foreground/[0.03] transition-all duration-300 group",
        className
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.04]",
          "overflow-hidden p-2",
          wideLogo ? "h-14 w-[4.5rem]" : "h-14 w-14"
        )}
      >
        <Image
          src={item.logo}
          alt={item.name}
          width={wideLogo ? 72 : 48}
          height={48}
          className={cn(
            "object-contain object-center",
            wideLogo ? "max-h-8 w-auto max-w-[4rem]" : "h-9 w-auto max-w-[2.75rem]"
          )}
        />
      </div>
      <div className="min-w-0 text-left">
        <div className="text-base font-medium tracking-tight group-hover:translate-x-0.5 transition-transform">
          {item.name}
        </div>
        <div className="text-sm text-muted-foreground">{item.category}</div>
      </div>
    </div>
  );
}

export function IntegrationsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

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

  return (
    <section id="integrations" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div
          className={`text-center max-w-3xl mx-auto mb-16 lg:mb-24 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-foreground/30" />
            Integrations
            <span className="w-8 h-px bg-foreground/30" />
          </span>
          <h2 className="text-4xl lg:text-6xl font-display tracking-tight mb-6">
            Fits your stack.
            <br />
            Keeps you in control.
          </h2>
          <p className="text-xl text-muted-foreground">
            Wallets, browsers, and the decentralized stack. Your vault works where you do.
          </p>
        </div>
      </div>

      <div className="w-full mb-6">
        <div className="flex gap-5 marquee py-1">
          {[...Array(2)].map((_, setIndex) => (
            <div key={setIndex} className="flex gap-5 shrink-0 items-stretch">
              {integrations.map((integration) => (
                <IntegrationTile
                  key={`${integration.name}-${setIndex}`}
                  item={integration}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full">
        <div className="flex gap-5 marquee-reverse py-1">
          {[...Array(2)].map((_, setIndex) => (
            <div key={setIndex} className="flex gap-5 shrink-0 items-stretch">
              {[...integrations].reverse().map((integration) => (
                <IntegrationTile
                  key={`${integration.name}-reverse-${setIndex}`}
                  item={integration}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
