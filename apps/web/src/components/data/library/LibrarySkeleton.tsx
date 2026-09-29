/** Grey placeholders shaped like the grid while the library loads from storage. */
export function LibrarySkeleton() {
  return (
    <div className="data-day" aria-busy="true" aria-label="Loading images">
      <span className="skeleton data-skeleton__title" />
      <div className="data-grid">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="photo-card photo-card--skeleton" aria-hidden="true">
            <span className="skeleton photo-card__thumb" />
            <span className="photo-card__meta">
              <span className="skeleton data-skeleton__line" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
