// Edge function: register-owner
// Atomically registers a new restaurant owner: creates the auth user, the restaurant,
// and the owner staff row. Uses the service role key to bypass RLS for the atomic create.
//
// POST /functions/v1/register-owner
// Body: { email, password, full_name, restaurant_name }
// Returns: { success: true, restaurant: { id, slug, name } } or { error }

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

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "restaurant"}-${suffix}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const email = (body?.email || "").toString().trim().toLowerCase();
    const password = (body?.password || "").toString();
    const fullName = (body?.full_name || "").toString().trim();
    const restaurantName = (body?.restaurant_name || "").toString().trim();

    if (!email || !password || !fullName || !restaurantName) {
      return new Response(
        JSON.stringify({ error: "All fields are required (email, password, full_name, restaurant_name)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Check if a user with this email already exists
    const { data: userList } = await admin.auth.admin.listUsers();
    const existing = (userList?.users || []).find((u) => u.email === email);
    if (existing) {
      return new Response(
        JSON.stringify({ error: "An account with this email already exists. Please sign in instead." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create the auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = authData.user.id;

    // 3. Generate a unique slug
    let slug = slugify(restaurantName);
    // ensure uniqueness
    const { data: slugCheck } = await admin.from("restaurants").select("id").eq("slug", slug).maybeSingle();
    if (slugCheck) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    // 4. Create the restaurant
    const { data: restaurant, error: restError } = await admin
      .from("restaurants")
      .insert({
        name: restaurantName,
        slug,
        gst_enabled: false,
        gst_percentage: 0,
        service_charge_percentage: 0,
        currency: "₹",
      })
      .select("id, slug, name")
      .single();
    if (restError) {
      // Clean up the auth user if restaurant creation failed
      await admin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Failed to create restaurant: " + restError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Create the owner staff row linking the auth user to the restaurant
    const { error: staffError } = await admin.from("staff").insert({
      user_id: userId,
      restaurant_id: restaurant.id,
      role: "owner",
      full_name: fullName,
      email,
      is_active: true,
    });
    if (staffError) {
      // Clean up
      await admin.from("restaurants").delete().eq("id", restaurant.id);
      await admin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Failed to create owner profile: " + staffError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        restaurant: { id: restaurant.id, slug: restaurant.slug, name: restaurant.name },
        message: "Registration successful. You can now sign in.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Registration failed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
