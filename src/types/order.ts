export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

export interface Order {
  id: string;
  guildId: string;
  channelId: string;
  userId: string;
  username: string;
  itemDetails: string;
  quantity: number;
  status: OrderStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderDTO {
  guildId: string;
  channelId: string;
  userId: string;
  username: string;
  itemDetails: string;
  quantity?: number;
  notes?: string;
}

export function formatOrderId(id: string | number): string {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(numericId)) {
    return `#ORD-${id}`;
  }
  return `#ORD-${numericId.toString().padStart(4, '0')}`;
}
