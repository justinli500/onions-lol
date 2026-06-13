"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  type CandlestickData,
  type UTCTimestamp,
} from "lightweight-charts";
import { buildCandles, markAtUsd, type Candle } from "@shared/mark";
import { CANDLE_INTERVAL_MS } from "@shared/constants";

const HISTORY_CANDLES = 120;

/**
 * Live candlestick chart of the synthetic onion mark. Initial candles are built
 * client-side from the deterministic mark, then "streamed" by recomputing the
 * current bucket every second and calling series.update — same function the
 * keeper pushes on-chain, so the chart matches contract PnL. v5 API
 * (addSeries(CandlestickSeries)); attribution logo on per Apache-2.0 license.
 */
export function PriceChart({ anchorUsd }: { anchorUsd: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8b919c",
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#20242c" },
      timeScale: {
        borderColor: "#20242c",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#16c784",
      downColor: "#ea3943",
      borderUpColor: "#16c784",
      borderDownColor: "#ea3943",
      wickUpColor: "#16c784",
      wickDownColor: "#ea3943",
    });

    const interval = CANDLE_INTERVAL_MS;
    const alignedNow = Math.floor(Date.now() / interval) * interval;
    const from = alignedNow - HISTORY_CANDLES * interval;
    const initial = buildCandles(anchorUsd, from, alignedNow + interval, interval);
    series.setData(initial as CandlestickData<UTCTimestamp>[]);
    chart.timeScale().fitContent();

    let last: Candle | undefined = initial[initial.length - 1];
    const tick = () => {
      const now = Date.now();
      const v = markAtUsd(anchorUsd, now);
      const bucket = ((Math.floor(now / interval) * interval) / 1000) as number;
      if (!last || bucket > last.time) {
        last = { time: bucket, open: v, high: v, low: v, close: v };
      } else {
        last = {
          time: last.time,
          open: last.open,
          high: Math.max(last.high, v),
          low: Math.min(last.low, v),
          close: v,
        };
      }
      series.update(last as CandlestickData<UTCTimestamp>);
    };
    const id = setInterval(tick, 1000);

    return () => {
      clearInterval(id);
      chart.remove();
    };
  }, [anchorUsd]);

  return <div ref={containerRef} className="h-full w-full" />;
}
