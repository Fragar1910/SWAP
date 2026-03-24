# Non-Functional Requirement: Performance

**Document Version:** 1.0
**Date:** 2026-03-22
**Status:** Approved
**Traceability:** REQ-NF-013, REQ-NF-014, REQ-NF-015

---

## 1. Overview

This document defines the performance targets, measurement strategies, and monitoring requirements for the Solana SWAP application. Performance is critical for user experience and operational cost efficiency in blockchain applications.

### 1.1 Performance Dimensions

| Dimension | Target | Priority | Impact |
|-----------|--------|----------|--------|
| Transaction Confirmation Time | p99 < 800ms | Must have | User experience, arbitrage viability |
| Compute Unit Efficiency | < 50,000 CU per swap | Should have | Transaction fees, network congestion |
| UI Responsiveness | < 500ms post-confirmation | Should have | User experience, perceived performance |
| RPC Response Time | < 200ms for account queries | Should have | UI load time |

---

## 2. Transaction Confirmation Time

### 2.1 Requirement
**REQ-NF-013:** The system SHALL process swap transactions within 1 block confirmation time on Solana mainnet (target: 400-800ms).

### 2.2 Performance Targets

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| p50 (median) | < 400ms | RPC confirmTransaction() duration |
| p95 | < 600ms | 95th percentile of confirmation times |
| p99 | < 800ms | 99th percentile of confirmation times |
| Max acceptable | < 2000ms | Timeout threshold (network congestion) |

### 2.3 Measurement Strategy

#### 2.3.1 Client-Side Measurement
```typescript
interface TransactionMetrics {
    signature: string;
    submittedAt: number;      // Unix timestamp (ms)
    confirmedAt: number;      // Unix timestamp (ms)
    finalizedAt: number;      // Unix timestamp (ms)
    confirmationTime: number; // confirmedAt - submittedAt (ms)
    finalizationTime: number; // finalizedAt - submittedAt (ms)
    slot: number;
    computeUnitsConsumed: number;
}

async function measureSwapPerformance(
    connection: Connection,
    program: Program,
    swapParams: SwapParams
): Promise<TransactionMetrics> {
    const submittedAt = Date.now();

    // Send transaction with confirmation strategy
    const signature = await program.methods
        .swap(swapParams.amount, swapParams.swapAToB)
        .accounts({...})
        .rpc({ commitment: "confirmed" });

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, "confirmed");
    const confirmedAt = Date.now();

    // Wait for finalization
    await connection.confirmTransaction(signature, "finalized");
    const finalizedAt = Date.now();

    // Fetch transaction details
    const tx = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
    });

    return {
        signature,
        submittedAt,
        confirmedAt,
        finalizedAt,
        confirmationTime: confirmedAt - submittedAt,
        finalizationTime: finalizedAt - submittedAt,
        slot: confirmation.context.slot,
        computeUnitsConsumed: tx?.meta?.computeUnitsConsumed || 0,
    };
}
```

#### 2.3.2 Logging and Analytics
```typescript
// Log metrics to monitoring service (e.g., Datadog, New Relic)
function logTransactionMetrics(metrics: TransactionMetrics) {
    console.log(JSON.stringify({
        event: "swap_performance",
        signature: metrics.signature,
        confirmation_time_ms: metrics.confirmationTime,
        finalization_time_ms: metrics.finalizationTime,
        compute_units: metrics.computeUnitsConsumed,
        slot: metrics.slot,
        timestamp: new Date().toISOString(),
    }));

    // Send to monitoring service
    monitoring.gauge("solana_swap.confirmation_time", metrics.confirmationTime, {
        commitment: "confirmed",
    });
    monitoring.gauge("solana_swap.finalization_time", metrics.finalizationTime, {
        commitment: "finalized",
    });
}
```

### 2.4 Factors Affecting Confirmation Time

| Factor | Impact | Mitigation |
|--------|--------|------------|
| Network congestion | High (can add 1-5 seconds) | Implement priority fees during congestion |
| RPC node quality | Medium (200-500ms variance) | Use premium RPC providers (Helius, QuickNode) |
| Transaction size | Low (<50ms variance) | Keep transactions minimal (no unnecessary accounts) |
| Compute unit limit | Medium (higher limits = faster inclusion) | Set compute unit limit to 100,000 (2x buffer) |

### 2.5 Optimization Strategies

#### 2.5.1 Priority Fees (Dynamic Fee Market)
```typescript
import { ComputeBudgetProgram } from "@solana/web3.js";

async function swapWithPriorityFee(
    connection: Connection,
    program: Program,
    amount: BN,
    swapAToB: boolean,
    priorityFeeMicroLamports: number = 1000  // Default: 0.001 lamports per CU
) {
    // Get recent prioritization fees
    const recentFees = await connection.getRecentPrioritizationFees();
    const medianFee = recentFees.sort((a, b) => a.prioritizationFee - b.prioritizationFee)[
        Math.floor(recentFees.length / 2)
    ].prioritizationFee;

    // Use higher of default or 1.5x median
    const actualFee = Math.max(priorityFeeMicroLamports, medianFee * 1.5);

    const tx = await program.methods
        .swap(amount, swapAToB)
        .accounts({...})
        .preInstructions([
            ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: actualFee,
            }),
        ])
        .rpc();

    return tx;
}
```

#### 2.5.2 Preflight Checks
```typescript
// Disable preflight if confident in transaction validity (saves ~200ms)
const signature = await program.methods
    .swap(amount, swapAToB)
    .accounts({...})
    .rpc({ skipPreflight: true, commitment: "confirmed" });
```

### 2.6 Monitoring and Alerting

#### 2.6.1 Dashboards
- **Grafana Dashboard**: Real-time confirmation time histogram (p50, p95, p99)
- **Metrics to Track**:
  - Confirmation time (ms) - line chart, 1-minute intervals
  - Finalization time (ms) - line chart, 1-minute intervals
  - Transaction success rate (%) - gauge
  - Compute units consumed - histogram

#### 2.6.2 Alerts
| Alert | Condition | Action |
|-------|-----------|--------|
| High Confirmation Latency | p99 > 2000ms for 5 minutes | Investigate network congestion, check RPC node health |
| Transaction Failures | Failure rate > 5% for 5 minutes | Check program state, vault balances, RPC node issues |
| Compute Budget Exceeded | Any transaction exceeds 50,000 CU | Optimize program logic, investigate regression |

---

## 3. Compute Unit Efficiency

### 3.1 Requirement
**REQ-NF-014:** The system SHALL execute swap instructions within 50,000 compute units to minimize transaction fees.

### 3.2 Compute Unit Targets

| Instruction | Target CU (baseline) | Target CU (with events) | Max Acceptable CU | Measurement |
|-------------|---------------------|------------------------|-------------------|-------------|
| initialize_market | < 18,000 CU | < 20,000 CU | 30,000 CU | Account creation + PDA derivation |
| set_price | < 4,000 CU | < 5,000 CU | 10,000 CU | Simple state update |
| add_liquidity | < 13,000 CU | < 15,000 CU | 25,000 CU | Token transfer CPI |
| swap (A→B) | < 10,000 CU | < 12,000 CU | 20,000 CU | Calculation + 2 token transfer CPIs |
| swap (B→A) | < 10,000 CU | < 12,000 CU | 20,000 CU | Calculation + 2 token transfer CPIs |

**Note:** Baseline assumes minimal event emission. Event-heavy configurations add ~2,000 CU overhead for event serialization and log writing. See `LIMITS.md` for detailed breakdown.

### 3.3 Measurement Strategy

#### 3.3.1 Compute Unit Logging
```rust
use anchor_lang::prelude::*;
use solana_program::log::sol_log_compute_units;

pub fn swap(ctx: Context<Swap>, amount: u64, swap_a_to_b: bool) -> Result<()> {
    sol_log_compute_units();  // Log initial CU

    // Perform calculations
    let amount_out = calculate_swap(amount, swap_a_to_b, &ctx.accounts.market)?;
    sol_log_compute_units();  // Log after calculation

    // Transfer tokens
    transfer_tokens(&ctx, amount, amount_out, swap_a_to_b)?;
    sol_log_compute_units();  // Log after transfers

    emit!(SwapExecuted { ... });
    sol_log_compute_units();  // Log after event emission

    Ok(())
}
```

#### 3.3.2 Client-Side Parsing
```typescript
// Extract compute units from transaction
async function getComputeUnits(connection: Connection, signature: string): Promise<number> {
    const tx = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
    });

    return tx?.meta?.computeUnitsConsumed || 0;
}

// Aggregate compute unit statistics
interface ComputeUnitStats {
    instruction: string;
    count: number;
    totalCU: number;
    avgCU: number;
    minCU: number;
    maxCU: number;
    p95CU: number;
}

function analyzeComputeUnits(metrics: TransactionMetrics[]): ComputeUnitStats[] {
    const byInstruction = metrics.reduce((acc, m) => {
        const key = m.instruction;
        if (!acc[key]) acc[key] = [];
        acc[key].push(m.computeUnitsConsumed);
        return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(byInstruction).map(([instruction, values]) => {
        const sorted = values.sort((a, b) => a - b);
        return {
            instruction,
            count: values.length,
            totalCU: values.reduce((sum, v) => sum + v, 0),
            avgCU: values.reduce((sum, v) => sum + v, 0) / values.length,
            minCU: sorted[0],
            maxCU: sorted[sorted.length - 1],
            p95CU: sorted[Math.floor(sorted.length * 0.95)],
        };
    });
}
```

### 3.4 Optimization Strategies

#### 3.4.1 Compute Budget Instruction
```typescript
import { ComputeBudgetProgram } from "@solana/web3.js";

// Set explicit compute unit limit (prevents default 200,000 CU allocation)
const setComputeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 50000,  // Allocate exactly what we need
});

const tx = await program.methods
    .swap(amount, swapAToB)
    .accounts({...})
    .preInstructions([setComputeUnitLimitIx])
    .rpc();
```

#### 3.4.2 Program Optimizations
- **Use `&mut` instead of `&`**: Avoids unnecessary clones
- **Minimize CPI calls**: Batch operations where possible
- **Avoid unnecessary deserialization**: Only load accounts you need
- **Use zero-copy deserialization**: For large accounts (not applicable to current scope)
- **Optimize event emission**: Emit only essential fields

### 3.5 Cost Analysis

| Compute Units | Lamports (at 0.000005 SOL/CU) | USD (at $100/SOL) | Notes |
|---------------|-------------------------------|-------------------|-------|
| 5,000 CU | 25 lamports | $0.0000025 | Simple instruction (set_price) |
| 12,000 CU | 60 lamports | $0.000006 | Swap instruction |
| 50,000 CU | 250 lamports | $0.000025 | Max target |
| 200,000 CU | 1,000 lamports | $0.0001 | Default limit (wasteful) |

**Key Insight**: Setting explicit compute unit limits saves ~75% in compute fees vs default allocation.

---

## 4. UI Responsiveness

### 4.1 Requirement
**REQ-NF-015:** The web UI SHALL display transaction status updates within 500ms of receiving on-chain confirmation.

### 4.2 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Account fetch time | < 200ms | Time to fetch market/vault data via RPC |
| Balance update latency | < 500ms | Time from confirmation to UI refresh |
| Initial page load | < 2000ms | Time to first interactive state |
| Wallet connection | < 1000ms | Phantom wallet popup to connected state |

### 4.3 Measurement Strategy

#### 4.3.1 Client-Side Performance API
```typescript
import { performance } from "perf_hooks";

interface UIPerformanceMetrics {
    operation: string;
    startTime: number;
    endTime: number;
    duration: number;
}

class PerformanceMonitor {
    private marks: Map<string, number> = new Map();

    mark(label: string) {
        this.marks.set(label, performance.now());
    }

    measure(label: string, startLabel: string, endLabel?: string): UIPerformanceMetrics {
        const startTime = this.marks.get(startLabel)!;
        const endTime = endLabel ? this.marks.get(endLabel)! : performance.now();

        return {
            operation: label,
            startTime,
            endTime,
            duration: endTime - startTime,
        };
    }
}

// Usage
const monitor = new PerformanceMonitor();

monitor.mark("swap_submit");
await program.methods.swap(...).rpc();
monitor.mark("swap_confirmed");

await refreshBalances();
monitor.mark("balances_refreshed");

const confirmMetrics = monitor.measure("swap_confirmation", "swap_submit", "swap_confirmed");
const uiMetrics = monitor.measure("ui_update", "swap_confirmed", "balances_refreshed");

console.log(`Confirmation: ${confirmMetrics.duration}ms`);
console.log(`UI Update: ${uiMetrics.duration}ms`);
```

#### 4.3.2 React Component Monitoring
```typescript
import { useEffect, useState } from "react";

function SwapComponent() {
    const [balances, setBalances] = useState(null);
    const [loadTime, setLoadTime] = useState<number>(0);

    useEffect(() => {
        const startTime = performance.now();

        fetchBalances().then((data) => {
            setBalances(data);
            const duration = performance.now() - startTime;
            setLoadTime(duration);

            // Log slow loads
            if (duration > 500) {
                console.warn(`Slow balance fetch: ${duration}ms`);
            }
        });
    }, []);

    return (
        <div>
            {/* Display load time in dev mode */}
            {process.env.NODE_ENV === "development" && (
                <div>Load time: {loadTime.toFixed(0)}ms</div>
            )}
        </div>
    );
}
```

### 4.4 Optimization Strategies

#### 4.4.1 WebSocket Subscriptions (Real-Time Updates)
```typescript
import { Connection } from "@solana/web3.js";

// Subscribe to account changes (faster than polling)
const connection = new Connection("https://api.mainnet-beta.solana.com");

const subscriptionId = connection.onAccountChange(
    userTokenAccountA,
    (accountInfo, context) => {
        const balance = parseTokenAccount(accountInfo);
        updateUIBalance(balance);  // Instant UI update
    },
    "confirmed"
);

// Clean up subscription
connection.removeAccountChangeListener(subscriptionId);
```

#### 4.4.2 Optimistic UI Updates
```typescript
async function executeSwap(amount: BN, swapAToB: boolean) {
    // Calculate expected output
    const expectedOutput = calculateExpectedOutput(amount, currentPrice, swapAToB);

    // Update UI immediately (optimistic)
    updateBalancesOptimistic(amount, expectedOutput, swapAToB);

    try {
        // Submit transaction
        const signature = await program.methods.swap(amount, swapAToB).rpc();

        // Wait for confirmation
        await connection.confirmTransaction(signature, "confirmed");

        // Refresh actual balances
        await refreshBalancesFromChain();
    } catch (error) {
        // Revert optimistic update on failure
        revertBalancesOptimistic();
        throw error;
    }
}
```

#### 4.4.3 Caching Strategy
```typescript
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;  // Time to live (ms)
}

class AccountCache {
    private cache: Map<string, CacheEntry<any>> = new Map();

    async get<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttl: number = 5000  // 5 seconds default
    ): Promise<T> {
        const entry = this.cache.get(key);

        if (entry && Date.now() - entry.timestamp < entry.ttl) {
            return entry.data;  // Return cached data
        }

        // Fetch fresh data
        const data = await fetcher();
        this.cache.set(key, { data, timestamp: Date.now(), ttl });
        return data;
    }
}

// Usage
const cache = new AccountCache();

const marketData = await cache.get(
    `market_${marketPDA}`,
    () => program.account.marketAccount.fetch(marketPDA),
    10000  // Cache for 10 seconds
);
```

### 4.5 Monitoring and Alerting

#### 4.5.1 Synthetic Monitoring
```typescript
// Run synthetic transactions every 5 minutes
setInterval(async () => {
    const startTime = Date.now();

    try {
        // Fetch test market data
        const market = await program.account.marketAccount.fetch(testMarketPDA);
        const fetchTime = Date.now() - startTime;

        // Log metrics
        monitoring.gauge("solana_swap.account_fetch_time", fetchTime);

        // Alert if slow
        if (fetchTime > 1000) {
            alerts.send("RPC node slow", { fetchTime, market: testMarketPDA });
        }
    } catch (error) {
        alerts.send("RPC node error", { error: error.message });
    }
}, 5 * 60 * 1000);  // Every 5 minutes
```

---

## 5. Load Testing Strategy

### 5.1 Test Scenarios

| Scenario | Description | Success Criteria |
|----------|-------------|------------------|
| Baseline | 10 swaps/second, sustained for 5 minutes | p99 confirmation time < 800ms |
| Peak Load | 50 swaps/second, sustained for 1 minute | p99 confirmation time < 2000ms, success rate > 95% |
| Stress Test | 100 swaps/second, sustained for 30 seconds | No crashes, graceful degradation |
| Soak Test | 5 swaps/second, sustained for 1 hour | No memory leaks, consistent performance |

### 5.2 Load Testing Script

```typescript
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { BN } from "bn.js";

async function loadTest(
    program: Program,
    swapsPerSecond: number,
    durationSeconds: number
) {
    const metrics: TransactionMetrics[] = [];
    const interval = 1000 / swapsPerSecond;  // ms between swaps

    const startTime = Date.now();
    const endTime = startTime + durationSeconds * 1000;

    let swapCount = 0;
    let successCount = 0;
    let failureCount = 0;

    while (Date.now() < endTime) {
        const iterationStart = Date.now();

        try {
            const txMetrics = await measureSwapPerformance(
                connection,
                program,
                {
                    amount: new BN(1000000),  // 1 token
                    swapAToB: swapCount % 2 === 0,  // Alternate directions
                }
            );

            metrics.push(txMetrics);
            successCount++;
        } catch (error) {
            console.error(`Swap failed: ${error.message}`);
            failureCount++;
        }

        swapCount++;

        // Sleep to maintain target rate
        const elapsed = Date.now() - iterationStart;
        const sleepTime = Math.max(0, interval - elapsed);
        await new Promise(resolve => setTimeout(resolve, sleepTime));
    }

    // Calculate statistics
    const confirmationTimes = metrics.map(m => m.confirmationTime).sort((a, b) => a - b);
    const p50 = confirmationTimes[Math.floor(confirmationTimes.length * 0.5)];
    const p95 = confirmationTimes[Math.floor(confirmationTimes.length * 0.95)];
    const p99 = confirmationTimes[Math.floor(confirmationTimes.length * 0.99)];

    console.log(`Load Test Results:`);
    console.log(`  Total Swaps: ${swapCount}`);
    console.log(`  Successful: ${successCount} (${(successCount / swapCount * 100).toFixed(1)}%)`);
    console.log(`  Failed: ${failureCount} (${(failureCount / swapCount * 100).toFixed(1)}%)`);
    console.log(`  Confirmation Times:`);
    console.log(`    p50: ${p50}ms`);
    console.log(`    p95: ${p95}ms`);
    console.log(`    p99: ${p99}ms`);

    return { swapCount, successCount, failureCount, p50, p95, p99 };
}

// Run load test
loadTest(program, 10, 300);  // 10 swaps/sec for 5 minutes
```

### 5.3 Performance Benchmarking

```bash
# Install Solana bench tool
cargo install solana-bench-tps

# Run benchmark on localnet
solana-bench-tps \
    --identity ~/.config/solana/id.json \
    --duration 60 \
    --tx-count 1000 \
    --url http://localhost:8899

# Expected results (localnet):
# - 400ms block time
# - 50,000 TPS (theoretical max)
# - Swap program: 80-100 swaps/second sustained
```

---

## 6. Acceptance Criteria

### 6.1 Performance Test Checklist

- [ ] Transaction confirmation time p99 < 800ms on devnet (light load)
- [ ] Transaction confirmation time p99 < 2000ms on mainnet (peak hours)
- [ ] Swap instruction consumes < 20,000 CU (measured via transaction logs)
- [ ] UI updates within 500ms of on-chain confirmation (measured via client-side timers)
- [ ] Load test: 10 swaps/second sustained for 5 minutes with 95%+ success rate
- [ ] No memory leaks in UI after 100 consecutive swaps (measured via browser DevTools)
- [ ] RPC account fetch < 200ms (p95) using premium provider (Helius/QuickNode)

### 6.2 Production Readiness Criteria

- [ ] Performance monitoring dashboard deployed (Grafana + Prometheus)
- [ ] Alerts configured for latency degradation (p99 > 2s for 5 minutes)
- [ ] Compute unit regression tests in CI pipeline
- [ ] Load testing integrated into release process
- [ ] Performance metrics logged to centralized logging (e.g., Datadog, New Relic)

---

## 7. References

- [Solana Performance Tuning](https://docs.solana.com/developing/programming-model/runtime#compute-budget)
- [Anchor Compute Budget](https://book.anchor-lang.com/anchor_in_depth/compute_budget.html)
- [Solana RPC Best Practices](https://docs.solana.com/developing/clients/jsonrpc-api#performance-tips)
- [Web Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- REQ-NF-013: Transaction Confirmation Time
- REQ-NF-014: Compute Unit Efficiency
- REQ-NF-015: UI Responsiveness
