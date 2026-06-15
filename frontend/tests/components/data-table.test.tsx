import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/data-table";

type Row = {
  id: string;
  name: string;
  role: string;
};

const columnHelper = createColumnHelper<Row>();

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("role", {
    header: "Role",
    cell: (info) => info.getValue(),
  }),
] satisfies ColumnDef<Row, string>[];

const data: Row[] = [
  { id: "1", name: "Ada Lovelace", role: "Analyst" },
  { id: "2", name: "Grace Hopper", role: "Manager" },
];

describe("DataTable", () => {
  it("renders columns and rows", () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        pageIndex={0}
        pageSize={10}
        totalCount={2}
        onPaginationChange={() => {}}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Role" })).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("renders a loading skeleton state", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        pageIndex={0}
        pageSize={10}
        totalCount={2}
        loading
        onPaginationChange={() => {}}
      />,
    );

    expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
  });

  it("renders an empty state when there are no rows", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        pageIndex={0}
        pageSize={10}
        totalCount={0}
        onPaginationChange={() => {}}
      />,
    );

    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it("disables previous on the first page", () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        pageIndex={0}
        pageSize={10}
        totalCount={25}
        onPaginationChange={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
  });

  it("disables next on the last page", () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        pageIndex={2}
        pageSize={10}
        totalCount={25}
        onPaginationChange={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("calls pagination change when clicking next", async () => {
    const user = userEvent.setup();
    const onPaginationChange = vi.fn();

    render(
      <DataTable
        columns={columns}
        data={data}
        pageIndex={0}
        pageSize={10}
        totalCount={25}
        onPaginationChange={onPaginationChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(onPaginationChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 10 });
  });

  it("shows the current range in the footer", () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        pageIndex={1}
        pageSize={10}
        totalCount={25}
        onPaginationChange={() => {}}
      />,
    );

    expect(screen.getByText("Showing 11–20 of 25")).toBeInTheDocument();
  });
});
