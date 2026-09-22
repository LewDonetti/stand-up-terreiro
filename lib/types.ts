export type OrderStatus = "pending" | "confirmed" | "cancelled";

export interface Order {
  id: string;
  reference: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  status: OrderStatus;
  comprovante_path: string | null;
  created_at: string;
  confirmed_at: string | null;
}

export interface Ticket {
  id: string;
  order_id: string;
  code: string;
  holder_name: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
}
