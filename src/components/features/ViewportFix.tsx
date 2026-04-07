"use client";

import { useEffect } from "react";

/**
 * Resets any residual visual viewport offset when the keyboard dismisses.
 * iOS can set visualViewport.offsetLeft/offsetTop when the keyboard is shown,
 * and sometimes doesn't reset them on dismiss. This is the belt-and-suspenders
 * companion to interactiveWidget="overlays-content".
 */
export function ViewportFix() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function reset() {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }

    // Reset when a form element loses focus (keyboard about to hide)
    function onFocusOut() {
      requestAnimationFrame(reset);
    }

    // Also reset whenever the visual viewport scrolls (catches mid-session drift)
    vv.addEventListener("scroll", reset);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      vv.removeEventListener("scroll", reset);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return null;
}
