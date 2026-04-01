export const dynamic = "force-dynamic";

import { TopBar } from "@/components/layout/TopBar";
import { AccountCard } from "@/components/accounts/AccountCard";
import { getAllAccounts, getNetWorthSummary } from "@/lib/queries/accounts";
import { formatCurrency } from "@/lib/utils/currency";
import { Card, CardContent } from "@/components/ui/card";

export default async function AccountsPage() {
  let accounts: Awaited<ReturnType<typeof getAllAccounts>> = [];
  let summary = { assets: 0, liabilities: 0, netWorth: 0 };
  let dbError = false;

  try {
    [accounts, summary] = await Promise.all([getAllAccounts(), getNetWorthSummary()]);
  } catch {
    dbError = true;
  }

  const byGroup = {
    asset: accounts.filter((a) => a.group === "asset" && a.status === "ACTIVE"),
    liability: accounts.filter((a) => a.group === "liability" && a.status === "ACTIVE"),
    excluded: accounts.filter((a) => a.group === "excluded" && a.status === "ACTIVE"),
    inactive: accounts.filter((a) => a.status === "INACTIVE"),
  };

  return (
    <>
      <TopBar title="Accounts" />
      <main className="flex-1 overflow-auto p-6 space-y-6">
        {dbError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Database not available. Start Docker and run <code>npm run db:push</code> to set up the database.
          </div>
        )}

        {!dbError && (
          <>
            {/* Summary row */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Assets</p>
                  <p className="text-xl font-bold text-[#9ece6a]">{formatCurrency(summary.assets)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Liabilities</p>
                  <p className="text-xl font-bold text-[#f7768e]">{formatCurrency(summary.liabilities)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Net Worth</p>
                  <p className={`text-xl font-bold ${summary.netWorth >= 0 ? "text-foreground" : "text-destructive"}`}>
                    {formatCurrency(summary.netWorth)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {accounts.length === 0 && (
              <div className="rounded-lg border border-dashed p-12 text-center">
                <p className="text-muted-foreground mb-2">No accounts yet.</p>
                <p className="text-sm text-muted-foreground">Click <strong>Sync</strong> to pull your accounts from Akahu.</p>
              </div>
            )}

            {byGroup.asset.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Assets
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {byGroup.asset.map((acc) => (
                    <AccountCard key={acc.id} account={acc} />
                  ))}
                </div>
              </section>
            )}

            {byGroup.liability.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Liabilities
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {byGroup.liability.map((acc) => (
                    <AccountCard key={acc.id} account={acc} />
                  ))}
                </div>
              </section>
            )}

            {byGroup.excluded.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Other
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {byGroup.excluded.map((acc) => (
                    <AccountCard key={acc.id} account={acc} />
                  ))}
                </div>
              </section>
            )}

            {byGroup.inactive.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Inactive
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
                  {byGroup.inactive.map((acc) => (
                    <AccountCard key={acc.id} account={acc} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
