"use client";

import axios from "axios";

const SESSION_KEY = "client_info";

// ─── Collectors ───────────────────────────────────────────────────────────────

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("SamsungBrowser")) return "Samsung Browser";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  return "Unknown";
}

function getDevice(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Linux/.test(ua)) return "Linux PC";
  return "Unknown";
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android.*Mobile|iPhone/.test(ua)) return "mobile";
  if (/Tablet|iPad/.test(ua)) return "tablet";
  return "desktop";
}

function getGpuRenderer(): string | null {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return null;
    const ext = (gl as WebGLRenderingContext).getExtension(
      "WEBGL_debug_renderer_info",
    );
    if (!ext) return null;
    return (gl as WebGLRenderingContext).getParameter(
      ext.UNMASKED_RENDERER_WEBGL,
    );
  } catch {
    return null;
  }
}

async function getBatteryInfo(): Promise<{
  level: string | null;
  charging: string | null;
}> {
  try {
    const nav = navigator as any;
    if (!nav.getBattery) return { level: null, charging: null };
    const battery = await nav.getBattery();
    return {
      level: `${Math.round(battery.level * 100)}%`,
      charging: String(battery.charging),
    };
  } catch {
    return { level: null, charging: null };
  }
}

async function getMediaDevices(): Promise<{
  cameras: string;
  microphones: string;
}> {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return { cameras: "0", microphones: "0" };
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((d) => d.kind === "videoinput").length;
    const microphones = devices.filter((d) => d.kind === "audioinput").length;
    return { cameras: String(cameras), microphones: String(microphones) };
  } catch {
    return { cameras: "0", microphones: "0" };
  }
}

function getGeolocation(): Promise<{
  latitude: string | null;
  longitude: string | null;
}> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: null, longitude: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: String(pos.coords.latitude),
          longitude: String(pos.coords.longitude),
        }),
      () => resolve({ latitude: null, longitude: null }),
      { timeout: 5000, maximumAge: 300000 },
    );
  });
}

async function getIpInfo(): Promise<{
  publicIp: string | null;
  isp: string | null;
  asn: string | null;
  city: string | null;
  country: string | null;
  ip: string | null;
  latitude: string | null;
  longitude: string | null;
}> {
  const endpoints = [
    { url: "https://ipinfo.io/json", name: "ipinfo.io" },
    { url: "https://ipwhois.app/json/", name: "ipwhois.app" },
    { url: "https://ipapi.co/json/", name: "ipapi.co" },
    { url: "http://ip-api.com/json/", name: "ip-api.com" },
  ];

  for (const endpoint of endpoints) {
    try {
      const { data } = await axios.get(endpoint.url, { timeout: 3000 });
      console.log(`IP data from ${endpoint.name}:`, data);

      if (endpoint.name === "ipinfo.io") {
        if (!data.ip) continue;
        const [lat, lon] = (data.loc || "").split(",");
        return {
          publicIp: data.ip || null,
          isp: data.org || null,
          asn: data.org ? data.org.split(" ")[0] : null,
          city: data.city || null,
          country: data.country || null,
          ip: data.ip || null,
          latitude: lat || null,
          longitude: lon || null,
        };
      }

      if (endpoint.name === "ipwhois.app") {
        if (data.success === false) continue;
        return {
          publicIp: data.ip || null,
          isp: data.isp || data.org || null,
          asn: data.asn || null,
          city: data.city || null,
          country: data.country_code || data.country || null,
          ip: data.ip || null,
          latitude: data.latitude ? String(data.latitude) : null,
          longitude: data.longitude ? String(data.longitude) : null,
        };
      }

      if (endpoint.name === "ipapi.co") {
        if (data.error) continue;
        return {
          publicIp: data.ip || null,
          isp: data.org || null,
          asn: data.asn || null,
          city: data.city || null,
          country: data.country || data.country_name || null,
          ip: data.ip || null,
          latitude: data.latitude ? String(data.latitude) : null,
          longitude: data.longitude ? String(data.longitude) : null,
        };
      }

      if (endpoint.name === "ip-api.com") {
        if (data.status !== "success") continue;
        return {
          publicIp: data.query || null,
          isp: data.isp || data.org || null,
          asn: data.as ? data.as.split(" ")[0] : null,
          city: data.city || null,
          country: data.countryCode || data.country || null,
          ip: data.query || null,
          latitude: data.lat ? String(data.lat) : null,
          longitude: data.lon ? String(data.lon) : null,
        };
      }
    } catch (e) {
      console.warn(`Failed to fetch from ${endpoint.name}`);
    }
  }

  return {
    publicIp: null,
    isp: null,
    asn: null,
    city: null,
    country: null,
    ip: null,
    latitude: null,
    longitude: null,
  };
}

function detectPossibleIoT(): boolean {
  const cores = navigator.hardwareConcurrency || 0;
  const nav = navigator as any;
  const mem = nav.deviceMemory || 0;
  return cores <= 2 && mem <= 1 && getDeviceType() !== "desktop";
}

// ─── Collect all client info ──────────────────────────────────────────────────

async function collectClientInfo(): Promise<Record<string, any>> {
  const [geo, ipInfo, battery, media] = await Promise.all([
    getGeolocation(),
    getIpInfo(),
    getBatteryInfo(),
    getMediaDevices(),
  ]);

  const nav = navigator as any;

  return {
    latitude: geo.latitude || ipInfo.latitude,
    longitude: geo.longitude || ipInfo.longitude,
    ip: ipInfo.ip,
    browser: getBrowser(),
    device: getDevice(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookiesEnabled: navigator.cookieEnabled,
    javascriptEnabled: true,
    touchSupport: "ontouchstart" in window || navigator.maxTouchPoints > 0,
    deviceType: getDeviceType(),
    cpuCores: navigator.hardwareConcurrency || null,
    memory: nav.deviceMemory ? `${nav.deviceMemory} GB` : null,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    batteryLevel: battery.level,
    isCharging: battery.charging,
    gpuRenderer: getGpuRenderer(),
    cameras: media.cameras,
    microphones: media.microphones,
    publicIp: ipInfo.publicIp,
    isp: ipInfo.isp,
    asn: ipInfo.asn,
    city: ipInfo.city,
    country: ipInfo.country,
    possibleIoT: detectPossibleIoT(),
  };
}

// ─── Session-cached getter (single fetch per browser session) ─────────────────

let fetchPromise: Promise<Record<string, any>> | null = null;

export function getClientInfo(): Promise<Record<string, any>> {
  // Return from sessionStorage if already fetched this session AND has valid data
  try {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      // Only use cache if it has valid IP and Country data
      if (data.publicIp && data.country) {
        console.log("Using cached client info", data);
        return Promise.resolve(data);
      }
      console.warn("Cached client info incomplete, re-fetching...");
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {}

  // Single in-flight promise — no duplicate fetches
  if (!fetchPromise) {
    fetchPromise = collectClientInfo()
      .then((info) => {
        try {
          // Only cache if the critical data was fetched successfully
          if (info.publicIp && info.country) {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(info));
          }
        } catch {}
        return info;
      })
      .catch(() => ({}));
  }

  return fetchPromise;
}

// Auto-fetch on page load so it's ready before first API call
if (typeof window !== "undefined") {
  getClientInfo();
}
