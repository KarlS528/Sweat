export function sweatValue(entry, contributor) {
  const gap = Math.max(0, contributor.marketRate - contributor.paidRate);
  return entry.hours * gap * (entry.riskMultiplier ?? 1);
}

export function capitalValue(entry) {
  return entry.amount;
}

export function contributorSweatTotal(contributorId, sweatEntries, contributors) {
  const contributor = contributors.find((c) => c.id === contributorId);
  if (!contributor) return 0;
  return sweatEntries
    .filter((e) => e.contributorId === contributorId)
    .reduce((sum, entry) => sum + sweatValue(entry, contributor), 0);
}

export function contributorCapitalTotal(contributorId, capitalEntries) {
  return capitalEntries
    .filter((e) => e.contributorId === contributorId)
    .reduce((sum, entry) => sum + capitalValue(entry), 0);
}

export function contributorTotal(contributor, sweatEntries, capitalEntries) {
  const sweat = contributorSweatTotal(contributor.id, sweatEntries, [contributor]);
  const capital = contributorCapitalTotal(contributor.id, capitalEntries);
  return sweat + capital;
}

export function poolTotal(contributors, sweatEntries, capitalEntries) {
  return contributors.reduce(
    (sum, c) => sum + contributorTotal(c, sweatEntries, capitalEntries),
    0
  );
}

export function equityPct(contributor, contributors, sweatEntries, capitalEntries) {
  const pool = poolTotal(contributors, sweatEntries, capitalEntries);
  if (pool === 0) return 0;
  return contributorTotal(contributor, sweatEntries, capitalEntries) / pool;
}

export function latestSnapshot(snapshots) {
  if (!snapshots.length) return null;
  return [...snapshots].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
}

export function valuation(snapshots) {
  const latest = latestSnapshot(snapshots);
  if (!latest) return 0;
  return latest.ebitda * latest.industryMultiple;
}

export function hasPositiveEbitda(snapshots) {
  const latest = latestSnapshot(snapshots);
  if (!latest) return false;
  return latest.ebitda > 0;
}

export function stakeValue(contributor, contributors, sweatEntries, capitalEntries, snapshots) {
  if (!hasPositiveEbitda(snapshots)) return null;
  const pct = equityPct(contributor, contributors, sweatEntries, capitalEntries);
  return pct * valuation(snapshots);
}

export function buildCapTable(contributors, sweatEntries, capitalEntries, snapshots) {
  const pool = poolTotal(contributors, sweatEntries, capitalEntries);
  const positiveEbitda = hasPositiveEbitda(snapshots);
  const val = positiveEbitda ? valuation(snapshots) : 0;

  return contributors.map((contributor) => {
    const sweat = contributorSweatTotal(contributor.id, sweatEntries, contributors);
    const capital = contributorCapitalTotal(contributor.id, capitalEntries);
    const total = sweat + capital;
    const pct = pool > 0 ? total / pool : 0;
    const dollar = positiveEbitda ? pct * val : null;

    return {
      ...contributor,
      cashInvested: capital,
      sweatDollars: sweat,
      equityPct: pct,
      stakeValue: dollar,
    };
  });
}

export function formatMoney(n) {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

export function formatPct(n) {
  return `${(n * 100).toFixed(1)}%`;
}
