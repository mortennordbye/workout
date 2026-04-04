/**
 * Auth layout — no bottom navigation, full-screen centered content.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center">
      {children}
    </div>
  );
}
