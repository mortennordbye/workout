"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  blur?: boolean;
};

const SHEET_TRANSITION = {
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

export function BottomSheet({ open, onClose, children, blur = false }: Props) {
  const [kbHeight, setKbHeight] = useState(0);

  // When the sheet is open, track the keyboard height so the sheet can
  // lift above the keyboard. With interactiveWidget="overlays-content" the
  // layout viewport doesn't resize, so we read from visualViewport.
  useEffect(() => {
    if (!open) return;

    const vv = window.visualViewport;
    if (!vv) return;

    function sync() {
      setKbHeight(Math.max(0, window.innerHeight - vv!.height));
    }

    // Read immediately (keyboard might already be open when sheet opens)
    sync();

    vv.addEventListener("resize", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      setKbHeight(0);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`fixed inset-0 z-50 ${
              blur ? "bg-background/80 backdrop-blur-sm" : "bg-black/50"
            }`}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={SHEET_TRANSITION}
            className="fixed inset-x-0 bottom-0 z-50"
            style={{ marginBottom: kbHeight }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
