// Company settings — the singleton that prints as the quotation header
// (the one place bilingual data fields survive, ADR-0031).
import { requireSessionOrRedirect } from '@/lib/session'
import { getCompany } from '@/lib/data/admin'
import { saveCompanyAction } from '../actions'

export const dynamic = 'force-dynamic'

export default async function CompanyPage() {
  await requireSessionOrRedirect()
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
            <input name="tel" required defaultValue={company?.tel ?? ''} />
          </label>
          <label>
            Tax ID
            <input name="taxId" defaultValue={company?.taxId ?? ''} />
          </label>
          <label>
            Thank-you text (Thai)
            <textarea name="thankYouTextTh" rows={2} defaultValue={company?.thankYouTextTh ?? ''} />
          </label>
          <label>
            Thank-you text (English)
            <textarea name="thankYouTextEn" rows={2} defaultValue={company?.thankYouTextEn ?? ''} />
          </label>
          <button>Save</button>
        </form>
      </div>
    </>
  )
}
