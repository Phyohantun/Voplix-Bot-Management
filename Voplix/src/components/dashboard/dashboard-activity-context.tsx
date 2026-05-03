'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type DashboardActivityValue = {
  pendingSlipOrders: number;
  unreadAnnouncements: number;
  setFromPoll: (v: { pendingSlipOrders: number; unreadAnnouncements: number }) => void;
};

const DashboardActivityContext = createContext<DashboardActivityValue | null>(null);

export function DashboardActivityProvider({
  children,
  initialPendingSlipOrders,
  initialUnreadAnnouncements,
}: {
  children: React.ReactNode;
  initialPendingSlipOrders: number;
  initialUnreadAnnouncements: number;
}) {
  const [pendingSlipOrders, setPending] = useState(initialPendingSlipOrders);
  const [unreadAnnouncements, setUnread] = useState(initialUnreadAnnouncements);

  useEffect(() => {
    setPending(initialPendingSlipOrders);
    setUnread(initialUnreadAnnouncements);
  }, [initialPendingSlipOrders, initialUnreadAnnouncements]);

  const setFromPoll = useCallback((v: { pendingSlipOrders: number; unreadAnnouncements: number }) => {
    setPending(v.pendingSlipOrders);
    setUnread(v.unreadAnnouncements);
  }, []);

  const value = useMemo(
    () => ({ pendingSlipOrders, unreadAnnouncements, setFromPoll }),
    [pendingSlipOrders, unreadAnnouncements, setFromPoll]
  );

  return <DashboardActivityContext.Provider value={value}>{children}</DashboardActivityContext.Provider>;
}

export function useDashboardActivity() {
  const ctx = useContext(DashboardActivityContext);
  if (!ctx) {
    throw new Error('useDashboardActivity must be used within DashboardActivityProvider');
  }
  return ctx;
}

export function useDashboardActivityOptional() {
  return useContext(DashboardActivityContext);
}
