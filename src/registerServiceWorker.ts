/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let deferredInstallPrompt: any = null;
const installListeners = new Set<() => void>();

/**
 * Registers the Service Worker and sets up PWA install event listeners
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;

  // Capture native browser install prompt event
  window.addEventListener("beforeinstallprompt", (e: any) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    console.log("[PWA] Captured beforeinstallprompt event!");
    installListeners.forEach((listener) => listener());
  });

  // Listen for appinstalled event
  window.addEventListener("appinstalled", () => {
    console.log("[PWA] DevVault successfully installed as a PWA app!");
    deferredInstallPrompt = null;
    installListeners.forEach((listener) => listener());
  });

  // Register Service Worker in supporting environments
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] ServiceWorker registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] ServiceWorker registration failed:", err);
        });
    });
  }
}

/**
 * Returns true if PWA installation is supported and ready to be triggered
 */
export function canInstallPWA(): boolean {
  return deferredInstallPrompt !== null;
}

/**
 * Returns true if currently running inside standalone PWA window
 */
export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

/**
 * Triggers native OS install prompt dialog
 */
export async function promptPWAInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) return false;

  deferredInstallPrompt.prompt();
  const choiceResult = await deferredInstallPrompt.userChoice;

  if (choiceResult.outcome === "accepted") {
    console.log("[PWA] User accepted the PWA installation prompt.");
    deferredInstallPrompt = null;
    installListeners.forEach((listener) => listener());
    return true;
  } else {
    console.log("[PWA] User dismissed the PWA installation prompt.");
    return false;
  }
}

/**
 * Subscribe to PWA installability changes
 */
export function subscribePWAInstall(callback: () => void): () => void {
  installListeners.add(callback);
  return () => {
    installListeners.delete(callback);
  };
}
