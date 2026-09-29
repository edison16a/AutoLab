"use client";
import "@/styles/data-library.css";
import "@/styles/data-card.css";
import Link from "next/link";
import { useMemo } from "react";
import { Images, SearchX } from "lucide-react";
import { useAutolab } from "@/providers/autolab-context";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
import { LibrarySkeleton } from "./library/LibrarySkeleton";
import { LibraryToolbar } from "./library/LibraryToolbar";
import { PhotoGrid } from "./library/PhotoGrid";
import { SelectionBar } from "./library/SelectionBar";
import { useLibraryActions } from "./library/use-library-actions";
import { useLibraryFilters } from "./library/use-library-filters";
import { useSelection } from "./library/use-selection";

function imagesLabel(count: number) {
  return count === 1 ? "1 image" : `${count} images`;
}

/** The image library: every capture and upload, filtered and grouped by day. */
export function DataScreen() {
  const { photos, photosReady, devices, hasMore } = useAutolab();
  const library = useLibraryFilters(photos, devices);
  const visibleIds = useMemo(() => library.visible.map((p) => p.id), [library.visible]);
  const actions = useLibraryActions();
  const selection = useSelection(visibleIds, !actions.pendingDelete);

  const pending = actions.pendingDelete?.length ?? 0;
  const subtitle = !photosReady
    ? "Loading"
    : library.filtered
      ? `${library.visible.length} of ${imagesLabel(photos.length)}`
      : imagesLabel(photos.length);

  const selectToggle = photos.length ? (
    <button
      type="button"
      className={`btn data-select-toggle ${selection.active ? "data-select-toggle--on" : ""}`}
      aria-pressed={selection.active}
      onClick={() => selection.setMode(!selection.active)}
    >
      Select
    </button>
  ) : null;

  let body;
  if (!photosReady) body = <LibrarySkeleton />;
  else if (!photos.length)
    body = (
      <EmptyState
        icon={Images}
        title="No images yet"
        text="Captures and uploads show up here."
        action={
          <Link href="/live" className="btn btn--primary">
            Open live view
          </Link>
        }
      />
    );
  else if (!library.visible.length)
    body = (
      <EmptyState
        compact
        icon={SearchX}
        title="No matches"
        action={
          <button type="button" className="btn" onClick={library.clear}>
            Clear filters
          </button>
        }
      />
    );
  else
    body = (
      <PhotoGrid
        groups={library.groups}
        selecting={selection.active}
        selected={selection.selected}
        onToggle={selection.toggle}
        onDelete={(id) => actions.askDelete([id])}
      />
    );

  return (
    <div className="page data">
      <PageHeader title="Data" subtitle={subtitle} actions={selectToggle} />
      {photos.length ? <LibraryToolbar filters={library.filters} devices={devices} onChange={library.update} /> : null}
      {body}
      {photosReady && hasMore ? (
        <div className="data__more">
          <button type="button" className="btn" disabled={actions.loadingMore} onClick={() => void actions.more()}>
            {actions.loadingMore ? "Loading" : "Load more"}
          </button>
        </div>
      ) : null}
      {selection.active ? (
        <SelectionBar
          count={selection.selected.length}
          total={visibleIds.length}
          busy={actions.busy}
          onSelectAll={selection.selectAll}
          onDownload={() => void actions.downloadMany(selection.selected)}
          onDelete={() => actions.askDelete(selection.selected)}
          onDone={() => selection.setMode(false)}
        />
      ) : null}
      <ConfirmDialog
        open={pending > 0}
        title={pending === 1 ? "Delete image?" : `Delete ${pending} images?`}
        message="This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => void actions.confirmDelete()}
        onCancel={actions.cancelDelete}
      />
    </div>
  );
}
