export type Role = "owner" | "waiter" | "kitchen";

export type TableStatus = "available" | "occupied" | "bill_pending";

export type OrderType = "dine_in" | "takeaway" | "delivery";
export type OrderChannel = "waiter" | "qr" | "online";
export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "cancelled";
export type ItemStatus = "pending" | "accepted" | "preparing" | "ready" | "served";
export type PaymentStatus = "unpaid" | "paid";
export type PaymentMethod = "cash" | "upi" | "card";
export type MenuSize = "small" | "medium" | "large" | "half" | "full";
export type MenuSizeOption = "none" | "small_medium_large" | "half_full";

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  upi_id: string | null;
  upi_name: string | null;
  gst_enabled: boolean;
  gst_percentage: number;
  service_charge_percentage: number;
  currency: string;
  logo_url: string | null;
  created_at: string;
}

export interface Staff {
  id: string;
  user_id: string;
  restaurant_id: string;
  role: Role;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  small_price: number | null;
  medium_price: number | null;
  large_price: number | null;
  half_price: number | null;
  full_price: number | null;
  size_option: MenuSizeOption;
  is_veg: boolean;
  is_available: boolean;
  is_bestseller: boolean;
  image_url: string | null;
  emoji: string;
  sort_order: number;
  category?: Category | null;
}

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  name: string;
  seats: number;
  status: TableStatus;
  qr_token: string;
  created_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  order_type: OrderType;
  order_channel: OrderChannel;
  status: OrderStatus;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  special_instructions: string | null;
  subtotal: number;
  tax_amount: number;
  service_charge: number;
  total: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  item_count: number;
  access_token: string;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  table?: RestaurantTable | null;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  restaurant_id: string;
  menu_item_id: string | null;
  name: string;
  price: number;
  item_size: MenuSize | null;
  quantity: number;
  is_veg: boolean;
  emoji: string;
  special_instructions: string | null;
  status: ItemStatus;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  restaurant_id: string;
  amount: number;
  method: PaymentMethod;
  created_at: string;
}

export interface Expense {
  id: string;
  restaurant_id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  restaurant_id: string;
  name: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  cost_per_unit: number;
  created_at: string;
}
