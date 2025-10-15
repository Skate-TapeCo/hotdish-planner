export default function NotFound() {
  return (
    <main className="min-h-screen bg-orange-50 text-gray-900">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold text-orange-900">Page not found</h1>
        <p className="mt-2">That page doesn’t exist. Head back to the planner.</p>
        <a
          href="/"
          className="inline-block mt-4 rounded-xl bg-orange-600 text-white px-4 py-2 hover:bg-orange-700"
        >
          Go to HotDish Planner
        </a>
      </div>
    </main>
  );
}
