// Fixed reports over a report builder (ADR-0008). Phase 1 placeholder:
// pipeline by progress step. Forecast reads from Project.expected_amount;
// actuals read from Orders (ADR-0030) — never conflated.
import { requireSessionOrRedirect } from '@/lib/session'
import { listProjects, PROGRESS_STEPS } from '@/lib/data/projects'
import { Decimal, toDecimal, formatMoney } from '@/lib/money'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  await requireSessionOrRedirect()
  const projects = await listProjects()

  const byStep = new Map<number, { count: number; expected: Decimal }>()
  for (const p of projects) {
    if (p.status !== 'open') continue
    const entry = byStep.get(p.progress) ?? { count: 0, expected: new Decimal(0) }
    entry.count += 1
    if (p.expectedAmount != null && p.currency === 'THB') {
      entry.expected = entry.expected.plus(toDecimal(p.expectedAmount))
    }
    byStep.set(p.progress, entry)
  }

  const steps = Object.keys(PROGRESS_STEPS).map(Number).sort((a, b) => a - b)

  return (
    <>
      <h1>Reports</h1>
      <h2>Open pipeline by progress</h2>
      <table className="list">
        <thead>
          <tr>
            <th>Step</th>
            <th>Label</th>
            <th className="num">Projects</th>
            <th className="num">Expected (THB)</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s) => {
            const e = byStep.get(s)
            return (
              <tr key={s}>
                <td>{s}%</td>
                <td>{PROGRESS_STEPS[s]}</td>
                <td className="num">{e?.count ?? 0}</td>
                <td className="num">{e ? formatMoney(e.expected) : '0.00'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="muted">
        Forecast only — actual revenue is the sum of Orders and is reported separately.
      </p>
    </>
  )
}
