export type Suggestion = { id: string; label: string };

const ALL_ITEMS: Suggestion[] = [
  { id: "1", label: "iPhone 15" },
  { id: "2", label: "iPhone 14" },
  { id: "3", label: "AirPods Pro" },
  { id: "4", label: "AirPods Max" },
  { id: "5", label: "MacBook Air" },
  { id: "6", label: "MacBook Pro" },
  { id: "7", label: "iPad Pro" },
  { id: "8", label: "iPad Air" },
  { id: "9", label: "Apple Watch Ultra" },
  { id: "10", label: "Apple Watch Series 9" },
  { id: "11", label: "Magic Keyboard" },
  { id: "12", label: "MagSafe Charger" },
  { id: "13", label: "HomePod" },
  { id: "14", label: "Apple TV 4K" },
  { id: "15", label: "iMac" },
];

// Simulate network latency + occasional failures (toggle if you want)
const FAIL_RATE = 0.08; // 8%
const MIN_DELAY = 250;
const MAX_DELAY = 900;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fakeSuggestApi(
  query: string,
  signal?: AbortSignal
): Promise<Suggestion[]> {
  const q = query.trim().toLowerCase();
  const delay = MIN_DELAY + Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY));

  // abort support
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const abortPromise = new Promise<never>((_, reject) => {
    signal?.addEventListener(
      "abort",
      () => reject(new DOMException("Aborted", "AbortError")),
      { once: true }
    );
  });

  await Promise.race([sleep(delay), abortPromise]);

  if (Math.random() < FAIL_RATE) throw new Error("Random network failure");

  if (q.length === 0) return [];

  // naive "search"
  const filtered = ALL_ITEMS.filter((it) => it.label.toLowerCase().includes(q));
  return filtered.slice(0, 20);
}