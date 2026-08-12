"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  interestRankOf,
  type InterestState,
} from "@/lib/interest";
import {
  consumeLegacyInterestIds,
  fetchWatchlists,
  itemsToInterest,
  loadWatchlistPartner,
  mutateWatchlist,
  saveWatchlistPartner,
  subscribeWatchlist,
  type WatchlistItem,
  type WatchlistOverlap,
} from "@/lib/watchlists";

/**
 * DB-backed Interest / watchlist state keyed by active partner.
 * Keeps the same like/rank surface as the old localStorage Interest Desk.
 */
export function useInterest(knownCompanyIds?: readonly string[]) {
  const [partner, setPartnerState] = useState(() =>
    typeof window === "undefined" ? "Alex Chen" : loadWatchlistPartner(),
  );
  const [state, setState] = useState<InterestState>({
    liked: [],
    ranked: [],
    updated_at: "",
  });
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [byPartner, setByPartner] = useState<Record<string, WatchlistItem[]>>({});
  const [overlap, setOverlap] = useState<WatchlistOverlap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const knownKey = knownCompanyIds?.length ? knownCompanyIds.join("\0") : "";
  const knownSet = useMemo(
    () => (knownCompanyIds?.length ? new Set(knownCompanyIds) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [knownKey],
  );

  const applySnapshot = useCallback((snap: Awaited<ReturnType<typeof fetchWatchlists>>) => {
    const nextItems = snap.items || [];
    setItems(nextItems);
    setByPartner(snap.by_partner || {});
    setOverlap(snap.overlap || {});
    setState(itemsToInterest(nextItems));
    setError(null);
  }, []);

  const reload = useCallback(async (partnerName = partner) => {
    setLoading(true);
    try {
      const snap = await fetchWatchlists(partnerName);
      applySnapshot(snap);

      // One-time migrate browser Interest likes into this partner's DB list
      const legacy = consumeLegacyInterestIds();
      if (legacy?.length && !(snap.items || []).length) {
        const filtered = knownSet ? legacy.filter((id) => knownSet.has(id)) : legacy;
        if (filtered.length) {
          const migrated = await mutateWatchlist({
            action: "migrate",
            partner_name: partnerName,
            ranked: filtered,
          });
          applySnapshot(migrated);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  }, [partner, applySnapshot, knownSet]);

  useEffect(() => {
    void reload(partner);
    return subscribeWatchlist(() => {
      void reload(partner);
    });
  }, [partner, reload]);

  const setPartner = useCallback((name: string) => {
    saveWatchlistPartner(name);
    setPartnerState(name);
  }, []);

  const like = useCallback(
    async (companyId: string) => {
      // Optimistic
      setState((prev) => {
        const on = prev.liked.includes(companyId);
        if (on) {
          const ranked = prev.ranked.filter((id) => id !== companyId);
          return { liked: ranked, ranked, updated_at: new Date().toISOString() };
        }
        const ranked = [...prev.ranked, companyId];
        return { liked: ranked, ranked, updated_at: new Date().toISOString() };
      });
      try {
        const snap = await mutateWatchlist({
          action: "toggle",
          partner_name: partner,
          company_id: companyId,
          source: "ui",
        });
        applySnapshot(snap);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update");
        await reload(partner);
      }
    },
    [partner, applySnapshot, reload],
  );

  const rank = useCallback(
    async (companyId: string, dir: -1 | 1) => {
      setState((prev) => {
        const ranked = [...prev.ranked];
        const i = ranked.indexOf(companyId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= ranked.length) return prev;
        [ranked[i], ranked[j]] = [ranked[j], ranked[i]];
        return { liked: ranked, ranked, updated_at: new Date().toISOString() };
      });
      try {
        const snap = await mutateWatchlist({
          action: "move",
          partner_name: partner,
          company_id: companyId,
          dir,
        });
        applySnapshot(snap);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to reorder");
        await reload(partner);
      }
    },
    [partner, applySnapshot, reload],
  );

  const reorder = useCallback(
    async (ranked: string[]) => {
      setState({
        liked: ranked,
        ranked,
        updated_at: new Date().toISOString(),
      });
      try {
        const snap = await mutateWatchlist({
          action: "replace_ranks",
          partner_name: partner,
          ranked,
        });
        applySnapshot(snap);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to reorder");
        await reload(partner);
      }
    },
    [partner, applySnapshot, reload],
  );

  const setNote = useCallback(
    async (companyId: string, note: string) => {
      try {
        const snap = await mutateWatchlist({
          action: "set_note",
          partner_name: partner,
          company_id: companyId,
          note,
        });
        applySnapshot(snap);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save note");
      }
    },
    [partner, applySnapshot],
  );

  const liked = useMemo(() => new Set(state.liked), [state.liked]);
  const isLiked = useCallback((id: string) => liked.has(id), [liked]);
  const noteFor = useCallback(
    (id: string) => items.find((i) => i.company_id === id)?.note || "",
    [items],
  );

  return {
    partner,
    setPartner,
    state,
    items,
    byPartner,
    overlap,
    loading,
    error,
    liked,
    likedCount: state.liked.length,
    rankedIds: state.ranked,
    isLiked,
    like,
    rank,
    reorder,
    setNote,
    noteFor,
    reload,
    interestRankOf: (id: string) => interestRankOf(state, id),
  };
}
