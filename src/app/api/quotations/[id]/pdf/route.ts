// Export / preview a quotation as PDF. Preview uses the real renderer
// (docs/03-tech-stack.md §4.3) — an HTML approximation that differed from the
// output would be worse than no preview, particularly when the thing being
// checked is that cost is absent.
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { buildPdfPayload } from '@/lib/data/quotations'
import { renderQuotationPdf, PdfServiceError } from '@/lib/pdf/client'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
  } catch {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const { id } = await ctx.params
  const quotationId = Number(id)
  if (!Number.isInteger(quotationId) || quotationId <= 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const payload = await buildPdfPayload(quotationId)
  if (!payload) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const pdf = await renderQuotationPdf(payload)
    const number = (payload.quotation as { number?: string }).number ?? `quotation-${quotationId}`
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${number}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    const detail = err instanceof PdfServiceError ? err.message : 'Render failed'
    return NextResponse.json({ error: detail }, { status: 502 })
  }
}
