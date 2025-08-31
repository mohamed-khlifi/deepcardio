'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

interface SWRProviderProps {
  children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Global configuration
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        errorRetryCount: 2,
        errorRetryInterval: 1000,
        
        // Cache management
        dedupingInterval: 10000, // 10 seconds
        focusThrottleInterval: 5000, // 5 seconds
        
        // Performance optimizations
        loadingTimeout: 3000,
        
        // Global error handler
        onError: (error) => {
          console.error('SWR Error:', error);
          // Don't throw on the frontend, just log
        },
        
        // Retry configuration for failed requests
        shouldRetryOnError: (error) => {
          // Only retry on network errors, not on 4xx or 5xx HTTP errors
          return !error.message.includes('HTTP');
        },
        
        // Global success handler for debugging
        onSuccess: (data, key) => {
          // console.log('SWR Cache hit:', key, data);
        }
      }}
    >
      {children}
    </SWRConfig>
  );
}
