import { UserManagement } from "@/components/features/UserManagement";
import { requireSession } from "@/lib/utils/session";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await requireSession();
  if (session.user.role !== "admin") notFound();

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <div className="px-4 pt-8 pb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage accounts — only admins can access this page.
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-24">
        <UserManagement />
      </div>
    </div>
  );
}
