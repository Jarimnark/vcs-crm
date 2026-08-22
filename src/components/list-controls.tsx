// Server components shared by every module list: a search/filter bar (GET
// form, so state lives in the URL) and pagination links.
import Link from 'next/link'
import type { Paged } from '@/lib/list'

export function SearchBar({
  action,
  q,
  children,
  placeholder = 'Search…',
}: {
  action: string
  q: string
  children?: React.ReactNode // extra <select> filters; submit on the button
  placeholder?: string
}) {
  return (
    <form method="GET" action={action} className="filter-bar">
      <input type="search" name="q" defaultValue={q} placeholder={placeholder} />
      {children}
      <button className="quiet">Filter</button>
      {q !== '' || children ? (
        <Link className="muted" href={action}>
          clear
        </Link>
      ) : null}
    </form>
  )
}

export function Pagination({
  paged,
  basePath,
  params,
}: {
  paged: Paged<unknown>
  basePath: string
  params: Record<string, string>
}) {
  if (paged.pageCount <= 1) {
    return <p className="muted pagination">{paged.total} record{paged.total === 1 ? '' : 's'}</p>
  }
  const href = (page: number) => {
    const sp = new URLSearchParams({ ...params, page: String(page) })
    return `${basePath}?${sp.toString()}`
  }
  return (
    <p className="pagination">
      {paged.page > 1 ? <Link href={href(paged.page - 1)}>← Prev</Link> : <span />}
      <span className="muted">
        Page {paged.page} / {paged.pageCount} · {paged.total} records
      </span>
      {paged.page < paged.pageCount ? <Link href={href(paged.page + 1)}>Next →</Link> : <span />}
    </p>
  )
}
