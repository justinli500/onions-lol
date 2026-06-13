import type {
  ICustomSeriesPaneView,
  ICustomSeriesPaneRenderer,
  PaneRendererCustomData,
  CustomSeriesPricePlotValues,
  CustomData,
  CustomSeriesWhitespaceData,
  PriceToCoordinateConverter,
  Time,
  CustomSeriesOptions,
} from "lightweight-charts";
import { customSeriesDefaultOptions } from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import { leekGeometry } from "@/lib/leek";

export interface OnionData extends CustomData<Time> {
  open: number;
  high: number;
  low: number;
  close: number;
}

export type OnionSeriesOptions = CustomSeriesOptions;

const COLORS = {
  leafUp: "#2f8f4e",
  leafDown: "#d8392b",
  stalkUp: "#3aa15c",
  stalkDown: "#cf4654",
  bulb: "#eccb6a",
  edge: "rgba(42,16,12,0.4)",
} as const;

class OnionRenderer implements ICustomSeriesPaneRenderer {
  private _data: PaneRendererCustomData<Time, OnionData> | null = null;

  update(data: PaneRendererCustomData<Time, OnionData>): void {
    this._data = data;
  }

  draw(
    target: CanvasRenderingTarget2D,
    priceConverter: PriceToCoordinateConverter,
  ): void {
    const data = this._data;
    if (!data) return;

    target.useBitmapCoordinateSpace(
      ({
        context: ctx,
        horizontalPixelRatio: hr,
        verticalPixelRatio: vr,
      }) => {
        const y = (p: number): number => (priceConverter(p) ?? 0) * vr;
        const width = Math.max(6, data.barSpacing * 0.5) * hr;

        for (const item of data.bars) {
          const bar = item.originalData;
          if (!bar) continue;
          const cx = item.x * hr;
          const g = leekGeometry(bar, cx, width, y);
          const leafColor = g.up ? COLORS.leafUp : COLORS.leafDown;
          const stalkColor = g.up ? COLORS.stalkUp : COLORS.stalkDown;

          // Roots (lower wick)
          ctx.strokeStyle = stalkColor;
          ctx.lineWidth = 1.1 * hr;
          ctx.lineCap = "round";
          for (const r of g.roots) {
            ctx.beginPath();
            ctx.moveTo(cx, r.baseY);
            ctx.quadraticCurveTo(r.ctrlX, r.ctrlY, r.tipX, r.tipY);
            ctx.stroke();
          }

          // Stalk (body)
          ctx.fillStyle = stalkColor;
          ctx.strokeStyle = COLORS.edge;
          ctx.lineWidth = 0.5 * hr;
          ctx.beginPath();
          ctx.rect(
            g.stalk.x,
            g.stalk.yTop,
            g.stalk.width,
            Math.max(2, g.stalk.yBottom - g.stalk.yTop),
          );
          ctx.fill();
          ctx.stroke();

          // Bulb
          ctx.fillStyle = COLORS.bulb;
          ctx.beginPath();
          ctx.ellipse(
            g.bulb.cx,
            g.bulb.cy,
            g.bulb.rx,
            g.bulb.ry,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.stroke();

          // Leaves (upper wick)
          ctx.strokeStyle = leafColor;
          ctx.lineWidth = 2 * hr;
          for (const l of g.leaves) {
            ctx.beginPath();
            ctx.moveTo(cx, l.baseY);
            ctx.quadraticCurveTo(l.ctrlX, l.ctrlY, l.tipX, l.tipY);
            ctx.stroke();
          }
        }
      },
    );
  }
}

export class OnionSeries
  implements ICustomSeriesPaneView<Time, OnionData, OnionSeriesOptions>
{
  private _renderer = new OnionRenderer();

  priceValueBuilder(d: OnionData): CustomSeriesPricePlotValues {
    return [d.low, d.high, d.close];
  }

  isWhitespace(
    d: OnionData | CustomSeriesWhitespaceData<Time>,
  ): d is CustomSeriesWhitespaceData<Time> {
    return (d as OnionData).close === undefined;
  }

  renderer(): ICustomSeriesPaneRenderer {
    return this._renderer;
  }

  update(
    data: PaneRendererCustomData<Time, OnionData>,
    seriesOptions: OnionSeriesOptions,
  ): void {
    void seriesOptions;
    this._renderer.update(data);
  }

  defaultOptions(): OnionSeriesOptions {
    return { ...customSeriesDefaultOptions };
  }
}
