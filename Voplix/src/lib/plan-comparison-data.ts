/** Plain-text plan matrix for dashboard subscription page (keep in sync with marketing /pricing). */
export const PLAN_COMPARISON_ROWS: { feature: string; free: string; pro: string; plus: string }[] = [
  { feature: 'Bots', free: '1', pro: '2', plus: '5' },
  { feature: 'Products', free: '5', pro: 'Unlimited', plus: 'Unlimited' },
  { feature: 'Orders / month', free: '50', pro: 'Unlimited', plus: 'Unlimited' },
  { feature: 'Manual delivery', free: 'Yes', pro: 'Yes', plus: 'Yes' },
  { feature: 'Auto delivery (digital)', free: 'No', pro: 'Yes', plus: 'Yes' },
  { feature: 'Stock management', free: 'No', pro: 'Yes', plus: 'Yes' },
  { feature: 'Message templates', free: 'No', pro: 'Yes', plus: 'Yes' },
  { feature: 'Reports', free: 'Daily only', pro: 'Full', plus: 'Full' },
  { feature: 'Export PDF / CSV', free: 'No', pro: 'Yes', plus: 'Yes' },
  { feature: 'Broadcast', free: 'No', pro: 'No', plus: 'Yes' },
  { feature: 'Advanced analytics', free: 'No', pro: 'No', plus: 'Yes' },
  { feature: 'Price', free: '0 MMK', pro: '45,000 MMK', plus: '65,000 MMK' },
];
