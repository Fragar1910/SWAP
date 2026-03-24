# Non-Functional Requirement: System Limits and Thresholds

**Document Version:** 1.0
**Date:** 2026-03-22
**Status:** Approved
**Traceability:** REQ-NF-025, REQ-F-010, REQ-F-011, REQ-C-004

---

## 1. Overview

This document defines the operational limits, capacity constraints, and safety thresholds for the Solana SWAP application. Understanding and documenting these limits is critical for capacity planning, security, and preventing system failures.

### 1.1 Limit Categories

| Category | Scope | Enforcement | Impact if Exceeded |
|----------|-------|-------------|-------------------|
| **On-Chain Limits** | Solana blockchain constraints | Runtime (hard limits) | Transaction failure, program panic |
| **Program Logic Limits** | Application-defined constraints | Application code (soft limits) | Custom error, transaction revert |
| **Economic Limits** | Cost and resource constraints | Economic incentives | High fees, slow confirmation |
| **Operational Limits** | Recommended best practices | Documentation only | Degraded performance, UX issues |

---

## 2. On-Chain Limits (Solana Platform)

### 2.1 Compute Unit Limits

**Limit:** 1,400,000 compute units (CU) per transaction (Solana runtime hard limit)

**Impact on SWAP Program:**
| Instruction | Est. CU (baseline) | Est. CU (with events) | Max CU Budget | Headroom |
|-------------|-------------------|---------------------|---------------|----------|
| initialize_market | ~15,000 CU | ~18,000 CU | 30,000 CU | 1.7-2x |
| set_price | ~4,000 CU | ~5,000 CU | 10,000 CU | 2-2.5x |
| add_liquidity | ~12,000 CU | ~14,000 CU | 25,000 CU | 1.8-2x |
| swap (A→B or B→A) | ~10,000 CU | ~12,000 CU | 20,000 CU | 1.7-2x |

**Note:** Baseline: 2 CPI calls (user→vault, vault→user). Event emission adds ~2,000 CU for SwapExecuted event serialization and log writing.

**Authoritative Target:** 10,000 CU baseline (no events), 12,000 CU with events enabled (see PERFORMANCE.md for monitoring strategy).

**Enforcement:**
```typescript
import { ComputeBudgetProgram } from "@solana/web3.js";

// Set explicit compute unit limit (prevents default 200,000 CU allocation)
const setComputeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 20000,  // Allocate exactly what we need for swap
});

const tx = await program.methods
    .swap(amount, swapAToB)
    .preInstructions([setComputeUnitLimitIx])
    .rpc();
```

**Monitoring:**
```typescript
// Log actual CU consumption
const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
});
const cuConsumed = tx?.meta?.computeUnitsConsumed || 0;

if (cuConsumed > 20000) {
    console.warn(`Swap exceeded target CU: ${cuConsumed} CU`);
}
```

### 2.2 Transaction Size Limits

**Limit:** 1,232 bytes per transaction (Solana runtime hard limit)

**Impact on SWAP Program:**
- Typical swap transaction: ~300-400 bytes
  - Instruction data: ~50 bytes (discriminator + arguments)
  - Accounts: ~250 bytes (8-10 accounts × ~32 bytes each)
  - Signatures: ~64 bytes
- Headroom: ~800 bytes (ample for future additions)

**Enforcement:**
No explicit enforcement needed (all SWAP instructions fit within limit).

**Mitigation for Complex Transactions:**
If future features require many accounts (e.g., multi-hop swaps), split into multiple instructions:
```typescript
// Instead of: swap_multi_hop([marketA, marketB, marketC])
// Use: swap(marketA) → swap(marketB) → swap(marketC) in separate transactions
```

### 2.3 Account Size Limits

**Limit:** 10 MB per account (Solana runtime hard limit)

**Impact on SWAP Program:**
| Account Type | Size | Rent Cost (at 0.00000348 SOL/byte) | Notes |
|-------------|------|-------------------------------------|-------|
| MarketAccount | 115 bytes (107 data + 8 discriminator) | ~0.0004 SOL | Well within limit |
| TokenAccount (Vault) | 165 bytes | ~0.00057 SOL | SPL Token standard size |

**Enforcement:**
Anchor's `init` constraint allocates exact space:
```rust
#[account(
    init,
    payer = authority,
    space = 8 + MarketAccount::INIT_SPACE  // 8-byte discriminator + data
)]
pub market: Account<'info, MarketAccount>,
```

**Future Considerations:**
If adding historical swap tracking to `MarketAccount`:
- 10,000 swap records × 100 bytes = 1 MB (within limit)
- But not recommended (use events instead, see ADR-006)

### 2.4 Rent Exemption Requirements

**Limit:** Accounts must maintain minimum balance for rent exemption

**Impact on SWAP Program:**
| Account | Size | Rent Exemption (2 years) | Notes |
|---------|------|-------------------------|-------|
| MarketAccount (115 bytes) | 115 bytes | ~0.0016 SOL | Paid by authority during init |
| Vault A (165 bytes) | 165 bytes | ~0.00228 SOL | Paid by authority during init |
| Vault B (165 bytes) | 165 bytes | ~0.00228 SOL | Paid by authority during init |

**Total Initialization Cost:** ~0.00616 SOL + transaction fees (~0.00001 SOL) = **~0.0062 SOL**

**Enforcement:**
Anchor's `init` constraint automatically calculates and enforces rent exemption:
```rust
#[account(
    init,
    payer = authority,  // authority pays rent
    space = 8 + MarketAccount::INIT_SPACE
)]
pub market: Account<'info, MarketAccount>,
```

### 2.5 CPI (Cross-Program Invocation) Depth Limit

**Limit:** 4 levels of CPI depth (Solana runtime hard limit)

**Impact on SWAP Program:**
- SWAP program → SPL Token program (1 level, well within limit)
- No nested CPIs in current design

**Future Considerations:**
If implementing multi-hop swaps:
- User → SWAP program → SPL Token → SWAP program → SPL Token = 3 levels (OK)

---

## 3. Program Logic Limits

### 3.1 Maximum Markets Per Deployment

**Limit:** Unlimited (no artificial cap)

**Rationale:** Each market is a unique PDA derived from token mint addresses. PDA space is effectively unlimited (2^256 possible addresses).

**Scalability Analysis:**
| Markets | Storage Overhead | Performance Impact |
|---------|-----------------|-------------------|
| 1 | 115 bytes | None |
| 100 | 11.5 KB | None (each market is independent) |
| 10,000 | 1.15 MB | None (no global state) |
| 1,000,000 | 115 MB | None (markets don't interact) |

**Implementation:**
```rust
// Market PDA derivation (deterministic, unique per token pair)
#[account(
    init,
    seeds = [b"market", token_mint_a.key().as_ref(), token_mint_b.key().as_ref()],
    bump,
    payer = authority,
    space = 8 + MarketAccount::INIT_SPACE
)]
pub market: Account<'info, MarketAccount>,
```

**Recommendation:** No cap needed. Markets are isolated and don't affect each other.

### 3.2 Maximum Token Decimals

**Limit:** 18 decimals (practical limit for u64 arithmetic)

**Rationale:**
- SPL Token standard supports 0-255 decimals (u8)
- Most tokens use 6-9 decimals (USDC: 6, SOL: 9)
- At 18 decimals, token amounts approach u64::MAX (~18.4 quintillion)

**Overflow Risk Analysis:**
```rust
// Example: Token with 18 decimals
let amount_a = 1_000_000_000_000_000_000_u64;  // 1 token (18 decimals)
let price = 1_000_000_u64;                      // 1:1 exchange rate (6 decimals)

// Calculation: amount_b = (amount_a × price × 10^decimals_b) / (10^6 × 10^decimals_a)
// Numerator: 1e18 × 1e6 × 1e18 = 1e42 (OVERFLOWS u64::MAX = 1.8e19)

// Mitigation: Use u128 for intermediate calculations (future enhancement)
```

**Current Enforcement:**
```rust
// No explicit check (relies on checked arithmetic to catch overflow)
pub struct MarketAccount {
    pub decimals_a: u8,  // Can be 0-255
    pub decimals_b: u8,  // Can be 0-255
    // ...
}
```

**Recommendation:**
- Document recommended range: 6-18 decimals
- Add explicit validation (future enhancement):
  ```rust
  require!(decimals_a <= 18 && decimals_b <= 18, SwapError::DecimalsTooHigh);
  ```

### 3.3 Price Precision

**Limit:** 6 decimal places (price stored as u64 with 10^6 scaling)

**Rationale:**
- Allows prices from 0.000001 to 18,446,744,073,709 (u64::MAX / 10^6)
- Sufficient for most real-world exchange rates (e.g., 1 BTC = 65,000 USDC)

**Examples:**
| Exchange Rate | Stored Price | Notes |
|--------------|-------------|-------|
| 1 Token A = 1 Token B | 1,000,000 | 1.000000 |
| 1 Token A = 0.5 Token B | 500,000 | 0.500000 |
| 1 Token A = 2.5 Token B | 2,500,000 | 2.500000 |
| 1 Token A = 0.000001 Token B | 1 | 0.000001 (minimum) |
| 1 Token A = 18,446,744 Token B | 18,446,744,000,000 | ~18 trillion (max) |

**Precision Loss:**
```rust
// Example: Price = 1.123456789 (9 decimals desired)
// Stored: 1,123,456 (only 6 decimals)
// Lost precision: 0.000000789 (~0.00007% error)

// Recommendation: If higher precision needed, increase scaling factor
// e.g., 10^9 instead of 10^6 (requires code changes)
```

**Enforcement:**
```rust
pub struct MarketAccount {
    pub price: u64,  // Scaled by 10^6
}

// Formula: 1 Token A = price/10^6 Token B
```

**Recommendation:** 6 decimals sufficient for educational scope. Production systems may need 9+ decimals.

### 3.4 Maximum Transaction Size (Swap Amount)

**Limit:** Constrained by u64::MAX and vault balance

**Hard Limits:**
| Constraint | Value | Notes |
|-----------|-------|-------|
| u64::MAX | 18,446,744,073,709,551,615 | Largest possible amount (raw) |
| Practical (9 decimals) | ~18.4 billion tokens | Equivalent to u64::MAX with 9 decimals |
| Vault Balance | Variable | Must be < vault balance |

**Overflow Protection:**
```rust
// Swap A→B calculation with checked arithmetic
let numerator = amount_a
    .checked_mul(market.price).ok_or(SwapError::Overflow)?  // Catches overflow
    .checked_mul(10u64.pow(market.decimals_b as u32)).ok_or(SwapError::Overflow)?;
```

**Test Case:**
```typescript
it("Handles maximum safe amount", async () => {
    // Maximum amount that won't overflow with price = 1,000,000 (1:1)
    const maxSafeAmount = new BN("18446744073709");  // ~18 trillion (raw)

    // Add sufficient liquidity
    await program.methods.addLiquidity(new BN(0), maxSafeAmount).accounts({...}).rpc();

    // Execute swap (should succeed)
    await program.methods.swap(maxSafeAmount, true).accounts({...}).rpc();
});

it("Rejects amount causing overflow", async () => {
    const overflowAmount = new BN("18446744073709551615");  // u64::MAX

    await expect(
        program.methods.swap(overflowAmount, true).accounts({...}).rpc()
    ).to.be.rejectedWith(/Overflow/);
});
```

**Recommendation:** No explicit max amount needed (overflow protection handles edge cases).

### 3.5 Rate Limits

**Limit:** No rate limits enforced by program (Solana network handles spam prevention)

**Solana Network Limits:**
| Limit Type | Value | Notes |
|-----------|-------|-------|
| Transactions per account per slot | ~200 | Nonce-based limit |
| Transactions per block | ~20,000-30,000 | Network-wide throughput |

**Economic Rate Limiting:**
- Transaction fee: ~0.000005 SOL per swap
- At 100 swaps/second: 0.0005 SOL/second = 1.8 SOL/hour (~$180 at $100/SOL)
- Natural spam deterrent (no need for explicit rate limits)

**Recommendation:** Rely on Solana's built-in spam prevention. No application-level rate limits needed.

---

## 4. Economic Limits

### 4.1 Transaction Fees

**Components:**
| Fee Component | Typical Cost | Notes |
|--------------|-------------|-------|
| Base fee (5,000 lamports) | 0.000005 SOL | Standard Solana transaction fee |
| Compute unit fee (optional) | 0-0.001 SOL | Priority fee during congestion |
| Account creation rent | 0.00616 SOL | One-time cost for initialize_market |

**Fee Estimation:**
```typescript
// Get recent fees
const recentFees = await connection.getRecentPrioritizationFees();
const medianFee = recentFees.sort((a, b) => a.prioritizationFee - b.prioritizationFee)[
    Math.floor(recentFees.length / 2)
].prioritizationFee;

console.log(`Median priority fee: ${medianFee} micro-lamports/CU`);

// Calculate total fee for 12,000 CU swap
const priorityFee = (medianFee * 12000) / 1_000_000;  // Convert to lamports
const totalFee = 0.000005 + priorityFee;

console.log(`Total swap fee: ${totalFee} SOL (~$${(totalFee * 100).toFixed(4)})`);
```

### 4.2 Rent Costs

**Rent Exemption Formula:**
```
rent_exempt_balance = account_size × rent_per_byte_year × years_exempt
```

**Solana Parameters (as of 2026-03-22):**
- `rent_per_byte_year`: ~0.00000348 SOL/byte/year
- `years_exempt`: 2 years (Solana default)

**SWAP Program Costs:**
| Account | Size | Rent (2 years) | Refundable? |
|---------|------|---------------|-------------|
| MarketAccount | 115 bytes | ~0.0016 SOL | Yes (if closed) |
| Vault A | 165 bytes | ~0.00228 SOL | Yes (if closed) |
| Vault B | 165 bytes | ~0.00228 SOL | Yes (if closed) |

**Total:** ~0.00616 SOL per market

**Close Account (Refund Rent):**
```rust
// Future feature: Allow authority to close market and reclaim rent
#[account(
    mut,
    close = authority  // Transfer remaining balance to authority
)]
pub market: Account<'info, MarketAccount>,
```

### 4.3 Liquidity Requirements

**Minimum Recommended Liquidity:**
| Market Type | Recommended Liquidity | Notes |
|------------|---------------------|-------|
| Test market | 1,000 tokens each side | For testing swaps |
| Low-volume market | 10,000 tokens each side | Supports small users |
| Medium-volume market | 100,000 tokens each side | Supports average users |
| High-volume market | 1,000,000+ tokens each side | Supports large trades |

**Liquidity Buffer Calculation:**
```typescript
// Calculate recommended liquidity based on expected swap volume
function calculateRecommendedLiquidity(
    expectedDailyVolume: number,
    avgSwapSize: number
): number {
    const dailySwaps = expectedDailyVolume / avgSwapSize;
    const peakHourlySwaps = dailySwaps / 24 * 3;  // Assume 3x average during peak hour

    // Buffer = 2x peak hourly volume (prevents depletion)
    const recommendedLiquidity = peakHourlySwaps * avgSwapSize * 2;

    return recommendedLiquidity;
}

// Example: 10,000 daily volume, 100 avg swap
// → 100 daily swaps → 12.5 peak hourly swaps → 2,500 recommended liquidity
```

---

## 5. Operational Limits and Recommendations

### 5.1 UI Input Validation

**Recommended Limits:**
| Input | Min | Max | Notes |
|-------|-----|-----|-------|
| Swap amount | 0.000001 tokens | 1,000,000 tokens | Adjust based on token decimals |
| Price | 0.000001 | 1,000,000 | Prevents accidental typos (e.g., "1000000000") |
| Liquidity amount | 1 token | No limit | Warn if < 1,000 tokens |

**UI Validation Example:**
```typescript
function validateSwapAmount(amount: number, decimals: number): string | null {
    const minAmount = 1 / 10**decimals;  // 1 raw unit

    if (amount <= 0) {
        return "Amount must be greater than zero";
    }
    if (amount < minAmount) {
        return `Amount too small (minimum: ${minAmount})`;
    }
    if (amount > 1_000_000) {
        return "Amount exceeds recommended maximum (1,000,000)";
    }
    return null;  // Valid
}
```

### 5.2 Performance Recommendations

**Recommended Limits for Optimal Performance:**
| Metric | Target | Max Acceptable | Notes |
|--------|--------|---------------|-------|
| Markets per UI page load | < 10 | 50 | Fetch only active markets |
| Historical swaps fetched | < 100 | 1,000 | Paginate event queries |
| RPC requests per second | < 50 | 200 | Use WebSocket subscriptions for real-time data |
| Event listener count | < 10 | 50 | Remove listeners when component unmounts |

### 5.3 Security Recommendations

**Operational Limits for Security:**
| Control | Limit | Rationale |
|---------|-------|-----------|
| Price change frequency | Max 1/minute | Prevents rapid manipulation |
| Price change magnitude | Max ±20% per change | Prevents extreme swings |
| Liquidity withdrawal | Not implemented | Prevents rug pulls (admin can't drain vaults) |
| Admin key rotation | Not implemented | Future feature (transfer_authority) |

**Monitoring Thresholds:**
```typescript
// Alert if administrator behavior is suspicious
const priceChangeEvents = await fetchEvents("PriceSet", marketPDA, { limit: 10 });

const rapidChanges = priceChangeEvents.filter((e, i) => {
    if (i === 0) return false;
    const timeDiff = e.timestamp - priceChangeEvents[i - 1].timestamp;
    return timeDiff < 60;  // Changes within 60 seconds
});

if (rapidChanges.length > 3) {
    alerts.send("Rapid price changes detected (possible manipulation)", {
        market: marketPDA,
        changeCount: rapidChanges.length,
    });
}
```

---

## 6. Summary Table: All Limits

| Limit | Value | Type | Enforcement | Impact if Exceeded |
|-------|-------|------|-------------|-------------------|
| Compute units per transaction | 1,400,000 CU | Hard (Solana) | Runtime | Transaction fails |
| Transaction size | 1,232 bytes | Hard (Solana) | Runtime | Transaction fails |
| Account size | 10 MB | Hard (Solana) | Runtime | Account creation fails |
| CPI depth | 4 levels | Hard (Solana) | Runtime | CPI fails |
| Markets per deployment | Unlimited | Soft | None | N/A |
| Token decimals | 18 (recommended) | Soft | Documentation | Overflow risk |
| Price precision | 6 decimals | Soft | Application | Precision loss |
| Max swap amount | u64::MAX | Hard (arithmetic) | Checked math | Overflow error |
| Rate limit | None (network-limited) | Soft | Economic | High fees |
| Rent per market | ~0.00616 SOL | Economic | Solana | Initialization fails |

---

## 7. Capacity Planning

### 7.1 Storage Capacity

**Per Market Storage:**
- MarketAccount: 115 bytes
- Vault A: 165 bytes
- Vault B: 165 bytes
- Total: 445 bytes

**Scaling Projection:**
| Markets | Total Storage | Total Rent Cost | Notes |
|---------|--------------|----------------|-------|
| 100 | 44.5 KB | 0.616 SOL | Small exchange |
| 1,000 | 445 KB | 6.16 SOL | Medium exchange |
| 10,000 | 4.45 MB | 61.6 SOL | Large exchange (~$6,160 at $100/SOL) |

### 7.2 Throughput Capacity

**Solana Network Throughput:**
- 65,000 transactions per second (theoretical max)
- 20,000-30,000 TPS sustained (current mainnet)

**SWAP Program Capacity:**
- Swap instruction: ~12,000 CU
- Compute units per second: 65,000 TPS × 12,000 CU = 780,000,000 CU/second
- Network limit: 1,400,000 CU per transaction
- **Theoretical max SWAP TPS:** ~55,000 swaps/second (compute-bound)
- **Practical max SWAP TPS:** ~15,000-20,000 swaps/second (network-bound)

**Bottleneck Analysis:**
- Network throughput (20,000 TPS) is the primary bottleneck
- Compute efficiency (12,000 CU) is well-optimized
- Recommendation: No optimization needed for current scope

---

## 8. References

- [Solana Transaction Limits](https://docs.solana.com/developing/programming-model/transactions#transaction-size)
- [Solana Compute Budget](https://docs.solana.com/developing/programming-model/runtime#compute-budget)
- [Solana Rent](https://docs.solana.com/developing/programming-model/accounts#rent)
- [SPL Token Standard](https://spl.solana.com/token)
- [u64 Arithmetic Limits](https://doc.rust-lang.org/std/primitive.u64.html)
- REQ-NF-025: Multiple Market Support
- REQ-F-010: Market Account Data Structure
- REQ-F-011: PDA Derivation
- REQ-C-004: SPL Token Standard constraint
