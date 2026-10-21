import { useCallback, useEffect, useState } from "react";

// Run an async loader on mount and whenever deps change; expose a reload().
export function useAsync(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  const reload = useCallback(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    run()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState({ data: null, error, loading: false }));
    return () => {
      cancelled = true;
    };
  }, [run]);

  useEffect(reload, [reload]);

  return { ...state, reload, setData: (fn) => setState((s) => ({ ...s, data: fn(s.data) })) };
}
