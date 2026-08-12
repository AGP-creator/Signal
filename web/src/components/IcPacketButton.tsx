"use client";

import { useState } from "react";
import {
  appendDiligenceToIcPacket,
  buildDiligencePack,
  companyToSubject,
} from "@/lib/diligence";
import { buildIcMemo } from "@/lib/icMemo";
import {
  buildIcPacketMarkdown,
  computeCompanyFreshness,
  type PartnerOverride,
} from "@/lib/judgment";
import { loadOverrides } from "@/lib/overrideStore";
import type { Commentary, Company, PeerActivity } from "@/lib/types";

type Competitive = {
  on_cap_table?: { name: string }[];
  circling?: { name: string; reason?: string }[];
  syndicate_suggestions?: { firm: string; reason?: string }[];
};

function loadOverride(companyId: string): PartnerOverride | null {
  try {
    return loadOverrides().find((o) => o.company_id === companyId) || null;
  } catch {
    return null;
  }
}

export function IcPacketButton({
  company,
  commentary,
  comps,
  competitive,
  peers,
}: {
  company: Company;
  commentary: Commentary[];
  comps: {
    name: string;
    thesis_score?: number | null;
    recommendation?: string | null;
    why?: string;
  }[];
  competitive?: Competitive;
  peers?: PeerActivity[];
}) {
  const [done, setDone] = useState<"copy" | "download" | "memo" | "memo-dl" | null>(null);

  function packet() {
    const override = loadOverride(company.id);
    const base = buildIcPacketMarkdown(company, {
      commentary,
      comps,
      freshness: computeCompanyFreshness(company),
      competitive,
      override,
    });
    const pack = buildDiligencePack(companyToSubject(company), {
      commentary,
      peers,
    });
    return appendDiligenceToIcPacket(base, pack);
  }

  function memo() {
    const override = loadOverride(company.id);
    return buildIcMemo(company, {
      commentary,
      peers,
      comps,
      competitive,
      override,
    }).markdown;
  }

  async function copyPacket() {
    await navigator.clipboard.writeText(packet());
    setDone("copy");
    setTimeout(() => setDone(null), 1800);
  }

  function downloadPacket() {
    const md = packet();
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `IC_Packet_${company.slug || company.name}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setDone("download");
    setTimeout(() => setDone(null), 1800);
  }

  async function copyMemo() {
    await navigator.clipboard.writeText(memo());
    setDone("memo");
    setTimeout(() => setDone(null), 1800);
  }

  function downloadMemo() {
    const md = memo();
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `IC_Memo_${company.slug || company.name}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setDone("memo-dl");
    setTimeout(() => setDone(null), 1800);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={copyPacket} className="btn btn-primary btn-sm">
        {done === "copy" ? "Copied ✓" : "Copy IC packet"}
      </button>
      <button type="button" onClick={downloadPacket} className="btn btn-ghost btn-sm">
        {done === "download" ? "Saved ✓" : "Download .md"}
      </button>
      <button type="button" onClick={copyMemo} className="btn btn-soft btn-sm">
        {done === "memo" ? "Memo copied ✓" : "Copy IC memo"}
      </button>
      <button type="button" onClick={downloadMemo} className="btn btn-ghost btn-sm">
        {done === "memo-dl" ? "Saved ✓" : "Memo .md"}
      </button>
    </div>
  );
}
