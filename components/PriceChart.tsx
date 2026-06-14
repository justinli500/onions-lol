"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  AreaSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type UTCTimestamp,
  type AreaData,
  type CandlestickData,
} from "lightweight-charts";
import { buildCandles, markAtUsd, type Candle } from "@shared/mark";
import { windowFor, type TimeframeId } from "@/lib/chartWindow";
import { OnionSeries, type OnionData } from "@/components/trade/onionSeries";

type Mode = "line" | "candles" | "onions";

const RED = "#c0271f";
const GREEN = "#2f8f4e";

export function PriceChart({
  anchorUsd,
  mode,
  timeframe,
}: {
  anchorUsd: number;
  mode: Mode;
  timeframe: TimeframeId;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // Holds whichever series is currently active; type varies by mode, narrowed at call sites.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<ISeriesApi<SeriesType, any> | null>(null);
  const lastRef = useRef<Candle | undefined>(undefined);

  // Create the chart once on mount; destroy on unmount.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#7a4a1f",
        attributionLogo: false,
      },
      grid: {
        vertLines: {
          color: "rgba(161,30,33,0.10)",
          style: LineStyle.Dashed,
        },
        horzLines: {
          color: "rgba(161,30,33,0.10)",
          style: LineStyle.Dashed,
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: RED, width: 1 },
        horzLine: { color: RED, width: 1 },
      },
      rightPriceScale: { borderColor: "rgba(161,30,33,0.25)" },
      timeScale: {
        borderColor: "rgba(161,30,33,0.25)",
        timeVisible: true,
        secondsVisible: false,
      },
    });
    chartRef.current = chart;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Swap series and restart live-tick whenever mode/timeframe/anchor change.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }

    const win = windowFor(timeframe, Date.now());
    const interval = win.intervalMs;
    const candles = buildCandles(anchorUsd, win.fromMs, win.toMs, interval);
    lastRef.current = candles[candles.length - 1];

    if (mode === "line") {
      const s = chart.addSeries(AreaSeries, {
        lineColor: RED,
        lineWidth: 3,
        topColor: "rgba(240,180,42,0.55)",
        bottomColor: "rgba(240,180,42,0.0)",
        priceLineVisible: false,
        lastValueVisible: true,
      });
      s.setData(
        candles.map(
          (c): AreaData<UTCTimestamp> => ({
            time: c.time as UTCTimestamp,
            value: c.close,
          }),
        ),
      );
      seriesRef.current = s;
    } else if (mode === "candles") {
      const s = chart.addSeries(CandlestickSeries, {
        upColor: GREEN,
        downColor: RED,
        borderUpColor: GREEN,
        borderDownColor: RED,
        wickUpColor: GREEN,
        wickDownColor: RED,
      });
      s.setData(
        candles.map(
          (c): CandlestickData<UTCTimestamp> => ({
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }),
        ),
      );
      seriesRef.current = s;
    } else {
      const s = chart.addCustomSeries(new OnionSeries(), {});
      s.setData(
        candles.map(
          (c): OnionData => ({
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }),
        ),
      );
      seriesRef.current = s;
    }

    const len = candles.length;
    chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, len - 60), to: len - 1 });

    const id = setInterval(() => {
      const s = seriesRef.current;
      if (!s) return;
      const now = Date.now();
      const v = markAtUsd(anchorUsd, now);
      const bucket = (Math.floor(now / interval) * interval) / 1000;
      const prev = lastRef.current;
      const next: Candle =
        !prev || bucket > prev.time
          ? { time: bucket, open: v, high: v, low: v, close: v }
          : {
              time: prev.time,
              open: prev.open,
              high: Math.max(prev.high, v),
              low: Math.min(prev.low, v),
              close: v,
            };
      lastRef.current = next;

      if (mode === "line") {
        // Narrow cast: s is ISeriesApi<"Area"> in this branch
        (s as ISeriesApi<"Area">).update({
          time: next.time as UTCTimestamp,
          value: next.close,
        });
      } else if (mode === "candles") {
        // Narrow cast: s is ISeriesApi<"Candlestick"> in this branch
        (s as ISeriesApi<"Candlestick">).update({
          time: next.time as UTCTimestamp,
          open: next.open,
          high: next.high,
          low: next.low,
          close: next.close,
        });
      } else {
        // Narrow cast: s is ISeriesApi<"Custom",...,OnionData,...> in this branch
        (s as ISeriesApi<"Custom", UTCTimestamp, OnionData>).update({
          time: next.time as UTCTimestamp,
          open: next.open,
          high: next.high,
          low: next.low,
          close: next.close,
        });
      }
    }, 1000);

    return () => clearInterval(id);
  }, [anchorUsd, mode, timeframe]);

  return <div ref={containerRef} className="h-full w-full" />;
}
