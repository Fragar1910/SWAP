# Non-Functional Requirement: Observability

**Document Version:** 1.0
**Date:** 2026-03-22
**Status:** Approved
**Traceability:** REQ-NF-009, REQ-NF-010, REQ-NF-011, REQ-NF-012

---

## 1. Overview

This document defines the logging, monitoring, alerting, and observability requirements for the Solana SWAP application. Comprehensive observability is critical for debugging, performance monitoring, security auditing, and operational excellence.

### 1.1 Observability Pillars

| Pillar | Implementation | Priority | Tools |
|--------|---------------|----------|-------|
| **Logs** | Solana transaction logs, msg!() | High | Solana Explorer, Helius |
| **Metrics** | Transaction counts, latency, success rates | High | Prometheus, Grafana |
| **Traces** | Transaction flow, CPI calls | Medium | Solana Explorer, custom indexer |
| **Events** | Structured on-chain events (Anchor) | Critical | Anchor event listeners, Helius API |

---

## 2. Event Emission Requirements

### 2.1 Event Schema Definitions

All events follow Anchor event format with structured fields for programmatic parsing.

#### 2.1.1 MarketInitialized Event (REQ-NF-009)

**Requirement:** THE system SHALL emit a MarketInitialized event containing market PDA, token_mint_a, token_mint_b, authority, and timestamp when a market is created.

**Implementation:**
```rust
#[event]
pub struct MarketInitialized {
    #[index]
    pub market: Pubkey,           // PDA address of the market
    pub token_mint_a: Pubkey,     // Mint address of Token A
    pub token_mint_b: Pubkey,     // Mint address of Token B
    pub authority: Pubkey,        // Administrator's wallet address
    pub timestamp: i64,           // Unix timestamp (seconds)
}

// Emit in initialize_market instruction
emit!(MarketInitialized {
    market: ctx.accounts.market.key(),
    token_mint_a: ctx.accounts.token_mint_a.key(),
    token_mint_b: ctx.accounts.token_mint_b.key(),
    authority: ctx.accounts.authority.key(),
    timestamp: Clock::get()?.unix_timestamp,
});
```

**Usage:**
```typescript
// Client-side listener
program.addEventListener("MarketInitialized", (event, slot, signature) => {
    console.log(`Market created: ${event.market.toString()}`);
    console.log(`  Token A: ${event.tokenMintA.toString()}`);
    console.log(`  Token B: ${event.tokenMintB.toString()}`);
    console.log(`  Authority: ${event.authority.toString()}`);
    console.log(`  Timestamp: ${new Date(event.timestamp * 1000).toISOString()}`);
    console.log(`  Slot: ${slot}, Signature: ${signature}`);
});
```

#### 2.1.2 PriceSet Event (REQ-NF-010)

**Requirement:** THE system SHALL emit a PriceSet event containing market PDA, old_price, new_price, and timestamp when the exchange rate is updated.

**Implementation:**
```rust
#[event]
pub struct PriceSet {
    #[index]
    pub market: Pubkey,           // Market PDA
    pub old_price: u64,           // Previous price (1 Token A = old_price/10^6 Token B)
    pub new_price: u64,           // New price (1 Token A = new_price/10^6 Token B)
    pub timestamp: i64,           // Unix timestamp
}

// Emit in set_price instruction
let old_price = ctx.accounts.market.price;
ctx.accounts.market.price = new_price;

emit!(PriceSet {
    market: ctx.accounts.market.key(),
    old_price,
    new_price,
    timestamp: Clock::get()?.unix_timestamp,
});
```

**Analytics Use Case:**
```typescript
// Calculate price volatility over time
const priceEvents = await fetchEvents("PriceSet", marketPDA, { limit: 100 });
const priceChanges = priceEvents.map(e => ({
    timestamp: e.timestamp,
    priceChange: Math.abs(e.newPrice - e.oldPrice) / e.oldPrice * 100,
}));

const avgVolatility = priceChanges.reduce((sum, c) => sum + c.priceChange, 0) / priceChanges.length;
console.log(`Average price volatility: ${avgVolatility.toFixed(2)}%`);
```

#### 2.1.3 LiquidityAdded Event (REQ-NF-011)

**Requirement:** THE system SHALL emit a LiquidityAdded event containing market PDA, amount_a, amount_b, and timestamp when liquidity is added.

**Implementation:**
```rust
#[event]
pub struct LiquidityAdded {
    #[index]
    pub market: Pubkey,           // Market PDA
    pub amount_a: u64,            // Amount of Token A added (raw, not decimalized)
    pub amount_b: u64,            // Amount of Token B added (raw, not decimalized)
    pub timestamp: i64,           // Unix timestamp
}

// Emit in add_liquidity instruction
emit!(LiquidityAdded {
    market: ctx.accounts.market.key(),
    amount_a,
    amount_b,
    timestamp: Clock::get()?.unix_timestamp,
});
```

**Dashboard Metric:**
```typescript
// Track total liquidity added over time
const liquidityEvents = await fetchEvents("LiquidityAdded", marketPDA);
const totalLiquidityA = liquidityEvents.reduce((sum, e) => sum + e.amountA, 0);
const totalLiquidityB = liquidityEvents.reduce((sum, e) => sum + e.amountB, 0);

console.log(`Total Liquidity Provided:`);
console.log(`  Token A: ${totalLiquidityA / 10**decimalsA} (${totalLiquidityA} raw)`);
console.log(`  Token B: ${totalLiquidityB / 10**decimalsB} (${totalLiquidityB} raw)`);
```

#### 2.1.4 SwapExecuted Event (REQ-NF-012)

**Requirement:** THE system SHALL emit a SwapExecuted event containing market PDA, user, direction, input_amount, output_amount, and timestamp when a swap is executed.

**Implementation:**
```rust
#[event]
pub struct SwapExecuted {
    #[index]
    pub market: Pubkey,           // Market PDA
    pub user: Pubkey,             // User's wallet address
    pub swap_a_to_b: bool,        // true = A→B, false = B→A
    pub input_amount: u64,        // Amount user sent (raw)
    pub output_amount: u64,       // Amount user received (raw)
    pub timestamp: i64,           // Unix timestamp
}

// Emit in swap instruction
emit!(SwapExecuted {
    market: ctx.accounts.market.key(),
    user: ctx.accounts.user.key(),
    swap_a_to_b,
    input_amount: amount,
    output_amount: amount_out,
    timestamp: Clock::get()?.unix_timestamp,
});
```

**Analytics Use Case:**
```typescript
// Calculate 24-hour trading volume
const last24h = Math.floor(Date.now() / 1000) - 86400;
const swapEvents = await fetchEvents("SwapExecuted", marketPDA, {
    minTimestamp: last24h,
});

const volumeA = swapEvents
    .filter(e => e.swapAToB)
    .reduce((sum, e) => sum + e.inputAmount, 0);

const volumeB = swapEvents
    .filter(e => !e.swapAToB)
    .reduce((sum, e) => sum + e.inputAmount, 0);

console.log(`24h Trading Volume:`);
console.log(`  Token A→B: ${volumeA / 10**decimalsA}`);
console.log(`  Token B→A: ${volumeB / 10**decimalsB}`);
```

### 2.2 Event Emission Coverage

**Metric:** 100% of critical operations MUST emit events.

| Instruction | Event Emitted | Verified | Notes |
|-------------|---------------|----------|-------|
| initialize_market | MarketInitialized | Yes | REQ-NF-009 |
| set_price | PriceSet | Yes | REQ-NF-010 |
| add_liquidity | LiquidityAdded | Yes | REQ-NF-011 |
| swap | SwapExecuted | Yes | REQ-NF-012 |

**Test Coverage:**
```typescript
describe("Event Emission", () => {
    it("Emits all required events", async () => {
        const eventCounts = {
            MarketInitialized: 0,
            PriceSet: 0,
            LiquidityAdded: 0,
            SwapExecuted: 0,
        };

        // Set up event listeners
        const listeners = [
            program.addEventListener("MarketInitialized", () => eventCounts.MarketInitialized++),
            program.addEventListener("PriceSet", () => eventCounts.PriceSet++),
            program.addEventListener("LiquidityAdded", () => eventCounts.LiquidityAdded++),
            program.addEventListener("SwapExecuted", () => eventCounts.SwapExecuted++),
        ];

        // Execute all instructions
        await program.methods.initializeMarket().accounts({...}).rpc();
        await program.methods.setPrice(new BN(1000000)).accounts({...}).rpc();
        await program.methods.addLiquidity(new BN(1000), new BN(2000)).accounts({...}).rpc();
        await program.methods.swap(new BN(100), true).accounts({...}).rpc();

        await sleep(2000);  // Wait for event propagation

        // Verify all events emitted
        expect(eventCounts.MarketInitialized).to.equal(1);
        expect(eventCounts.PriceSet).to.equal(1);
        expect(eventCounts.LiquidityAdded).to.equal(1);
        expect(eventCounts.SwapExecuted).to.equal(1);

        // Clean up listeners
        listeners.forEach(id => program.removeEventListener(id));
    });
});
```

---

## 3. RPC Node Monitoring

### 3.1 RPC Health Checks

**Objective:** Ensure RPC node is responsive and healthy.

**Metrics to Track:**
| Metric | Target | Measurement Interval | Alert Threshold |
|--------|--------|---------------------|-----------------|
| RPC response time | < 200ms | 1 minute | > 1000ms for 5 minutes |
| RPC availability | > 99.5% | 1 minute | < 95% for 5 minutes |
| RPC slot lag | < 10 slots behind | 1 minute | > 50 slots for 2 minutes |
| Account fetch errors | < 1% | 1 minute | > 5% for 5 minutes |

**Implementation:**
```typescript
import { Connection, PublicKey } from "@solana/web3.js";
import * as monitoring from "./monitoring";  // Datadog, Prometheus, etc.

class RPCHealthMonitor {
    private connection: Connection;
    private checkInterval: NodeJS.Timeout | null = null;

    constructor(rpcUrl: string) {
        this.connection = new Connection(rpcUrl, "confirmed");
    }

    async checkHealth(): Promise<RPCHealthMetrics> {
        const startTime = Date.now();

        try {
            // Check 1: Measure response time
            const slot = await this.connection.getSlot();
            const responseTime = Date.now() - startTime;

            // Check 2: Compare to network slot (detect lag)
            const epochInfo = await this.connection.getEpochInfo();
            const slotLag = epochInfo.absoluteSlot - slot;

            // Check 3: Test account fetch
            const accountFetchStart = Date.now();
            const balance = await this.connection.getBalance(PublicKey.default);
            const accountFetchTime = Date.now() - accountFetchStart;

            const metrics = {
                timestamp: Date.now(),
                responseTime,
                slotLag,
                accountFetchTime,
                healthy: responseTime < 1000 && slotLag < 50 && accountFetchTime < 500,
            };

            // Log metrics
            monitoring.gauge("rpc.response_time", metrics.responseTime);
            monitoring.gauge("rpc.slot_lag", metrics.slotLag);
            monitoring.gauge("rpc.account_fetch_time", metrics.accountFetchTime);
            monitoring.gauge("rpc.healthy", metrics.healthy ? 1 : 0);

            return metrics;
        } catch (error) {
            console.error("RPC health check failed:", error);
            monitoring.increment("rpc.errors");
            return {
                timestamp: Date.now(),
                responseTime: -1,
                slotLag: -1,
                accountFetchTime: -1,
                healthy: false,
            };
        }
    }

    startMonitoring(intervalSeconds: number = 60) {
        this.checkInterval = setInterval(() => {
            this.checkHealth();
        }, intervalSeconds * 1000);
    }

    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }
}

// Usage
const monitor = new RPCHealthMonitor("https://api.mainnet-beta.solana.com");
monitor.startMonitoring(60);  // Check every 60 seconds
```

### 3.2 RPC Provider Recommendations

| Provider | Use Case | Cost | Reliability | Features |
|----------|----------|------|-------------|----------|
| **Helius** | Production | $99-$499/mo | Excellent | Enhanced transactions, webhooks, historical data |
| **QuickNode** | Production | $49-$299/mo | Excellent | Global CDN, analytics dashboard |
| **Alchemy** | Production | $49+/mo | Excellent | NFT APIs, trace APIs |
| **Solana Foundation RPC** | Development | Free | Good | Rate-limited (40 req/10s) |
| **Local RPC (solana-test-validator)** | Testing | Free | Excellent | No network latency |

**Failover Strategy:**
```typescript
const RPC_ENDPOINTS = [
    { url: "https://helius-rpc.com", priority: 1 },
    { url: "https://quicknode-rpc.com", priority: 2 },
    { url: "https://api.mainnet-beta.solana.com", priority: 3 },
];

async function getConnectionWithFailover(): Promise<Connection> {
    for (const endpoint of RPC_ENDPOINTS) {
        try {
            const connection = new Connection(endpoint.url, "confirmed");
            const slot = await connection.getSlot();  // Test connectivity
            return connection;
        } catch (error) {
            console.warn(`RPC ${endpoint.url} failed, trying next...`);
        }
    }
    throw new Error("All RPC endpoints failed");
}
```

---

## 4. Transaction Success Rate Tracking

### 4.1 Success Rate Metrics

**Objective:** Monitor transaction success/failure rates to detect issues.

**Metrics:**
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Overall success rate | > 95% | < 90% for 5 minutes |
| Swap success rate | > 98% | < 95% for 5 minutes |
| Initialize market success rate | > 90% | < 80% (frequent duplicate attempts) |
| Set price success rate | > 99% | < 95% for 5 minutes |

**Implementation:**
```typescript
class TransactionTracker {
    private metrics = {
        total: 0,
        successful: 0,
        failed: 0,
        byInstruction: new Map<string, { total: number; successful: number; failed: number }>(),
    };

    recordTransaction(instruction: string, success: boolean, error?: string) {
        // Update global counters
        this.metrics.total++;
        if (success) {
            this.metrics.successful++;
        } else {
            this.metrics.failed++;
        }

        // Update per-instruction counters
        if (!this.metrics.byInstruction.has(instruction)) {
            this.metrics.byInstruction.set(instruction, { total: 0, successful: 0, failed: 0 });
        }
        const instructionMetrics = this.metrics.byInstruction.get(instruction)!;
        instructionMetrics.total++;
        if (success) {
            instructionMetrics.successful++;
        } else {
            instructionMetrics.failed++;
        }

        // Log to monitoring service
        monitoring.increment("transactions.total", { instruction });
        monitoring.increment(success ? "transactions.success" : "transactions.failure", {
            instruction,
            error: error || "none",
        });

        // Alert if success rate drops
        const overallSuccessRate = this.metrics.successful / this.metrics.total;
        if (this.metrics.total > 100 && overallSuccessRate < 0.9) {
            alerts.send("Low transaction success rate", {
                successRate: (overallSuccessRate * 100).toFixed(2) + "%",
                total: this.metrics.total,
                failed: this.metrics.failed,
            });
        }
    }

    getSuccessRate(instruction?: string): number {
        if (instruction) {
            const metrics = this.metrics.byInstruction.get(instruction);
            if (!metrics || metrics.total === 0) return 0;
            return metrics.successful / metrics.total;
        }
        if (this.metrics.total === 0) return 0;
        return this.metrics.successful / this.metrics.total;
    }

    getSummary() {
        const summary: any = {
            overall: {
                total: this.metrics.total,
                successful: this.metrics.successful,
                failed: this.metrics.failed,
                successRate: this.getSuccessRate(),
            },
            byInstruction: {},
        };

        for (const [instruction, metrics] of this.metrics.byInstruction) {
            summary.byInstruction[instruction] = {
                ...metrics,
                successRate: metrics.successful / metrics.total,
            };
        }

        return summary;
    }
}

// Usage
const tracker = new TransactionTracker();

try {
    await program.methods.swap(amount, true).accounts({...}).rpc();
    tracker.recordTransaction("swap", true);
} catch (error) {
    tracker.recordTransaction("swap", false, error.message);
}

// Periodic reporting
setInterval(() => {
    const summary = tracker.getSummary();
    console.log("Transaction Summary:", JSON.stringify(summary, null, 2));
}, 60000);  // Every minute
```

### 4.2 Common Failure Patterns

| Error | Frequency | Root Cause | Mitigation |
|-------|-----------|------------|------------|
| `InsufficientLiquidity` | High | User attempts swap larger than vault balance | Display vault balances in UI, validate before submission |
| `PriceNotSet` | Medium | Swap B→A when price = 0 | Require set_price before allowing swaps, UI validation |
| `InvalidAmount` | Low | User submits amount = 0 | UI validation (disable submit if amount = 0) |
| `ConstraintSeeds` | Low | Wrong vault account passed | UI derives correct PDAs automatically |
| `Unauthorized` | Low | Non-admin attempts set_price | UI hides admin actions for non-admins |

---

## 5. Error Rate Thresholds and Alerting

### 5.1 Alert Definitions

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High Failure Rate | Failure rate > 10% for 5 minutes | Critical | Investigate program state, check RPC health |
| RPC Node Down | RPC unavailable for 2 minutes | Critical | Failover to backup RPC |
| Slow Transactions | p99 confirmation time > 2s for 5 minutes | High | Check network congestion, consider priority fees |
| Large Price Change | Price changes > 20% in 1 transaction | High | Verify administrator action is intentional |
| Vault Balance Low | Vault balance < 10% of peak | Medium | Notify admin to add liquidity |
| Anomalous Volume | Swap volume > 5x daily average | Medium | Monitor for potential exploit |

### 5.2 Alerting Implementation

```typescript
import * as Datadog from "datadog-api-client";

class AlertingService {
    private datadogClient: Datadog.MetricsApi;

    constructor() {
        const configuration = Datadog.createConfiguration();
        this.datadogClient = new Datadog.MetricsApi(configuration);
    }

    async checkAlertConditions() {
        // Check 1: Failure rate
        const failureRate = await this.getMetric("transactions.failure_rate");
        if (failureRate > 0.1) {
            await this.sendAlert("High transaction failure rate", {
                failureRate: (failureRate * 100).toFixed(2) + "%",
                severity: "critical",
            });
        }

        // Check 2: RPC health
        const rpcHealthy = await this.getMetric("rpc.healthy");
        if (rpcHealthy === 0) {
            await this.sendAlert("RPC node unhealthy", {
                severity: "critical",
            });
        }

        // Check 3: Vault balance
        const vaultBalance = await this.getVaultBalance();
        const peakBalance = await this.getMetric("vault.peak_balance");
        if (vaultBalance < peakBalance * 0.1) {
            await this.sendAlert("Vault balance low", {
                currentBalance: vaultBalance,
                peakBalance: peakBalance,
                severity: "medium",
            });
        }
    }

    async sendAlert(title: string, details: any) {
        console.error(`🚨 ALERT: ${title}`, details);

        // Send to monitoring service (Datadog, PagerDuty, etc.)
        // await this.datadogClient.submitEvent({ title, text: JSON.stringify(details) });

        // Send to Discord/Slack
        // await this.sendDiscordWebhook(title, details);

        // Send email (for critical alerts)
        if (details.severity === "critical") {
            // await this.sendEmail(title, details);
        }
    }
}

// Run alert checks every minute
const alerting = new AlertingService();
setInterval(() => alerting.checkAlertConditions(), 60000);
```

---

## 6. Dashboard Requirements

### 6.1 Grafana Dashboard Layout

**Panel 1: Transaction Metrics (Top Row)**
- Total transactions (counter)
- Success rate (gauge, target: > 95%)
- Failure rate (gauge, alert if > 5%)
- Transactions per second (time series graph)

**Panel 2: Performance Metrics (Second Row)**
- p50 confirmation time (time series graph)
- p99 confirmation time (time series graph, red line at 800ms)
- Compute units consumed (histogram)

**Panel 3: Business Metrics (Third Row)**
- Total swaps (counter)
- 24h trading volume (Token A and Token B, stacked bar chart)
- Markets created (counter)
- Active markets (gauge)

**Panel 4: System Health (Fourth Row)**
- RPC response time (time series graph)
- RPC error rate (time series graph)
- Vault balances (multi-series line chart, one per market)

### 6.2 Grafana Dashboard Configuration

```yaml
# grafana-dashboard.yaml
apiVersion: 1
dashboards:
  - name: Solana SWAP
    panels:
      - title: "Transaction Success Rate"
        type: gauge
        targets:
          - expr: "sum(rate(transactions_success[5m])) / sum(rate(transactions_total[5m]))"
        thresholds:
          - value: 0.95
            color: green
          - value: 0.9
            color: yellow
          - value: 0
            color: red

      - title: "Confirmation Time (p99)"
        type: graph
        targets:
          - expr: "histogram_quantile(0.99, rate(confirmation_time_bucket[5m]))"
        thresholds:
          - value: 800
            color: red

      - title: "24h Trading Volume"
        type: bargauge
        targets:
          - expr: "sum(increase(swap_executed_input_amount[24h])) by (swap_direction)"
```

### 6.3 Prometheus Metrics Export

```typescript
import { Counter, Gauge, Histogram, register } from "prom-client";

// Define metrics
const transactionCounter = new Counter({
    name: "solana_swap_transactions_total",
    help: "Total number of transactions",
    labelNames: ["instruction", "status"],
});

const confirmationTimeHistogram = new Histogram({
    name: "solana_swap_confirmation_time_ms",
    help: "Transaction confirmation time in milliseconds",
    buckets: [100, 200, 400, 800, 1600, 3200, 6400],
});

const vaultBalanceGauge = new Gauge({
    name: "solana_swap_vault_balance",
    help: "Current vault balance",
    labelNames: ["market", "token"],
});

// Export metrics endpoint
app.get("/metrics", async (req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
});

// Update metrics
transactionCounter.inc({ instruction: "swap", status: "success" });
confirmationTimeHistogram.observe(450);  // 450ms
vaultBalanceGauge.set({ market: marketPDA, token: "A" }, 1000000);
```

---

## 7. Acceptance Criteria

### 7.1 Observability Checklist

- [ ] All 4 event types implemented and emitting (MarketInitialized, PriceSet, LiquidityAdded, SwapExecuted)
- [ ] Event listeners functional in client-side code
- [ ] RPC health monitoring deployed and running
- [ ] Transaction success rate tracking implemented
- [ ] Grafana dashboard deployed with all panels
- [ ] Alerting configured for critical failures (failure rate > 10%, RPC down)
- [ ] Prometheus metrics exported on /metrics endpoint
- [ ] Historical event queries tested (fetch last 100 swaps)
- [ ] Event-based analytics validated (24h volume calculation correct)

### 7.2 Testing Checklist

- [ ] Unit tests verify all events emit with correct fields
- [ ] Integration tests verify events can be queried via RPC
- [ ] Load tests verify events emit under high load (100 swaps/second)
- [ ] Monitoring tests verify alerts trigger when thresholds exceeded

---

## 8. References

- [Anchor Events Documentation](https://book.anchor-lang.com/anchor_in_depth/events.html)
- [Solana Transaction Logs](https://docs.solana.com/developing/programming-model/transactions#transaction-fees)
- [Helius Enhanced Transactions API](https://docs.helius.dev/api-reference/enhanced-transactions-api)
- [Grafana Dashboard Configuration](https://grafana.com/docs/grafana/latest/dashboards/)
- [Prometheus Client for Node.js](https://github.com/siimon/prom-client)
- [Datadog Solana Integration](https://docs.datadoghq.com/integrations/solana/)
- REQ-NF-009 to REQ-NF-012: Event emission requirements
- ADR-006: Event Emission decision record
