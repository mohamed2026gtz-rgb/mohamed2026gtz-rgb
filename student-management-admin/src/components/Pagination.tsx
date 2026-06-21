interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, totalCount, pageSize, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="pager">
      <button type="button" className="btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
        {typeof totalCount === 'number' ? ` (${totalCount.toLocaleString()} total` : ''}
        {typeof pageSize === 'number' && typeof totalCount === 'number' ? `, ${pageSize} per page` : ''}
        {typeof totalCount === 'number' ? ')' : ''}
      </span>
      <button type="button" className="btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next
      </button>
    </div>
  );
}