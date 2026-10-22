import { useState, useEffect } from 'react';
import axios from 'axios';
import { useVisiblePoll } from './useVisiblePoll';

export const MESSAGES_READ_EVENT = 'vfrb:messages-read';
// Messages pages fire this after opening a thread so the nav badge refetches at once.
export const announceMessagesRead = () => window.dispatchEvent(new Event(MESSAGES_READ_EVENT));

// Total unread messages for the nav badge, from the side-aware /messages/unread-count endpoint.
export function useUnreadMessages(url, enabled = true) {
  const [count, setCount] = useState(0);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick(t => t + 1);
    window.addEventListener(MESSAGES_READ_EVENT, on);
    return () => window.removeEventListener(MESSAGES_READ_EVENT, on);
  }, []);
  useVisiblePoll(async () => {
    if (!enabled) return;
    const r = await axios.get(url);
    setCount(Number(r.data?.unread_count) || 0);
  }, 60_000, [url, enabled, tick]);
  return enabled ? count : 0;
}
