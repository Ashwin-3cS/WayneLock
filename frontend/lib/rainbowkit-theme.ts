import type { Theme } from "@rainbow-me/rainbowkit";
import { lightTheme } from "@rainbow-me/rainbowkit";

const base = lightTheme({
  accentColor: "var(--foreground)",
  accentColorForeground: "var(--background)",
  borderRadius: "large",
  fontStack: "system",
});

/** Matches landing primary CTA: foreground fill, background text, Instrument Sans via --font-sans */
export const waynelockRainbowKitTheme: Theme = {
  ...base,
  colors: {
    ...base.colors,
    connectButtonBackground: "var(--foreground)",
    connectButtonText: "var(--background)",
    connectButtonInnerBackground: "var(--foreground)",
  },
  fonts: {
    ...base.fonts,
    body: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
  },
  shadows: {
    ...base.shadows,
    connectButton: "none",
  },
};
