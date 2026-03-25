import { useEffect, useRef, useCallback } from 'react';
import { refreshTokens, getTokenRefreshInterval } from '../services/api';

/**
 * useTokenRefresh
 * 
 * Proactively refreshes the access token in the background before it expires.
 * This prevents users from being logged out due to token expiration during
 * periods of inactivity (where no API calls would trigger reactive refresh).
 * 
 * The token is refreshed every 13 minutes (2 minutes before the 15-minute expiry).
 * 
 * @param {Object} options
 * @param {Function} options.onRefreshFailed - Callback when refresh fails (user should be logged out)
 * @param {boolean} options.enabled - Whether the hook should be active (typically: isLoggedIn)
 */
export function useTokenRefresh({ onRefreshFailed, enabled = true }) {
  const refreshTimer = useRef(null);
  const isRefreshing = useRef(false);

  const doRefresh = useCallback(async () => {
    // Prevent concurrent refresh attempts
    if (isRefreshing.current) return;
    
    const hasRefreshToken = !!localStorage.getItem('refresh_token');
    if (!hasRefreshToken) return;

    isRefreshing.current = true;
    
    try {
      const success = await refreshTokens();
      if (!success) {
        console.warn('[TokenRefresh] Failed to refresh token');
        onRefreshFailed?.();
      } else {
        console.log('[TokenRefresh] Token refreshed successfully');
      }
    } catch (error) {
      console.error('[TokenRefresh] Error refreshing token:', error);
      onRefreshFailed?.();
    } finally {
      isRefreshing.current = false;
    }
  }, [onRefreshFailed]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
    }
    
    const interval = getTokenRefreshInterval();
    
    // Schedule periodic refresh
    refreshTimer.current = setInterval(() => {
      doRefresh();
    }, interval);
    
    // Also do an immediate refresh if we're close to expiry
    // (e.g., user returns to a tab after being away)
    doRefresh();
  }, [doRefresh]);

  useEffect(() => {
    if (!enabled) {
      // Not logged in - clear any existing timer
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
        refreshTimer.current = null;
      }
      return;
    }

    // Start the refresh schedule
    scheduleRefresh();

    // Handle visibility change - refresh when user returns to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        doRefresh();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
        refreshTimer.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, scheduleRefresh, doRefresh]);

  return { refreshNow: doRefresh };
}

export default useTokenRefresh;
