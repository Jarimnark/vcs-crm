// The quotation view (Flow C). The full builder — line CRUD, autocomplete,
// live margin, issue flow — is Phase C (approved, K6). This screen renders
// what exists and exports the real PDF.
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

  const qRows = await db
    .select({
      id: quotations.id,
      projectId: quotations.projectId,
      quotationNo: quotations.quotationNo,
      revision: quotations.revision,
      status: quotations.status,
      quotationDate: quotations.quotationDate,
      currency: quotations.currency,
      vatApplied: quotations.vatApplied,
      vatRate: quotations.vatRate,
      subtotal: quotations.subtotal,
      discountTotal: quotations.discountTotal,
      vatAmount: quotations.vatAmount,
      grandTotal: quotations.grandTotal,
    })
    .from(quotations)
    .where(eq(quotations.id, quotationId))
    .limit(1)
  const q = qRows[0]
  if (!q) notFound()

  const lines = await db
    .select({
      // G2: pass fields, never rows — unitCost/lineCost/lineMargin are
      // deliberately not selected, so they cannot reach the page payload.
      id: quotationLines.id,
      sequence: quotationLines.sequence,
      itemCode: quotationLines.itemCode,
      itemName: quotationLines.itemName,
      quantity: quotationLines.quantity,
      unitPrice: quotationLines.unitPrice,
      amount: quotationLines.amount,
    })
    .from(quotationLines)
    .where(eq(quotationLines.quotationId, quotationId))
    .orderBy(asc(quotationLines.sequence))

  const base = q.quotationNo ?? 'Draft'
  const displayNo = q.revision > 1 ? `${base}-R${q.revision}` : base

  return (
    <>
      <h1>
        {displayNo} <span className="badge">{q.status}</span>
      </h1>
      <div className="card">
        <p>
          <Link href={`/projects/${q.projectId}`}>Project #{q.projectId}</Link> ·{' '}
          {q.quotationDate} · {q.currency}
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
                No lines yet — the builder lands in Phase C.
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
              <td className="num">{l.quantity}</td>
              <td className="num">{formatMoney(l.unitPrice)}</td>
              <td className="num">{formatMoney(l.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="num">
              Total
            </td>
            <td className="num">{formatMoney(q.subtotal)}</td>
          </tr>
          {q.discountTotal !== '0.00' && (
            <tr>
              <td colSpan={4} className="num">
                Discount
              </td>
              <td className="num">-{formatMoney(q.discountTotal)}</td>
            </tr>
          )}
          {q.vatApplied && (
            <tr>
              <td colSpan={4} className="num">
                VAT {q.vatRate.replace(/\.0+$/, '')}%
              </td>
              <td className="num">{formatMoney(q.vatAmount)}</td>
            </tr>
          )}
          <tr>
            <td colSpan={4} className="num">
              <strong>Grand Total</strong>
            </td>
            <td className="num">
              <strong>{formatMoney(q.grandTotal)}</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    </>
  )
}
