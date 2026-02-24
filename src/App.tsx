import React, {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./App.css";
import { fakeSuggestApi, type Suggestion } from "./fakeAPi";
import { LruTtlCache } from "./cache";
import { useDebouncedCallback } from "./useDebouncedCallback";
import { Row } from "./components/components/Row";

function normalizeKey(q: string) {
  return q.trim().toLowerCase();
}


export default function App() {
  const MIN_LEN = 2;

  // Cache: LRU 200 items, TTL 60s
  const cache = useMemo(() => new LruTtlCache<Suggestion[]>(200, 60_000), []);

  // In-flight de-dupe map: key -> Promise
  const inflightRef = useRef(new Map<string, Promise<Suggestion[]>>());

  // Abort + latest-only guard
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  // IME composition guard
  const isComposingRef = useRef(false);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(true);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyResults = useCallback((next: Suggestion[]) => {
    startTransition(() => setItems(next));
  }, []);

  const runQuery = useCallback(
    async (raw: string) => {
      const key = normalizeKey(raw);

      // minimum query rule
      if (key.length < MIN_LEN) {
        abortRef.current?.abort();
        setLoading(false);
        setError(null);
        applyResults([]);
        return;
      }

      // SWR: serve cache immediately if present
      const cached = cache.get(key);
      if (cached) {
        setError(null);
        applyResults(cached);
        // continue to revalidate in background
      }

      // abort previous (prevents stale overwrite)
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // latest-only guard
      const mySeq = ++seqRef.current;

      setLoading(true);
      setError(null);

      try {
        // de-dupe: reuse in-flight promise for same query
        const existing = inflightRef.current.get(key);
        const p =
          existing ??
          (async () => {
            const data = await fakeSuggestApi(key, controller.signal);
            return data;
          })();

        if (!existing) inflightRef.current.set(key, p);

        const data = await p;
        inflightRef.current.delete(key);

        // ignore abort/stale
        if (controller.signal.aborted) return;
        if (mySeq !== seqRef.current) return;

        cache.set(key, data, 60_000);
        applyResults(data);
      } catch (e: any) {
        inflightRef.current.delete(key);
        if (controller.signal.aborted) return;
        if (mySeq !== seqRef.current) return;

        setError(e?.name === "AbortError" ? null : e?.message ?? "Error");
        // do NOT clear items aggressively to avoid flicker
      } finally {
        if (!controller.signal.aborted && mySeq === seqRef.current) {
          setLoading(false);
        }
      }
    },
    [MIN_LEN, cache, applyResults]
  );

  const { debounced, cancel } = useDebouncedCallback(runQuery, 250);

  useEffect(() => {
    if (!open) return;
    if (isComposingRef.current) return;
    debounced(q);
  }, [q, open, debounced]);

  // Prefetch popular queries on idle
  useEffect(() => {
    const popular = ["iphone", "airpods", "macbook"];
    const idle =
      "requestIdleCallback" in window
        ? (window as any).requestIdleCallback
        : (fn: Function) => setTimeout(fn as any, 500);

    const cancelIdle =
      "cancelIdleCallback" in window
        ? (window as any).cancelIdleCallback
        : (id: number) => clearTimeout(id);

    const id = idle(async () => {
      for (const p of popular) {
        const key = normalizeKey(p);
        if (cache.hasFresh(key)) continue;
        if (inflightRef.current.has(key)) continue;

        const controller = new AbortController();
        const promise = fakeSuggestApi(key, controller.signal);
        inflightRef.current.set(key, promise);

        try {
          const data = await promise;
          cache.set(key, data, 120_000);
        } catch {
          // ignore
        } finally {
          inflightRef.current.delete(key);
        }
      }
    });

    return () => cancelIdle(id);
  }, [cache]);

  const onPick = useCallback((s: Suggestion) => {
    setQ(s.label);
    setOpen(false);
  }, []);

  return (
    <div className="page">
      <div className="card">
        <h2 className="title">Autocomplete</h2>

        <label className="label">Search products</label>
        <input
          value={q}
          className="input"
          placeholder="Type e.g. iphone, airpods, mac..."
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setTimeout(() => setOpen(false), 120);
          }}
          onCompositionStart={() => {
            isComposingRef.current = true;
            cancel();
          }}
          onCompositionEnd={(e) => {
            isComposingRef.current = false;
            setQ((e.target as HTMLInputElement).value);
          }}
          aria-autocomplete="list"
          aria-expanded={open}
        />

        {open && (
          <div className="dropdown">
            <div className="meta">
              <span>{loading ? "Loading…" : "\u00A0"}</span>
              {error ? <span className="error">{error}</span> : null}
              <span className="hint">
                (debounce + abort + dedupe + cache + latest-only)
              </span>
            </div>

            {items.length === 0 && !loading && !error ? (
              <div className="empty">No results</div>
            ) : (
              <ul className="list" role="listbox">
                {items.map((it) => (
                  <Row key={it.id} item={it} onPick={onPick} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}