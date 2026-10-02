'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Keeps open pages from showing stale data.
 *
 * Pages load once when they open. This bumps a counter (put it in the page's
 * load effect's dependencies) when:
 *  - you come back to the tab after it was hidden for a while, or
 *  - something was saved in another ERP tab (announced over BroadcastChannel).
 *
 * It never refreshes while a dialog is open or a field has focus — the refresh
 * waits until you're done, so nothing you are editing gets reset.
 */

const CHANNEL = 'shuroq-erp-data';
const AWAY_MS = 30_000; // hidden at least this long before a return counts as "stale"

let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL);
  return channel;
}

/** Tell other open ERP tabs that data changed. Called by the API layer after every successful save. */
export function announceDataChange() {
  try {
    getChannel()?.postMessage({ at: Date.now() });
  } catch {
    // older browsers / private mode — other tabs simply refresh on return instead
  }
}

function busy(): boolean {
  if (document.querySelector('[aria-modal="true"]')) return true;
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export function useRefreshTick(): number {
  const [tick, setTick] = useState(0);
  const hiddenAt = useRef<number | null>(null);
  const pending = useRef(false);

  useEffect(() => {
    let retry: ReturnType<typeof setInterval> | null = null;

    const run = () => {
      if (document.visibilityState !== 'visible') { pending.current = true; return; }
      if (busy()) {
        pending.current = true;
        if (!retry) retry = setInterval(() => { if (!busy()) run(); }, 3000);
        return;
      }
      pending.current = false;
      if (retry) { clearInterval(retry); retry = null; }
      setTick((t) => t + 1);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') { hiddenAt.current = Date.now(); return; }
      const away = hiddenAt.current !== null && Date.now() - hiddenAt.current >= AWAY_MS;
      hiddenAt.current = null;
      if (away || pending.current) run();
    };

    const ch = getChannel();
    const onMessage = () => run();
    document.addEventListener('visibilitychange', onVisibility);
    ch?.addEventListener('message', onMessage);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      ch?.removeEventListener('message', onMessage);
      if (retry) clearInterval(retry);
    };
  }, []);

  return tick;
}
