import { useLayoutEffect } from "react";

/**
 * Permanently forces the page into Light Mode by synchronously stripping
 * the `dark` class from the root HTML element before the browser's first paint.
 * Restores the previous dark/system class on component unmount.
 * 
 * Use this hook in any page where dark mode should never appear (landing page, auth pages, etc.)
 */
export function useForceLightMode() {
    useLayoutEffect(() => {
        const root = window.document.documentElement;

        // Capture existing theme state before we override
        const wasDark = root.classList.contains("dark");

        // Synchronously strip dark and force light before first browser paint
        root.classList.remove("dark");
        root.classList.add("light");

        return () => {
            // On unmount, restore whatever the ThemeProvider had set
            root.classList.remove("light");
            if (wasDark) {
                root.classList.add("dark");
            }
        };
    }, []);
}
