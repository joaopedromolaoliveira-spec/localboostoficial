// Stripe API endpoints
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stripe")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        if (action === "plans") {
          return handleGetPlans();
        } else if (action === "customer") {
          return handleGetCustomer(request);
        } else if (action === "subscriptions") {
          return handleGetSubscriptions(request);
        }

        return json({ error: "unknown action" }, 400);
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        if (action === "create-checkout") {
          return handleCreateCheckout(request);
        } else if (action === "create-portal") {
          return handleCreatePortal(request);
        } else if (action === "cancel-subscription") {
          return handleCancelSubscription(request);
        }

        return json({ error: "unknown action" }, 400);
      },
    },
  },
});

async function handleGetPlans() {
  try {
    const { PLANS } = await import("@/lib/stripe.server");
    const plans = Object.values(PLANS);
    return json({ plans });
  } catch (err) {
    console.error("get plans error", err);
    return json({ error: String(err) }, 500);
  }
}

async function handleGetCustomer(request: Request) {
  try {
    const { data: { user } } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin.auth.admin.getUserById("");
    if (!user) return json({ error: "unauthorized" }, 401);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    return json({ subscription });
  } catch (err) {
    console.error("get customer error", err);
    return json({ error: String(err) }, 500);
  }
}

async function handleGetSubscriptions(request: Request) {
  try {
    const { data: { user } } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin.auth.admin.getUserById("");
    if (!user) return json({ error: "unauthorized" }, 401);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    return json({ subscription });
  } catch (err) {
    console.error("get subscriptions error", err);
    return json({ error: String(err) }, 500);
  }
}

async function handleCreateCheckout(request: Request) {
  try {
    const { data: { user } } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin.auth.admin.getUserById("");
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await request.json() as { priceId: string; interval: string };
    if (!body.priceId) {
      return json({ error: "priceId required" }, 400);
    }

    const { getOrCreateCustomer, createCheckoutSession } = await import("@/lib/stripe.server");
    const appUrl = process.env.VITE_APP_URL || "http://localhost:5173";

    const customer = await getOrCreateCustomer(user.email || "", user.id);
    const session = await createCheckoutSession(
      customer.id,
      body.priceId,
      `${appUrl}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      `${appUrl}/pricing`
    );

    return json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (err) {
    console.error("create checkout error", err);
    return json({ error: String(err) }, 500);
  }
}

async function handleCreatePortal(request: Request) {
  try {
    const { data: { user } } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin.auth.admin.getUserById("");
    if (!user) return json({ error: "unauthorized" }, 401);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!subscription?.stripe_customer_id) {
      return json({ error: "no customer found" }, 404);
    }

    const { createPortalSession } = await import("@/lib/stripe.server");
    const appUrl = process.env.VITE_APP_URL || "http://localhost:5173";

    const session = await createPortalSession(
      subscription.stripe_customer_id,
      `${appUrl}/account`
    );

    return json({
      success: true,
      url: session.url,
    });
  } catch (err) {
    console.error("create portal error", err);
    return json({ error: String(err) }, 500);
  }
}

async function handleCancelSubscription(request: Request) {
  try {
    const { data: { user } } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin.auth.admin.getUserById("");
    if (!user) return json({ error: "unauthorized" }, 401);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!subscription?.stripe_subscription_id) {
      return json({ error: "no subscription found" }, 404);
    }

    const { cancelSubscription } = await import("@/lib/stripe.server");
    await cancelSubscription(subscription.stripe_subscription_id);

    // Update database
    await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "canceled",
        plan: "trial",
      })
      .eq("user_id", user.id);

    return json({ success: true });
  } catch (err) {
    console.error("cancel subscription error", err);
    return json({ error: String(err) }, 500);
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
