// Fixed reports over a report builder (ADR-0008). Phase 1 placeholder:
// pipeline by progress step, weighted per 00-product-concept §4.4:
// COALESCE(quoted_value, expected_amount) × progress ÷ 100 over open
// projects. Actuals read from Orders (ADR-0030) — never conflated.
import { requireSessionOrRedirect } from '@/lib/session'
import { listAllProjects, PROGRESS_STEPS } from '@/lib/data/projects'
import { Decimal, toDecimal, formatMoney } from '@/lib/money'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  await requireSessionOrRedirect()
  const projects = await listAllProjects()

  const byStep = new Map<number, { count: number; value: Decimal; weighted: Decimal }>()
  for (const p of projects) {
    if (p.status !== 'open') continue
    const entry =
      byStep.get(p.progress) ?? { count: 0, value: new Decimal(0), weighted: new Decimal(0) }
    entry.count += 1
    const basis = p.quotedValue ?? p.expectedAmount
    if (basis != null && p.currency === 'THB') {
      const v = toDecimal(basis)
      entry.value = entry.value.plus(v)
      entry.weighted = entry.weighted.plus(v.times(p.progress).div(100))
    }
    byStep.set(p.progress, entry)
  }

  return (
    <>
      <h1>Reports</h1>
      <h2>Open pipeline by progress</h2>
      <table className="list">
        <thead>
          <tr>
            <th>Progress</th>
            <th className="num">Projects</th>
            <th className="num">Value (THB)</th>
            <th className="num">Weighted (THB)</th>
          </tr>
        </thead>
        <tbody>
          {PROGRESS_STEPS.map((s) => {
            const e = byStep.get(s)
            return (
              <tr key={s}>
                <td>{s}%</td>
                <td className="num">{e?.count ?? 0}</td>
                <td className="num">{e ? formatMoney(e.value) : '0.00'}</td>
                <td className="num">{e ? formatMoney(e.weighted) : '0.00'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="muted">
        Value = latest issued quotation when one exists, else the expected amount. Actual revenue
        is the sum of Orders and is reported separately.
      </p>
    </>
  )
}
