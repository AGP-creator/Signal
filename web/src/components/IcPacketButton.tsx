"use client";

import { useState } from "react";
import {
  appendDiligenceToIcPacket,
  buildDiligencePack,
  companyToSubject,
} from "@/lib/diligence";
import {
  buildIcPacketMarkdown,
  computeCompanyFreshness,
  type PartnerOverride,
} from "@/lib/judgment";
import { loadOverrides } from "@/lib/overrideStore";
import type { Commentary, Company, PeerActivity } from "@/lib/types";

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
  competitive?: {
    on_cap_table?: { name: string }[];
    circling?: { name: string; reason?: string }[];
    syndicate_suggestions?: { firm: string; reason?: string }[];
  };
  peers?: PeerActivity[];
}) {
  const [done, setDone] = useState<"copy" | "download" | null>(null);

  function packet() {
    let override: PartnerOverride | null = null;
    try {
      override = loadOverrides().find((o) => o.company_id === company.id) || null;
    } catch {
      override = null;
    }
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

  async function copy() {
    await navigator.clipboard.writeText(packet());
    setDone("copy");
    setTimeout(() => setDone(null), 1800);
  }

  function download() {
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

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={copy} className="btn btn-primary !py-1.5 !text-xs">
        {done === "copy" ? "Copied ✓" : "Copy IC packet"}
      </button>
      <button type="button" onClick={download} className="btn btn-ghost !py-1.5 !text-xs">
        {done === "download" ? "Saved ✓" : "Download .md"}
      </button>
    </div>
  );
}
