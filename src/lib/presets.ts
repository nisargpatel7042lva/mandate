// Shared demo presets: one clean approval, one protocol denial, one size denial.
// Used by the console quick-sim, the full simulator, and the landing "try it" row.

export const PRESETS = [
  { id: 'uniswap-approved',     protocol: 'uniswap-v3', action: 'Swap USDC → ETH', amountUsdc: 8000,  expect: 'allow' as const, why: 'in scope, under cap' },
  { id: 'gmx-blocked-protocol', protocol: 'gmx-perp',   action: 'Long ETH 10×',    amountUsdc: 5000,  expect: 'deny'  as const, why: 'protocol not in allowlist' },
  { id: 'curve-blocked-size',   protocol: 'curve',      action: 'Add LP',          amountUsdc: 12000, expect: 'deny'  as const, why: 'exceeds per-trade cap' },
]
