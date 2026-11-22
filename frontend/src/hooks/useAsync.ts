import { useEffect, useState } from "react";

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Runs `fetcher` whenever `deps` change. Pass null to wait (for example until a date
 * range is known). Older responses that arrive late are ignored.
 */
export function useAsync<T>(fetcher: (() => Promise<T>) | null, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true });

  useEffect(() => {
    if (!fetcher) {
      setState({ data: null, error: null, loading: true });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setState({ data: null, error: e instanceof Error ? e.message : "Something went wrong", loading: false });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
