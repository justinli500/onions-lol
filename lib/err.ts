export function msgOf(e: unknown): string {
  if (e && typeof e === "object") {
    const o = e as { shortMessage?: string; message?: string };
    if (typeof o.shortMessage === "string") return o.shortMessage;
    if (typeof o.message === "string") return o.message;
  }
  return "Something went wrong";
}
