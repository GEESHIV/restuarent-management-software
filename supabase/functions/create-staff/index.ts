// Edge function: create-staff
// Called by an authenticated restaurant owner to create a new staff account
// (waiter/kitchen/owner) for their restaurant. Uses the service role key so the
// owner's client session is never disturbed (client-side signUp would switch
// the session and break the RLS check on the staff INSERT).
//
// POST /functions/v1/create-staff
// Authorization: Bearer <user access token> (caller must be an authenticated owner)
// Body: { email, password, full_name, role, restaurant_id }
// Returns: { success: true, staff: { id, user_id } } or { error }

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
    const role = (body?.role || "").toString();
    const restaurantId = (body?.restaurant_id || "").toString();

    if (!email || !password || !fullName || !role || !restaurantId) {
      return new Response(
        JSON.stringify({ error: "All fields are required (email, password, full_name, role, restaurant_id)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!["owner", "waiter", "kitchen"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller is an authenticated owner of this restaurant.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: callerData, error: callerError } = await admin.auth.getUser(token);
    if (callerError || !callerData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: ownerRow, error: ownerError } = await admin.from("staff")
      .select("id, role, is_active")
      .eq("user_id", callerData.user.id)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    if (ownerError) {
      return new Response(JSON.stringify({ error: "Failed to verify restaurant owner: " + ownerError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ownerRow || ownerRow.role !== "owner" || !ownerRow.is_active) {
      return new Response(JSON.stringify({ error: "Only the restaurant owner can create staff accounts." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = authData.user.id;

    // Create the staff row
    const { data: staffRow, error: staffError } = await admin.from("staff").insert({
      user_id: userId,
      restaurant_id: restaurantId,
      role,
      full_name: fullName,
      email,
      is_active: true,
    }).select("id, user_id").single();
    if (staffError) {
      await admin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: "Failed to create staff profile: " + staffError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      staff: { id: staffRow.id, user_id: userId },
      message: `${role} account created for ${fullName}.`,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Failed to create staff." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
