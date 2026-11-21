// Edge function: seed-demo
// Creates demo auth accounts (owner/waiter/kitchen) and seeds a full demo restaurant
// with categories, menu items, tables, inventory, expenses, and sample orders.
// Uses the service role key to bypass RLS for seeding.
//
// Call with: POST /functions/v1/seed-demo  (no body required)
// Idempotent: re-running updates/creates as needed and reports what was done.

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type StaffSeed = {
  email: string;
  password: string;
  fullName: string;
  role: "owner" | "waiter" | "kitchen";
};

const STAFF: StaffSeed[] = [
  { email: "owner@demo.restaurant", password: "SpiceGarden2025!", fullName: "Arjun Mehta (Owner)", role: "owner" },
  { email: "waiter@demo.restaurant", password: "SpiceGarden2025!", fullName: "Priya Sharma (Waiter)", role: "waiter" },
  { email: "kitchen@demo.restaurant", password: "SpiceGarden2025!", fullName: "Vikram Singh (Kitchen)", role: "kitchen" },
];

const CATEGORIES = [
  { name: "Starters", sort_order: 1 },
  { name: "Main Course", sort_order: 2 },
  { name: "Breads", sort_order: 3 },
  { name: "Rice & Biryani", sort_order: 4 },
  { name: "Desserts", sort_order: 5 },
  { name: "Beverages", sort_order: 6 },
];

type MenuItemSeed = {
  name: string;
  description: string;
  price: number;
  is_veg: boolean;
  category: string;
  emoji: string;
  sort_order: number;
};

const MENU: MenuItemSeed[] = [
  // Starters
  { name: "Paneer Tikka", description: "Marinated cottage cheese grilled in tandoor", price: 220, is_veg: true, category: "Starters", emoji: "🧀", sort_order: 1 },
  { name: "Chicken 65", description: "Spicy deep-fried chicken with curry leaves", price: 260, is_veg: false, category: "Starters", emoji: "🍗", sort_order: 2 },
  { name: "Veg Spring Rolls", description: "Crispy rolls stuffed with vegetables", price: 180, is_veg: true, category: "Starters", emoji: "🥬", sort_order: 3 },
  { name: "Fish Amritsari", description: "Batter-fried fish with Punjabi spices", price: 290, is_veg: false, category: "Starters", emoji: "🐟", sort_order: 4 },
  // Main Course
  { name: "Butter Paneer", description: "Creamy tomato gravy with paneer cubes", price: 280, is_veg: true, category: "Main Course", emoji: "🍛", sort_order: 1 },
  { name: "Dal Makhani", description: "Slow-cooked black lentils in butter", price: 240, is_veg: true, category: "Main Course", emoji: "🥣", sort_order: 2 },
  { name: "Butter Chicken", description: "Tandoori chicken in rich makhani gravy", price: 340, is_veg: false, category: "Main Course", emoji: "🍗", sort_order: 3 },
  { name: "Mutton Rogan Josh", description: "Aromatic Kashmiri mutton curry", price: 420, is_veg: false, category: "Main Course", emoji: "🍖", sort_order: 4 },
  { name: "Palak Paneer", description: "Paneer in creamy spinach gravy", price: 270, is_veg: true, category: "Main Course", emoji: "🥬", sort_order: 5 },
  // Breads
  { name: "Butter Naan", description: "Soft tandoor bread brushed with butter", price: 60, is_veg: true, category: "Breads", emoji: "🫓", sort_order: 1 },
  { name: "Garlic Naan", description: "Naan topped with garlic and coriander", price: 80, is_veg: true, category: "Breads", emoji: "🧄", sort_order: 2 },
  { name: "Tandoori Roti", description: "Whole wheat tandoor bread", price: 40, is_veg: true, category: "Breads", emoji: "🫓", sort_order: 3 },
  // Rice & Biryani
  { name: "Veg Biryani", description: "Fragrant basmati with vegetables and spices", price: 240, is_veg: true, category: "Rice & Biryani", emoji: "🍚", sort_order: 1 },
  { name: "Chicken Biryani", description: "Hyderabadi dum biryani with raita", price: 320, is_veg: false, category: "Rice & Biryani", emoji: "🍚", sort_order: 2 },
  { name: "Mutton Biryani", description: "Slow-cooked mutton biryani with saffron", price: 380, is_veg: false, category: "Rice & Biryani", emoji: "🍚", sort_order: 3 },
  { name: "Jeera Rice", description: "Cumin-tempered basmati rice", price: 140, is_veg: true, category: "Rice & Biryani", emoji: "🍚", sort_order: 4 },
  // Desserts
  { name: "Gulab Jamun", description: "Warm dumplings in sugar syrup", price: 120, is_veg: true, category: "Desserts", emoji: "🍮", sort_order: 1 },
  { name: "Rasmalai", description: "Soft cheese discs in saffron milk", price: 140, is_veg: true, category: "Desserts", emoji: "🥛", sort_order: 2 },
  { name: "Ice Cream Sundae", description: "Vanilla ice cream with nuts and sauce", price: 160, is_veg: true, category: "Desserts", emoji: "🍨", sort_order: 3 },
  // Beverages
  { name: "Masala Chai", description: "Spiced Indian tea with milk", price: 40, is_veg: true, category: "Beverages", emoji: "☕", sort_order: 1 },
  { name: "Fresh Lime Soda", description: "Refreshing lime soda, sweet or salty", price: 80, is_veg: true, category: "Beverages", emoji: "🍋", sort_order: 2 },
  { name: "Mango Lassi", description: "Thick yogurt drink with mango", price: 100, is_veg: true, category: "Beverages", emoji: "🥭", sort_order: 3 },
  { name: "Cold Coffee", description: "Chilled coffee with ice cream", price: 120, is_veg: true, category: "Beverages", emoji: "🥤", sort_order: 4 },
];

const TABLES = [
  { name: "T1", seats: 2 },
  { name: "T2", seats: 4 },
  { name: "T3", seats: 4 },
  { name: "T4", seats: 6 },
  { name: "T5", seats: 2 },
  { name: "T6", seats: 8 },
];

const INVENTORY = [
  { name: "Basmati Rice", unit: "kg", quantity: 45, min_quantity: 10, cost_per_unit: 80 },
  { name: "Chicken", unit: "kg", quantity: 18, min_quantity: 8, cost_per_unit: 220 },
  { name: "Paneer", unit: "kg", quantity: 12, min_quantity: 5, cost_per_unit: 280 },
  { name: "Tomatoes", unit: "kg", quantity: 30, min_quantity: 10, cost_per_unit: 40 },
  { name: "Onions", unit: "kg", quantity: 35, min_quantity: 10, cost_per_unit: 35 },
  { name: "Cooking Oil", unit: "ltr", quantity: 8, min_quantity: 5, cost_per_unit: 160 },
  { name: "Mutton", unit: "kg", quantity: 4, min_quantity: 6, cost_per_unit: 650 },
  { name: "Wheat Flour", unit: "kg", quantity: 50, min_quantity: 15, cost_per_unit: 45 },
];

function buildOrdersPayload(
  restaurantId: string,
  tableIds: string[],
  menuByCategory: Record<string, any[]>,
  gstPercentage: number,
  serviceChargePercentage: number
) {
  const m = menuByCategory;
  const now = new Date();
  const isoFromMinutesAgo = (mins: number) => new Date(now.getTime() - mins * 60000).toISOString();

  const mkTotals = (subtotal: number) => {
    const tax = +(subtotal * gstPercentage / 100).toFixed(2);
    const service = +(subtotal * serviceChargePercentage / 100).toFixed(2);
    const total = +(subtotal + tax + service).toFixed(2);
    return { subtotal: +subtotal.toFixed(2), tax_amount: tax, service_charge: service, total };
  };

  // Completed dine-in order paid by upi (today)
  const o1Sub = m["Main Course"][0].price + m["Breads"][0].price * 2 + m["Beverages"][0].price;
  const o1 = {
    restaurant_id: restaurantId,
    table_id: tableIds[0],
    order_type: "dine_in",
    order_channel: "waiter",
    status: "completed",
    subtotal: o1Sub,
    ...mkTotals(o1Sub),
    payment_status: "paid",
    payment_method: "upi",
    item_count: 4,
    created_at: isoFromMinutesAgo(180),
    accepted_at: isoFromMinutesAgo(178),
    ready_at: isoFromMinutesAgo(160),
  };
  const o1Items = [
    { ...m["Main Course"][0], quantity: 1, status: "served" },
    { ...m["Breads"][0], quantity: 2, status: "served" },
    { ...m["Beverages"][0], quantity: 1, status: "served" },
  ];

  // Completed takeaway paid by cash (today)
  const o2Sub = m["Rice & Biryani"][1].price + m["Beverages"][2].price;
  const o2 = {
    restaurant_id: restaurantId,
    order_type: "takeaway",
    order_channel: "online",
    status: "completed",
    customer_name: "Rahul Verma",
    customer_phone: "9876543210",
    subtotal: o2Sub,
    ...mkTotals(o2Sub),
    payment_status: "paid",
    payment_method: "cash",
    item_count: 2,
    created_at: isoFromMinutesAgo(120),
    accepted_at: isoFromMinutesAgo(118),
    ready_at: isoFromMinutesAgo(95),
  };
  const o2Items = [
    { ...m["Rice & Biryani"][1], quantity: 1, status: "served" },
    { ...m["Beverages"][2], quantity: 1, status: "served" },
  ];

  // Active preparing order on T3 (dine-in waiter)
  const o3Sub = m["Starters"][1].price + m["Main Course"][2].price + m["Breads"][1].price * 2;
  const o3 = {
    restaurant_id: restaurantId,
    table_id: tableIds[2],
    order_type: "dine_in",
    order_channel: "waiter",
    status: "preparing",
    special_instructions: "Extra spicy please",
    subtotal: o3Sub,
    ...mkTotals(o3Sub),
    payment_status: "unpaid",
    item_count: 4,
    created_at: isoFromMinutesAgo(12),
    accepted_at: isoFromMinutesAgo(10),
  };
  const o3Items = [
    { ...m["Starters"][1], quantity: 1, status: "accepted" },
    { ...m["Main Course"][2], quantity: 1, status: "accepted" },
    { ...m["Breads"][1], quantity: 2, status: "preparing" },
  ];

  // Pending online delivery order
  const o4Sub = m["Main Course"][1].price + m["Breads"][2].price * 3 + m["Desserts"][0].price;
  const o4 = {
    restaurant_id: restaurantId,
    order_type: "delivery",
    order_channel: "online",
    status: "pending",
    customer_name: "Anita Desai",
    customer_phone: "9988776655",
    customer_address: "42 Lotus Apartments, MG Road, Bengaluru 560001",
    subtotal: o4Sub,
    ...mkTotals(o4Sub),
    payment_status: "unpaid",
    item_count: 5,
    created_at: isoFromMinutesAgo(4),
  };
  const o4Items = [
    { ...m["Main Course"][1], quantity: 1, status: "pending" },
    { ...m["Breads"][2], quantity: 3, status: "pending" },
    { ...m["Desserts"][0], quantity: 1, status: "pending" },
  ];

  return [
    { order: o1, items: o1Items },
    { order: o2, items: o2Items },
    { order: o3, items: o3Items },
    { order: o4, items: o4Items },
  ];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const log: string[] = [];
  try {
    // 1. Upsert restaurant (by slug)
    const RESTAURANT_SLUG = "spice-garden";
    const { data: existing } = await admin
      .from("restaurants")
      .select("id")
      .eq("slug", RESTAURANT_SLUG)
      .maybeSingle();

    let restaurantId: string;
    if (existing) {
      restaurantId = existing.id;
      await admin.from("restaurants").update({
        name: "Spice Garden",
        address: "12 Brigade Road, Bengaluru 560001",
        phone: "+91 80 4000 1234",
        gst_enabled: true,
        gst_percentage: 5,
        service_charge_percentage: 10,
        currency: "₹",
      }).eq("id", restaurantId);
      log.push("Updated existing restaurant");
    } else {
      const { data: created, error } = await admin.from("restaurants").insert({
        name: "Spice Garden",
        slug: RESTAURANT_SLUG,
        address: "12 Brigade Road, Bengaluru 560001",
        phone: "+91 80 4000 1234",
        gst_enabled: true,
        gst_percentage: 5,
        service_charge_percentage: 10,
        currency: "₹",
      }).select("id").single();
      if (error) throw error;
      restaurantId = created.id;
      log.push("Created restaurant Spice Garden");
    }

    // 2. Upsert staff auth accounts + staff rows
    for (const s of STAFF) {
      // List users by email
      const { data: list } = await admin.auth.admin.listUsers();
      const found = (list?.users || []).find((u) => u.email === s.email);
      let userId: string;
      if (found) {
        // Update password + reactivate
        const { data: upd, error } = await admin.auth.admin.updateUserById(found.id, {
          password: s.password,
          email_confirm: true,
        });
        if (error) throw error;
        userId = upd!.user.id;
        log.push(`Updated auth user ${s.email}`);
      } else {
        const { data: created, error } = await admin.auth.admin.createUser({
          email: s.email,
          password: s.password,
          email_confirm: true,
        });
        if (error) throw error;
        userId = created.user.id;
        log.push(`Created auth user ${s.email}`);
      }

      // Upsert staff row
      const { data: staffRow } = await admin
        .from("staff")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("email", s.email)
        .maybeSingle();
      if (staffRow) {
        await admin.from("staff").update({
          user_id: userId,
          role: s.role,
          full_name: s.fullName,
          is_active: true,
        }).eq("id", staffRow.id);
        log.push(`Updated staff ${s.role}`);
      } else {
        await admin.from("staff").insert({
          user_id: userId,
          restaurant_id: restaurantId,
          role: s.role,
          full_name: s.fullName,
          email: s.email,
          is_active: true,
        });
        log.push(`Inserted staff ${s.role}`);
      }
    }

    // 3. Upsert categories
    const { data: existingCats } = await admin
      .from("categories")
      .select("id, name")
      .eq("restaurant_id", restaurantId);
    const catMap: Record<string, string> = {};
    for (const c of CATEGORIES) {
      const found = (existingCats || []).find((x) => x.name === c.name);
      if (found) {
        catMap[c.name] = found.id;
        await admin.from("categories").update({ sort_order: c.sort_order }).eq("id", found.id);
      } else {
        const { data: nc } = await admin.from("categories").insert({
          restaurant_id: restaurantId,
          name: c.name,
          sort_order: c.sort_order,
        }).select("id").single();
        catMap[c.name] = nc!.id;
      }
    }
    log.push(`Categories ready: ${CATEGORIES.length}`);

    // 4. Upsert menu items by name + restaurant
    const { data: existingMenu } = await admin
      .from("menu_items")
      .select("id, name")
      .eq("restaurant_id", restaurantId);
    for (const mi of MENU) {
      const found = (existingMenu || []).find((x) => x.name === mi.name);
      const payload = {
        restaurant_id: restaurantId,
        category_id: catMap[mi.category],
        name: mi.name,
        description: mi.description,
        price: mi.price,
        is_veg: mi.is_veg,
        is_available: true,
        emoji: mi.emoji,
        sort_order: mi.sort_order,
      };
      if (found) {
        await admin.from("menu_items").update(payload).eq("id", found.id);
      } else {
        await admin.from("menu_items").insert(payload);
      }
    }
    log.push(`Menu items ready: ${MENU.length}`);

    // 5. Upsert tables by name + restaurant
    const { data: existingTables } = await admin
      .from("restaurant_tables")
      .select("id, name")
      .eq("restaurant_id", restaurantId);
    const tableIds: string[] = [];
    for (let i = 0; i < TABLES.length; i++) {
      const t = TABLES[i];
      const found = (existingTables || []).find((x) => x.name === t.name);
      if (found) {
        tableIds.push(found.id);
        await admin.from("restaurant_tables").update({ seats: t.seats }).eq("id", found.id);
      } else {
        const { data: nt } = await admin.from("restaurant_tables").insert({
          restaurant_id: restaurantId,
          name: t.name,
          seats: t.seats,
        }).select("id").single();
        tableIds.push(nt!.id);
      }
    }
    log.push(`Tables ready: ${TABLES.length}`);

    // 6. Upsert inventory by name + restaurant
    const { data: existingInv } = await admin
      .from("inventory")
      .select("id, name")
      .eq("restaurant_id", restaurantId);
    for (const inv of INVENTORY) {
      const found = (existingInv || []).find((x) => x.name === inv.name);
      const payload = {
        restaurant_id: restaurantId,
        name: inv.name,
        unit: inv.unit,
        quantity: inv.quantity,
        min_quantity: inv.min_quantity,
        cost_per_unit: inv.cost_per_unit,
      };
      if (found) {
        await admin.from("inventory").update(payload).eq("id", found.id);
      } else {
        await admin.from("inventory").insert(payload);
      }
    }
    log.push(`Inventory ready: ${INVENTORY.length}`);

    // 7. Seed a few expenses for today
    const { data: existingExp } = await admin
      .from("expenses")
      .select("id")
      .eq("restaurant_id", restaurantId);
    if (!existingExp || existingExp.length === 0) {
      const expenses = [
        { category: "Groceries", amount: 3500, description: "Vegetables and dairy" },
        { category: "Utilities", amount: 1200, description: "Gas cylinder refill" },
        { category: "Salaries", amount: 8000, description: "Staff daily wages" },
      ];
      for (const e of expenses) {
        await admin.from("expenses").insert({ restaurant_id: restaurantId, ...e });
      }
      log.push("Seeded 3 expenses");
    }

    // 8. Seed sample orders + order_items + payments (only if none exist)
    const { data: existingOrders } = await admin
      .from("orders")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .limit(1);
    if (!existingOrders || existingOrders.length === 0) {
      // Re-fetch menu to get ids + is_veg
      const { data: menuRows } = await admin
        .from("menu_items")
        .select("id, name, price, is_veg, category_id, categories!inner(name)")
        .eq("restaurant_id", restaurantId);
      const menuByCategory: Record<string, any[]> = {};
      for (const r of menuRows || []) {
        const catName = (r.categories as any).name;
        if (!menuByCategory[catName]) menuByCategory[catName] = [];
        menuByCategory[catName].push({
          menu_item_id: r.id,
          name: r.name,
          price: r.price,
          is_veg: r.is_veg,
        });
      }

      const ordersPayload = buildOrdersPayload(
        restaurantId,
        tableIds,
        menuByCategory,
        5, // gst
        10 // service charge
      );

      for (const op of ordersPayload) {
        const { data: newOrder, error } = await admin.from("orders").insert(op.order).select("id, total, payment_status, payment_method, status").single();
        if (error) throw error;
        const items = op.items.map((it: any) => ({
          order_id: newOrder.id,
          restaurant_id: restaurantId,
          menu_item_id: it.menu_item_id,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          is_veg: it.is_veg,
          status: it.status,
        }));
        await admin.from("order_items").insert(items);
        if (newOrder.payment_status === "paid") {
          await admin.from("payments").insert({
            order_id: newOrder.id,
            restaurant_id: restaurantId,
            amount: newOrder.total,
            method: newOrder.payment_method,
          });
        }
        // Set table to occupied for active dine-in
        if (op.order.table_id && op.order.status !== "completed" && op.order.status !== "cancelled") {
          await admin.from("restaurant_tables").update({ status: "occupied" }).eq("id", op.order.table_id);
        }
      }
      log.push("Seeded 4 sample orders");
    } else {
      log.push("Orders already present, skipping order seed");
    }

    return new Response(JSON.stringify({
      success: true,
      restaurant_slug: RESTAURANT_SLUG,
      log,
      credentials: STAFF.map((s) => ({ email: s.email, password: s.password, role: s.role })),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, log }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
