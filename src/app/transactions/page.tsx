import { TopBar } from "@/components/layout/TopBar";

export default function TransactionsPage() {
  return (
    <>
      <TopBar title="Transactions" />
      <main className="flex-1 overflow-auto p-6">
        <p className="text-muted-foreground">Coming soon — sync your accounts first.</p>
      </main>
    </>
  );
}
