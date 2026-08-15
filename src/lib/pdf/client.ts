// Authenticated call to the WeasyPrint render service — the only module that
// talks to it (docs/03-tech-stack.md §4). Server-side only.
import 'server-only'
import type { PdfContext } from '@/lib/pdf/context'

export class PdfServiceError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'PdfServiceError'
  }
}

/**
 * Render a quotation PDF. The context has already passed through the
 * whitelist in buildQuotationPdfContext — nothing else may be sent.
 * The service authenticates with a shared secret; an open render endpoint
 * accepting arbitrary HTML is an SSRF and content-injection hazard.
 */
export async function renderQuotationPdf(context: PdfContext): Promise<Buffer> {
  const url = process.env.PDF_SERVICE_URL
  const secret = process.env.PDF_SERVICE_SECRET
  if (!url || !secret) {
    throw new PdfServiceError('PDF_SERVICE_URL / PDF_SERVICE_SECRET are not configured')
  }

  const res = await fetch(`${url.replace(/\/$/, '')}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(context),
    // Cold start of a few seconds is acceptable for someone who just
    // clicked Export; a hung render is not.
    signal: AbortSignal.timeout(60_000),
    cache: 'no-store',
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new PdfServiceError(`PDF service returned ${res.status}: ${detail.slice(0, 500)}`, res.status)
  }
  return Buffer.from(await res.arrayBuffer())
}
