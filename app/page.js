"use client";

import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { createClient } from "@supabase/supabase-js";
import {
  buildCapTable,
  formatMoney,
  formatPct,
  hasPositiveEbitda,
  latestSnapshot,
  valuation,
} from "../lib/calc";

// ── SEED DATA — swap partner names here ──────────────────────────────────────
const SEED = {
  contributors: [
    { id: "a", name: "Partner A", role: "CEO", marketRate: 150, paidRate: 0 },
    { id: "b", name: "Partner B", role: "CFO", marketRate: 120, paidRate: 0 },
    { id: "c", name: "Partner C", role: "CTO", marketRate: 180, paidRate: 60 },
    { id: "d", name: "Partner D", role: "Lead Dev", marketRate: 140, paidRate: 0 },
  ],
  sweatEntries: [
    { id: "s1", contributorId: "a", date: "2025-03-01", hours: 800, riskMultiplier: 1.0 },
    { id: "s2", contributorId: "b", date: "2025-04-15", hours: 200, riskMultiplier: 1.0 },
    { id: "s3", contributorId: "c", date: "2025-05-01", hours: 600, riskMultiplier: 1.0 },
    { id: "s4", contributorId: "d", date: "2025-06-01", hours: 500, riskMultiplier: 1.5 },
  ],
  capitalEntries: [
    { id: "c1", contributorId: "b", date: "2025-01-15", amount: 50000 },
    { id: "c2", contributorId: "c", date: "2025-02-01", amount: 25000 },
  ],
  financialSnapshots: [
    { id: "f1", date: "2025-06-01", ebitda: 350000, industryMultiple: 4.5 },
    { id: "f2", date: "2025-12-01", ebitda: 400000, industryMultiple: 5.0 },
  ],
};

const COLORS = ["#f97316", "#fb923c", "#fdba74", "#fed7aa"];
const ACCENT = "#f97316";

const supabase =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
    : null;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function AnimatedValue({ value, className }) {
  return (
    <span key={value} className={`num-transition ${className || ""}`}>
      {value}
    </span>
  );
}

export default function Home() {
  const [contributors, setContributors] = useState(SEED.contributors);
  const [sweatEntries, setSweatEntries] = useState(SEED.sweatEntries);
  const [capitalEntries, setCapitalEntries] = useState(SEED.capitalEntries);
  const [financialSnapshots, setFinancialSnapshots] = useState(SEED.financialSnapshots);
  const [usingDb, setUsingDb] = useState(false);

  const [sweatForm, setSweatForm] = useState({
    contributorId: "a",
    hours: "",
    riskMultiplier: "1.0",
  });
  const [capitalForm, setCapitalForm] = useState({ contributorId: "a", amount: "" });
  const [snapshotForm, setSnapshotForm] = useState({ ebitda: "", industryMultiple: "" });

  useEffect(() => {
    if (!supabase) return;

    async function load() {
      try {
        const [cRes, sRes, capRes, fRes] = await Promise.all([
          supabase.from("contributors").select("*"),
          supabase.from("sweat_entries").select("*"),
          supabase.from("capital_entries").select("*"),
          supabase.from("financial_snapshots").select("*"),
        ]);

        if (cRes.error || sRes.error || capRes.error || fRes.error) throw new Error("fetch failed");
        if (!cRes.data?.length) return;

        setContributors(
          cRes.data.map((r) => ({
            id: r.id,
            name: r.name,
            role: r.role,
            marketRate: r.market_rate,
            paidRate: r.paid_rate,
          }))
        );
        setSweatEntries(
          sRes.data.map((r) => ({
            id: r.id,
            contributorId: r.contributor_id,
            date: r.date,
            hours: r.hours,
            riskMultiplier: r.risk_multiplier,
          }))
        );
        setCapitalEntries(
          capRes.data.map((r) => ({
            id: r.id,
            contributorId: r.contributor_id,
            date: r.date,
            amount: r.amount,
          }))
        );
        setFinancialSnapshots(
          fRes.data.map((r) => ({
            id: r.id,
            date: r.date,
            ebitda: r.ebitda,
            industryMultiple: r.industry_multiple,
          }))
        );
        setUsingDb(true);
      } catch {
        // fallback to seed data — app never blank
      }
    }

    load();
  }, []);

  const capTable = useMemo(
    () => buildCapTable(contributors, sweatEntries, capitalEntries, financialSnapshots),
    [contributors, sweatEntries, capitalEntries, financialSnapshots]
  );

  const chartData = useMemo(
    () =>
      capTable.map((row, i) => ({
        name: row.name,
        value: row.equityPct,
        color: COLORS[i % COLORS.length],
      })),
    [capTable]
  );

  const latest = latestSnapshot(financialSnapshots);
  const val = hasPositiveEbitda(financialSnapshots) ? valuation(financialSnapshots) : null;

  async function addSweat(e) {
    e.preventDefault();
    const hours = Number(sweatForm.hours);
    const riskMultiplier = Number(sweatForm.riskMultiplier);
    if (!hours || isNaN(hours)) return;

    const entry = {
      id: uid(),
      contributorId: sweatForm.contributorId,
      date: new Date().toISOString().slice(0, 10),
      hours,
      riskMultiplier: riskMultiplier || 1,
    };

    setSweatEntries((prev) => [...prev, entry]);

    if (supabase && usingDb) {
      await supabase.from("sweat_entries").insert({
        id: entry.id,
        contributor_id: entry.contributorId,
        date: entry.date,
        hours: entry.hours,
        risk_multiplier: entry.riskMultiplier,
      });
    }

    setSweatForm((f) => ({ ...f, hours: "" }));
  }

  async function addCapital(e) {
    e.preventDefault();
    const amount = Number(capitalForm.amount);
    if (!amount || isNaN(amount)) return;

    const entry = {
      id: uid(),
      contributorId: capitalForm.contributorId,
      date: new Date().toISOString().slice(0, 10),
      amount,
    };

    setCapitalEntries((prev) => [...prev, entry]);

    if (supabase && usingDb) {
      await supabase.from("capital_entries").insert({
        id: entry.id,
        contributor_id: entry.contributorId,
        date: entry.date,
        amount: entry.amount,
      });
    }

    setCapitalForm((f) => ({ ...f, amount: "" }));
  }

  async function addSnapshot(e) {
    e.preventDefault();
    const ebitda = Number(snapshotForm.ebitda);
    const industryMultiple = Number(snapshotForm.industryMultiple);
    if (!ebitda || isNaN(ebitda) || !industryMultiple || isNaN(industryMultiple)) return;

    const snap = {
      id: uid(),
      date: new Date().toISOString().slice(0, 10),
      ebitda,
      industryMultiple,
    };

    setFinancialSnapshots((prev) => [...prev, snap]);

    if (supabase && usingDb) {
      await supabase.from("financial_snapshots").insert({
        id: snap.id,
        date: snap.date,
        ebitda: snap.ebitda,
        industry_multiple: snap.industryMultiple,
      });
    }

    setSnapshotForm({ ebitda: "", industryMultiple: "" });
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-6">
      <header className="mb-5 flex items-baseline gap-3">
        <h1 className="text-lg font-bold tracking-tight" style={{ color: ACCENT }}>
          Sweat
        </h1>
        <p className="text-sm text-zinc-600">Equity from sweat + capital</p>
      </header>

      <div className="grid grid-cols-3 gap-5 mb-5">
        {/* Donut */}
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Equity Split</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, i) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => formatPct(v)}
                contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {chartData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                {d.name} <AnimatedValue value={formatPct(d.value)} className="tabular-nums" />
              </div>
            ))}
          </div>
        </div>

        {/* Valuation + cap table */}
        <div className="col-span-2 bg-zinc-900 rounded-lg p-5 border border-zinc-800">
          <div className="flex items-end justify-between mb-4 pb-4 border-b border-zinc-800">
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                Company Valuation
              </div>
              <AnimatedValue
                value={val != null ? formatMoney(val) : "—"}
                className="text-5xl font-bold tracking-tight tabular-nums"
              />
            </div>
            <div className="text-right">
              {latest && (
                <div className="text-xs text-zinc-500 tabular-nums">
                  EBITDA {formatMoney(latest.ebitda)} × {latest.industryMultiple}x
                </div>
              )}
              {!hasPositiveEbitda(financialSnapshots) && (
                <div className="text-xs mt-1" style={{ color: ACCENT }}>
                  No positive EBITDA — percentages only.
                </div>
              )}
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="text-zinc-600 text-xs uppercase tracking-wider border-b border-zinc-800">
                <th className="text-left pb-2 font-medium">Contributor</th>
                <th className="text-right pb-2 font-medium">Cash</th>
                <th className="text-right pb-2 font-medium">Sweat</th>
                <th className="text-right pb-2 font-medium">Equity</th>
                <th className="text-right pb-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {capTable.map((row) => (
                <tr key={row.id} className="border-b border-zinc-800/50">
                  <td className="py-3">
                    <div className="font-medium text-sm">{row.name}</div>
                    <div className="text-xs text-zinc-600">{row.role}</div>
                  </td>
                  <td className="text-right py-3 text-xs text-zinc-500 tabular-nums">
                    <AnimatedValue value={formatMoney(row.cashInvested)} />
                  </td>
                  <td className="text-right py-3 text-xs text-zinc-500 tabular-nums">
                    <AnimatedValue value={formatMoney(row.sweatDollars)} />
                  </td>
                  <td
                    className="text-right py-3 text-4xl font-bold tabular-nums"
                    style={{ color: ACCENT }}
                  >
                    <AnimatedValue value={formatPct(row.equityPct)} />
                  </td>
                  <td className="text-right py-3 text-2xl font-semibold tabular-nums">
                    <AnimatedValue
                      value={row.stakeValue != null ? formatMoney(row.stakeValue) : "—"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forms */}
      <div className="grid grid-cols-3 gap-4">
        <form onSubmit={addSweat}>
          <h3 className="text-xs uppercase tracking-wider text-zinc-600 mb-2">Add Sweat Entry</h3>
          <div className="space-y-2">
            <select
              value={sweatForm.contributorId}
              onChange={(e) => setSweatForm((f) => ({ ...f, contributorId: e.target.value }))}
              className="w-full bg-transparent border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-200"
            >
              {contributors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Hours"
              value={sweatForm.hours}
              onChange={(e) => setSweatForm((f) => ({ ...f, hours: e.target.value }))}
              className="w-full bg-transparent border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-200"
            />
            <input
              type="number"
              step="0.1"
              min="1"
              max="2"
              placeholder="Risk multiplier (1.0–2.0)"
              value={sweatForm.riskMultiplier}
              onChange={(e) => setSweatForm((f) => ({ ...f, riskMultiplier: e.target.value }))}
              className="w-full bg-transparent border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-200"
            />
            <button
              type="submit"
              className="w-full py-1.5 rounded text-sm font-medium bg-zinc-900 border border-zinc-800"
              style={{ color: ACCENT }}
            >
              Log Sweat
            </button>
          </div>
        </form>

        <form onSubmit={addCapital}>
          <h3 className="text-xs uppercase tracking-wider text-zinc-600 mb-2">Add Capital Entry</h3>
          <div className="space-y-2">
            <select
              value={capitalForm.contributorId}
              onChange={(e) => setCapitalForm((f) => ({ ...f, contributorId: e.target.value }))}
              className="w-full bg-transparent border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-200"
            >
              {contributors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Amount ($)"
              value={capitalForm.amount}
              onChange={(e) => setCapitalForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full bg-transparent border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-200"
            />
            <button
              type="submit"
              className="w-full py-1.5 rounded text-sm font-medium bg-zinc-900 border border-zinc-800"
              style={{ color: ACCENT }}
            >
              Log Capital
            </button>
          </div>
        </form>

        <form onSubmit={addSnapshot}>
          <h3 className="text-xs uppercase tracking-wider text-zinc-600 mb-2">
            Add Financial Snapshot
          </h3>
          <div className="space-y-2">
            <input
              type="number"
              placeholder="EBITDA ($)"
              value={snapshotForm.ebitda}
              onChange={(e) => setSnapshotForm((f) => ({ ...f, ebitda: e.target.value }))}
              className="w-full bg-transparent border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-200"
            />
            <input
              type="number"
              step="0.1"
              placeholder="Industry multiple"
              value={snapshotForm.industryMultiple}
              onChange={(e) =>
                setSnapshotForm((f) => ({ ...f, industryMultiple: e.target.value }))
              }
              className="w-full bg-transparent border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-200"
            />
            <button
              type="submit"
              className="w-full py-1.5 rounded text-sm font-medium bg-zinc-900 border border-zinc-800"
              style={{ color: ACCENT }}
            >
              Add Snapshot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
