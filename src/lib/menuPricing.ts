import type { MenuItem, MenuSize } from "@/types";

export const MENU_SIZES: MenuSize[] = ["small", "medium", "large"];
export const HALF_FULL_SIZES: MenuSize[] = ["half", "full"];

export function hasMenuSizes(item: MenuItem): boolean {
  return item.size_option === "small_medium_large"
    || item.size_option === "half_full"
    || (item.small_price != null && item.medium_price != null && item.large_price != null)
    || (item.half_price != null && item.full_price != null);
}

export function getMenuSizes(item: MenuItem): MenuSize[] {
  if (item.size_option === "half_full" || item.half_price != null) return HALF_FULL_SIZES;
  if (item.size_option === "small_medium_large" || (item.small_price != null && item.medium_price != null && item.large_price != null)) return MENU_SIZES;
  return [];
}

export function getMenuItemPrice(item: MenuItem, size: MenuSize | null): number {
  if (!size) return Number(item.price);
  const price = item[`${size}_price`];
  return price == null ? Number(item.price) : Number(price);
}

export function menuSizeLabel(size: MenuSize): string {
  return size.charAt(0).toUpperCase() + size.slice(1);
}
