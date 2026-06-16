"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export type EmployeeRowActionsProps = {
  id: number;
  name: string;
};

export function EmployeeRowActions({ id, name }: EmployeeRowActionsProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const onConfirm = React.useCallback(async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to delete employee ${id}`);
      }
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }, [id, router]);

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Link
        href={`/employees/${id}`}
        className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
      >
        Edit
      </Link>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
            />
          }
        >
          Delete
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {`This will permanently remove ${name} from the directory.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirm}
              disabled={submitting}
            >
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
