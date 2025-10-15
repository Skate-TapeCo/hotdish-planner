export default function Page() {
  return (
    <main className="min-h-screen bg-orange-50 text-gray-900">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold mb-4 text-orange-900">Privacy</h1>
        <p className="mb-2">HotDish Planner runs in your browser. Plans are saved on your device (localStorage). No account or database today.</p>
        <p className="mb-2">Payments are processed by Stripe. We don’t store card details.</p>
        <p className="mb-2">We may use basic, privacy-friendly analytics to understand usage (page views, not personal data).</p>
        <p>Questions? Email{" "}
          <a className="underline" href="mailto:youremail@example.com?subject=HotDish%20Planner%20privacy">
            youremail@example.com
          </a>
        </p>
      </div>
    </main>
  );
}
