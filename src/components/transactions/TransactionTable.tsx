"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, toNumber } from "@/lib/utils/currency";
import { formatDateShort } from "@/lib/utils/dates";
import { getCategoryColor, getCategoryLabel } from "@/lib/utils/categories";
import { TransactionEditDialog } from "./TransactionEditDialog";
import type { getTransactions } from "@/lib/queries/transactions";

type TransactionRow = Awaited<ReturnType<typeof getTransactions>>[number];

interface TransactionTableProps {
  transactions: TransactionRow[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const [selectedTx, setSelectedTx] = useState<TransactionRow | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No transactions found for this period.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-36">Category</TableHead>
              <TableHead className="w-28 text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => {
              const amount = toNumber(tx.amount);
              const isTransfer = tx.isTransfer;
              const category = isTransfer
                ? "Transfer"
                : (tx.userCategory ?? tx.akahuCategoryGroup ?? "Uncategorised");

              return (
                <TableRow
                  key={tx.id}
                  className={`cursor-pointer ${isTransfer ? "text-muted-foreground" : ""}`}
                  onClick={() => setSelectedTx(tx)}
                >
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateShort(tx.date)}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium truncate max-w-xs">
                      {tx.merchantName ?? tx.description}
                    </p>
                    {tx.accountName && (
                      <p className="text-xs text-muted-foreground">{tx.accountName}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: getCategoryColor(category) + "20",
                        color: getCategoryColor(category),
                      }}
                    >
                      {getCategoryLabel(category)}
                    </span>
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold tabular-nums text-sm ${
                      amount >= 0 ? "text-[#9ece6a]" : ""
                    }`}
                  >
                    {amount >= 0 ? "+" : ""}
                    {formatCurrency(amount)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedTx && (
        <TransactionEditDialog
          transaction={selectedTx}
          open={selectedTx !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedTx(null);
          }}
        />
      )}
    </>
  );
}
