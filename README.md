# high-traffic-autocomplete
High-traffic Autocomplete (React + TS) implementing:

 1) Debounce + AbortController cancellation
 2) In-flight de-dupe + "latest only" guard
 3) LRU cache + TTL + normalized keys + SWR (serve cache then revalidate)
 4) Min query + IME composition guard
 5) Render perf: memo rows + (optional) react-window virtualization
 6) Prefetch popular queries on idle + graceful UX


1) Component API (props)

“I expose an API that separates input value control, fetching, rendering, and selection.”

value: string (controlled input)

onChange(value: string)

onSelect(item)

fetcher(query, { signal }) => Promise<Item[]> (injectable data layer)

minChars = 2

debounceMs = 250

getItemKey(item), getItemLabel(item) (stable keys + label)

renderItem(item, { isActive }) (custom UI)

cacheTtlMs = 60000, cacheSize = 100

emptyState, errorState, loadingState (optional render hooks)

Accessibility:

ariaLabel, id

initialHighlightedIndex = -1

2) Internal data flow / state machine

“Internally I treat it like a small state machine: idle → typing → loading → success | empty | error.”

State:

query

status: "idle" | "loading" | "success" | "empty" | "error"

items: Item[]

highlightedIndex

isOpen

error

Events:

INPUT_CHANGED

REQUEST_START

REQUEST_SUCCESS

REQUEST_EMPTY

REQUEST_ERROR

SELECT

CLOSE

Keyboard support:

ArrowUp/Down changes highlightedIndex

Enter selects highlighted

Escape closes

Home/End optional

Keep aria-activedescendant and role="listbox" with role="option" items

3) Cancellation + caching + de-dupe (key senior part)

“For correctness and performance, I combine AbortController, request de-dupe, and an LRU cache with TTL.”

On each query change:

Normalize key: key = query.trim().toLowerCase()

If key.length < minChars → close list, reset to idle

If cache hit (not expired) → show cached items immediately (fast UX)

Start a new request with AbortController

Abort previous controller (prevents stale overwrites + saves bandwidth)

Add a requestId guard:

only the latest request can update state (extra safety)

Request de-dupe:

if same key already in flight, reuse the same promise

On success:

update cache + state

On abort:

ignore result, don’t flip to error

Optional UX polish:

“stale-while-revalidate”: show cached results instantly while fetching fresh results in background

Use startTransition/useDeferredValue for smooth typing if rendering is heavy
