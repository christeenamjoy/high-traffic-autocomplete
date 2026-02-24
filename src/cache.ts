export class LruTtlCache<V> {
    private map = new Map<string, { value: V; expiresAt: number }>();
  
    constructor(private maxSize: number, private defaultTtlMs: number) {}
  
    get(key: string): V | undefined {
      const entry = this.map.get(key);
      if (!entry) return undefined;
  
      if (Date.now() > entry.expiresAt) {
        this.map.delete(key);
        return undefined;
      }
  
      // refresh LRU order
      this.map.delete(key);
      this.map.set(key, entry);
      return entry.value;
    }
  
    set(key: string, value: V, ttlMs?: number) {
      const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
      if (this.map.has(key)) this.map.delete(key);
      this.map.set(key, { value, expiresAt });
  
      while (this.map.size > this.maxSize) {
        const oldestKey = this.map.keys().next().value as string | undefined;
        if (!oldestKey) break;
        this.map.delete(oldestKey);
      }
    }
  
    hasFresh(key: string) {
      return this.get(key) !== undefined;
    }
  }