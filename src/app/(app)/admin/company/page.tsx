// Company settings — what prints on every document, plus the quotation
// counter (ADR-0047: forward-only re-seed; the "700XX next year" control).
import { requireSessionOrRedirect, isManager } from '@/lib/session'
import { getCompany } from '@/lib/data/admin'
import { saveCompanyAction, setNextQuotationNumberAction } from '../actions'

export const dynamic = 'force-dynamic'

export default async function CompanyPage() {
  const session = await requireSessionOrRedirect()
  const company = await getCompany()

  return (
    <>
      <h1>Company settings</h1>
      <div className="card">
        <form className="stack" action={saveCompanyAction}>
          <label>
            Name (Thai)
            <input name="nameTh" required defaultValue={company?.nameTh ?? ''} />
          </label>
          <label>
            Name (English)
            <input name="nameEn" required defaultValue={company?.nameEn ?? ''} />
          </label>
          <label>
            Address (Thai)
            <textarea name="addressTh" rows={3} required defaultValue={company?.addressTh ?? ''} />
          </label>
          <label>
            Address (English)
            <textarea name="addressEn" rows={3} required defaultValue={company?.addressEn ?? ''} />
          </label>
          <label>
            Telephone
            <input name="phone" required defaultValue={company?.phone ?? ''} />
          </label>
          <label>
            Tax ID
            <input name="taxId" defaultValue={company?.taxId ?? ''} />
          </label>
          <label>
            Thank-you text (Thai)
            <textarea
              name="quotationFooterTextTh"
              rows={2}
              defaultValue={company?.quotationFooterTextTh ?? ''}
            />
          </label>
          <label>
            Thank-you text (English)
            <textarea
              name="quotationFooterTextEn"
              rows={2}
              defaultValue={company?.quotationFooterTextEn ?? ''}
            />
          </label>
          <label>
            Standard terms &amp; conditions — prints as the quotation&apos;s final page when set
            (T1: wording awaited from VCS)
            <textarea
              name="quotationTermsText"
              rows={6}
              defaultValue={company?.quotationTermsText ?? ''}
            />
          </label>
          <label>
            Default VAT rate (%)
            <input
              name="defaultVatRate"
              required
              inputMode="decimal"
              pattern="\d{1,2}(\.\d{1,2})?"
              defaultValue={company?.defaultVatRate ?? '7.00'}
            />
          </label>
          <label>
            Date format
            <input name="dateFormat" required defaultValue={company?.dateFormat ?? 'DD/MM/YYYY'} />
          </label>
          <button>Save</button>
        </form>
      </div>

      <h2>Quotation numbering</h2>
      <div className="card">
        <p>
          Next number: <strong>
            {company ? `${company.quotationNumberPrefix}${String(company.quotationNumberNext).padStart(5, '0')}` : '—'}
          </strong>
          <span className="muted">
            {' '}
            — ⚠️ placeholder until VCS&apos;s real current counter arrives (B5)
          </span>
        </p>
        {isManager(session) ? (
          <form className="stack" action={setNextQuotationNumberAction}>
            <label>
              Set next number (forward only — e.g. 70000 to start next year&apos;s sequence)
              <input name="next" type="number" min={1} required />
            </label>
            <button>Update counter</button>
          </form>
        ) : (
          <p className="muted">Manager role is required to move the counter.</p>
        )}
      </div>
    </>
  )
}
