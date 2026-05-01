'use client';

import { createContext, useContext } from 'react';
import type { ShopCurrency } from '@/lib/currency';

const CurrencyContext = createContext<ShopCurrency>('THB');

export function CurrencyProvider({
  value,
  children,
}: {
  value: ShopCurrency;
  children: React.ReactNode;
}) {
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useShopCurrency(): ShopCurrency {
  return useContext(CurrencyContext);
}
