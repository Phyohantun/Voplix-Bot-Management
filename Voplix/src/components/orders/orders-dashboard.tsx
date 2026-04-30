'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, CheckCircle, XCircle, Clock, User } from 'lucide-react';
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
  const [deliveryData, setDeliveryData] = useState({
    username: '',
    password: '',
    note: '',
  });

  const pendingOrders = orders.filter(o => o.status === 'SLIP_SUBMITTED');
  const otherOrders = orders.filter(o => o.status !== 'SLIP_SUBMITTED');

  const handleSelectChange = (value: string | null) => {
    if (value === 'all' || value === null) {
      router.push('/orders');
    } else {
      router.push(`/orders?bot=${value}`);
    }
    router.refresh();
  };

  const handleApprove = async () => {
    if (!selectedOrder) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manual_delivery_data: deliveryData.username || deliveryData.password || deliveryData.note
            ? deliveryData
            : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve order');
      }

      setOrders(orders.map(o => 
        o.id === selectedOrder.id 
          ? { ...o, status: 'COMPLETED', manual_delivery_data: deliveryData }
          : o
      ));
      setSelectedOrder(null);
      setDeliveryData({ username: '', password: '', note: '' });
      toast.success('Order approved and delivered');
    } catch (error) {
      toast.error('Failed to approve order');
    }

    setLoading(false);
  };

  const handleReject = async () => {
    if (!selectedOrder) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/reject`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reject order');
      }

      setOrders(orders.map(o => 
        o.id === selectedOrder.id 
          ? { ...o, status: 'REJECTED' }
          : o
      ));
      setSelectedOrder(null);
      toast.success('Order rejected');
    } catch (error) {
      toast.error('Failed to reject order');
    }

    setLoading(false);
  };

  const OrderCard = ({ order }: { order: any }) => (
    <Card 
      className="border-zinc-800 bg-zinc-900 cursor-pointer hover:bg-zinc-800/50 transition-colors"
      onClick={() => setSelectedOrder(order)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-zinc-400" />
            </div>
            <div>
              <CardTitle className="text-sm text-white">{order.menu_items?.name}</CardTitle>
              <p className="text-xs text-zinc-400">
                {order.menu_items?.price.toLocaleString()} THB • @{order.bots?.bot_username}
              </p>
            </div>
          </div>
          <Badge className={`${statusColors[order.status]} text-white text-xs`}>
            {statusLabels[order.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <User className="h-4 w-4" />
          <span>{order.telegram_username || `User ${order.telegram_user_id}`}</span>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          {new Date(order.created_at).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );

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

        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Clock className="h-4 w-4 text-yellow-500" />
          <span>{pendingOrders.length} pending</span>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-zinc-800 border-zinc-700">
          <TabsTrigger value="pending" className="data-[state=active]:bg-zinc-700">
            Pending ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-zinc-700">
            All Orders ({orders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingOrders.length === 0 ? (
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No pending orders</h3>
                <p className="text-zinc-400">All orders have been processed!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          {orders.length === 0 ? (
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingCart className="h-12 w-12 text-zinc-500 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No orders yet</h3>
                <p className="text-zinc-400">Orders will appear here when customers make purchases.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg border-zinc-800 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-white">Order Details</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Review and process this order
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-500">Product</span>
                  <p className="text-white font-medium">{selectedOrder.menu_items?.name}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Price</span>
                  <p className="text-white font-medium">{selectedOrder.menu_items?.price.toLocaleString()} THB</p>
                </div>
                <div>
                  <span className="text-zinc-500">Customer</span>
                  <p className="text-white font-medium">
                    {selectedOrder.telegram_username || `User ${selectedOrder.telegram_user_id}`}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500">Status</span>
                  <Badge className={`${statusColors[selectedOrder.status]} text-white`}>
                    {statusLabels[selectedOrder.status]}
                  </Badge>
                </div>
              </div>

              {selectedOrder.slip_image_url && (
                <div className="space-y-2">
                  <span className="text-zinc-500 text-sm">Payment Slip</span>
                  <div className="rounded-lg overflow-hidden border border-zinc-800 bg-zinc-800">
                    <img
                      src={`/api/orders/${selectedOrder.id}/slip`}
                      alt="Payment slip"
                      className="w-full max-h-80 object-contain"
                    />
                  </div>
                </div>
              )}

              {selectedOrder.status === 'SLIP_SUBMITTED' && (
                <>
                  <div className="space-y-3 pt-4 border-t border-zinc-800">
                    <h4 className="text-sm font-medium text-white">Delivery Details (Optional)</h4>
                    <div className="space-y-2">
                      <Input
                        placeholder="Username / Account"
                        value={deliveryData.username}
                        onChange={(e) => setDeliveryData({ ...deliveryData, username: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                      <Input
                        placeholder="Password / Key"
                        value={deliveryData.password}
                        onChange={(e) => setDeliveryData({ ...deliveryData, password: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                      <Input
                        placeholder="Additional note"
                        value={deliveryData.note}
                        onChange={(e) => setDeliveryData({ ...deliveryData, note: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={handleReject}
                      disabled={loading}
                      className="border-red-700 text-red-400 hover:bg-red-950/30"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve & Deliver
                    </Button>
                  </DialogFooter>
                </>
              )}

              {selectedOrder.status === 'COMPLETED' && selectedOrder.manual_delivery_data && (
                <div className="pt-4 border-t border-zinc-800">
                  <h4 className="text-sm font-medium text-white mb-2">Delivered</h4>
                  <div className="bg-zinc-800 rounded p-3 text-sm text-zinc-300">
                    {Object.entries(selectedOrder.manual_delivery_data).map(([key, value]) => (
                      value ? (
                        <p key={key}>
                          <span className="text-zinc-500 capitalize">{key}:</span> {value as string}
                        </p>
                      ) : null
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
