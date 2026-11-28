interface Props { page: number; size: number; total: number; onPage: (page: number) => void }

/** Previous / next buttons with a "1–20 of 134" label. */
export default function Pager({ page, size, total, onPage }: Props) {
  const pages = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  return (
    <div className="pager">
      <span className="muted">{from}–{Math.min(page * size, total)} of {total}</span>
      <div className="actions">
        <button className="btn btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <span className="muted">Page {page} of {pages}</span>
        <button className="btn btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
