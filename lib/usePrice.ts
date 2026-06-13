"use client";

import { useEffect, useState } from "react";
import { markAtUsd } from "@shared/mark";
import { DEFAULT_ANCHOR_USD } from "@shared/constants";

/**
 * Live synthetic mark for the UI. Fetches the daily anchor once, then ticks the
 * scalar price every second using the same pure `markAtUsd` the keeper/chart use,
 * so every surface agrees. `changePct` is measured vs the day's anchor (open).
 */
export function usePrice() {
  const [anchorUsd, setAnchorUsd] = useState(DEFAULT_ANCHOR_USD);
  const [price, setPrice] = useState(() => markAtUsd(DEFAULT_ANCHOR_USD, Date.now()));

  useEffect(() => {
    let alive = true;
    const now = Date.now();
    fetch(`/api/price/history?from=${now - 60_000}&to=${now}&interval=60000`)
      .then((r) => r.json())
      .then((d) => {
        if (alive && typeof d?.anchorUsd === "number") setAnchorUsd(d.anchorUsd);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const tick = () => setPrice(markAtUsd(anchorUsd, Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [anchorUsd]);

  const changePct = anchorUsd ? ((price - anchorUsd) / anchorUsd) * 100 : 0;
  return { anchorUsd, price, changePct };
}
