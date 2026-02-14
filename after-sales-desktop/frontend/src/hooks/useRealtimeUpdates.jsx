/**
 * Real-time Updates Hook
 * Connects to Server-Sent Events for live updates across all dashboards
 */
import { useEffect, useRef, useCallback } from 'react';

const API_BASE = 'https://rapide-api.rapideph.workers.dev';

// Track if SSE has been determined to be unavailable (blocked by adblocker, etc.)
let sseUnavailable = false;

/**
 * Hook for subscribing to real-time updates
 * @param {string[]} modules - Array of module names to listen for (e.g., ['job-controller', 'warehouse'])
 * @param {function} onUpdate - Callback function when an update is received
 * @param {object} options - Additional options
 */
export function useRealtimeUpdates(modules = [], onUpdate, options = {}) {
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = options.maxReconnectAttempts ?? 3;
  const reconnectDelay = options.reconnectDelay ?? 3000;

  const connect = useCallback(() => {
    // Skip if SSE is known to be unavailable OR we are offline
    if (sseUnavailable || !navigator.onLine) {
      return;
    }

    // Don't connect if already connected
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    try {
      const eventSource = new EventSource(`${API_BASE}/api/events/stream`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[Realtime] Connected');
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Skip ping messages
          if (data.type === 'ping' || data.type === 'connected') {
            return;
          }

          // Check if this event is for one of our subscribed modules
          if (modules.length === 0 || modules.includes(data.module) || modules.includes('*')) {
            if (onUpdate) {
              onUpdate(data);
            }
          }
        } catch (e) {
          // Silently ignore parse errors
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;

        // Attempt to reconnect (limited attempts)
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = reconnectDelay * reconnectAttempts.current;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          // Mark SSE as unavailable globally to stop all components from trying
          sseUnavailable = true;
          console.log('[Realtime] SSE unavailable, using polling fallback');
          if (options.onMaxReconnectReached) {
            options.onMaxReconnectReached();
          }
        }
      };
    } catch (e) {
      sseUnavailable = true;
    }
  }, [modules, onUpdate, maxReconnectAttempts, reconnectDelay, options]);

  useEffect(() => {
    // Only connect if online
    const handleOnline = () => {
       console.log('[Realtime] Internet restored, reconnecting live updates...');
       connect();
    };
    const handleOffline = () => {
       console.log('[Realtime] Offline mode enabled, pausing live updates.');
       if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
       }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connect if online
    if (navigator.onLine) connect();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  // Return a function to manually reconnect
  return {
    reconnect: connect,
    isConnected: () => eventSourceRef.current?.readyState === EventSource.OPEN,
    isSSEAvailable: () => !sseUnavailable
  };
}

/**
 * Simplified hook that auto-refreshes data when updates are received
 * Falls back to polling if SSE connection fails
 * @param {string[]} modules - Modules to listen for
 * @param {function} refreshFn - Function to call to refresh data
 * @param {number} debounceMs - Debounce time in ms (default: 500)
 * @param {number} pollingIntervalMs - Fallback polling interval if SSE fails (default: 3000)
 */
export function useAutoRefresh(modules, refreshFn, debounceMs = 500, pollingIntervalMs = 3000) {
  const timeoutRef = useRef(null);
  const pollingRef = useRef(null);

  const handleUpdate = useCallback((event) => {
    // Debounce rapid updates
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (refreshFn) {
        refreshFn(event);
      }
    }, debounceMs);
  }, [refreshFn, debounceMs]);

  // Fallback polling when SSE fails
  useEffect(() => {
    // Start fallback polling quickly if SSE is unavailable
    const checkSSE = setTimeout(() => {
      if (sseUnavailable && !pollingRef.current) {
        console.log('[Realtime] Using polling fallback');
        pollingRef.current = setInterval(() => {
          if (refreshFn) {
            refreshFn({ module: 'polling', action: 'refresh' });
          }
        }, pollingIntervalMs);
      }
    }, 2000); // Wait 2 seconds before starting polling

    return () => {
      clearTimeout(checkSSE);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [refreshFn, pollingIntervalMs]);

  const realtime = useRealtimeUpdates(modules, handleUpdate, {
    maxReconnectAttempts: 3
  });

  return realtime;
}

export default useRealtimeUpdates;
