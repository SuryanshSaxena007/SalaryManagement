"use client"

import * as React from "react"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

type DataTableProps<TData, TValue = unknown> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageIndex: number
  pageSize: number
  totalCount: number
  onPaginationChange: (pagination: PaginationState) => void
  loading?: boolean
}

export function DataTable<TData, TValue = unknown>({
  columns,
  data,
  pageIndex,
  pageSize,
  totalCount,
  onPaginationChange,
  loading = false,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
    },
  })

  const start = totalCount === 0 ? 0 : pageIndex * pageSize + 1
  const end = totalCount === 0 ? 0 : Math.min(totalCount, (pageIndex + 1) * pageSize)
  const isFirstPage = pageIndex <= 0
  const isLastPage = totalCount === 0 || end >= totalCount

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-4">
                  <div data-testid="data-table-skeleton" className="space-y-3">
                    {Array.from({ length: 3 }).map((_, rowIndex) => (
                      <div key={rowIndex} className="flex gap-3">
                        {Array.from({ length: columns.length }).map((__, cellIndex) => (
                          <Skeleton
                            key={cellIndex}
                            className="h-4 flex-1 rounded-md"
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>{`Showing ${start}–${end} of ${totalCount}`}</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPaginationChange({ pageIndex: pageIndex - 1, pageSize })}
            disabled={isFirstPage}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPaginationChange({ pageIndex: pageIndex + 1, pageSize })}
            disabled={isLastPage}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
