"use client";

/**
 * NewProgramButton
 *
 * Inline form (shown/hidden) for creating a new workout program.
 */

import { createProgram } from "@/lib/actions/programs";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewProgramButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const result = await createProgram({ name: name.trim() });
    setLoading(false);
    if (result.success) {
      setName("");
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 rounded-full border-2 border-primary px-6 py-3 text-primary font-semibold text-sm hover:bg-primary/10 active:bg-primary/20 transition-colors"
      >
        <PlusIcon className="h-4 w-4" />
        New Program
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Program name…"
        className="flex-1 rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 ring-primary"
      />
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {loading ? "…" : "Create"}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setName("");
        }}
        className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground"
      >
        Cancel
      </button>
    </form>
  );
}
