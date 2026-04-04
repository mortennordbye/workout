"use client";

import { createProgram, deleteProgram } from "@/lib/actions/programs";
import type { Program } from "@/types/workout";
import { ChevronRightIcon, Minus, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  programs: Program[];
};

export function ProgramListClient({ programs: initial }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [programs, setPrograms] = useState(initial);

  useEffect(() => {
    setPrograms(initial);
  }, [initial]);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleDelete(programId: number) {
    setDeleting(true);
    setPrograms((prev) => prev.filter((p) => p.id !== programId));
    await deleteProgram(programId);
    setPendingDeleteId(null);
    setDeleting(false);
    router.refresh();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const result = await createProgram({ name: newName.trim() });
    setCreating(false);
    if (result.success) {
      setNewName("");
      setShowCreate(false);
      router.refresh();
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-8 pb-2">
        <h1 className="text-3xl font-bold tracking-tight">Programs</h1>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <button
              type="button"
              onClick={() => { setIsEditing(false); setPendingDeleteId(null); }}
              className="text-primary text-sm font-medium min-h-[44px] px-1"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-primary text-sm font-medium min-h-[44px] px-1"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground active:opacity-80 transition-opacity"
                aria-label="New program"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        {programs.length > 0 && (
          <div className="flex flex-col divide-y divide-border rounded-xl bg-muted overflow-hidden mb-4">
            {programs.map((program) => {
              const isPending = pendingDeleteId === program.id;

              if (isPending) {
                return (
                  <div key={program.id} className="flex items-center justify-between px-4 py-4 bg-destructive/10">
                    <span className="text-sm font-medium text-destructive">
                      Delete &ldquo;{program.name}&rdquo;?
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(null)}
                        className="text-sm text-muted-foreground font-medium min-h-[44px] px-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(program.id)}
                        disabled={deleting}
                        className="text-sm text-destructive font-semibold min-h-[44px] px-1 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={program.id} className="flex items-center gap-3 px-4">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(program.id)}
                      className="w-7 h-7 rounded-full bg-destructive flex items-center justify-center shrink-0"
                      aria-label={`Delete ${program.name}`}
                    >
                      <Minus className="w-4 h-4 text-white" />
                    </button>
                  )}
                  <Link
                    href={`/programs/${program.id}`}
                    className="flex-1 flex items-center justify-between py-4 active:opacity-70 transition-opacity"
                  >
                    <span className="text-base font-medium">{program.name}</span>
                    {!isEditing && (
                      <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {programs.length === 0 && !showCreate && (
          <p className="text-muted-foreground text-sm mb-6">
            No programs yet. Tap + to create one.
          </p>
        )}

        {/* Inline create form */}
        {showCreate && (
          <form onSubmit={handleCreate} className="flex gap-2 mb-4">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Program name…"
              className="flex-1 rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 ring-primary"
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {creating ? "…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setNewName(""); }}
              className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </>
  );
}
