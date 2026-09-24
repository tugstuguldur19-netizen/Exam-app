import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { describeError } from "../api/client";

// Loads data for a screen and silently refreshes it whenever the screen
// regains focus (e.g. coming back from a finished test).
export function useLoad<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const loadedOnce = useRef(false);

  const load = useCallback(async (mode: "initial" | "refresh" | "silent") => {
    if (mode === "refresh") setRefreshing(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
    } catch (err) {
      // Keep showing stale data on a failed background refresh.
      if (mode !== "silent" || !loadedOnce.current) setError(describeError(err));
    } finally {
      loadedOnce.current = true;
      if (mode === "refresh") setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    setData(null);
    setError(null);
    loadedOnce.current = false;
    load("initial");
  }, [load]);

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      load("silent");
    }, [load])
  );

  return {
    data,
    error,
    loading: data === null && error === null,
    refreshing,
    refresh: () => load("refresh"),
    retry: () => {
      setError(null);
      load("initial");
    },
    setData,
  };
}
