"use client";

import { useEffect } from "react";

const ENABLED_KEY = "voicetasker:location-triggers-enabled";

export function useContextLocation(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !navigator.geolocation || localStorage.getItem(ENABLED_KEY) !== "true") return;
    let lastSent = 0;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (Date.now() - lastSent < 5 * 60 * 1000) return;
        lastSent = Date.now();
        void fetch("/api/context/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: Number(position.coords.latitude.toFixed(4)), longitude: Number(position.coords.longitude.toFixed(4)) }),
        }).catch(() => undefined);
      },
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);
}

export const contextLocationStorageKey = ENABLED_KEY;
