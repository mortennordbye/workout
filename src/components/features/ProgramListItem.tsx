"use client";

import { deleteProgram } from "@/lib/actions/programs";
import { ChevronRightIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  program: {
    id: number;
    name: string;
  };
};

export function ProgramListItem({ program }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${program.name}"?`)) return;

    setDeleting(true);
    await deleteProgram(program.id);
    router.refresh();
  };

  return (
    <div className="flex items-center">
      <Link
        href={`/programs/${program.id}/workout`}
        className="flex-1 flex items-center justify-between px-5 py-4 hover:bg-muted/70 active:bg-muted/50 transition-colors"
      >
        <span className="text-base font-medium">{program.name}</span>
        <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
      </Link>
      <Link
        href={`/programs/${program.id}`}
        className="px-3 py-4 text-primary text-sm font-medium hover:opacity-80"
      >
        Edit
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-3 py-4 text-destructive hover:opacity-80 disabled:opacity-50 transition-opacity"
      >
        <Trash2Icon className="h-4 w-4" />
      </button>
    </div>
  );
}
