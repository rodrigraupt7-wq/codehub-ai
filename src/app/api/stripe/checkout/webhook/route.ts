import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Assinatura Stripe ausente." },
      { status: 400 }
    );
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    const supabase = createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;

        if (!userId || (plan !== "pro" && plan !== "promax")) {
          break;
        }

        await supabase
          .from("profiles")
          .update({
            plan,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const customerId = subscription.customer as string;

        const { data: subscriptionData } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (subscriptionData?.user_id) {
          await supabase
            .from("profiles")
            .update({
              plan: "free",
              updated_at: new Date().toISOString(),
            })
            .eq("id", subscriptionData.user_id);
        }

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);

    return NextResponse.json(
      { error: "Webhook inválido." },
      { status: 400 }
    );
  }
}