"use client";
import { Search, X } from "lucide-react";
import type { Device } from "@/model/types";
import { Tabs } from "../../ui/Tabs";
import { FilterSelect } from "./FilterSelect";
import type { LibraryFilters, SortOrder, SourceFilter, StatusFilter } from "./filters";

const SOURCES: { id: SourceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "autolab", label: "Autolab" },
  { id: "computer", label: "Computer" },
  { id: "upload", label: "Upload" },
];

const STATUSES: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "analyzed", label: "Analyzed" },
  { id: "pending", label: "Not analyzed" },
];

const SORTS: { id: SortOrder; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
];

interface LibraryToolbarProps {
  filters: LibraryFilters;
  devices: Device[];
  onChange: <K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) => void;
}

/** Search, source tabs and the selects above the grid, in one row that wraps on phones. */
export function LibraryToolbar({ filters, devices, onChange }: LibraryToolbarProps) {
  const deviceOptions = [{ id: "all", label: "All" }, ...devices.map((d) => ({ id: d.id, label: d.name }))];

  return (
    <div className="data-toolbar">
      <div className="data-search">
        <Search className="data-search__icon" size={16} strokeWidth={1.8} aria-hidden="true" />
        <input
          className="input data-search__input"
          type="search"
          placeholder="Search labels"
          aria-label="Search labels"
          value={filters.query}
          onChange={(e) => onChange("query", e.target.value)}
        />
        {filters.query ? (
          <button type="button" className="data-search__clear" aria-label="Clear search" onClick={() => onChange("query", "")}>
            <X size={14} strokeWidth={1.8} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <Tabs
        className="data-toolbar__tabs"
        label="Source"
        items={SOURCES}
        value={filters.source}
        onChange={(source) => onChange("source", source)}
      />
      <div className="data-toolbar__selects">
        <FilterSelect label="Status" value={filters.status} options={STATUSES} onChange={(v) => onChange("status", v)} />
        {devices.length > 1 ? (
          <FilterSelect label="Device" value={filters.device} options={deviceOptions} onChange={(v) => onChange("device", v)} />
        ) : null}
        <FilterSelect label="Sort" value={filters.sort} options={SORTS} onChange={(v) => onChange("sort", v)} />
      </div>
    </div>
  );
}
