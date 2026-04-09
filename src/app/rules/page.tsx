import { TopBar } from "@/components/layout/TopBar";
import { RulesSection } from "@/components/rules/RulesSection";
import { getAllRules } from "@/lib/queries/rules";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  let rules: Awaited<ReturnType<typeof getAllRules>> = [];
  let dbError = false;

  try {
    rules = await getAllRules();
  } catch {
    dbError = true;
  }

  return (
    <>
      <TopBar title="Rules" />
      <main className="flex-1 overflow-auto p-3 sm:p-6">
        {dbError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive mb-6">
            <strong>Database not available.</strong> Start Docker and run{" "}
            <code>npm run db:push</code> to initialise the database.
          </div>
        )}
        {!dbError && <RulesSection rules={rules} />}
      </main>
    </>
  );
}
