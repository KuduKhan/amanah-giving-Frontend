"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/use-language";
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export default function Pwa() {
  const [language] = useLanguage();
  const [offline, setOffline] = useState(false);
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    const sync = () => setOffline(!navigator.onLine);
    const prompt = (e: Event) => { e.preventDefault(); setInstall(e as InstallPrompt); };
    const installed = () => setInstall(null);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", installed);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); window.removeEventListener("beforeinstallprompt", prompt); window.removeEventListener("appinstalled", installed); };
  }, []);
  const t = (en: string, sw: string) => language === "sw" ? sw : en;
  if (offline) return <aside className="mvp-device-notice" role="status">{t("You’re offline. Reconnect to refresh records or make a donation.", "Huna mtandao. Unganisha tena kusasisha rekodi au kutoa mchango.")}</aside>;
  if (!install || dismissed) return null;
  return <aside className="mvp-device-notice"><span>{t("Keep Amanah Giving close.", "Weka Amanah Giving karibu.")}</span><button className="text-link" onClick={async () => { try { await install.prompt(); await install.userChoice; } finally { setInstall(null); } }}>{t("Install app", "Sakinisha programu")}</button><button className="text-link" onClick={() => setDismissed(true)}>{t("Not now", "Si sasa")}</button></aside>;
}
