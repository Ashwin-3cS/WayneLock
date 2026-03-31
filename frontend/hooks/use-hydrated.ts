"use client";

import { useEffect, useState } from "react";

/** True only after mount — use to avoid SSR/client mismatch when branching on wallet or browser-only state. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
