export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.2),transparent_45%),radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.14),transparent_35%)]" />
      <div className="relative w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
