// Stripe integration — server only
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20",
});

export interface PlanConfig {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  instances: number;
  features: string[];
}

export const PLANS: Record<string, PlanConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    description: "Perfeito para começar",
    monthlyPrice: 2700, // R$ 27 em centavos
    yearlyPrice: 27000, // R$ 270 em centavos
    instances: 1,
    features: [
      "1 instância WhatsApp",
      "Base de conhecimento básica",
      "Suporte por email",
      "Até 1.000 mensagens/mês",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Para negócios em crescimento",
    monthlyPrice: 6700, // R$ 67 em centavos (aproximado)
    yearlyPrice: 67000, // R$ 670 em centavos (aproximado)
    instances: 3,
    features: [
      "3 instâncias WhatsApp",
      "Base de conhecimento avançada",
      "Suporte prioritário",
      "Até 10.000 mensagens/mês",
      "Relatórios detalhados",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    description: "Solução completa para empresas",
    monthlyPrice: 13400, // R$ 134 em centavos (aproximado)
    yearlyPrice: 134000, // R$ 1.340 em centavos (aproximado)
    instances: -1, // Unlimited
    features: [
      "Instâncias WhatsApp ilimitadas",
      "Base de conhecimento ilimitada",
      "Suporte 24/7",
      "Mensagens ilimitadas",
      "Relatórios em tempo real",
      "API customizada",
      "Integração com CRM",
    ],
  },
};

/**
 * Get or create Stripe products and prices
 */
export async function ensureStripeProducts() {
  const products: Record<string, { productId: string; monthlyPriceId: string; yearlyPriceId: string }> = {};

  for (const [planKey, plan] of Object.entries(PLANS)) {
    try {
      // Search for existing product
      const existingProducts = await stripe.products.list({
        limit: 100,
        active: true,
      });

      let product = existingProducts.data.find((p) => p.metadata?.planId === planKey);

      if (!product) {
        // Create product
        product = await stripe.products.create({
          name: plan.name,
          description: plan.description,
          metadata: {
            planId: planKey,
          },
        });
      }

      // Get or create prices
      const existingPrices = await stripe.prices.list({
        product: product.id,
        active: true,
      });

      let monthlyPrice = existingPrices.data.find((p) => p.recurring?.interval === "month");
      if (!monthlyPrice) {
        monthlyPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.monthlyPrice,
          currency: "brl",
          recurring: {
            interval: "month",
          },
          metadata: {
            planId: planKey,
            interval: "month",
          },
        });
      }

      let yearlyPrice = existingPrices.data.find((p) => p.recurring?.interval === "year");
      if (!yearlyPrice) {
        yearlyPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.yearlyPrice,
          currency: "brl",
          recurring: {
            interval: "year",
          },
          metadata: {
            planId: planKey,
            interval: "year",
          },
        });
      }

      products[planKey] = {
        productId: product.id,
        monthlyPriceId: monthlyPrice.id,
        yearlyPriceId: yearlyPrice.id,
      };
    } catch (err) {
      console.error(`Error ensuring Stripe product for ${planKey}:`, err);
    }
  }

  return products;
}

/**
 * Create a checkout session
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
}

/**
 * Get or create customer
 */
export async function getOrCreateCustomer(email: string, userId: string): Promise<Stripe.Customer> {
  // Search for existing customer
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (customers.data.length > 0) {
    return customers.data[0];
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  });

  return customer;
}

/**
 * Get customer subscriptions
 */
export async function getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
  });

  return subscriptions.data;
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.del(subscriptionId);
  return subscription;
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}

/**
 * Create portal session for customer to manage subscription
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Stripe.Event | null {
  try {
    const event = stripe.webhooks.constructEvent(body, signature, secret);
    return event;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return null;
  }
}

/**
 * Handle subscription updated event
 */
export function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const status = subscription.status;
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;

  return {
    customerId,
    subscriptionId,
    status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

/**
 * Get plan from subscription
 */
export function getPlanFromSubscription(subscription: Stripe.Subscription): string {
  const item = subscription.items.data[0];
  if (!item?.price?.metadata?.planId) {
    return "trial";
  }
  return item.price.metadata.planId;
}
