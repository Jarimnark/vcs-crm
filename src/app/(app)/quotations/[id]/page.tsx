// The quotation view (Flow C). Phase 1 note: the full builder — typed lines
// with autocomplete, live margin via decimal.js in a client component — is
// blocked on client answers B3 (discount format), B5 (counter value) and B6
// (terms per line?). This screen renders what exists and exports the real PDF.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireSessionOrRedirect } from '@/lib/session'
import { db } from '@/lib/db'
import { quotationLines, quotations } from '@/db/schema'
import { asc, eq } from 'drizzle-orm'
import { formatMoney } from '@/lib/money'

export const dynamic = 'force-dynamic'

export default async function QuotationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSessionOrRedirect()
  const { id } = await params
  const quotationId = Number(id)
  if (!Number.isInteger(quotationId)) notFound()

  const qRows = await db.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1)
  const q = qRows[0]
  if (!q) notFound()

  const lines = await db
    .select({
      // G2: pass fields, never rows — unitCost is deliberately not selected,
      // so it cannot reach the page payload.
      id: quotationLines.id,
      sequence: quotationLines.sequence,
      itemCode: quotationLines.itemCode,
      itemName: quotationLines.itemName,
      quantity: quotationLines.quantity,
      unit: quotationLines.unit,
      unitPrice: quotationLines.unitPrice,
      amount: quotationLines.amount,
    })
    .from(quotationLines)
    .where(eq(quotationLines.quotationId, quotationId))
    .orderBy(asc(quotationLines.sequence))

  const displayNumber = q.revision > 0 ? `${q.number}-R${q.revision}` : q.number

  return (
    <>
      <h1>
        {displayNumber} <span className="badge">{q.status}</span>
      </h1>
      <div className="card">
        <p>
          <Link href={`/projects/${q.projectId}`}>Project #{q.projectId}</Link> · {q.date} ·{' '}
          {q.currency}
        </p>
        <p>
          <a href={`/api/quotations/${q.id}/pdf`} target="_blank">
            Preview / export PDF
          </a>{' '}
          <span className="muted">— preview uses the real renderer, not an approximation</span>
        </p>
      </div>

      <table className="list">
        <thead>
          <tr>
            <th>No.</th>
            <th>Description</th>
            <th className="num">Qty</th>
            <th className="num">Unit price</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No lines yet.
              </td>
            </tr>
          )}
          {lines.map((l) => (
            <tr key={l.id}>
              <td>{l.sequence}</td>
              <td>
                {l.itemCode ? `${l.itemCode} ` : ''}
                {l.itemName}
              </td>
              <td className="num">
                {l.quantity} {l.unit}
              </td>
              <td className="num">{formatMoney(l.unitPrice)}</td>
              <td className="num">{formatMoney(l.amount)}</td>
            </tr>
          ))}
        </tbody>
        {q.grandTotal != null && (
          <tfoot>
            <tr>
              <td colSpan={4} className="num">
                Total
              </td>
              <td className="num">{q.totalAmount != null ? formatMoney(q.totalAmount) : '—'}</td>
            </tr>
            <tr>
              <td colSpan={4} className="num">
                VAT 7%
              </td>
              <td className="num">{q.vatAmount != null ? formatMoney(q.vatAmount) : '—'}</td>
            </tr>
            <tr>
              <td colSpan={4} className="num">
                Grand Total
              </td>
              <td className="num">{formatMoney(q.grandTotal)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </>
  )
}
