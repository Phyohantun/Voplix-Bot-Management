import { FREE_ORDERS_PER_MONTH_DEFAULT } from '@/lib/plan-constants';

/**
 * Plain-text plan matrix for subscription UI. The Price row is replaced at runtime with admin-configured MMK amounts.
 * Public /pricing page uses its own copy for logged-out visitors.
 */
export const PLAN_COMPARISON_ROWS: { feature: string; free: string; pro: string; plus: string }[] = [
  { feature: 'Bots', free: '1', pro: '2', plus: '5' },
  { feature: 'Products', free: '5', pro: 'Unlimited', plus: 'Unlimited' },
  { feature: 'Orders / month', free: String(FREE_ORDERS_PER_MONTH_DEFAULT), pro: 'Unlimited', plus: 'Unlimited' },
  { feature: 'Manual delivery', free: 'Yes', pro: 'Yes', plus: 'Yes' },
  { feature: 'Auto delivery (digital)', free: 'No', pro: 'Yes', plus: 'Yes' },
  { feature: 'Stock management', free: 'No', pro: 'Yes', plus: 'Yes' },
  { feature: 'Message templates', free: 'No', pro: 'Yes', plus: 'Yes' },
  { feature: 'Reports', free: 'Daily only', pro: 'Full', plus: 'Full' },
  { feature: 'Broadcast (per month, UTC)', free: 'No', pro: '10', plus: '50' },
  { feature: 'Price', free: '0 MMK', pro: '—', plus: '—' },
];
