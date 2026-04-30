import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Lightning, ShieldCheck, Storefront } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.18),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_35%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl ring-1 ring-zinc-700">
              <Image src="/apple-touch-icon.png" alt="Voplix logo" width={36} height={36} className="h-full w-full object-cover" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">Voplix</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="text-zinc-200 hover:bg-zinc-800 hover:text-white">
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-indigo-600 text-white hover:bg-indigo-700">Sign up</Button>
            </Link>
          </div>
        </header>

        <main className="flex flex-1 items-center py-12 sm:py-16">
          <div className="w-full space-y-10">
            <section className="mx-auto max-w-3xl space-y-6 text-center">
              <p className="text-sm font-medium text-indigo-300">Telegram Commerce Platform</p>
              <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Sell digital products with a clean, fast Telegram workflow
              </h1>
              <p className="mx-auto max-w-2xl text-zinc-400">
                Manage menu items, approve orders, and run broadcasts from one premium dashboard built for modern
                creators and digital shops.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/signup">
                  <Button className="w-full bg-indigo-600 text-white hover:bg-indigo-700 sm:w-auto">
                    Get started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="w-full border-zinc-700 bg-zinc-900/70 text-zinc-200 hover:bg-zinc-800 sm:w-auto"
                  >
                    I already have an account
                  </Button>
                </Link>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <Card className="border-zinc-800 bg-zinc-900/70">
                <CardContent className="space-y-3 p-5">
                  <Lightning className="h-5 w-5 text-indigo-300" />
                  <h2 className="font-medium text-white">Fast operations</h2>
                  <p className="text-sm text-zinc-400">Approve and fulfill orders in seconds with clear workflows.</p>
                </CardContent>
              </Card>
              <Card className="border-zinc-800 bg-zinc-900/70">
                <CardContent className="space-y-3 p-5">
                  <Storefront className="h-5 w-5 text-indigo-300" />
                  <h2 className="font-medium text-white">Simple product setup</h2>
                  <p className="text-sm text-zinc-400">Create menu items and let customers buy directly from Telegram.</p>
                </CardContent>
              </Card>
              <Card className="border-zinc-800 bg-zinc-900/70">
                <CardContent className="space-y-3 p-5">
                  <ShieldCheck className="h-5 w-5 text-indigo-300" />
                  <h2 className="font-medium text-white">Reliable control</h2>
                  <p className="text-sm text-zinc-400">Track status and keep your business flow stable from one place.</p>
                </CardContent>
              </Card>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
