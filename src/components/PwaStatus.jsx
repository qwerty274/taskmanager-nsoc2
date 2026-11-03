import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

// How often an open tab asks the server whether a new version has been deployed.
const UPDATE_CHECK_MS = 60 * 60 * 1000;
// "Ready to work offline" goes away on its own after this long.
const OFFLINE_READY_MS = 6000;

export default function PwaStatus() {
  const online = useOnlineStatus();
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => {
        if (registration.installing || !navigator.onLine) return;
        registration.update().catch(() => {});
      }, UPDATE_CHECK_MS);
    },
    onRegisterError(error) {
      console.error('Service worker registration failed:', error);
    }
  });

  useEffect(() => {
    if (!offlineReady) return undefined;
    const timer = setTimeout(() => setOfflineReady(false), OFFLINE_READY_MS);
    return () => clearTimeout(timer);
  }, [offlineReady, setOfflineReady]);

  return (
    <div className="pwa-status" role="status" aria-live="polite">
      {!online && (
        <div className="pwa-toast pwa-toast-offline" id="pwa-offline">
          You are offline. Your tasks are saved on this device.
        </div>
      )}
      {offlineReady && !needRefresh && (
        <div className="pwa-toast" id="pwa-offline-ready">
          <span>Ready to work offline.</span>
          <button type="button" className="pwa-toast-btn" onClick={() => setOfflineReady(false)}>
            Dismiss
          </button>
        </div>
      )}
      {needRefresh && (
        <div className="pwa-toast" id="pwa-update">
          <span>A new version is available.</span>
          <button
            type="button"
            className="pwa-toast-btn pwa-toast-btn-primary"
            onClick={() => updateServiceWorker(true)}
          >
            Reload
          </button>
          <button type="button" className="pwa-toast-btn" onClick={() => setNeedRefresh(false)}>
            Later
          </button>
        </div>
      )}
    </div>
  );
}
