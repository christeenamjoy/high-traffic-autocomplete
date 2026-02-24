# high-traffic-autocomplete
High-traffic Autocomplete (React + TS) implementing:

 1) Debounce + AbortController cancellation
 2) In-flight de-dupe + "latest only" guard
 3) LRU cache + TTL + normalized keys + SWR (serve cache then revalidate)
 4) Min query + IME composition guard
 5) Render perf: memo rows + (optional) react-window virtualization
 6) Prefetch popular queries on idle + graceful UX
