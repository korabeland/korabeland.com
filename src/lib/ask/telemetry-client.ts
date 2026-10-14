// Browser side of the daily counters. Fire and forget: every failure is
// swallowed, so a dead counter can never affect search. Sends only the event
// name; no question text, no identifier.

import { COUNTER_ENDPOINT, type CounterEvent } from "./counters";

export const OPEN_COUNTED_KEY = "korab-ask-open-counted";

type SendFetch = (
  input: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    keepalive: boolean;
  },
) => Promise<unknown>;

export function sendEvent(event: CounterEvent, send: SendFetch): void {
  try {
    void Promise.resolve(
      send(COUNTER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
        keepalive: true,
      }),
    ).catch(() => {});
  } catch {
    // Counting is best effort.
  }
}

/** Counts a panel open once per browser session. Without usable storage it
 *  counts every open rather than guessing. */
export function countOpenOnce(
  storage: Pick<Storage, "getItem" | "setItem"> | null,
  send: SendFetch,
): void {
  try {
    if (storage?.getItem(OPEN_COUNTED_KEY)) return;
    storage?.setItem(OPEN_COUNTED_KEY, "1");
  } catch {
    // Fall through and count.
  }
  sendEvent("open", send);
}
