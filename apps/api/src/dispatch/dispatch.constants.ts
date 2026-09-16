export const OFFER_TIMEOUT_SECONDS = 25;
export const CANDIDATE_LIMIT = 6;
// Index 0 is the synchronous dispatch done at order creation; the sweep
// handles indices 1+ as the order ages past each timeout window.
export const REDISPATCH_RADII_M = [3_000, 6_000, 12_000, 24_000];
