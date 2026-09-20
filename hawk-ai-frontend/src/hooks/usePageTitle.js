import { useEffect } from 'react';

/** Sets the browser tab title, e.g. "Market · Hawk AI". */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Hawk AI` : 'Hawk AI';
  }, [title]);
}
