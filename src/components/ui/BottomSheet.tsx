"use client";
import { AnimatePresence, motion } from "framer-motion";

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
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
