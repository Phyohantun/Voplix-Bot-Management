import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center text-zinc-100">
      <h1 className="text-2xl font-semibold tracking-tight">We will be right back</h1>
      <p className="mt-3 max-w-md text-sm text-zinc-400">
        Voplix is temporarily in maintenance mode. Please try again in a few minutes.
      </p>
      <p className="mt-6 text-xs text-zinc-600">
        <Link href="/" className="text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline">
          Home
        </Link>
      </p>
    </div>
  );
}
