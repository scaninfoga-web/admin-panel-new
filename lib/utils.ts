import axios from "axios";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function isValidIndianMobileNumber(input: string): {
  result: boolean;
  fixedNumber: string;
} {
  const mobileRegex = /^(?:\+91[\-\s]?)?[5-9]\d{9}$/;
  input = input
    .normalize('NFKD')
    .replace(/[\u200B-\u200D\uFEFF\u202C\u202D\u202E]/g, '')
    .trim();
  input = input.replace(/\s/g, '');
  if (input.length === 12) {
    input = input.slice(2, 13);
  }
  if (input.length === 13) {
    input = input.slice(3, 14);
  }
  const isValid = mobileRegex.test(input);

  return {
    result: isValid,
    fixedNumber: input,
  };
}


export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);
};


export const formatISOtoDDMMYYYY = (isoString: string | null): string => {
  if(!isoString) return '---';
  const date = new Date(isoString);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};


export const getClientInfoUtil = async () => {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  const language = navigator.language;
  const cookiesEnabled = navigator.cookieEnabled;
  const touchSupport = 'ontouchstart' in window;
  const deviceType = /Mobi|Android/i.test(userAgent) ? 'Mobile' : 'Desktop';
  const cpuCores = typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : null;
  const memory = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : null;
  const screenSize = `${window.screen.width}x${window.screen.height}`;

  let browser = 'Unknown';
  if (/Chrome/.test(userAgent)) browser = 'Chrome';
  else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) browser = 'Safari';
  else if (/Firefox/.test(userAgent)) browser = 'Firefox';
  else if (/Edg/.test(userAgent)) browser = 'Edge';

  let device = 'Unknown';
  if (/iPhone/.test(userAgent)) device = 'iPhone';
  else if (/iPad/.test(userAgent)) device = 'iPad';
  else if (/Android/.test(userAgent)) {
    const match = userAgent.match(/\((.*?)\)/);
    device = match?.[1] || 'Android';
  } else if (/Macintosh/.test(userAgent)) device = 'Mac';
  else if (/Windows/.test(userAgent)) device = 'Windows PC';

  let batteryLevel = 'Not supported';
  let isCharging = 'Not supported';
  try {
    const batteryManager = await (navigator as any).getBattery?.();
    if (batteryManager) {
      batteryLevel = `${(batteryManager.level * 100).toFixed(0)}%`;
      isCharging = batteryManager.charging;
    }
  } catch {}

  let gpuRenderer = 'Blocked or Not Available';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      gpuRenderer = debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        : 'Unknown';
    }
  } catch {}

  let cameras = 'Not Allowed';
  let microphones = 'Not Allowed';
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    cameras = devices.filter((d) => d.kind === 'videoinput').length.toString();
    microphones = devices.filter((d) => d.kind === 'audioinput').length.toString();
  } catch {}

  // 🌐 Fetch IP and ISP via local proxy to avoid CORS
  let publicIp = 'Unavailable';
  let latitude = 'Unavailable';
  let longitude = 'Unavailable';
  let isp = 'Unavailable';
  let asn = 'Unavailable';
  let city = 'Unavailable';
  let country = 'Unavailable';
  let ip = 'Unavailable';
  try {
    const {data: ipInfo} = await axios.get('/api/ipinfo');
    publicIp = ipInfo.ip || publicIp;
    isp = ipInfo.org || isp;
    asn = ipInfo.asn || asn;
    city = ipInfo.city || city;
    country = ipInfo.country_name || country;
    longitude= ipInfo.longitude;
    latitude= ipInfo.latitude;
    ip= ipInfo.ip;
  } catch (err) {
    console.warn("Failed to fetch public IP info:", err);
  }

  const iotKeywords = ['ESP', 'Arduino', 'Raspberry', 'MicroPython', 'IoT'];
  const isIoT =
    iotKeywords.some((k) => userAgent.includes(k)) ||
    (userAgent.length < 50 && /Linux/.test(userAgent));
  const possibleIoT = isIoT;

  return {
    latitude,
    longitude,
    browser,
    device,
    userAgent,
    platform,
    language,
    cookiesEnabled,
    javascriptEnabled: true,
    touchSupport,
    deviceType,
    cpuCores,
    memory,
    screenSize,
    batteryLevel,
    isCharging,
    gpuRenderer,
    cameras,
    microphones,
    publicIp,
    isp,
    ip,
    asn,
    city,
    country,
    possibleIoT,
  };
};