import {
  useEffect,
  useState,
} from "react";

export function useSidebarStorage<T>(
  key: string,
  initial: T
) {
  // IMPORTANT:
  // Server and client's first render must use
  // exactly the same initial value.
  const [value, setValue] =
    useState<T>(initial);

  const [hydrated, setHydrated] =
    useState(false);

  // Read persisted value only AFTER hydration.
  useEffect(() => {
    try {
      const raw =
        window.localStorage.getItem(key);

      if (raw !== null) {
        setValue(JSON.parse(raw) as T);
      }
    } catch {
      // Ignore invalid/missing storage.
    } finally {
      setHydrated(true);
    }
  }, [key]);

  // Persist changes only after we've read storage.
  //
  // This guard is important:
  // without it, the initial server-safe value
  // could overwrite the real stored value.
  useEffect(() => {
    if (!hydrated) return;

    try {
      window.localStorage.setItem(
        key,
        JSON.stringify(value)
      );
    } catch {
      // Ignore storage errors.
    }
  }, [key, value, hydrated]);

  return [value, setValue] as const;
}