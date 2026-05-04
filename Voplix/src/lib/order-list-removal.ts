/** Owner soft-hide from Orders list — blocked while buyer flow is still active. */
const BLOCK_OWNER_LIST_REMOVAL = new Set(['PENDING_PAYMENT', 'SLIP_SUBMITTED']);

export function orderAllowsOwnerListRemoval(status: string): boolean {
  return !BLOCK_OWNER_LIST_REMOVAL.has(status);
}
