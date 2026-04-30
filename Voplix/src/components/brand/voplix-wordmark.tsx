import { cn } from '@/lib/utils';

/**
 * DM Sans SemiBold (600) via --font-voplix-wordmark from root layout.
 * Balanced tracking: tighter than “loose”, not as tight as the first pass.
 */
export function VoplixWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-x-px text-white [font-family:var(--font-voplix-wordmark),ui-sans-serif,system-ui,sans-serif] font-semibold',
        className
      )}
    >
      <span className="tracking-[-0.09em]">Vo</span>
      <span className="tracking-[-0.055em]">pl</span>
      <span className="tracking-[-0.09em]">ix</span>
    </span>
  );
}
