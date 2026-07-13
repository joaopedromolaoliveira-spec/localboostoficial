// Stripe webhook handler
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.text();
          const signature = request.headers.get("stripe-signature") || "";

          const { verifyWebhookSignature, handleSubscriptionUpdated, getPlanFromSubscription } = await import("@/lib/stripe.server");
          const event = verifyWebhookSignature(body, signature, process.env.STRIPE_WEBHOOK_SECRET || "");

          if (!event) {
            return json({ error: "invalid signature" }, 401);
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          switch (event.type) {
            case "customer.subscription.updated": {
              const subscription = event.data.object as any;
              const data = handleSubscriptionUpdated(subscription);
              const plan = getPlanFromSubscription(subscription);

              // Update subscription in database
              await supabaseAdmin
                .from("subscriptions")
                .update({
                  plan: plan as any,
                  status: data.status as any,
                  stripe_subscription_id: data.subscriptionId,
                  stripe_customer_id: data.customerId,
                  current_period_end: data.currentPeriodEnd.toISOString(),
                })
                .eq("stripe_customer_id", data.customerId);

              break;
            }

            case "customer.subscription.deleted": {
              const subscription = event.data.object as any;
              const customerId = subscription.customer;

              // Update subscription status
              await supabaseAdmin
                .from("subscriptions")
                .update({
                  plan: "trial",
                  status: "canceled",
                })
                .eq("stripe_customer_id", customerId);

              break;
            }

            case "invoice.payment_succeeded": {
              const invoice = event.data.object as any;
              const customerId = invoice.customer;

              // Update subscription
              await supabaseAdmin
                .from("subscriptions")
                .update({
                  status: "active",
                })
                .eq("stripe_customer_id", customerId);

              break;
            }

            case "invoice.payment_failed": {
              const invoice = event.data.object as any;
              const customerId = invoice.customer;

              // Update subscription
              await supabaseAdmin
                .from("subscriptions")
                .update({
                  status: "past_due",
                })
                .eq("stripe_customer_id", customerId);

              break;
            }
          }

          return json({ received: true });
        } catch (err) {
          console.error("webhook error", err);
          return json({ error: String(err) }, 500);
        }
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
