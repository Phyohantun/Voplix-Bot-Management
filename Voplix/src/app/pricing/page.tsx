import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check, X, Crown } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { VoplixWordmark } from '@/components/brand/voplix-wordmark';

function Yes() {
  return (
    <span className="inline-flex justify-center text-zinc-600 dark:text-zinc-400" aria-label="Included">
      <Check className="h-4 w-4" weight="bold" />
    </span>
  );
}

function No() {
  return (
    <span className="inline-flex justify-center text-zinc-300 dark:text-zinc-600" aria-label="Not included">
      <X className="h-4 w-4" weight="bold" />
    </span>
  );
}

const comparisonRows: {
  feature: string;
  free: ReactNode;
  pro: ReactNode;
  plus: ReactNode;
}[] = [
  { feature: 'Bots', free: '1', pro: '2', plus: '5' },
  { feature: 'Products', free: '5', pro: 'Unlimited', plus: 'Unlimited' },
  { feature: 'Orders / month', free: '50', pro: 'Unlimited', plus: 'Unlimited' },
  { feature: 'Manual delivery', free: <Yes />, pro: <Yes />, plus: <Yes /> },
  { feature: 'Auto delivery', free: <No />, pro: <Yes />, plus: <Yes /> },
  { feature: 'Stock management', free: <No />, pro: <Yes />, plus: <Yes /> },
  { feature: 'Message templates (5 key messages)', free: <No />, pro: <Yes />, plus: <Yes /> },
  { feature: 'Reports', free: 'Daily only', pro: 'Full (daily, weekly, monthly)', plus: 'Full (daily, weekly, monthly)' },
  { feature: 'Export PDF / CSV', free: <No />, pro: <Yes />, plus: <Yes /> },
  { feature: 'Bot pause / resume', free: <No />, pro: <Yes />, plus: <Yes /> },
  { feature: 'Low stock alerts', free: <No />, pro: <Yes />, plus: <Yes /> },
  { feature: 'Bank / payment info edit', free: <No />, pro: <Yes />, plus: <Yes /> },
  { feature: 'Custom reply after order confirmed', free: <No />, pro: <No />, plus: <Yes /> },
  { feature: 'Broadcast to past customers', free: <No />, pro: <No />, plus: <Yes /> },
  { feature: 'Advanced analytics', free: <No />, pro: <No />, plus: <Yes /> },
  { feature: 'Sales vs last month', free: <No />, pro: <No />, plus: <Yes /> },
  { feature: 'Early access to new features', free: <No />, pro: <No />, plus: <Yes /> },
  {
    feature: 'Support',
    free: <span className="text-zinc-600 dark:text-zinc-400">Basic</span>,
    pro: <span className="text-zinc-600 dark:text-zinc-400">Priority</span>,
    plus: <span className="text-zinc-600 dark:text-zinc-400">VIP</span>,
  },
  {
    feature: 'Price',
    free: <span className="font-medium text-zinc-800 dark:text-zinc-200">0</span>,
    pro: <span className="font-medium text-zinc-800 dark:text-zinc-200">45,000 MMK</span>,
    plus: <span className="font-medium text-zinc-800 dark:text-zinc-200">65,000 MMK</span>,
  },
];

export default function PricingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 dark:opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,113,108,0.12),transparent),radial-gradient(ellipse_60%_40%_at_100%_0%,rgba(161,161,170,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(161,161,170,0.06),transparent)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-700">
              <Image src="/apple-touch-icon.png" alt="Voplix logo" width={36} height={36} className="h-full w-full object-cover" />
            </div>
            <VoplixWordmark className="text-lg" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/pricing" prefetch>
              <Button variant="ghost" className="text-zinc-800 hover:bg-zinc-200 dark:text-zinc-200 dark:hover:bg-zinc-800">
                Pricing
              </Button>
            </Link>
            <Link href="/login" prefetch>
              <Button variant="ghost" className="text-zinc-800 hover:bg-zinc-200 dark:text-zinc-200 dark:hover:bg-zinc-800">
                Login
              </Button>
            </Link>
            <Link href="/signup" prefetch>
              <Button className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                Sign up
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex flex-1 flex-col py-10 sm:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">Plans</h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
              Compare Free, Pro, and Plus. Subscribe from your dashboard after you sign in — checkout connects in a
              later release.
            </p>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
              Reference THB equivalents: ฿0 · ฿330/mo (Pro) · ฿499/mo (Plus) — final charge may vary with FX.
            </p>
          </div>

          <div className="mx-auto mt-10 grid w-full max-w-5xl gap-5 lg:grid-cols-3">
            <Card className="border-zinc-200 bg-white/80 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
              <CardHeader className="border-b border-zinc-100 pb-4 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Free</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">0 MMK</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">฿0</p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Start selling with one bot and core flows.</p>
              </CardHeader>
              <CardContent className="space-y-2 pt-4 text-sm text-zinc-600 dark:text-zinc-400">
                <ul className="list-inside list-disc space-y-1.5 marker:text-zinc-400">
                  <li>1 bot · up to 5 products · 50 orders / month</li>
                  <li>Manual delivery only · daily report only</li>
                  <li>Default bot messages only — cannot edit templates</li>
                  <li>No export · no pause/resume · no broadcast</li>
                  <li>Basic support</li>
                </ul>
                <Link href="/signup" prefetch className="mt-4 block">
                  <Button variant="outline" className="w-full border-zinc-300 dark:border-zinc-600">
                    Create free account
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-zinc-300 bg-white shadow-md dark:border-zinc-600 dark:bg-zinc-900">
              <CardHeader className="border-b border-zinc-100 pb-4 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Pro</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">45,000 MMK</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">~฿330 / month</p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Two shops, automation, and full messaging control.</p>
              </CardHeader>
              <CardContent className="space-y-2 pt-4 text-sm text-zinc-600 dark:text-zinc-400">
                <ul className="list-inside list-disc space-y-1.5 marker:text-zinc-400">
                  <li>2 bots · unlimited products · unlimited orders</li>
                  <li>Manual + auto delivery · stock management</li>
                  <li>Daily, weekly, monthly reports · edit all 5 message templates</li>
                  <li>Export reports PDF/CSV · bot pause/resume with custom message</li>
                  <li>Bank / payment info customization · priority Telegram support</li>
                </ul>
                <Link href="/login?next=/subscription" prefetch className="mt-4 block">
                  <Button className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                    Log in to choose Pro
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="relative border-zinc-200 bg-white/90 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90">
              <div className="absolute right-4 top-4 text-zinc-400 dark:text-zinc-500" aria-hidden>
                <Crown className="h-5 w-5" weight="duotone" />
              </div>
              <CardHeader className="border-b border-zinc-100 pb-4 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Plus</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">65,000 MMK</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">~฿499 / month</p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Scale volume, broadcast, and analytics.</p>
              </CardHeader>
              <CardContent className="space-y-2 pt-4 text-sm text-zinc-600 dark:text-zinc-400">
                <p className="font-medium text-zinc-800 dark:text-zinc-200">Everything in Pro, and:</p>
                <ul className="list-inside list-disc space-y-1.5 marker:text-zinc-400">
                  <li>5 bots</li>
                  <li>Custom reply after order confirmed</li>
                  <li>Broadcast to all past customers</li>
                  <li>Advanced analytics — best-selling times, revenue trends</li>
                  <li>Sales comparison this month vs last month</li>
                  <li>Early access to new features · VIP support (fastest response)</li>
                </ul>
                <Link href="/login?next=/subscription" prefetch className="mt-4 block">
                  <Button variant="outline" className="w-full border-zinc-300 dark:border-zinc-600">
                    Log in to choose Plus
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="mx-auto mt-14 w-full max-w-5xl">
            <h2 className="text-center text-lg font-semibold text-zinc-900 dark:text-white">Feature comparison</h2>
            <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-900">
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Feature</th>
                    <th className="px-4 py-3 text-center font-medium text-zinc-700 dark:text-zinc-300">Free</th>
                    <th className="px-4 py-3 text-center font-medium text-zinc-700 dark:text-zinc-300">Pro</th>
                    <th className="px-4 py-3 text-center font-medium text-zinc-700 dark:text-zinc-300">Plus</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr
                      key={row.feature}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80"
                    >
                      <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{row.feature}</td>
                      <td className="px-4 py-2.5 text-center text-zinc-600 dark:text-zinc-400">{row.free}</td>
                      <td className="px-4 py-2.5 text-center text-zinc-600 dark:text-zinc-400">{row.pro}</td>
                      <td className="px-4 py-2.5 text-center text-zinc-600 dark:text-zinc-400">{row.plus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-500">
              Feature flags and billing enforcement will align with these tiers as they ship.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-8 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                When to move Free → Pro
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" weight="bold" aria-hidden />
                  You are approaching or hit the 50 orders / month limit
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" weight="bold" aria-hidden />
                  You need more than 5 products
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" weight="bold" aria-hidden />
                  You want auto delivery with stock — usually the strongest upgrade trigger
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" weight="bold" aria-hidden />
                  You need weekly or monthly reports, not only daily
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" weight="bold" aria-hidden />
                  You want to edit all five customer-facing bot message templates
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" weight="bold" aria-hidden />
                  You need a second bot for another shop
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                When to move Pro → Plus
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" weight="bold" aria-hidden />
                  You need more than two bots (up to five on Plus)
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" weight="bold" aria-hidden />
                  You want broadcast campaigns to past customers
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" weight="bold" aria-hidden />
                  You need a custom reply after delivery is confirmed
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" weight="bold" aria-hidden />
                  You want advanced analytics and revenue trends
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" weight="bold" aria-hidden />
                  You rely on month-over-month sales comparison
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" weight="bold" aria-hidden />
                  You run serious volume and want VIP response times
                </li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
