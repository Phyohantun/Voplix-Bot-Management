'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface OrdersDashboardProps {
  bots: any[];
  orders: any[];
  selectedBotId: string | null;
}

const statusColors: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-600',
  SLIP_SUBMITTED: 'bg-blue-600',
  APPROVED: 'bg-green-600',
  COMPLETED: 'bg-indigo-600',
  REJECTED: 'bg-red-600',
};

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: 'Pending Payment',
  SLIP_SUBMITTED: 'Slip Submitted',
  APPROVED: 'Approved',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

export function OrdersDashboard({ bots, orders: initialOrders, selectedBotId }: OrdersDashboardProps) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  const handleSelectChange = (value: string | null) => {
    if (value === 'all' || value === null) {
      router.push('/orders');
    } else {
      router.push(`/orders?bot=${value}`);
    }
    router.refresh();
  };

  const pendingOrders = useMemo(
    () => orders.filter((o: any) => o.status === 'SLIP_SUBMITTED'),
    [orders]
  );

  const handleApprove = async (order: any) => {
    setLoading(true);

    try {
      const response = await fetch(`/api/orders/${order.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual_delivery_data: null }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve order');
      }

      setOrders(orders.map((o: any) => (o.id === order.id ? { ...o, status: 'COMPLETED' } : o)));
      toast.success('Order confirmed');
    } catch {
      toast.error('Failed to approve order');
    }

    setLoading(false);
  };

  const handleReject = async (order: any) => {
    setLoading(true);
    const reason = (rejectReasons[order.id] || '').trim();

    try {
      const response = await fetch(`/api/orders/${order.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject order');
      }

      setOrders(orders.map((o: any) => (o.id === order.id ? { ...o, status: 'REJECTED' } : o)));
      toast.success('Order rejected');
    } catch {
      toast.error('Failed to reject order');
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Select value={selectedBotId || 'all'} onValueChange={handleSelectChange}>
          <SelectTrigger className="w-[280px] bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="All bots" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all" className="text-white">All bots</SelectItem>
            {bots.map((bot) => (
              <SelectItem key={bot.id} value={bot.id} className="text-white">
                @{bot.bot_username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-sm text-zinc-400">{pendingOrders.length} pending verification</p>
      </div>

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-white">Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-zinc-400">No orders found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-zinc-400">
                  <tr className="border-b border-zinc-800">
                    <th className="py-2 text-left font-medium">Order number</th>
                    <th className="py-2 text-left font-medium">Customer Telegram name</th>
                    <th className="py-2 text-left font-medium">Product purchased</th>
                    <th className="py-2 text-left font-medium">Price</th>
                    <th className="py-2 text-left font-medium">Time</th>
                    <th className="py-2 text-left font-medium">Payment slip</th>
                    <th className="py-2 text-left font-medium">Status</th>
                    <th className="py-2 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order: any) => (
                    <tr key={order.id} className="border-b border-zinc-800/60 align-top text-zinc-200">
                      <td className="py-2">#{order.id.slice(0, 8)}</td>
                      <td className="py-2">{order.telegram_username || order.telegram_user_id}</td>
                      <td className="py-2">{order.menu_items?.name || '-'}</td>
                      <td className="py-2">{Number(order.menu_items?.price || 0).toLocaleString()} THB</td>
                      <td className="py-2">{new Date(order.created_at).toLocaleString()}</td>
                      <td className="py-2">
                        {order.slip_image_url ? (
                          <button
                            type="button"
                            className="text-indigo-400 hover:text-indigo-300"
                            onClick={() => setSelectedOrder(order)}
                          >
                            Click to view
                          </button>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </td>
                      <td className="py-2">
                        <Badge className={`${statusColors[order.status]} text-white`}>
                          {statusLabels[order.status]}
                        </Badge>
                      </td>
                      <td className="py-2 min-w-[280px]">
                        {order.status === 'SLIP_SUBMITTED' ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleApprove(order)}
                                disabled={loading}
                                className="h-8 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="mr-1 h-4 w-4" />
                                Confirm
                              </Button>
                              <Button
                                onClick={() => handleReject(order)}
                                disabled={loading}
                                variant="outline"
                                className="h-8 border-red-700 text-red-400 hover:bg-red-950/30"
                              >
                                <XCircle className="mr-1 h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                            <Input
                              placeholder="Reject reason (optional)"
                              value={rejectReasons[order.id] || ''}
                              onChange={(e) =>
                                setRejectReasons((prev) => ({ ...prev, [order.id]: e.target.value }))
                              }
                              className="h-8 bg-zinc-800 border-zinc-700 text-white"
                            />
                          </div>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl border-zinc-800 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-white">Payment Slip</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Order #{selectedOrder?.id?.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {selectedOrder.slip_image_url && (
                <div className="space-y-2">
                  <div className="rounded-lg overflow-hidden border border-zinc-800 bg-zinc-800">
                    <img
                      src={`/api/orders/${selectedOrder.id}/slip`}
                      alt="Payment slip"
                      className="w-full max-h-80 object-contain"
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedOrder(null)} className="border-zinc-700 text-zinc-300">
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
