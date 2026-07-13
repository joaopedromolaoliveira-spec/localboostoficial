// Evolution API management endpoints with multi-session support
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/evolution-multi")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        if (action === "instances") {
          return handleGetInstances(request);
        } else if (action === "instance") {
          return handleGetInstance(request);
        }

        return json({ error: "unknown action" }, 400);
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        if (action === "create-instance") {
          return handleCreateInstance(request);
        } else if (action === "reconnect") {
          return handleReconnect(request);
        } else if (action === "disconnect") {
          return handleDisconnect(request);
        }

        return json({ error: "unknown action" }, 400);
      },
    },
  },
});

async function handleGetInstances(request: Request) {
  try {
    const { data: { user } } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin.auth.admin.getUserById("");
    if (!user) return json({ error: "unauthorized" }, 401);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: instances } = await supabaseAdmin
      .from("evolution_instances")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    return json({ instances: instances || [] });
  } catch (err) {
    console.error("get instances error", err);
    return json({ error: String(err) }, 500);
  }
}

async function handleGetInstance(request: Request) {
  try {
    const { data: { user } } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin.auth.admin.getUserById("");
    if (!user) return json({ error: "unauthorized" }, 401);

    const url = new URL(request.url);
    const instanceId = url.searchParams.get("id");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: instance } = await supabaseAdmin
      .from("evolution_instances")
      .select("*")
      .eq("owner_id", user.id)
      .eq("id", instanceId)
      .maybeSingle();

    if (!instance) {
      return json({ error: "instance not found" }, 404);
    }

    return json(instance);
  } catch (err) {
    console.error("get instance error", err);
    return json({ error: String(err) }, 500);
  }
}

async function handleCreateInstance(request: Request) {
  try {
    const { data: { user } } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin.auth.admin.getUserById("");
    if (!user) return json({ error: "unauthorized" }, 401);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get user subscription to check plan limits
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();

    const plan = subscription?.plan || "trial";

    // Get existing instances count
    const { data: existingInstances } = await supabaseAdmin
      .from("evolution_instances")
      .select("id", { count: "exact" })
      .eq("owner_id", user.id);

    const { getMaxInstancesForPlan, canCreateMoreInstances, generateInstanceName } = await import("@/lib/evolution-api-multi.server");

    const maxInstances = getMaxInstancesForPlan(plan);
    const currentCount = existingInstances?.length || 0;

    if (!canCreateMoreInstances(currentCount, maxInstances)) {
      return json(
        {
          error: `Limite de instâncias atingido. Seu plano permite ${maxInstances} instância${maxInstances !== 1 ? "s" : ""}.`,
        },
        403
      );
    }

    const { createEvolutionInstance, setEvolutionWebhook } = await import("@/lib/evolution-api-multi.server");

    const instanceName = generateInstanceName(user.id, currentCount);

    // Create instance
    const evolutionInstance = await createEvolutionInstance(instanceName);

    // Set webhook URL
    const webhookUrl = `${process.env.VITE_APP_URL || "http://localhost:5173"}/api/public/webhooks/evolution?owner=${user.id}`;
    await setEvolutionWebhook(instanceName, webhookUrl);

    // Save to database
    const { data: savedInstance, error: dbErr } = await supabaseAdmin
      .from("evolution_instances")
      .insert({
        owner_id: user.id,
        instance_name: instanceName,
        status: evolutionInstance.status || "scan_qr",
        qr_code: evolutionInstance.qrcode?.code,
        phone_number: evolutionInstance.phoneNumber,
        profile_name: evolutionInstance.profileName,
        profile_picture_url: evolutionInstance.profilePictureUrl,
        webhook_url: webhookUrl,
      })
      .select()
      .single();

    if (dbErr) throw dbErr;

    return json({
      success: true,
      instance: savedInstance,
      qrCode: evolutionInstance.qrcode,
    });
  } catch (err) {
    console.error("create instance error", err);
    return json({ error: String(err) }, 500);
  }
}

async function handleReconnect(request: Request) {
  try {
    const { data: { user } } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin.auth.admin.getUserById("");
    if (!user) return json({ error: "unauthorized" }, 401);

    const url = new URL(request.url);
    const instanceId = url.searchParams.get("id");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: instance } = await supabaseAdmin
      .from("evolution_instances")
      .select("instance_name")
      .eq("owner_id", user.id)
      .eq("id", instanceId)
      .maybeSingle();

    if (!instance) {
      return json({ error: "instance not found" }, 404);
    }

    const { getEvolutionInstance } = await import("@/lib/evolution-api-multi.server");
    const evolutionInstance = await getEvolutionInstance(instance.instance_name);

    // Update database
    const { data: savedInstance, error: dbErr } = await supabaseAdmin
      .from("evolution_instances")
      .update({
        status: evolutionInstance.status || "scan_qr",
        qr_code: evolutionInstance.qrcode?.code,
        phone_number: evolutionInstance.phoneNumber,
        profile_name: evolutionInstance.profileName,
        profile_picture_url: evolutionInstance.profilePictureUrl,
      })
      .eq("id", instanceId)
      .select()
      .single();

    if (dbErr) throw dbErr;

    return json({
      success: true,
      instance: savedInstance,
      qrCode: evolutionInstance.qrcode,
    });
  } catch (err) {
    console.error("reconnect error", err);
    return json({ error: String(err) }, 500);
  }
}

async function handleDisconnect(request: Request) {
  try {
    const { data: { user } } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin.auth.admin.getUserById("");
    if (!user) return json({ error: "unauthorized" }, 401);

    const url = new URL(request.url);
    const instanceId = url.searchParams.get("id");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: instance } = await supabaseAdmin
      .from("evolution_instances")
      .select("instance_name")
      .eq("owner_id", user.id)
      .eq("id", instanceId)
      .maybeSingle();

    if (!instance) {
      return json({ error: "instance not found" }, 404);
    }

    const { disconnectEvolutionInstance } = await import("@/lib/evolution-api-multi.server");
    await disconnectEvolutionInstance(instance.instance_name);

    // Update database
    const { error: dbErr } = await supabaseAdmin
      .from("evolution_instances")
      .update({
        status: "disconnected",
        qr_code: null,
        phone_number: null,
      })
      .eq("id", instanceId);

    if (dbErr) throw dbErr;

    return json({ success: true });
  } catch (err) {
    console.error("disconnect error", err);
    return json({ error: String(err) }, 500);
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
