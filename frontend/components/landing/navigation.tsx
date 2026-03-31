"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const connectOutlineClass =
  "rounded-full border-foreground/20 bg-background font-sans font-medium shadow-xs hover:bg-foreground/5 hover:text-foreground";

function LandingNavConnect({
  className,
  onOpenWallet,
}: {
  className?: string;
  onOpenWallet?: () => void;
}) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const base = cn("border", connectOutlineClass, className);

        if (!mounted) {
          return (
            <Button variant="outline" type="button" className={base} disabled aria-hidden>
              Connect wallet
            </Button>
          );
        }

        if (!account) {
          return (
            <Button
              type="button"
              variant="outline"
              className={base}
              onClick={() => {
                onOpenWallet?.();
                openConnectModal();
              }}
            >
              Connect wallet
            </Button>
          );
        }

        if (chain?.unsupported) {
          return (
            <Button
              type="button"
              variant="outline"
              className={base}
              onClick={() => {
                onOpenWallet?.();
                openChainModal();
              }}
            >
              Wrong network
            </Button>
          );
        }

        return (
          <Button
            type="button"
            variant="outline"
            className={cn(base, "gap-2 max-w-[200px]")}
            onClick={() => {
              onOpenWallet?.();
              openAccountModal();
            }}
          >
            {chain?.hasIcon && chain.iconUrl ? (
              <span
                className="size-4 shrink-0 rounded-full overflow-hidden"
                style={{ background: chain.iconBackground }}
              >
                <img alt="" src={chain.iconUrl} width={16} height={16} className="size-4" />
              </span>
            ) : null}
            <span className="truncate tabular-nums">{account.displayName}</span>
          </Button>
        );
      }}
    </ConnectButton.Custom>
  );
}

const navLinks = [
  { name: "Features", href: "#features" },
  { name: "How it works", href: "#how-it-works" },
  { name: "Developers", href: "#developers" },
  { name: "Pricing", href: "#pricing" },
];

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed z-50 transition-all duration-500 ${
        isScrolled 
          ? "top-4 left-4 right-4" 
          : "top-0 left-0 right-0"
      }`}
    >
      <nav 
        className={`mx-auto transition-all duration-500 ${
          isScrolled || isMobileMenuOpen
            ? "bg-background/80 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-lg max-w-[1200px]"
            : "bg-transparent max-w-[1400px]"
        }`}
      >
        <div 
          className={`flex items-center justify-between transition-all duration-500 px-6 lg:px-8 ${
            isScrolled ? "h-14" : "h-20"
          }`}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className={`font-display tracking-tight transition-all duration-500 ${isScrolled ? "text-xl" : "text-2xl"}`}>WayneLock</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-12">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm text-foreground/70 hover:text-foreground transition-colors duration-300 relative group"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-foreground transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <LandingNavConnect
              className={cn(
                "transition-all duration-500",
                isScrolled ? "h-8 px-4 text-xs" : "h-10 px-6 text-sm"
              )}
            />
            <Button
              asChild
              size="sm"
              className={cn(
                "rounded-full bg-foreground font-sans font-medium text-background hover:bg-foreground/90 transition-all duration-500",
                isScrolled ? "h-8 px-4 text-xs" : "h-10 px-6 text-sm"
              )}
            >
              <Link href="/create">Create vault</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

      </nav>
      
      {/* Mobile Menu - Full Screen Overlay */}
      <div
        className={`md:hidden fixed inset-0 bg-background z-40 transition-all duration-500 ${
          isMobileMenuOpen 
            ? "opacity-100 pointer-events-auto" 
            : "opacity-0 pointer-events-none"
        }`}
        style={{ top: 0 }}
      >
        <div className="flex flex-col h-full px-8 pt-28 pb-8">
          {/* Navigation Links */}
          <div className="flex-1 flex flex-col justify-center gap-8">
            {navLinks.map((link, i) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-5xl font-display text-foreground hover:text-muted-foreground transition-all duration-500 ${
                  isMobileMenuOpen 
                    ? "opacity-100 translate-y-0" 
                    : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: isMobileMenuOpen ? `${i * 75}ms` : "0ms" }}
              >
                {link.name}
              </a>
            ))}
          </div>
          
          {/* Bottom CTAs */}
          <div className={`flex gap-4 pt-8 border-t border-foreground/10 transition-all duration-500 ${
            isMobileMenuOpen 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: isMobileMenuOpen ? "300ms" : "0ms" }}
          >
            <div className="flex-1 min-w-0">
              <LandingNavConnect
                className="w-full h-14 text-base rounded-full"
                onOpenWallet={() => setIsMobileMenuOpen(false)}
              />
            </div>
            <Button 
              asChild
              className="flex-1 bg-foreground text-background rounded-full h-14 text-base"
            >
              <Link href="/create" onClick={() => setIsMobileMenuOpen(false)}>Create vault</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
