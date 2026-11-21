import type { ItemStatus, OrderStatus, TableStatus } from "@/types";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  pending: "amber",
  accepted: "blue",
  preparing: "blue",
  ready: "green",
  served: "green",
  completed: "stone",
  cancelled: "red",
};

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
};

export const TABLE_STATUS_LABEL: Record<TableStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  bill_pending: "Bill Pending",
};

export const TABLE_STATUS_COLOR: Record<TableStatus, "green" | "red" | "amber"> = {
  available: "green",
  occupied: "red",
  bill_pending: "amber",
};
