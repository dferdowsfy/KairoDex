// MV3 service worker: session bridging and alarms
import { getSession, hasConfig } from '../supabaseClient';

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('agenthub-sync-ping', { periodInMinutes: 60 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'agenthub-sync-ping') {
    // no-op: could be used to refresh session or clean cache
  }
});

chrome.runtime.onMessage.addListener((_msg, _sender, _sendResponse) => {
  // reserved for future background tasks
  return false;
});

// Only touch Supabase if config exists.
void (async () => {
  if (await hasConfig()) {
    try { await getSession(); } catch { /* no-op */ }
  }
})();


