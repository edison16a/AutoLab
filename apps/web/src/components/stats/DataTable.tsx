import { ChevronRight } from "lucide-react";

interface DataTableProps {
  /** Names the table for screen readers, usually the chart title. */
  caption: string;
  /** First column names each row. The rest are numbers and align right. */
  columns: string[];
  rows: { key: string; cells: string[] }[];
}

/**
 * The table twin of a chart, folded away under "View table". Every value a
 * tooltip shows is also here, so nothing depends on hovering.
 */
export function DataTable({ caption, columns, rows }: DataTableProps) {
  return (
    <details className="stats-table">
      <summary className="stats-table__toggle">
        <ChevronRight className="stats-table__chevron" size={16} strokeWidth={1.8} aria-hidden="true" />
        View table
      </summary>
      <div className="stats-table__scroll">
        <table className="stats-table__table">
          <caption className="visually-hidden">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.cells[0]}</th>
                {row.cells.slice(1).map((cell, i) => (
                  <td key={columns[i + 1]}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
