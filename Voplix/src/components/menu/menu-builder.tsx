'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, PencilSimple, Trash, Package, GearSix } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyAmount } from '@/lib/currency';
import { useShopCurrency } from '@/components/dashboard/currency-context';
import type { PlanEnforcementSnapshot } from '@/lib/plan-limits';
import { cn } from '@/lib/utils';

type MenuItemType = 'DIGITAL_DELIVERY' | 'MANUAL_DELIVERY';

interface BotOption {
  id: string;
  bot_username: string;
  start_welcome_message: string | null;
  start_show_menu_only: boolean;
  start_show_tip: boolean;
  payment_instructions: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  type: MenuItemType;
  delivery_content: string | null;
  is_active?: boolean;
  unsold_stock_count?: number;
}

const TYPE_LABEL: Record<MenuItemType, string> = {
  DIGITAL_DELIVERY: 'Digital (stock on Stock page)',
  MANUAL_DELIVERY: 'Manual (you fulfill)',
};

const TYPE_HELP: Record<MenuItemType, string> = {
  DIGITAL_DELIVERY: 'Customer pays; after approval, delivery is sent from your stock lines.',
  MANUAL_DELIVERY: 'Customer pays; you enter delivery details when approving the order.',
};

interface MenuBuilderProps {
  bots: BotOption[];
  selectedBot: BotOption;
  menuItems: MenuItem[];
  planSnapshot: PlanEnforcementSnapshot;
}

type FormState = {
  name: string;
  price: string;
  type: MenuItemType;
  delivery_content: string;
};

const emptyForm = (canDigital: boolean): FormState => ({
  name: '',
  price: '0',
  type: canDigital ? 'DIGITAL_DELIVERY' : 'MANUAL_DELIVERY',
  delivery_content: '',
});

export function MenuBuilder({ bots, selectedBot, menuItems: initialItems, planSnapshot }: MenuBuilderProps) {
  const router = useRouter();
  const currency = useShopCurrency();
  const [menuItems, setMenuItems] = useState(initialItems);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBotSettingsOpen, setIsBotSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'start' | 'payment'>('start');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showStockNudge, setShowStockNudge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startSettingsLoading, setStartSettingsLoading] = useState(false);
  const [startWelcomeMessage, setStartWelcomeMessage] = useState(selectedBot.start_welcome_message ?? '');
  const [startShowMenuOnly, setStartShowMenuOnly] = useState(selectedBot.start_show_menu_only);
  const [startShowTip, setStartShowTip] = useState(selectedBot.start_show_tip);
  const [paymentInstructions, setPaymentInstructions] = useState(selectedBot.payment_instructions ?? '');
  const [paymentInstructionsSaving, setPaymentInstructionsSaving] = useState(false);

  useEffect(() => {
    setMenuItems(initialItems);
  }, [initialItems, selectedBot.id]);

  useEffect(() => {
    setShowStockNudge(false);
  }, [selectedBot.id]);

  useEffect(() => {
    setStartWelcomeMessage(selectedBot.start_welcome_message ?? '');
    setStartShowMenuOnly(selectedBot.start_show_menu_only);
    setStartShowTip(selectedBot.start_show_tip);
    setPaymentInstructions(selectedBot.payment_instructions ?? '');
  }, [
    selectedBot.id,
    selectedBot.start_welcome_message,
    selectedBot.start_show_menu_only,
    selectedBot.start_show_tip,
    selectedBot.payment_instructions,
  ]);
  const [formData, setFormData] = useState<FormState>(() => emptyForm(planSnapshot.canCreateDigitalProduct));

  useEffect(() => {
    if (!planSnapshot.canCreateDigitalProduct && formData.type === 'DIGITAL_DELIVERY' && !editingItem) {
      setFormData((prev) => ({ ...prev, type: 'MANUAL_DELIVERY' }));
    }
  }, [planSnapshot.canCreateDigitalProduct, formData.type, editingItem]);

  const parsePrice = (): number => {
    const n = Number.parseInt(formData.price.replace(/[^\d]/g, ''), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Enter a product name');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: selectedBot.id,
          name: formData.name.trim(),
          price: parsePrice(),
          type: formData.type,
          delivery_content: formData.delivery_content.trim() || null,
        }),
      });

      if (!response.ok) {
        const j = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || 'Failed to create');
      }

      const { menuItem } = (await response.json()) as { menuItem: MenuItem };
      const merged: MenuItem = {
        ...menuItem,
        is_active: menuItem.is_active !== false,
        unsold_stock_count: menuItem.unsold_stock_count ?? 0,
      };
      setMenuItems([...menuItems, merged]);
      setIsCreateOpen(false);
      setFormData(emptyForm(planSnapshot.canCreateDigitalProduct));
      toast.success('Product added — it will show on /start in Telegram');
      if (merged.type === 'DIGITAL_DELIVERY' && planSnapshot.canUseStockManagement) {
        setShowStockNudge(true);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create product');
    }

    setLoading(false);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;

    if (!formData.name.trim()) {
      toast.error('Enter a product name');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/menu-items/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          price: parsePrice(),
          type: formData.type,
          delivery_content: formData.delivery_content.trim() || null,
        }),
      });

      if (!response.ok) {
        const j = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || 'Failed to update');
      }

      const { menuItem } = (await response.json()) as { menuItem: MenuItem };
      const prev = editingItem;
      const merged: MenuItem = {
        ...menuItem,
        unsold_stock_count: menuItem.unsold_stock_count ?? prev.unsold_stock_count ?? 0,
        is_active: menuItem.is_active !== false,
      };
      setMenuItems(menuItems.map((item) => (item.id === editingItem.id ? merged : item)));
      setEditingItem(null);
      setFormData(emptyForm(planSnapshot.canCreateDigitalProduct));
      toast.success('Product updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update');
    }

    setLoading(false);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Remove this product from the bot menu?')) return;

    try {
      const response = await fetch(`/api/menu-items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove');
      }

      setMenuItems(menuItems.filter((item) => item.id !== itemId));
      toast.success('Product removed from menu');
    } catch {
      toast.error('Could not remove product');
    }
  };

  const toggleListed = async (item: MenuItem) => {
    const next = !item.is_active;
    try {
      const res = await fetch(`/api/menu-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: next }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || 'Could not update');
      }
      const { menuItem } = (await res.json()) as { menuItem: MenuItem };
      setMenuItems((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? {
                ...menuItem,
                unsold_stock_count: row.unsold_stock_count ?? 0,
                is_active: menuItem.is_active !== false,
              }
            : row
        )
      );
      toast.success(next ? 'Product is listed in Telegram again' : 'Product hidden from Telegram menu');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update listing');
    }
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    const normalizedType: MenuItemType =
      item.type === 'MANUAL_DELIVERY' ? 'MANUAL_DELIVERY' : 'DIGITAL_DELIVERY';
    setFormData({
      name: item.name,
      price: String(item.price),
      type: normalizedType,
      delivery_content: item.delivery_content ?? '',
    });
  };

  const handleSaveStartSettings = async () => {
    setStartSettingsLoading(true);
    try {
      const response = await fetch(`/api/bots/${selectedBot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_welcome_message: startWelcomeMessage.trim() || null,
          start_show_menu_only: startShowMenuOnly,
          start_show_tip: startShowTip,
        }),
      });

      if (!response.ok) {
        const j = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || 'Failed to save start settings');
      }

      toast.success('Start message settings saved');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setStartSettingsLoading(false);
    }
  };

  const handleSavePaymentInstructions = async (): Promise<boolean> => {
    setPaymentInstructionsSaving(true);
    try {
      const response = await fetch(`/api/bots/${selectedBot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_instructions: paymentInstructions.trim() || null,
        }),
      });

      if (!response.ok) {
        const j = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || 'Failed to save payment details');
      }

      toast.success('Payment details saved — customers will see them after Confirm & Pay');
      router.refresh();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save payment details');
      return false;
    } finally {
      setPaymentInstructionsSaving(false);
    }
  };

  const formFields = (
    <>
      <div className="space-y-2">
        <Label className="text-zinc-700 dark:text-zinc-300">Product name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Premium account — 30 days"
          className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
        />
        <p className="text-xs text-zinc-500">Shown in Telegram as a tap button under /start</p>
      </div>

      <div className="space-y-2">
        <Label className="text-zinc-700 dark:text-zinc-300">Price ({currency})</Label>
        <Input
          type="text"
          inputMode="numeric"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          placeholder="0"
          className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
        />
        <p className="text-xs text-zinc-500">
          Amount in your Account currency ({currency}). Use 0 for free items.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-zinc-700 dark:text-zinc-300">Product type</Label>
        {editingItem ? (
          <>
            <Select
              value={formData.type}
              onValueChange={(v) => setFormData({ ...formData, type: v as MenuItemType })}
            >
              <SelectTrigger className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700">
                <SelectItem
                  value="DIGITAL_DELIVERY"
                  disabled={!planSnapshot.canCreateDigitalProduct}
                  className="text-zinc-900 dark:text-white"
                >
                  {TYPE_LABEL.DIGITAL_DELIVERY}
                </SelectItem>
                <SelectItem value="MANUAL_DELIVERY" className="text-zinc-900 dark:text-white">
                  {TYPE_LABEL.MANUAL_DELIVERY}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500">{TYPE_HELP[formData.type]}</p>
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={!planSnapshot.canCreateDigitalProduct}
                title={
                  !planSnapshot.canCreateDigitalProduct
                    ? 'Upgrade to Pro or Plus for digital products with automatic delivery from stock.'
                    : undefined
                }
                onClick={() => planSnapshot.canCreateDigitalProduct && setFormData({ ...formData, type: 'DIGITAL_DELIVERY' })}
                className={cn(
                  'rounded-xl border-2 p-4 text-left transition-colors',
                  formData.type === 'DIGITAL_DELIVERY'
                    ? 'border-indigo-500 bg-indigo-50/80 dark:border-indigo-500 dark:bg-indigo-950/40'
                    : 'border-zinc-200 bg-zinc-50 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/60',
                  !planSnapshot.canCreateDigitalProduct && 'cursor-not-allowed opacity-50'
                )}
              >
                <p className="text-lg font-semibold text-zinc-900 dark:text-white">Digital 🤖</p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  After you approve payment, the customer receives the next free line from your Stock page.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'MANUAL_DELIVERY' })}
                className={cn(
                  'rounded-xl border-2 p-4 text-left transition-colors',
                  formData.type === 'MANUAL_DELIVERY'
                    ? 'border-indigo-500 bg-indigo-50/80 dark:border-indigo-500 dark:bg-indigo-950/40'
                    : 'border-zinc-200 bg-zinc-50 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/60'
                )}
              >
                <p className="text-lg font-semibold text-zinc-900 dark:text-white">Manual 👤</p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  You paste delivery details when you approve the order — good for custom work or off-platform
                  fulfillment.
                </p>
              </button>
            </div>
            <p className="text-xs text-zinc-500">{TYPE_HELP[formData.type]}</p>
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-zinc-700 dark:text-zinc-300">Note (optional)</Label>
        <Textarea
          value={formData.delivery_content}
          onChange={(e) => setFormData({ ...formData, delivery_content: e.target.value })}
          placeholder="Reference text or short description where relevant."
          className="min-h-[88px] bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
        />
        <p className="text-xs text-zinc-500">
          Digital delivery codes are managed on the Stock page, not here.
        </p>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Selected bot</p>
          <p className="text-sm font-medium text-zinc-900 dark:text-white">@{selectedBot.bot_username}</p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
            onClick={() => {
              setSettingsTab('start');
              setIsBotSettingsOpen(true);
            }}
          >
            <GearSix className="mr-2 h-4 w-4" />
            Bot settings
          </Button>

          <Dialog open={isBotSettingsOpen} onOpenChange={setIsBotSettingsOpen}>
            <DialogContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-zinc-900 dark:text-white">Bot settings</DialogTitle>
                <DialogDescription className="text-zinc-600 dark:text-zinc-400">
                  /start message and payment instructions for this shop.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-1 border-b border-zinc-200 pb-2 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSettingsTab('start')}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    settingsTab === 'start'
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  )}
                >
                  Start message
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab('payment')}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    settingsTab === 'payment'
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  )}
                >
                  Payment details
                </button>
              </div>

              {settingsTab === 'start' ? (
                <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
                  <div className="space-y-2">
                    <Label className="text-zinc-700 dark:text-zinc-300">Custom welcome message (optional)</Label>
                    <Textarea
                      value={startWelcomeMessage}
                      onChange={(e) => setStartWelcomeMessage(e.target.value)}
                      className="min-h-[88px] border-zinc-300 bg-zinc-100 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      placeholder="e.g. Welcome to Voplix! Choose your package below."
                    />
                    <p className="text-xs text-zinc-500">
                      Leave empty to use default message. This appears above your menu list.
                    </p>
                  </div>
                  <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={startShowMenuOnly}
                      onChange={(e) => setStartShowMenuOnly(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-600"
                    />
                    Show only menu list on /start (hide welcome/title text)
                  </label>
                  <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={startShowTip}
                      onChange={(e) => setStartShowTip(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-600"
                    />
                    Show &quot;Browse menu&quot; tip message after /start
                  </label>
                </div>
              ) : (
                <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
                  <p className="text-xs text-zinc-500">
                    Shown after the customer taps Confirm &amp; Pay, before they upload a slip. Plain text — you can
                    list several methods.
                  </p>
                  <Textarea
                    value={paymentInstructions}
                    onChange={(e) => setPaymentInstructions(e.target.value)}
                    placeholder={`Example:\nKBZ Pay — 09xxxxxxxxx (Your Shop Name)\nAYA Bank — 1234567890\nWave — 09xxxxxxxxx`}
                    maxLength={12000}
                    rows={10}
                    className="min-h-[180px] border-zinc-300 bg-zinc-100 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  />
                  <p className="text-xs text-zinc-500">{paymentInstructions.length} / 12000 characters</p>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBotSettingsOpen(false)}
                  className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                >
                  Close
                </Button>
                {settingsTab === 'start' ? (
                  <Button
                    type="button"
                    onClick={handleSaveStartSettings}
                    disabled={startSettingsLoading}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {startSettingsLoading ? 'Saving…' : 'Save start message'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => void handleSavePaymentInstructions()}
                    disabled={paymentInstructionsSaving}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {paymentInstructionsSaving ? 'Saving…' : 'Save payment details'}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (open) setFormData(emptyForm(planSnapshot.canCreateDigitalProduct));
            }}
          >
            <DialogTrigger
              render={
                <Button
                  type="button"
                  disabled={!planSnapshot.canAddMenuItem}
                  title={
                    !planSnapshot.canAddMenuItem
                      ? 'Product limit reached for your plan — upgrade on Subscription.'
                      : undefined
                  }
                  className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto disabled:opacity-50"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add product
                </Button>
              }
            />
            <DialogContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-zinc-900 dark:text-white">New product</DialogTitle>
                <DialogDescription className="text-zinc-600 dark:text-zinc-400">
                  Appears in Telegram when customers send /start or tap &quot;Browse menu&quot;.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">{formFields}</div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {loading ? 'Saving…' : 'Add to menu'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showStockNudge ? (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-950/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-100">
            Don&apos;t forget to add stock for your new digital product — customers only receive a code after you approve
            payment and stock is available.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/stock?bot=${selectedBot.id}`}
              className="inline-flex h-8 items-center justify-center rounded-md bg-amber-600 px-3 text-sm font-medium text-white hover:bg-amber-500"
            >
              Open Stock
            </Link>
            <Button type="button" size="sm" variant="ghost" className="text-amber-200" onClick={() => setShowStockNudge(false)}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      {menuItems.length === 0 ? (
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardContent className="flex flex-col items-center justify-center gap-5 py-14">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-200 dark:bg-zinc-800">
              <Package className="h-8 w-8 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div className="max-w-md space-y-2 text-center">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">No products yet</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Add your first product so /start in Telegram shows something customers can buy. You can start with a
                manual product on any plan.
              </p>
            </div>
            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={!planSnapshot.canAddMenuItem}
              title={
                !planSnapshot.canAddMenuItem
                  ? 'Product limit reached for your plan — upgrade on Subscription.'
                  : undefined
              }
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add your first product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {menuItems.map((item) => {
            const itemType: MenuItemType =
              item.type === 'MANUAL_DELIVERY' ? 'MANUAL_DELIVERY' : 'DIGITAL_DELIVERY';
            const unsold = item.unsold_stock_count ?? 0;
            const listed = item.is_active !== false;
            const lowStock =
              itemType === 'DIGITAL_DELIVERY' && listed && unsold > 0 && unsold < 5;
            const outStock = itemType === 'DIGITAL_DELIVERY' && unsold <= 0;
            return (
              <Card
                key={item.id}
                className={cn(
                  'border-2 bg-white dark:bg-zinc-900',
                  lowStock || (outStock && listed)
                    ? 'border-red-500/70 dark:border-red-500/50'
                    : 'border-zinc-200 dark:border-zinc-800',
                  !listed && 'opacity-80'
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base leading-snug text-zinc-900 dark:text-white">{item.name}</CardTitle>
                        <Badge variant="outline" className="border-zinc-600 text-xs text-zinc-700 dark:text-zinc-300">
                          {itemType === 'DIGITAL_DELIVERY' ? 'Digital' : 'Manual'}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {item.price > 0 ? formatCurrencyAmount(item.price, currency) : 'Free'}
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {itemType === 'DIGITAL_DELIVERY' ? (
                          <>
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">
                              {unsold === 1 ? '1 unit ready' : `${unsold} units ready`}
                            </span>
                            {outStock ? (
                              <span className="ml-2 text-red-600 dark:text-red-400">· Out of stock</span>
                            ) : null}
                            {lowStock ? (
                              <span className="ml-2 text-red-600 dark:text-red-400">· Low stock</span>
                            ) : null}
                            {' · '}
                            <Link
                              href={`/stock?bot=${selectedBot.id}`}
                              className="font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
                            >
                              Stock page
                            </Link>
                          </>
                        ) : (
                          <span>Manual — you send details when you approve the order.</span>
                        )}
                      </p>
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-zinc-500"
                          checked={listed}
                          onChange={() => void toggleListed(item)}
                        />
                        Listed in Telegram menu
                      </label>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 border-zinc-300 dark:border-zinc-700"
                        onClick={() => openEdit(item)}
                        aria-label="Edit product"
                        title="Edit product"
                      >
                        <PencilSimple className="h-4 w-4 text-zinc-800 dark:text-zinc-200" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 border-zinc-300 text-red-500 hover:bg-red-950/30 dark:border-zinc-700"
                        onClick={() => handleDelete(item.id)}
                        aria-label="Remove product"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {item.delivery_content ? (
                  <CardContent className="pt-0">
                    <p className="text-xs text-zinc-500 line-clamp-3">{item.delivery_content}</p>
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) {
            setEditingItem(null);
            setFormData(emptyForm(planSnapshot.canCreateDigitalProduct));
          }
        }}
      >
        <DialogContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-white">Edit product</DialogTitle>
            <DialogDescription className="text-zinc-600 dark:text-zinc-400">Changes apply on the next /start in Telegram.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">{formFields}</div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingItem(null)}
              className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdate}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
