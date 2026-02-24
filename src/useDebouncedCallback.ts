import { useCallback, useEffect, useRef } from "react";

export function useDebouncedCallback<T extends any[]>(
  cb: (...args: T) => void,
  delayMs: number
) {
  const cbRef = useRef(cb);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    cbRef.current = cb;
  }, [cb]);

  const debounced = useCallback(
    (...args: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => cbRef.current(...args), delayMs);
    },
    [delayMs]
  );

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  return { debounced, cancel };
}