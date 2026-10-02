import { useCallback, useEffect, useRef, useState } from 'react';

export type RequestState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

export type UseRequestResult<T> = RequestState<T> & {
  run: () => Promise<T | null>;
  reset: () => void;
};

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function useRequest<T>(
  request: () => Promise<T>,
  options: { immediate?: boolean } = {},
): UseRequestResult<T> {
  const immediate = options.immediate ?? true;
  const requestRef = useRef(request);

  const [state, setState] = useState<RequestState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  useEffect(() => {
    if (!immediate) {
      return;
    }
    let cancelled = false;
    requestRef
      .current()
      .then((data) => {
        if (!cancelled) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ data: null, loading: false, error: toError(error) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [immediate]);

  const run = useCallback(async (): Promise<T | null> => {
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const data = await requestRef.current();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      setState({ data: null, loading: false, error: toError(error) });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, run, reset };
}
