'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/* ---------- helpers ---------- */

// "HH:MM" (e.g. "18:00") -> Date (today, local time)
function timeToToday(hhmm) {
  const [hh = 0, mm = 0] = (hhmm || '18:00').split(':').map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
}

// --- Pro #1 helpers: countdown, chime, timer mgmt ---
const pad = (n) => (n < 10 ? '0' + n : '' + n);

// Build a portable, read-only plan blob
function buildPlanPayload(serveTime, dishes) {
  return {
    kind: 'hotdish-plan',
    version: 1,
    explain: 'Read-only HotDish Planner JSON. (Paste via Import in HotDish Planner.)',
    data: {
      serveTime,
      dishes: dishes.map(d => ({
        name: d.name || '',
        prepMinutes: Number(d.prepMinutes || 0),
        cookMinutes: Number(d.cookMinutes || 0),
      })).filter(d => d.name && (d.prepMinutes || d.cookMinutes)),
    },
  };
}

// Extract & validate a plan JSON from arbitrary text
function parsePlanFromText(text) {
  if (!text) return null;

  // Strip code fences/backticks and trim
  let t = String(text).replace(/```json|```/gi, '').trim();

  // If it includes extra lines, grab the first {...} block
  const firstBrace = t.indexOf('{');
  const lastBrace = t.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    t = t.slice(firstBrace, lastBrace + 1);
  }

  // Try to parse
  try {
    const parsed = JSON.parse(t);
    if (!parsed || parsed.kind !== 'hotdish-plan' || !parsed.data) return null;

    const p = parsed.data;
    const dishes = Array.isArray(p.dishes) ? p.dishes : [];
    return {
      serveTime: typeof p.serveTime === 'string' ? p.serveTime : '18:00',
      dishes: dishes.map(d => ({
        name: d?.name || '',
        prepMinutes: Number(d?.prepMinutes || 0),
        cookMinutes: Number(d?.cookMinutes || 0),
      })).filter(d => d.name && (d.prepMinutes || d.cookMinutes)),
    };
  } catch {
    return null;
  }
}

// Plans storage (local only)
const PLANS_KEY = 'hdp_plans'; // [{id,name,data:{serveTime, dishes}}]

function loadPlansLS() {
  try { return JSON.parse(localStorage.getItem(PLANS_KEY) || '[]'); }
  catch { return []; }
}
function savePlansLS(plans) {
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
}

/** Double-beep (~0.5s) — used by the loop below */
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();

    // Two short beeps: 180ms + 220ms with an 80ms gap
    const now = ctx.currentTime;
    const peak = 0.18;        // quieter than default
    const d1 = 0.18;          // first beep length
    const gap = 0.08;         // silence between beeps
    const d2 = 0.22;          // second beep length

    o.type = 'sine';
    o.frequency.setValueAtTime(1100, now); // first beep
    o.connect(g);
    g.connect(ctx.destination);

    g.gain.setValueAtTime(0.0001, now);

    // Beep 1
    g.gain.exponentialRampToValueAtTime(peak, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + d1 - 0.02);

    // Gap
    g.gain.setValueAtTime(0.0001, now + d1);

    // Beep 2 (slightly higher)
    o.frequency.setValueAtTime(1400, now + d1 + gap);
    g.gain.exponentialRampToValueAtTime(peak, now + d1 + gap + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + d1 + gap + d2 - 0.02);

    // Stop & cleanup
    o.start(now);
    o.stop(now + d1 + gap + d2);
    o.onended = () => { try { ctx.close(); } catch {} };
  } catch {}
}

/**
 * Install per-dish timers:
 *  - setInterval (1s): updates mm:ss until start
 *  - setTimeout: notifies component when a dish reaches start (onDishStart)
 * External state is managed via setters passed in.
 */
function setupAlarmsAndCountdowns(schedule, setCountdowns, timersRef, onDishStart) {
  const timeouts = [];
  const intervals = [];

  // defensive: clear any prior timers
  timersRef.current.timeouts.forEach((t) => clearTimeout(t));
  timersRef.current.intervals.forEach((i) => clearInterval(i));
  timersRef.current = { timeouts: [], intervals: [] };

  const now = Date.now();

  schedule.forEach((s) => {
    const startAt = new Date(s.startISO).getTime();

    // If start time already passed, mark as "Go!" and skip timers
    if (startAt <= Date.now()) {
      setCountdowns((prev) => ({ ...prev, [s.id]: 'Go!' }));
      return;
    }

    // live countdown (per dish)
    const intId = setInterval(() => {
      const delta = startAt - Date.now();
      if (delta <= 0) {
        setCountdowns((prev) => ({ ...prev, [s.id]: 'Go!' }));
      } else {
        const secs = Math.floor(delta / 1000);
        const mm = Math.floor(secs / 60);
        const ss = secs % 60;
        setCountdowns((prev) => ({ ...prev, [s.id]: `${pad(mm)}:${pad(ss)}` }));
      }
    }, 1000);
    intervals.push(intId);

    // start-time callback (per dish)
    const msUntilStart = startAt - now;
    if (msUntilStart > 0) {
      const tId = setTimeout(() => {
        onDishStart(s); // component handles beeping loop + banner
      }, msUntilStart);
      timeouts.push(tId);
    }
  });

  timersRef.current = { timeouts, intervals };
}

function clearAllTimers(timersRef) {
  timersRef.current?.timeouts?.forEach((t) => clearTimeout(t));
  timersRef.current?.intervals?.forEach((i) => clearInterval(i));
  timersRef.current = { timeouts: [], intervals: [] };
}

/* ---------- component ---------- */

export default function Page() {
  // Default serve time 6:00 PM
  const defaultServe = useMemo(() => '18:00', []);
  const [serveTime, setServeTime] = useState(defaultServe);

  // Print footer timestamp (avoid SSR/client mismatch)
const [generatedAt, setGeneratedAt] = useState('');
useEffect(() => { setGeneratedAt(new Date().toLocaleString()); }, []);

  // Dishes list (start blank)
const [dishes, setDishes] = useState([
  { id: crypto.randomUUID(), name: '', prepMinutes: 0, cookMinutes: 0 },
]);

  // Pro flag (unlocked on /success via localStorage)
  const [isPro, setIsPro] = useState(false);
  useEffect(() => {
    setIsPro(localStorage.getItem('hdp_pro') === '1');
  }, []);

  // Presets
  const presets = [
      { name: 'Roast Turkey (12–14 lb)', prepMinutes: 20, cookMinutes: 210 },
  { name: 'Stuffing (baked)',        prepMinutes: 15, cookMinutes: 45  },
  { name: 'Mashed Potatoes',         prepMinutes: 15, cookMinutes: 30  },
  { name: 'Green Bean Casserole',    prepMinutes: 10, cookMinutes: 30  },
  { name: 'Pumpkin Pie',             prepMinutes: 15, cookMinutes: 55  },
  { name: 'Cranberry Sauce (scratch)', prepMinutes: 10, cookMinutes: 15 },
  { name: 'Turkey Gravy',              prepMinutes: 10, cookMinutes: 15 },
  { name: 'Sweet Potato Casserole',    prepMinutes: 15, cookMinutes: 35 },
  { name: 'Mac & Cheese (baked)',      prepMinutes: 15, cookMinutes: 30 },
  { name: 'Brussels Sprouts (roasted)',prepMinutes: 10, cookMinutes: 25 },
  { name: 'Dinner Rolls (bake)',       prepMinutes: 5,  cookMinutes: 12 },
  { name: 'Apple Pie',                 prepMinutes: 15, cookMinutes: 60 },
  { name: 'Pecan Pie',                 prepMinutes: 15, cookMinutes: 55 },
  { name: 'Cornbread',                 prepMinutes: 10, cookMinutes: 20 },
  { name: 'Glazed Carrots',            prepMinutes: 10, cookMinutes: 15 },
  { name: 'Roasted Potatoes',          prepMinutes: 10, cookMinutes: 35 },
  { name: 'Corn Casserole',            prepMinutes: 10, cookMinutes: 45 },
  { name: 'Green Salad (assemble)',    prepMinutes: 10, cookMinutes: 0  },
  { name: 'Turkey Stock (stovetop)',   prepMinutes: 10, cookMinutes: 120},
  { name: 'Glazed Honey Ham (8–10 lb, pre-cooked)', prepMinutes: 10, cookMinutes: 100 },
  ];

  // Actions for dishes
  function addDish() {
    setDishes(prev => [
      ...prev,
      { id: crypto.randomUUID(), name: '', prepMinutes: 0, cookMinutes: 0 },
    ]);
  }
  function removeDish(id) {
    setDishes(prev => prev.filter(d => d.id !== id));
  }
  function updateDish(id, patch) {
    setDishes(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)));
  }
  function addPreset(p) {
    setDishes(prev => [
      ...prev,
      { id: crypto.randomUUID(), name: p.name, prepMinutes: p.prepMinutes, cookMinutes: p.cookMinutes },
    ]);
  }

  function onSavePlan() {
  if (!isPro) return alert('Pro only');
  const name = newPlanName.trim();
  if (!name) return alert('Name your plan first');

  const cleanDishes = dishes.map(d => ({
    // save minimal fields (no timers), preserve values
    name: d.name || '',
    prepMinutes: Number(d.prepMinutes || 0),
    cookMinutes: Number(d.cookMinutes || 0),
  })).filter(d => d.name && (d.prepMinutes || d.cookMinutes));

  const next = [
    ...plans,
    { id: crypto.randomUUID(), name, data: { serveTime, dishes: cleanDishes } },
  ];
  setPlans(next);
  savePlansLS(next);
  setNewPlanName('');
}

function onLoadPlan(plan) {
  if (!isPro) return alert('Pro only');
  const p = plan?.data || {};
  const loaded = (p.dishes || []).map(d => ({
    id: crypto.randomUUID(),
    name: d.name || '',
    prepMinutes: Number(d.prepMinutes || 0),
    cookMinutes: Number(d.cookMinutes || 0),
  }));
  setDishes(loaded.length ? loaded : [{ id: crypto.randomUUID(), name: '', prepMinutes: 0, cookMinutes: 0 }]);
  setServeTime(p.serveTime || '18:00');
  // optional: scroll to top so user sees everything updated
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
}

function onDeletePlan(id) {
  if (!isPro) return alert('Pro only');
  const next = plans.filter(p => p.id !== id);
  setPlans(next);
  savePlansLS(next);
}

async function onSharePlanToClipboard() {
  if (!isPro) return alert('Pro only');
  const payload = buildPlanPayload(serveTime, dishes);
  const friendly = [
    'HotDish Planner — Plan (read-only)',
    'To import: In HotDish Planner (Pro), click “Import / Paste JSON”, paste this, then press Import.',
    '',
    JSON.stringify(payload)
  ].join('\n');
  try {
    await navigator.clipboard.writeText(friendly);
    alert('Copied a shareable plan message to your clipboard!');
  } catch (e) {
    alert('Could not copy. You can manually copy this:\n\n' + friendly);
  }
}

async function onImportPlanFromClipboard() {
  if (!isPro) return alert('Pro only');
  try {
    const text = await navigator.clipboard.readText();
    const plan = parsePlanFromText(text);
    if (!plan) {
      alert('Could not read a valid plan from clipboard.\nTip: copy the JSON blob or the whole “Share” message and try again.');
      return;
    }
    const loaded = plan.dishes.map(d => ({
      id: crypto.randomUUID(),
      name: d.name,
      prepMinutes: d.prepMinutes,
      cookMinutes: d.cookMinutes,
    }));
    setDishes(loaded.length ? loaded : [{ id: crypto.randomUUID(), name: '', prepMinutes: 0, cookMinutes: 0 }]);
    setServeTime(plan.serveTime);
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
    alert('Plan imported from clipboard.');
  } catch (e) {
    alert('Clipboard read was blocked. On some browsers you must click once more or use the “Import / Paste JSON” box.');
  }
}

function onImportFromTextBox() {
  if (!isPro) return alert('Pro only');
  const plan = parsePlanFromText(importText);
  if (!plan) {
    alert('That doesn’t look like a HotDish plan JSON.\nTip: you can paste the whole message or just the JSON block.');
    return;
  }
  const loaded = plan.dishes.map(d => ({
    id: crypto.randomUUID(),
    name: d.name,
    prepMinutes: d.prepMinutes,
    cookMinutes: d.cookMinutes,
  }));
  setDishes(loaded.length ? loaded : [{ id: crypto.randomUUID(), name: '', prepMinutes: 0, cookMinutes: 0 }]);
  setServeTime(plan.serveTime);
  setImportText('');
  window.scrollTo?.({ top: 0, behavior: 'smooth' });
  alert('Plan imported.');
}

  // Schedule: start = serve - (prep + cook)
  const schedule = useMemo(() => {
    if (!serveTime) return [];
    const serve = timeToToday(serveTime).getTime();

    return dishes
      .filter(d => d.name.trim() && d.cookMinutes > 0)
      .map(d => {
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

  function fmt(iso) {
    const dt = new Date(iso);
    return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  // --- Pro #1: smart alarms & live countdowns state ---
  const [alarmsOn, setAlarmsOn] = useState(false);
  const [countdowns, setCountdowns] = useState({}); // { [dishId]: "mm:ss" | "Go!" }
  const timersRef = useRef({ timeouts: [], intervals: [] });

  // Alarm banner + looped beeps
  const [alarmBanner, setAlarmBanner] = useState(null); // string | null
  const alarmLoopRef = useRef(null);

  // Pro #3: Save & reload plans
const [plans, setPlans] = useState([]);       // array of saved plans
const [newPlanName, setNewPlanName] = useState(''); // input for saving

// Share/Import UX
const [importText, setImportText] = useState(''); // manual paste box

  // Beep loop control (keep beeping up to 10s, or until user clicks Stop)
  function startBeepLoop(durationMs = 10000) {
    stopBeepLoop();
    const endAt = Date.now() + durationMs;

    // Load saved plans when the page mounts
useEffect(() => {
  setPlans(loadPlansLS());
}, []);

    // play immediately, then repeat ~every 800ms
    playChime();
    alarmLoopRef.current = setInterval(() => {
      if (Date.now() >= endAt) {
        stopBeepLoop();
        return;
      }
      playChime();
    }, 800);
  }

  function stopBeepLoop() {
    if (alarmLoopRef.current) {
      clearInterval(alarmLoopRef.current);
      alarmLoopRef.current = null;
    }
  }

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      clearAllTimers(timersRef);
      stopBeepLoop();
    };
  }, []);

  // Rebuild timers whenever schedule/alarms/pro changes
  useEffect(() => {
    clearAllTimers(timersRef);
    stopBeepLoop();
    setAlarmBanner(null);
    setCountdowns({});
    if (!isPro || !alarmsOn || schedule.length === 0) return;
    setupAlarmsAndCountdowns(
      schedule,
      setCountdowns,
      timersRef,
      (s) => {
        // when a dish reaches its start time:
        startBeepLoop(10000); // up to 10s of beeps
        setAlarmBanner(`Start: ${s.name} (${s.totalMinutes} min)`);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro, alarmsOn, schedule]);

  return (
    <main className="min-h-screen bg-orange-50 text-gray-900">
      <div className="mx-auto max-w-3xl p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-orange-900">HotDish Planner</h1>
          <p className="text-gray-800 mt-1">
            Enter your dishes and choose when you want to eat. We’ll tell you when to start each one so everything is hot at the same time.
          </p>
        </header>

        {/* Alarm banner */}
        {alarmBanner && (
          <div className="print:hidden mb-4 rounded-xl border border-orange-300 bg-orange-100 px-4 py-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-orange-900">{alarmBanner}</div>
            <button
              onClick={() => { stopBeepLoop(); setAlarmBanner(null); }}
              className="ml-4 rounded-lg border border-orange-400 bg-white px-3 py-1 text-sm text-gray-900 hover:bg-orange-50"
            >
              Stop
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="mb-4 print:hidden flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="rounded-xl bg-orange-600 text-white px-4 py-2 hover:bg-orange-700"
            >
              Print / Save as PDF
            </button>

            {!isPro && (
              <div>
                <button
                  onClick={async () => {
                    try {
                      const email = prompt('Enter your email for the receipt (optional):') || '';
                      const res = await fetch('/api/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email }),
                      });

                      if (!res.ok) {
                        const text = await res.text();
                        alert(`Checkout error (${res.status}): ${text}`);
                        return;
                      }

                      const data = await res.json();
                      if (data.url) {
                        window.location.href = data.url;
                      } else {
                        alert(data.message || 'No checkout URL returned.');
                      }
                    } catch (e) {
                      alert(`Unexpected error: ${e?.message || e}`);
                    }
                  }}
                  className="rounded-xl border border-gray-400 px-4 py-2 text-gray-900 hover:bg-orange-50"
                >
                  Upgrade to Pro — $5/year
                </button>
                <p className="text-xs text-gray-600 mt-1">
  Pro unlocks smart alarms, live countdowns, save/load plans, and a beautiful print layout — just $5/year.
</p>
              </div>
            )}
          </div>

          {isPro && (
            <label className="flex items-center gap-2 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={alarmsOn}
                onChange={(e) => setAlarmsOn(e.target.checked)}
              />
              Enable smart alarms & live countdowns
            </label>
          )}
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

        {/* Your dishes */}
        <section className="bg-white rounded-2xl shadow p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Your dishes</h2>

          {/* Column headers (desktop) */}
          <div className="hidden md:grid grid-cols-12 gap-2 font-semibold text-gray-900 mb-2 text-sm">
            <div className="col-span-5">Dish Name</div>
            <div className="col-span-3 text-center">Prep. (min)</div>
            <div className="col-span-3 text-center">Cook (min)</div>
            <div className="col-span-1"></div>
          </div>

          <div className="space-y-3">
  {dishes.map((d) => (
    <div key={d.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
      {/* Dish name */}
      <div className="md:col-span-5">
        <label className="md:hidden block text-xs text-gray-700 mb-1">Dish name</label>
        <input
          className="w-full rounded-xl border border-gray-400 p-2 text-gray-900 placeholder-gray-500"
          placeholder="Dish name"
          value={d.name}
          onChange={(e) => updateDish(d.id, { name: e.target.value })}
        />
      </div>

      {/* Prep minutes */}
      <div className="md:col-span-3">
        <label className="md:hidden block text-xs text-gray-700 mb-1">Prep (min)</label>
        <input
          type="number"
          className="w-full rounded-xl border border-gray-400 p-2 text-gray-900 placeholder-gray-500"
          min={0}
          placeholder="Prep (min)"
          value={d.prepMinutes}
          onChange={(e) => updateDish(d.id, { prepMinutes: Number(e.target.value || 0) })}
        />
      </div>

      {/* Cook minutes */}
      <div className="md:col-span-3">
        <label className="md:hidden block text-xs text-gray-700 mb-1">Cook (min)</label>
        <input
          type="number"
          className="w-full rounded-xl border border-gray-400 p-2 text-gray-900 placeholder-gray-500"
          min={0}
          placeholder="Cook (min)"
          value={d.cookMinutes}
          onChange={(e) => updateDish(d.id, { cookMinutes: Number(e.target.value || 0) })}
        />
      </div>

      {/* Remove */}
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

          <div className="mt-3 flex gap-2">
            <button
              onClick={addDish}
              className="rounded-xl bg-orange-600 text-white px-4 py-2 hover:bg-orange-700"
            >
              + Add another dish
            </button>
            <button
              onClick={() =>
                setDishes([{ id: crypto.randomUUID(), name: '', prepMinutes: 0, cookMinutes: 0 }])
              }
              className="rounded-xl border border-gray-400 px-4 py-2 text-gray-900 hover:bg-orange-50"
            >
              Reset dishes
            </button>
          </div>
        </section>

{/* Save & reload plans (Pro) */}
{isPro && (
  <section className="bg-white rounded-2xl shadow p-4 mb-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-3">Save & reload plans</h2>

    <div className="flex flex-col sm:flex-row gap-2 mb-3">
      <input
        className="rounded-xl border border-gray-400 p-2 text-gray-900 placeholder-gray-500 flex-1"
        placeholder="Plan name (e.g., Thanksgiving sides)"
        value={newPlanName}
        onChange={(e) => setNewPlanName(e.target.value)}
      />
      <button
        onClick={onSavePlan}
        className="rounded-xl bg-orange-600 text-white px-4 py-2 hover:bg-orange-700"
      >
        Save plan
      </button>
    </div>

    <div className="flex flex-wrap gap-2 mb-3">
      <button
        onClick={onSharePlanToClipboard}
        className="rounded-xl border border-gray-400 px-3 py-2 text-sm text-gray-900 hover:bg-orange-50"
      >
        Share (copy JSON)
      </button>
      <button
        onClick={onImportPlanFromClipboard}
        className="rounded-xl border border-gray-400 px-3 py-2 text-sm text-gray-900 hover:bg-orange-50"
      >
        Import from Clipboard
      </button>
    </div>

{/* Manual paste import (easier for most users than clipboard API) */}
<details className="mb-3">
  <summary className="cursor-pointer text-sm text-gray-900">Import / Paste JSON</summary>
  <div className="mt-2 flex flex-col gap-2">
    <textarea
      className="rounded-xl border border-gray-400 p-2 text-sm text-gray-900 placeholder-gray-500 min-h-[120px]"
      placeholder="Paste a HotDish plan JSON here…"
      value={importText}
      onChange={(e) => setImportText(e.target.value)}
    />
    <div className="flex gap-2">
      <button
        onClick={onImportFromTextBox}
        className="rounded-xl bg-orange-600 text-white px-4 py-2 hover:bg-orange-700 text-sm"
      >
        Import
      </button>
      <button
        onClick={() => setImportText('')}
        className="rounded-xl border border-gray-400 px-3 py-2 text-sm text-gray-900 hover:bg-orange-50"
      >
        Clear
      </button>
    </div>
    <p className="text-xs text-gray-700">
      Tip: Use “Share (copy JSON)” to get a message you can send to someone. They can paste it here to load your plan.
    </p>
  </div>
</details>

    {plans.length === 0 ? (
      <p className="text-sm text-gray-800">No saved plans yet.</p>
    ) : (
      <ul className="space-y-2">
        {plans.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-xl border border-gray-300 p-3">
            <div>
              <div className="font-medium text-gray-900">{p.name}</div>
              <div className="text-xs text-gray-700">
                {(p.data?.dishes?.length || 0)} dishes · serve @ {p.data?.serveTime || '--:--'}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onLoadPlan(p)}
                className="rounded-xl border border-gray-400 px-3 py-1 text-sm text-gray-900 hover:bg-orange-50"
              >
                Load
              </button>
              <button
                onClick={() => onDeletePlan(p.id)}
                className="rounded-xl border border-gray-400 px-3 py-1 text-sm text-gray-900 hover:bg-orange-50"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    )}
  </section>
)}

        {/* Schedule */}
        <section id="print-schedule" className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Your schedule</h2>
          {schedule.length === 0 ? (
            <p className="text-gray-800">Add at least one dish with a cook time to see your timeline.</p>
          ) : (
            <ul className="space-y-3">
              {schedule.map((s) => (
                <li key={s.id} className="rounded-xl border border-gray-400 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">{s.name}</div>

                    <div className="flex items-center gap-3">
                      {isPro && alarmsOn && (
                        <span className="text-xs rounded-full border border-orange-300 px-2 py-1 bg-orange-50 text-gray-900">
                          {countdowns[s.id] || '--:--'}
                        </span>
                      )}
                      <div className="text-sm text-gray-800">Total {s.totalMinutes} min</div>
                    </div>
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
  <div className="flex items-center justify-center gap-4">
    <a href="/about" className="underline">About</a>
    <a href="/privacy" className="underline">Privacy</a>
    <a href="mailto:youremail@example.com?subject=HotDish%20Planner%20feedback" className="underline">Contact</a>
  </div>
  <div className="mt-2">© {new Date().getFullYear()} HotDish Planner</div>
</footer>
      </div>

      {/* PRINT-ONLY SCHEDULE (shows only in print) */}
<section id="print-only-schedule" className="hidden">
  <div className="print-container">
    <h1 className="print-title">HotDish Planner — Schedule</h1>
    <div className="print-subtitle">
      Serve time: <span className="print-mono">{serveTime || '--:--'}</span>
    </div>

    {schedule.length === 0 ? (
      <p className="print-note">No dishes yet.</p>
    ) : (
      <table className="print-table">
        <thead>
          <tr>
            <th>Dish</th>
            <th>Start</th>
            <th>Finish</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td className="print-mono">{fmt(s.startISO)}</td>
              <td className="print-mono">{fmt(s.endISO)}</td>
              <td>{s.totalMinutes} min</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}

   <div className="print-footer-note" suppressHydrationWarning>
  Generated on {generatedAt}
</div>

  </div>
</section>

    </main>
  );
}
