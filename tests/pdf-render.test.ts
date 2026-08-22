// Testing priority 1, integration half: the sentinel payload rendered by the
// REAL WeasyPrint container, extracted with pdftotext, asserted clean —
// because the whitelist now has to hold across a network boundary (ADR-0042).
//
// Skipped unless PDF_SERVICE_URL and PDF_SERVICE_SECRET are set and
// `pdftotext` (poppler-utils) is on PATH. CI runs it against the freshly
// built image; locally: docker compose up -d pdf-service && npm test.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildQuotationPdfContext } from '@/lib/pdf/context'
import { makeSentinelQuotation } from './helpers/sentinel-quotation'

const url = process.env.PDF_SERVICE_URL
const secret = process.env.PDF_SERVICE_SECRET
const enabled = Boolean(url && secret)

describe.skipIf(!enabled)('PDF service integration', () => {
  async function render(body: unknown, auth = true): Promise<Response> {
    return fetch(`${url!.replace(/\/$/, '')}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify(body),
    })
  }

  it('rejects an unauthenticated render request', async () => {
    const res = await render({}, false)
    expect(res.status).toBe(401)
  })

  it('renders a PDF, in Thai, with no cost sentinel in the output', async () => {
    const context = buildQuotationPdfContext(makeSentinelQuotation())
    const res = await render(context)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/pdf')

    const pdf = Buffer.from(await res.arrayBuffer())
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')

    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vcs-pdf-')), 'q.pdf')
    fs.writeFileSync(tmp, pdf)
    const text = execFileSync('pdftotext', ['-enc', 'UTF-8', tmp, '-'], { encoding: 'utf8' })

    // The whitelist held across the network boundary:
    for (const sentinel of ['123456', '123,456', '987654', '987,654', '424242', '555555', '555,555']) {
      expect(text).not.toContain(sentinel)
    }
    // And the document is real: number, Thai labels, totals all present.
    // pdftotext's ToUnicode for shaped Sarabun confuses SARA AA (า), SARA AM
    // (ำ) and its decomposed NIKHAHIT+AA form — an extraction artifact, not
    // a render defect (verified visually against the rendered page).
    // Normalize both sides before comparing.
    const th = (s: string) => s.replaceAll('ำ', 'า').replaceAll('ํ', '')
    // (pdftotext may also break a trailing tone mark onto its own line, so
    // assert on prefixes that extract contiguously.)
    const extracted = th(text)
    expect(extracted).toContain(th('ใบเสนอราคา')) // the title box
    expect(extracted).toContain(th('จำนวนเงิน')) // the Grand Total label
    expect(extracted).toContain(th('รวมเงิน')) // the Total label
    expect(text).toContain('QUO69055')
    expect(text).toContain('17,387.50')
  }, 60_000)
})
