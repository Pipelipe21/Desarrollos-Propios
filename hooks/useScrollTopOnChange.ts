import { useEffect } from 'react';

/**
 * Resets the window scroll position to the top whenever `key` changes.
 *
 * Internal "screens" (POS, Inventario, Taller, etc.) are all conditionally
 * rendered within the same page rather than being real route changes, so the
 * browser never resets scroll on its own. Without this, scrolling down in a
 * tall view (e.g. editing a product) and then switching to a shorter view
 * (e.g. back to the menu) leaves the page scrolled past the new content,
 * showing blank space with the header pushed out of view.
 */
export const useScrollTopOnChange = (key: unknown) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);
};
