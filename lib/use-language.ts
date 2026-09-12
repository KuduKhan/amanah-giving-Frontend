"use client";
import { useSyncExternalStore } from "react";
import type { Language } from "./domain";
const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("amanah-language", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("amanah-language", callback);
  };
};
const snapshot = (): Language => {
  try {
    return localStorage.getItem("amanah-language") === "sw" ? "sw" : "en";
  } catch {
    return "en";
  }
};
export function useLanguage() {
  const language = useSyncExternalStore(
    subscribe,
    snapshot,
    (): Language => "en",
  );
  const setLanguage = (value: Language) => {
    try {
      localStorage.setItem("amanah-language", value);
    } catch {
      /* Private browsing can disable storage. */
    }
    window.dispatchEvent(new Event("amanah-language"));
  };
  return [language, setLanguage] as const;
}
