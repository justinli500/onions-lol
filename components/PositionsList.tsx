"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { FUTURES_ADDRESS, futuresAbi } from "@/lib/contracts";
import { fromUSDC, fromE8, fmtUSD, fmtSigned, fmtPrice } from "@/lib/format";
import { msgOf } from "@/lib/err";
import { DEMO_MODE } from "@/lib/demo";
import { DemoPositions } from "@/components/trade/DemoPositions";

const PRIVY_ENABLED = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

// positions(id) tuple layout from the public mapping getter.
type PositionTuple = readonly [
  string, // owner
  bigint, // margin (1e6)
  bigint, // notional (1e6)
  bigint, // entryPrice (1e8)
  bigint, // openTime
  bigint, // expiry
  number, // side
  boolean, // closed
];

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-ink/55">{text}</p>;
}

function PositionRow({ id }: { id: bigint }) {
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const intervalId = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(intervalId);
  }, []);

  const { writeContractAsync } = useWriteContract();
  const { data: pos } = useReadContract({
    address: FUTURES_ADDRESS,
    abi: futuresAbi,
    functionName: "positions",
    args: [id],
    query: { enabled: !!FUTURES_ADDRESS, refetchInterval: 5000 },
  });
  const { data: pnl } = useReadContract({
    address: FUTURES_ADDRESS,
    abi: futuresAbi,
    functionName: "markPnl",
    args: [id],
    query: { enabled: !!FUTURES_ADDRESS, refetchInterval: 3000 },
  });

  if (!pos) return null;
  const p = pos as PositionTuple;
  if (p[7]) return null; // closed

  const side = Number(p[6]);
  const isLong = side === 0;
  const notional = fromUSDC(p[2]);
  const entry = fromE8(p[3]);
  const expired = nowSec >= Number(p[5]);
  const pnlUsd = pnl !== undefined ? fromUSDC(pnl as bigint) : 0;

  async function act() {
    if (!FUTURES_ADDRESS) return;
    try {
      await writeContractAsync({
        address: FUTURES_ADDRESS,
        abi: futuresAbi,
        functionName: expired ? "settle" : "close",
        args: [id],
      });
      toast.success(expired ? "Settled against USDA price" : "Position closed");
    } catch (e) {
      toast.error(msgOf(e));
    }
  }

  return (
    <tr className="border-t border-line border-dotted">
      <td className={`py-2 font-semibold ${isLong ? "text-green" : "text-red"}`}>
        {isLong ? "Long" : "Short"}
      </td>
      <td className="tabular">{fmtUSD(notional)}</td>
      <td className="tabular">{fmtPrice(entry)}</td>
      <td className={`tabular ${pnlUsd >= 0 ? "text-green" : "text-red"}`}>
        {fmtSigned(pnlUsd)}
      </td>
      <td className="text-right">
        <button
          onClick={act}
          className="border-2 border-red text-red rounded-full px-3 py-1 text-xs hover:bg-red/[0.08] active:scale-[0.97] transition"
        >
          {expired ? "Settle" : "Close"}
        </button>
      </td>
    </tr>
  );
}

function PositionsInner() {
  const { address } = useAccount();
  const { data: ids } = useReadContract({
    address: FUTURES_ADDRESS,
    abi: futuresAbi,
    functionName: "getUserPositions",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!FUTURES_ADDRESS, refetchInterval: 5000 },
  });

  if (!FUTURES_ADDRESS) return <Empty text="Exchange not deployed yet." />;
  const list = (ids as bigint[] | undefined) ?? [];
  if (list.length === 0) return <Empty text="Open a position to see it here." />;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-red uppercase">
          <th className="py-1 font-normal">Side</th>
          <th className="font-normal">Notional</th>
          <th className="font-normal">Entry</th>
          <th className="font-normal">PnL (mark)</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {list.map((id) => (
          <PositionRow key={String(id)} id={id} />
        ))}
      </tbody>
    </table>
  );
}

export function PositionsList() {
  if (DEMO_MODE) return <DemoPositions />;
  if (!PRIVY_ENABLED) return <Empty text="Sign in to view positions." />;
  return <PositionsInner />;
}
