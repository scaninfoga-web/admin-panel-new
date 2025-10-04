'use client';

import axios, { type AxiosRequestConfig, type Method } from 'axios';
import { store } from '@/redux/store';

// Function to dynamically get base URL from localStorage
const getBaseUrl = () => {
  // return 'http://localhost:8000'
  return process.env.NEXT_PUBLIC_BACKEND_URL;
};

const axiosInstance = axios.create({
  timeout: 100000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to get current auth token from Redux
const getAuthToken = () => {
  return store.getState().user.token || null;
};

// Function to get client info from Redux
export const getClientInfo = () => {
  const state = store.getState();
  return state.info || {};
};

// Main API call
export const apiCall = async <T = any>(
  method: Method,
  endpoint: string,
  payload: any = null,
  additionalConfig: AxiosRequestConfig = {}
): Promise<T> => {
  try {
    const token = getAuthToken();
    const clientInfo = getClientInfo();

    const headers: Record<string, any> = {
      ...additionalConfig.headers,
      clientInfo: JSON.stringify(clientInfo),
    };

    if(!endpoint.includes("verifyOTP") ||
      !endpoint.includes("resendOTP") || 
      !endpoint.includes("login") || 
      !endpoint.includes("register") || 
      !endpoint.includes("forget-password")
    ){
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      }
      

    const config: AxiosRequestConfig = {
      baseURL: getBaseUrl(), // 🔥 dynamic baseURL here
      method,
      url: endpoint,
      ...additionalConfig,
      headers,
    };

    if (
      payload !== null &&
      ['post', 'put', 'patch'].includes(method.toLowerCase())
    ) {
      config.data = payload;
    }

    if (payload !== null && method.toLowerCase() === 'get') {
      config.params = payload;
    }

    const response = await axiosInstance(config);
    return response.data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Shorthand wrappers
export const get = <T = any>(endpoint: string, params = null, config = {}) =>
  apiCall<T>('get', endpoint, params, config);

export const post = <T = any>(endpoint: string, data = {}, config = {}) =>
  apiCall<T>('post', endpoint, data, config);

export const put = <T = any>(endpoint: string, data = null, config = {}) =>
  apiCall<T>('put', endpoint, data, config);

export const patch = <T = any>(endpoint: string, data = null, config = {}) =>
  apiCall<T>('patch', endpoint, data, config);

export const del = <T = any>(endpoint: string, config = {}) =>
  apiCall<T>('delete', endpoint, null, config);

export default axiosInstance;
