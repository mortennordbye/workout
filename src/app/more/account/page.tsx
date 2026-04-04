import { AccountClient } from "@/components/features/AccountClient";
import { requireSession } from "@/lib/utils/session";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireSession();

  return (
    <div className="h-[100dvh] pb-16 bg-background flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-6 pb-2 shrink-0">
        <Link href="/more" className="text-primary text-sm font-medium">
          &lt; More
        </Link>
        <span className="w-16" />
      </div>

      <div className="px-4 pt-2 pb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Account</h1>
      </div>

      <AccountClient
        name={session.user.name}
        email={session.user.email}
        role={(session.user as { role?: string }).role ?? "user"}
      />
    </div>
  );
}
