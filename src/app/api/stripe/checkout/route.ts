import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const { plan } = await request.json();

    if (plan !== "pro" && plan !== "promax") {
      return NextResponse.json(
        { error: "Plano inválido" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Tens de iniciar sessão primeiro." },
        { status: 401 }
      );
    }

    const priceId =
      plan === "pro"
        ? process.env.STRIPE_PRO_PRICE_ID
        : process.env.STRIPE_PROMAX_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID da Stripe não configurado." },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?payment=cancelled`,
      metadata: {
        user_id: user.id,
        plan,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);

    return NextResponse.json(
      { error: "Não foi possível criar o pagamento." },
      { status: 500 }
    );
  }
}