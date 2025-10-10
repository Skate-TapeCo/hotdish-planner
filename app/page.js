'use client';

import { useMemo, useState } from 'react';

// Turn "HH:MM" (e.g. "18:00") into a Date for today (local time)
function timeToToday(hhmm) {
  const [hh = 0, mm = 0] = (hhmm || '18:00').split(':').map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
}

export default function Page() {
  // Default to 6:00 PM
  const defaultServe = useMemo(() => '18:00', []);
  const [serveTime, setServeTime] = useState(defaultServe);

  const [dishes, setDishes] = useState([
    { id: crypto.randomUUID(), name: 'Roast Turkey', prepMinutes: 20, cookMinutes: 180 },
  ]);

  function addDish() {
    setDishes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', prepMinutes: 0, cookMinutes: 0 },
    ]);
  }

  function removeDish(id) {
    setDishes((prev) => prev.filter((d) => d.id !== id));
  }

  function updateDish(id, patch) {
    setDishes((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  // Compute schedule: start = serve - (prep + cook)
  const schedule = useMemo(() => {
    if (!serveTime) return [];
    const serve = timeToToday(serveTime).getTime();

    return dishes
      .filter((d) => d.name.trim() && d.cookMinutes > 0)
      .map((d) => {
        const total = (d.prepMinutes || 0) + d.cookMinutes;
        const start = new Date(serve - total * 60_000);
        const end = new Date(serve);
        return {
          ...d,
          totalMinutes: total,
          startISO: start.toISOString(),
          endISO: end.toISOString(),
        };
      })
      .sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
  }, [dishes, serveTime]);

  function fmt(dtISO) {
    const dt = new Date(dtISO);
    return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  const presets = [
    { name: 'Roast Turkey (12–14 lb)', prepMinutes: 20, cookMinutes: 210 },
    { name: 'Stuffing (baked)', prepMinutes: 15, cookMinutes: 45 },
    { name: 'Mashed Potatoes', prepMinutes: 15, cookMinutes: 30 },
    { name: 'Green Bean Casserole', prepMinutes: 10, cookMinutes: 30 },
    { name: 'Pumpkin Pie', prepMinutes: 15, cookMinutes: 55 },
  ];

  function addPreset(p) {
    setDishes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: p.name, prepMinutes: p.prepMinutes, cookMinutes: p.cookMinutes },
    ]);
  }

  return (
    <main className="min-h-screen bg-orange-50 text-gray-900">
      <div className="mx-auto max-w-3xl p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-orange-900">HotDish Planner</h1>
          <p className="text-gray-800 mt-1">
            Enter your dishes and choose when you want to eat. We’ll tell you when to start each one so everything is hot at the same time.
          </p>
        </header>

        {/* Actions (Print) */}
        <div className="mb-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-orange-600 text-white px-4 py-2 hover:bg-orange-700"
          >
            Print / Save as PDF
          </button>
        </div>

        {/* Serve time (TIME-ONLY) */}
        <section className="bg-white rounded-2xl shadow p-4 mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Target serve time
          </label>
          <input
            type="time"
            className="w-full rounded-xl border border-gray-400 p-2 text-gray-900 placeholder-gray-500"
            value={serveTime}
            onChange={(e) => setServeTime(e.target.value)}
          />
          <p className="text-sm text-gray-800 mt-2">
            Tip: Set the exact time you plan to sit down to eat.
          </p>
        </section>

        {/* Presets */}
        <section className="bg-white rounded-2xl shadow p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Quick add presets</h2>
            <button
              onClick={() =>
                setDishes([{ id: crypto.randomUUID(), name: '', prepMinutes: 0, cookMinutes: 0 }])
              }
              className="text-sm text-gray-700 underline"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((p, i) => (
              <button
                key={i}
                onClick={() => addPreset(p)}
                className="rounded-xl border border-gray-400 px-3 py-1 text-sm hover:bg-orange-100 text-gray-900"
              >
                {p.name}
              </button>
            ))}
          </div>
        </section>

        {/* Dish list */}
        <section className="bg-white rounded-2xl shadow p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Your dishes</h2>
          {/* Column headers */}
<div className="hidden md:grid grid-cols-12 gap-2 font-semibold text-gray-900 mb-2 text-sm">
  <div className="col-span-5">Dish Name</div>
  <div className="col-span-3 text-center">Prep. (min)</div>
  <div className="col-span-3 text-center">Cook (min)</div>
  <div className="col-span-1"></div>
</div>

          <div className="space-y-3">
            {dishes.map((d) => (
              <div key={d.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <input
                  className="md:col-span-5 rounded-xl border border-gray-400 p-2 text-gray-900 placeholder-gray-500"
                  placeholder="Dish name"
                  value={d.name}
                  onChange={(e) => updateDish(d.id, { name: e.target.value })}
                />
                <input
                  type="number"
                  className="md:col-span-3 rounded-xl border border-gray-400 p-2 text-gray-900 placeholder-gray-500"
                  min={0}
                  placeholder="Prep (min)"
                  value={d.prepMinutes}
                  onChange={(e) => updateDish(d.id, { prepMinutes: Number(e.target.value || 0) })}
                />
                <input
                  type="number"
                  className="md:col-span-3 rounded-xl border border-gray-400 p-2 text-gray-900 placeholder-gray-500"
                  min={0}
                  placeholder="Cook (min)"
                  value={d.cookMinutes}
                  onChange={(e) => updateDish(d.id, { cookMinutes: Number(e.target.value || 0) })}
                />
                <button
                  className="md:col-span-1 rounded-xl border border-gray-400 px-3 py-2 text-sm hover:bg-red-50 text-gray-900"
                  onClick={() => removeDish(d.id)}
                  aria-label="Remove dish"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <button
              onClick={addDish}
              className="rounded-xl bg-orange-600 text-white px-4 py-2 hover:bg-orange-700"
            >
              + Add another dish
            </button>
          </div>
        </section>

        {/* Schedule */}
        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Your schedule</h2>
          {schedule.length === 0 ? (
            <p className="text-gray-800">Add at least one dish with a cook time to see your timeline.</p>
          ) : (
            <ul className="space-y-3">
              {schedule.map((s) => (
                <li key={s.id} className="rounded-xl border border-gray-400 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">{s.name}</div>
                    <div className="text-sm text-gray-800">Total {s.totalMinutes} min</div>
                  </div>
                  <div className="text-sm text-gray-900 mt-1">
                    Start at <span className="font-semibold">{fmt(s.startISO)}</span>, finish by{' '}
                    <span className="font-semibold">{fmt(s.endISO)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-700 mt-3">
            This basic planner assumes each dish should be ready exactly at your serve time. We can add oven/stovetop juggling later.
          </p>
        </section>

        <footer className="text-center text-xs text-gray-800 mt-6">
          © {new Date().getFullYear()} HotDish Planner
        </footer>
      </div>
    </main>
  );
}
