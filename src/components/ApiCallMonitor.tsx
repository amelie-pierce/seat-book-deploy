// Debug component to monitor API calls
'use client';

import { useState, useEffect } from 'react';

interface ApiCall {
  timestamp: number;
  url: string;
  method: string;
}

let apiCallLog: ApiCall[] = [];

// Override fetch to log API calls
const originalFetch = window.fetch;
if (typeof window !== 'undefined' && !window.fetch.toString().includes('API_MONITOR')) {
  const enhancedFetch = function(this: typeof window, ...args: Parameters<typeof fetch>) {
    const url = args[0] as string;
    const options = args[1] as RequestInit;
    
    // Only log our API calls
    if (url.includes('/api/')) {
      const call: ApiCall = {
        timestamp: Date.now(),
        url: url.replace(window.location.origin, ''),
        method: options?.method || 'GET'
      };
      
      apiCallLog.push(call);
      
      // Keep only last 10 calls
      if (apiCallLog.length > 10) {
        apiCallLog = apiCallLog.slice(-10);
      }
      
      console.log(`🌐 API Call: ${call.method} ${call.url}`);
    }
    
    return originalFetch.apply(this, args);
  } as typeof originalFetch & { API_MONITOR: boolean };
  
  enhancedFetch.API_MONITOR = true;
  window.fetch = enhancedFetch;
}

export default function ApiCallMonitor() {
  const [calls, setCalls] = useState<ApiCall[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCalls([...apiCallLog]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <div 
        style={{
          position: 'fixed',
          top: 10,
          right: 10,
          zIndex: 9999,
          backgroundColor: '#333',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '5px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
        onClick={() => setIsVisible(true)}
      >
        📊 API Monitor ({calls.length})
      </div>
    );
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        zIndex: 9999,
        backgroundColor: '#333',
        color: 'white',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '11px',
        maxWidth: '300px',
        maxHeight: '400px',
        overflow: 'auto'
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '10px',
        borderBottom: '1px solid #555',
        paddingBottom: '5px'
      }}>
        <span>📊 API Calls ({calls.length})</span>
        <button 
          onClick={() => setIsVisible(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ×
        </button>
      </div>
      
      {calls.length === 0 ? (
        <div>No API calls detected</div>
      ) : (
        calls.slice(-5).map((call, index) => {
          const timeAgo = Math.round((Date.now() - call.timestamp) / 1000);
          return (
            <div key={index} style={{ 
              marginBottom: '5px',
              padding: '3px 5px',
              backgroundColor: '#444',
              borderRadius: '3px'
            }}>
              <div style={{ fontWeight: 'bold' }}>
                {call.method} {call.url}
              </div>
              <div style={{ opacity: 0.7, fontSize: '10px' }}>
                {timeAgo}s ago
              </div>
            </div>
          );
        })
      )}
      
      <button 
        onClick={() => { apiCallLog = []; setCalls([]); }}
        style={{
          marginTop: '10px',
          padding: '5px 10px',
          backgroundColor: '#666',
          border: 'none',
          color: 'white',
          borderRadius: '3px',
          cursor: 'pointer',
          fontSize: '11px'
        }}
      >
        Clear Log
      </button>
    </div>
  );
}