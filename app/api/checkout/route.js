import Stripe from "stripe";

// Ensure this route runs on Node.js (not Edge)
export const runtime = "nodejs";

export async function POST(req) {
  try {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "stripe_error", message: "Missing STRIPE_SECRET_KEY" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "stripe_error", message: "Missing STRIPE_PRICE_ID" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(apiKey);
    const { email } = await req.json();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      allow_promotion_codes: true,
      success_url: process.env.STRIPE_SUCCESS_URL || "http://localhost:3000/success",
      cancel_url: process.env.STRIPE_CANCEL_URL || "http://localhost:3000/",
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "stripe_error", message: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
