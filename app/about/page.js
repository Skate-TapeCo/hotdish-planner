export default function Page() {
  return (
    <main className="min-h-screen bg-orange-50 text-gray-900">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold mb-4 text-orange-900">About HotDish Planner</h1>
        <p className="mb-4">
          This tool times your dishes so everything finishes hot at the same time. Add dishes (prep + cook minutes), set your serve time, and it tells you when to start each dish.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2 text-orange-900">Contact</h2>
        <p>
          Feedback or issues? Email{" "}
          <a className="underline" href="mailto:support@example.com?subject=HotDish%20Planner%20feedback">
            support@example.com
          </a>
        </p>
      </div>
    </main>
  );
}
