'use client';

import { User } from '@supabase/supabase-js';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DashboardSidebar } from './sidebar';

interface DashboardHeaderProps {
  user: User;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-zinc-800 bg-zinc-900/95 px-4 backdrop-blur sm:gap-x-6 sm:px-6 lg:px-8">
      <Sheet>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" className="lg:hidden text-zinc-400" />}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open sidebar</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 bg-zinc-900 border-zinc-800 p-0">
          <DashboardSidebar user={user} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1 items-center">
          <p className="hidden text-sm text-zinc-400 sm:block">Signed in as {user.email}</p>
        </div>
      </div>
    </header>
  );
}
