"use client";

import axios, { type AxiosRequestConfig, type Method } from "axios";
import { getCookie } from "cookies-next";
import { getClientInfo } from "@/lib/header";

const getBaseUrl = () => {
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.backend.scaninfoga.com"
  );
};

const axiosInstance = axios.create({
  timeout: 100000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Read token from session cookie
const getAuthToken = (): string | null => {
  const raw = getCookie("accessToken");
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : null;
  } catch {
    return typeof raw === "string" ? raw : null;
  }
};

// ─── Main API call ────────────────────────────────────────────────────────────

export const apiCall = async <T = any>(
  method: Method,
  endpoint: string,
  payload: any = null,
  additionalConfig: AxiosRequestConfig = {},
): Promise<T> => {
  try {
    const token = getAuthToken();
    const clientInfo = await getClientInfo();

    const headers: Record<string, any> = {
      ...additionalConfig.headers,
      clientInfo: JSON.stringify(clientInfo),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config: AxiosRequestConfig = {
      baseURL: getBaseUrl(),
      method,
      url: endpoint,
      ...additionalConfig,
      headers,
    };

    if (
      payload !== null &&
      ["post", "put", "patch", "delete"].includes(method.toLowerCase())
    ) {
      config.data = payload;
    }

    if (payload !== null && method.toLowerCase() === "get") {
      config.params = payload;
    }

    const response = await axiosInstance(config);
    return response.data;
  } catch (error) {
    console.error("API call failed:", error);
    throw error;
  }
};

// Shorthand wrappers
export const get = <T = any>(endpoint: string, params = null, config = {}) =>
  apiCall<T>("get", endpoint, params, config);

export const post = <T = any>(endpoint: string, data = {}, config = {}) =>
  apiCall<T>("post", endpoint, data, config);

export const put = <T = any>(endpoint: string, data = null, config = {}) =>
  apiCall<T>("put", endpoint, data, config);

export const patch = <T = any>(endpoint: string, data = null, config = {}) =>
  apiCall<T>("patch", endpoint, data, config);

export const del = <T = any>(endpoint: string, data = {}, config = {}) =>
  apiCall<T>("delete", endpoint, data, config);

// File upload with progress tracking
export const postWithProgress = async <T = any>(
  endpoint: string,
  data: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> => {
  const token = getAuthToken();

  const response = await axiosInstance.post(endpoint, data, {
    baseURL: getBaseUrl(),
    headers: {
      "Content-Type": "multipart/form-data",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        onProgress(percent);
      }
    },
  });

  return response.data;
};

export default axiosInstance;
