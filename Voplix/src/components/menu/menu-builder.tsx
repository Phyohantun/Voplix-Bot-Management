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
import { Plus, PencilSimple, Trash, Package } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyAmount } from '@/lib/currency';
import { useShopCurrency } from '@/components/dashboard/currency-context';

type MenuItemType = 'DIGITAL_DELIVERY' | 'MANUAL_DELIVERY';

interface BotOption {
  id: string;
  bot_username: string;
  start_welcome_message: string | null;
  start_show_menu_only: boolean;
  start_show_tip: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  type: MenuItemType;
  delivery_content: string | null;
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
}

type FormState = {
  name: string;
  price: string;
  type: MenuItemType;
  delivery_content: string;
};

const emptyForm = (): FormState => ({
  name: '',
  price: '0',
  type: 'DIGITAL_DELIVERY',
  delivery_content: '',
});

export function MenuBuilder({ bots, selectedBot, menuItems: initialItems }: MenuBuilderProps) {
  const router = useRouter();
  const currency = useShopCurrency();
  const [menuItems, setMenuItems] = useState(initialItems);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isStartSettingsOpen, setIsStartSettingsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [startSettingsLoading, setStartSettingsLoading] = useState(false);
  const [startWelcomeMessage, setStartWelcomeMessage] = useState(selectedBot.start_welcome_message ?? '');
  const [startShowMenuOnly, setStartShowMenuOnly] = useState(selectedBot.start_show_menu_only);
  const [startShowTip, setStartShowTip] = useState(selectedBot.start_show_tip);

  useEffect(() => {
    setMenuItems(initialItems);
  }, [initialItems, selectedBot.id]);

  useEffect(() => {
    setStartWelcomeMessage(selectedBot.start_welcome_message ?? '');
    setStartShowMenuOnly(selectedBot.start_show_menu_only);
    setStartShowTip(selectedBot.start_show_tip);
  }, [selectedBot.id, selectedBot.start_welcome_message, selectedBot.start_show_menu_only, selectedBot.start_show_tip]);
  const [formData, setFormData] = useState<FormState>(emptyForm());

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
      setMenuItems([...menuItems, menuItem]);
      setIsCreateOpen(false);
      setFormData(emptyForm());
      toast.success('Product added — it will show on /start in Telegram');
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
      setMenuItems(menuItems.map((item) => (item.id === editingItem.id ? menuItem : item)));
      setEditingItem(null);
      setFormData(emptyForm());
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
        <Select
          value={formData.type}
          onValueChange={(v) => setFormData({ ...formData, type: v as MenuItemType })}
        >
          <SelectTrigger className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700">
            <SelectItem value="DIGITAL_DELIVERY" className="text-zinc-900 dark:text-white">
              {TYPE_LABEL.DIGITAL_DELIVERY}
            </SelectItem>
            <SelectItem value="MANUAL_DELIVERY" className="text-zinc-900 dark:text-white">
              {TYPE_LABEL.MANUAL_DELIVERY}
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-zinc-500">{TYPE_HELP[formData.type]}</p>
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
          <Dialog open={isStartSettingsOpen} onOpenChange={setIsStartSettingsOpen}>
            <DialogTrigger
              render={
                <Button type="button" variant="outline" className="w-full sm:w-auto border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                  Edit /start message
                </Button>
              }
            />
            <DialogContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-zinc-900 dark:text-white">Telegram /start settings</DialogTitle>
                <DialogDescription className="text-zinc-600 dark:text-zinc-400">
                  Customize what users see when they press Start or type /start.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label className="text-zinc-700 dark:text-zinc-300">Custom welcome message (optional)</Label>
                  <Textarea
                    value={startWelcomeMessage}
                    onChange={(e) => setStartWelcomeMessage(e.target.value)}
                    className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white min-h-[88px]"
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
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-200 dark:bg-zinc-800"
                  />
                  Show only menu list on /start (hide welcome/title text)
                </label>

                <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={startShowTip}
                    onChange={(e) => setStartShowTip(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-200 dark:bg-zinc-800"
                  />
                  Show &quot;Browse menu&quot; tip message after /start
                </label>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsStartSettingsOpen(false)}
                  className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveStartSettings}
                  disabled={startSettingsLoading}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {startSettingsLoading ? 'Saving…' : 'Save /start settings'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (open) setFormData(emptyForm());
            }}
          >
            <DialogTrigger
              render={
                <Button type="button" className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
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

      {menuItems.length === 0 ? (
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <Package className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">No products yet</h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-center max-w-md text-sm">
              Add at least one product here. Until then, your bot will tell customers the menu is empty when they
              use /start.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {menuItems.map((item) => {
            const itemType: MenuItemType =
              item.type === 'MANUAL_DELIVERY' ? 'MANUAL_DELIVERY' : 'DIGITAL_DELIVERY';
            return (
              <Card key={item.id} className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="text-base text-zinc-900 dark:text-white leading-snug">{item.name}</CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <Badge variant="outline" className="border-zinc-600 text-zinc-700 dark:text-zinc-300 text-xs">
                          {TYPE_LABEL[itemType]}
                        </Badge>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {item.price > 0 ? formatCurrencyAmount(item.price, currency) : 'Free'}
                        </span>
                        {itemType === 'DIGITAL_DELIVERY' ? (
                          <Link
                            href={`/stock?bot=${selectedBot.id}`}
                            className="text-xs text-indigo-400 hover:text-indigo-300 underline-offset-2 hover:underline"
                          >
                            Manage stock
                          </Link>
                        ) : null}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                        onClick={() => openEdit(item)}
                        aria-label="Edit product"
                      >
                        <PencilSimple className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="border-zinc-300 dark:border-zinc-700 text-red-400 hover:bg-red-950/30"
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
            setFormData(emptyForm());
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
