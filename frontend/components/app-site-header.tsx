"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const navLinkClass =
  "text-sm text-foreground/70 hover:text-foreground transition-colors duration-300 whitespace-nowrap relative group";

export type AppSiteHeaderLink = { href: string; label: string };

export function AppSiteHeader({ links }: { links: AppSiteHeaderLink[] }) {
  return (
    <header className="relative z-20 border-b border-foreground/10 bg-background/80 backdrop-blur-xl font-sans">
      <div className="mx-auto flex h-20 max-w-[1400px] items-center gap-6 px-6 lg:gap-10 lg:px-8">
        <Link
          href="/"
          className="font-display text-2xl tracking-tight text-foreground shrink-0 transition-opacity hover:opacity-80"
        >
          WayneLock
        </Link>

        <nav
          className="flex min-w-0 flex-1 items-center justify-end gap-6 overflow-x-auto py-1 lg:gap-10 xl:gap-12 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Site"
        >
          {links.map((link) => (
            <Link key={`${link.href}-${link.label}`} href={link.href} className={navLinkClass}>
              {link.label}
              <span className="pointer-events-none absolute -bottom-1 left-0 h-px w-0 bg-foreground transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="shrink-0 pl-1 lg:pl-2">
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
        </div>
      </div>
    </header>
  );
}
