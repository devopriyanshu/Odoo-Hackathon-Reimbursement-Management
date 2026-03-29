import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowDownAZ,
  ArrowUpZA,
  ArrowUpDown,
  Search,
  FilterX
} from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  total,
  page,
  limit,
  onPageChange,
  onSort,
  sortKey,
  sortDir,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  onRowClick,
  isLoading,
  emptyState,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(total / limit) || 1;

  const handleSort = (key: string) => {
    if (!onSort) return;
    if (sortKey === key) {
      onSort(key, sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(key, 'desc'); // default to desc for dates/amounts usually
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Toolbar */}
      {onSearchChange !== undefined && (
        <div className="p-4 border-b border-border flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={searchPlaceholder || 'Search...'}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <FilterX className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Table Area */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap border-b border-border ${
                    col.sortable && onSort ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''
                  }`}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <div className="flex items-center gap-2">
                    {col.title}
                    {col.sortable && onSort && (
                      <span className="text-muted-foreground/50">
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? <ArrowUpZA className="w-3.5 h-3.5 text-foreground" /> : <ArrowDownAZ className="w-3.5 h-3.5 text-foreground" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Loading generic state
              Array.from({ length: limit }).map((_, i) => (
                <tr key={`skel-${i}`} className="border-b border-border">
                  {columns.map((col, j) => (
                    <td key={`skel-${i}-${String(col.key)}`} className="p-4">
                      <div className="h-4 bg-muted/50 animate-pulse rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8">
                  {emptyState || (
                    <div className="text-center text-muted-foreground py-10">
                      No results found
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`border-b border-border border-dashed last:border-0 transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-muted/30' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td key={`${row.id}-${String(col.key)}`} className="p-4 text-sm align-middle">
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && total > 0 && (
        <div className="p-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground bg-muted/10 shrink-0">
          <div>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
