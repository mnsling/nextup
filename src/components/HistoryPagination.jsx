export function HistoryPagination({ total, page, onPageChange }) {
  const pageCount = Math.max(1, Math.ceil(total / 4));
  const currentPage = Math.min(page, pageCount);
  const offset = (currentPage - 1) * 4;

  if (!total) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e5da] pt-4">
      <p className="text-xs text-[#687167]">
        Showing {offset + 1}–{Math.min(offset + 4, total)} of {total} matches
      </p>

      <nav
        aria-label="Player match history pages"
        className="flex items-center gap-3"
      >
        <button
          type="button"
          className="outline"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </button>

        <span className="text-sm" aria-live="polite">
          {currentPage} / {pageCount}
        </span>

        <button
          type="button"
          className="outline"
          disabled={currentPage === pageCount}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </button>
      </nav>
    </div>
  );
}