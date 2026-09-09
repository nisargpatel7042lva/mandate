// MandateGate: the Phase 7 SwapVM opcode (1inch). Standalone proof, not wired into
// this app's own trade flow — see README's Honest Limitations. Both real fills were
// sent to the executor (MockTaker), which called the router internally, so the
// executor's Etherscan page is the one that actually shows both transactions; the
// router's own page has none directly on it.

export const MANDATE_GATE_ROUTER = '0x9E1a03205337E3bAEd5D629e8af8A3CA679A0987'
export const MANDATE_GATE_EXECUTOR = '0x25A8fE7F407E38b2DB50c49ad9B81bB474228e05'
