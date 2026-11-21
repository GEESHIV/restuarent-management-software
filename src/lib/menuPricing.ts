import type { MenuItem, MenuSize } from "@/types";

export const MENU_SIZES: MenuSize[] = ["small", "medium", "large"];

export function hasMenuSizes(item: MenuItem): boolean {
  return item.small_price != null && item.medium_price != null && item.large_price != null;
}

export function getMenuItemPrice(item: MenuItem, size: MenuSize | null): number {
  if (!size) return Number(item.price);
  const price = item[`${size}_price`];
  return price == null ? Number(item.price) : Number(price);
}

export function menuSizeLabel(size: MenuSize): string {
  return size.charAt(0).toUpperCase() + size.slice(1);
}
