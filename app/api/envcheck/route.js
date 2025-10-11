export const runtime = "nodejs";

export async function GET() {
  return new Response(
    JSON.stringify({
      hasKey: !!process.env.STRIPE_SECRET_KEY,
      hasPrice: !!process.env.STRIPE_PRICE_ID,
      successUrl: process.env.STRIPE_SUCCESS_URL,
      cancelUrl: process.env.STRIPE_CANCEL_URL,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
