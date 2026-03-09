import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

type Props = {
  program: {
    id: number;
    name: string;
  };
};

export function ProgramListItem({ program }: Props) {
  return (
    <Link
      href={`/programs/${program.id}`}
      className="flex items-center justify-between px-5 py-4 hover:bg-muted/70 active:bg-muted/50 transition-colors"
    >
      <span className="text-base font-medium">{program.name}</span>
      <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
    </Link>
  );
}
