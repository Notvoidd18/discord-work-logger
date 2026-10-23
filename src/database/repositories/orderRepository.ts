import { pool } from '../pool';
import { Order, CreateOrderDTO, OrderStatus } from '../../types/order';

interface OrderRow {
  id: string;
  guild_id: string;
  channel_id: string;
  user_id: string;
  username: string;
  item_details: string;
  quantity: number;
  status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapRowToOrder(row: OrderRow): Order {
  return {
    id: row.id.toString(),
    guildId: row.guild_id,
    channelId: row.channel_id,
    userId: row.user_id,
    username: row.username,
    itemDetails: row.item_details,
    quantity: row.quantity,
    status: row.status as OrderStatus,
    notes: row.notes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class OrderRepository {
  public async createOrder(dto: CreateOrderDTO): Promise<Order> {
    const query = `
      INSERT INTO orders (guild_id, channel_id, user_id, username, item_details, quantity, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7)
      RETURNING id, guild_id, channel_id, user_id, username, item_details, quantity, status, notes, created_at, updated_at;
    `;
    const values = [
      dto.guildId,
      dto.channelId,
      dto.userId,
      dto.username,
      dto.itemDetails,
      dto.quantity || 1,
      dto.notes || null,
    ];
    const res = await pool.query<OrderRow>(query, values);
    return mapRowToOrder(res.rows[0]);
  }

  public async getOrderById(id: string | number, guildId: string): Promise<Order | null> {
    const query = `
      SELECT id, guild_id, channel_id, user_id, username, item_details, quantity, status, notes, created_at, updated_at
      FROM orders
      WHERE id = $1 AND guild_id = $2;
    `;
    const res = await pool.query<OrderRow>(query, [id, guildId]);
    if (res.rows.length === 0) return null;
    return mapRowToOrder(res.rows[0]);
  }

  public async getRecentOrders(guildId: string, limit: number = 25): Promise<Order[]> {
    const query = `
      SELECT id, guild_id, channel_id, user_id, username, item_details, quantity, status, notes, created_at, updated_at
      FROM orders
      WHERE guild_id = $1
      ORDER BY id DESC
      LIMIT $2;
    `;
    const res = await pool.query<OrderRow>(query, [guildId, limit]);
    return res.rows.map(mapRowToOrder);
  }

  public async getTotalOrderCount(guildId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) AS total
      FROM orders
      WHERE guild_id = $1;
    `;
    const res = await pool.query<{ total: string }>(query, [guildId]);
    return parseInt(res.rows[0]?.total || '0', 10);
  }

  public async updateOrderStatus(id: string | number, guildId: string, status: OrderStatus): Promise<Order | null> {
    const query = `
      UPDATE orders
      SET status = $1,
          updated_at = NOW() AT TIME ZONE 'UTC'
      WHERE id = $2 AND guild_id = $3
      RETURNING id, guild_id, channel_id, user_id, username, item_details, quantity, status, notes, created_at, updated_at;
    `;
    const res = await pool.query<OrderRow>(query, [status, id, guildId]);
    if (res.rows.length === 0) return null;
    return mapRowToOrder(res.rows[0]);
  }
}

export const orderRepository = new OrderRepository();
