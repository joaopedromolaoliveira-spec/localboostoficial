// Evolution API management endpoints
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/evolution")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        if (action === "instance") {
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

async function handleGetInstance(request: Request) {
  try {
    const { data: { user } } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin.auth.admin.getUserById("");
    if (!user) return json({ error: "unauthorized" }, 401);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: instance } = await supabaseAdmin
      .from("evolution_instances")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!instance) {
      return json({ instance: null });
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
    const { createEvolutionInstance, setEvolutionWebhook } = await import("@/lib/evolution-api.server");

    const instanceName = `instance_${user.id}`;

    // Create instance
    const evolutionInstance = await createEvolutionInstance(instanceName);

    // Set webhook URL
    const webhookUrl = `${process.env.VITE_APP_URL || "http://localhost:5173"}/api/public/webhooks/evolution?owner=${user.id}`;
    await setEvolutionWebhook(instanceName, webhookUrl);

    // Save to database
    const { data: savedInstance, error: dbErr } = await supabaseAdmin
      .from("evolution_instances")
      .upsert({
        owner_id: user.id,
        instance_name: instanceName,
        status: evolutionInstance.status || "scan_qr",
        qr_code: evolutionInstance.qrcode?.code,
        phone_number: evolutionInstance.phoneNumber,
        profile_name: evolutionInstance.profileName,
        profile_picture_url: evolutionInstance.profilePictureUrl,
        webhook_url: webhookUrl,
      }, { onConflict: "owner_id,instance_name" })
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getEvolutionInstance } = await import("@/lib/evolution-api.server");

    const instanceName = `instance_${user.id}`;
    const evolutionInstance = await getEvolutionInstance(instanceName);

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
      .eq("owner_id", user.id)
      .eq("instance_name", instanceName)
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { disconnectEvolutionInstance } = await import("@/lib/evolution-api.server");

    const instanceName = `instance_${user.id}`;
    await disconnectEvolutionInstance(instanceName);

    // Update database
    const { error: dbErr } = await supabaseAdmin
      .from("evolution_instances")
      .update({
        status: "disconnected",
        qr_code: null,
        phone_number: null,
      })
      .eq("owner_id", user.id)
      .eq("instance_name", instanceName);

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
