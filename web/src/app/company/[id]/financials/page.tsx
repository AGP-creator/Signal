import Link from "next/link";
import { CompanyFinancialsView } from "@/components/CompanyFinancials";
import { getDemoFinancials, listDemoFinancials } from "@/lib/demoFinancials";
import { fetchCompany } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CompanyFinancialsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await fetchCompany(id);
  const pack =
    getDemoFinancials(company?.slug) ||
    getDemoFinancials(company?.id) ||
    getDemoFinancials(id);

  if (!pack) {
    const demos = listDemoFinancials();
    return (
      <div className="animate-in space-y-6">
        <h1 className="display text-[1.85rem]">Financials not available</h1>
        <p className="body-muted max-w-xl">
          Full ratio sheets and VC term desks are wired for demo showcase companies. Pick one
          below for the partner walkthrough.
        </p>
        {company ? (
          <Link href={`/company/${company.id}`} className="link-quiet text-sm">
            ← Back to {company.name}
          </Link>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {demos.map((d) => (
            <Link
              key={d.slug}
              href={`/company/${d.slug}/financials`}
              className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] px-4 py-3 transition hover:border-[var(--line-hover)]"
            >
              <div className="font-semibold">{d.name}</div>
              <div className="mt-1 text-[0.8125rem] text-[var(--muted)]">{d.tagline}</div>
              <div className="mono mt-2 text-sm text-[var(--signal)]">${d.kpis.arr_m}M ARR</div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return <CompanyFinancialsView pack={pack} companyId={company?.id || pack.slug} />;
}
