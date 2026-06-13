import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Blink's useBlinkDeposit hook nulls its internal ref in effect cleanup but
  // only recreates it on render, so React Strict Mode's dev-only double-invoke
  // (mount→cleanup→remount) hits `.on` of null. Strict Mode double-invoke is
  // dev-only (prod is unaffected), so disabling it makes local dev match prod.
  reactStrictMode: false,
};

export default nextConfig;
