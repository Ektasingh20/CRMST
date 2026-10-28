import { useEffect, useRef, useState } from "react";

export const HR_PAGE_LOADING_MS = 300;

/** Title shown in the top bar for a page. */
export const getPageTitle = (page) => (page === "Dashboard" ? "HR Dashboard" : page);

/** A loader only makes sense when the page actually changes. */
export const shouldShowLoader = (prev, next) => prev !== next;

/** Returns true for `ms` milliseconds after `page` changes (not on first render). */
export function usePageLoading(page, ms = HR_PAGE_LOADING_MS) {
  const [loading, setLoading] = useState(false);
  const prev = useRef(page);

  useEffect(() => {
    if (!shouldShowLoader(prev.current, page)) return undefined;
    prev.current = page;
    setLoading(true);
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [page, ms]);

  return loading;
}
