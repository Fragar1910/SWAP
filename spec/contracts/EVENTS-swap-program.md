# Event Schemas: Solana Swap Program

**Contract ID:** EVENTS-SWAP-PROGRAM
**Version:** 1.0
**Last Updated:** 2026-03-22
**Status:** Active

## Overview

**Description:** This document specifies all event schemas emitted by the Solana Swap Program for auditability, monitoring, and off-chain indexing. Events are logged on-chain and can be queried via Solana RPC methods or WebSocket subscriptions.

**Purpose:**
- **Auditability:** Complete audit trail of all state-changing operations
- **Monitoring:** Real-time tracking of market activity for administrators and users
- **Indexing:** Enable off-chain systems to build transaction history and analytics
- **Compliance:** Provide transparent records of all operations for regulatory review

**Event Framework:**
- **Anchor Events:** Events are emitted using Anchor's `#[event]` macro and `emit!()` function
- **Serialization:** Events are serialized as Borsh and stored in transaction logs
- **Querying:** Accessible via `connection.getParsedTransaction()` or program event subscriptions

**Traceability:**
- **Requirements:** REQ-NF-009, REQ-NF-010, REQ-NF-011, REQ-NF-012
- **Instructions:** initialize_market, set_price, add_liquidity, swap

---

## Table of Contents

1. [Event Emission Mechanism](#event-emission-mechanism)
2. [Event Schemas](#event-schemas)
   - [MarketInitialized](#marketinitialized)
   - [PriceSet](#priceset)
   - [LiquidityAdded](#liquidityadded)
   - [SwapExecuted](#swapexecuted)
3. [Event Querying Guide](#event-querying-guide)
4. [Event Indexing Strategy](#event-indexing-strategy)

---

## Event Emission Mechanism

### Anchor Event Macro

Events are defined using Anchor's `#[event]` attribute and emitted using the `emit!()` macro:

```rust
#[event]
pub struct MyEvent {
    pub field1: Pubkey,
    pub field2: u64,
    // ...
}

// Emit in instruction handler:
emit!(MyEvent {
    field1: some_pubkey,
    field2: some_value,
});
```

### Event Structure in Transaction Logs

Events are serialized as Borsh and stored in transaction logs with the following format:

```
Program log: Instruction: <InstructionName>
Program data: <Base64-encoded Borsh-serialized event data>
```

The event discriminator (first 8 bytes) is derived from the event name using:
```rust
discriminator = sighash("event", "<EventName>")
```

### Event Querying via RPC

**Method 1: Get Parsed Transaction**
```typescript
const tx = await connection.getParsedTransaction(signature, {
  commitment: 'confirmed',
  maxSupportedTransactionVersion: 0
});

// Parse program logs for events
const events = parseEventsFromLogs(tx.meta.logMessages);
```

**Method 2: Program Event Subscription**
```typescript
const listener = program.addEventListener('MarketInitialized', (event, slot) => {
  console.log('Market initialized:', event);
});
```

---

## Event Schemas

### MarketInitialized

**Event Name:** `MarketInitialized`
**Emitted By:** `initialize_market` instruction
**Purpose:** Records the creation of a new market for auditing and indexing.

**Traceability:** REQ-NF-009, UC-001

#### Rust Schema

```rust
#[event]
pub struct MarketInitialized {
    /// Market PDA address
    pub market: Pubkey,

    /// Token A mint address
    pub token_mint_a: Pubkey,

    /// Token B mint address
    pub token_mint_b: Pubkey,

    /// Administrator's public key (market authority)
    pub authority: Pubkey,

    /// Unix timestamp when market was initialized
    pub timestamp: i64,
}
```

#### Field Descriptions

| Field | Type | Description | Indexed |
|-------|------|-------------|---------|
| `market` | `Pubkey` (32 bytes) | Market PDA address - primary identifier for this market | Yes |
| `token_mint_a` | `Pubkey` (32 bytes) | Token A mint address - used to identify token pairs | Yes |
| `token_mint_b` | `Pubkey` (32 bytes) | Token B mint address - used to identify token pairs | Yes |
| `authority` | `Pubkey` (32 bytes) | Administrator wallet that created the market | Yes |
| `timestamp` | `i64` (8 bytes) | Unix timestamp (seconds since epoch) when market was created | Yes |

#### Example Event Data

```json
{
  "market": "8dTv3QKyJtLu9T4dhyRcW1zbk7X2GMqYa5hFDcj3pump",
  "token_mint_a": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "token_mint_b": "9yJEn5RT3YyFZqvJayV5e8xVF3W3vRwzfBZaXkjSZhKq",
  "authority": "3z9vL1zjN6qyAKuRJuJGNpEFBh9mMHW1GbeREqKMGRRJ",
  "timestamp": 1711084800
}
```

#### Use Cases

- **Market Discovery:** Off-chain indexers can discover all markets by listening for this event
- **Authority Tracking:** Identify which administrator created which markets
- **Historical Analysis:** Track market creation patterns over time
- **Duplicate Prevention:** Verify uniqueness of token pairs (though enforced on-chain via PDA)

#### Emission Code

```rust
emit!(MarketInitialized {
    market: ctx.accounts.market.key(),
    token_mint_a: ctx.accounts.token_mint_a.key(),
    token_mint_b: ctx.accounts.token_mint_b.key(),
    authority: ctx.accounts.authority.key(),
    timestamp: Clock::get()?.unix_timestamp,
});
```

---

### PriceSet

**Event Name:** `PriceSet`
**Emitted By:** `set_price` instruction
**Purpose:** Records exchange rate updates for price history and audit compliance.

**Traceability:** REQ-NF-010, UC-002, WF-002

#### Rust Schema

```rust
#[event]
pub struct PriceSet {
    /// Market PDA address
    pub market: Pubkey,

    /// Authority who set the price
    pub authority: Pubkey,

    /// Previous exchange rate (before update)
    pub old_price: u64,

    /// New exchange rate (after update)
    pub new_price: u64,

    /// Unix timestamp when price was updated
    pub timestamp: i64,
}
```

#### Field Descriptions

| Field | Type | Description | Indexed |
|-------|------|-------------|---------|
| `market` | `Pubkey` (32 bytes) | Market PDA address - identifies which market's price changed | Yes |
| `authority` | `Pubkey` (32 bytes) | Administrator wallet who set the price | Yes |
| `old_price` | `u64` (8 bytes) | Previous exchange rate value (format: price / 10^6) | No |
| `new_price` | `u64` (8 bytes) | New exchange rate value (format: price / 10^6) | No |
| `timestamp` | `i64` (8 bytes) | Unix timestamp when price was updated | Yes |

#### Price Interpretation

The `old_price` and `new_price` fields are stored as u64 values representing:
```
1 Token A = (price / 10^6) Token B
```

**Example:**
- `old_price = 2,500,000` → 1 Token A = 2.5 Token B
- `new_price = 2,800,000` → 1 Token A = 2.8 Token B

#### Example Event Data

```json
{
  "market": "8dTv3QKyJtLu9T4dhyRcW1zbk7X2GMqYa5hFDcj3pump",
  "old_price": 2500000,
  "new_price": 2800000,
  "timestamp": 1711088400
}
```

#### Use Cases

- **Price History:** Build historical price charts for markets
- **Rate Change Analysis:** Calculate frequency and magnitude of price updates
- **Arbitrage Detection:** Monitor price differences with external exchanges
- **Administrator Behavior Tracking:** Analyze admin pricing strategies
- **Compliance:** Demonstrate transparent pricing for regulatory review

#### Emission Code

```rust
let old_price = ctx.accounts.market.price;
ctx.accounts.market.price = new_price;

emit!(PriceSet {
    market: ctx.accounts.market.key(),
    old_price,
    new_price,
    timestamp: Clock::get()?.unix_timestamp,
});
```

---

### LiquidityAdded

**Event Name:** `LiquidityAdded`
**Emitted By:** `add_liquidity` instruction
**Purpose:** Records liquidity provision events for vault balance tracking and administrator activity monitoring.

**Traceability:** REQ-NF-011, UC-003

#### Rust Schema

```rust
#[event]
pub struct LiquidityAdded {
    /// Market PDA address
    pub market: Pubkey,

    /// Authority who added the liquidity
    pub authority: Pubkey,

    /// Token A amount added (0 if none added)
    pub amount_a: u64,

    /// Token B amount added (0 if none added)
    pub amount_b: u64,

    /// Unix timestamp when liquidity was added
    pub timestamp: i64,
}
```

#### Field Descriptions

| Field | Type | Description | Indexed |
|-------|------|-------------|---------|
| `market` | `Pubkey` (32 bytes) | Market PDA address - identifies which market received liquidity | Yes |
| `authority` | `Pubkey` (32 bytes) | Administrator wallet who added the liquidity | Yes |
| `amount_a` | `u64` (8 bytes) | Token A amount added in base units (0 if none) | No |
| `amount_b` | `u64` (8 bytes) | Token B amount added in base units (0 if none) | No |
| `timestamp` | `i64` (8 bytes) | Unix timestamp when liquidity was added | Yes |

#### Amount Interpretation

Amounts are stored in base units (smallest denomination):
- For tokens with 9 decimals: `amount_a = 10,000,000,000,000` = 10,000 tokens
- For tokens with 6 decimals: `amount_b = 25,000,000,000` = 25,000 tokens

At least one of `amount_a` or `amount_b` must be > 0 (enforced by instruction logic).

#### Example Event Data

**Single Vault Liquidity Addition (Vault A only):**
```json
{
  "market": "8dTv3QKyJtLu9T4dhyRcW1zbk7X2GMqYa5hFDcj3pump",
  "amount_a": 10000000000000,
  "amount_b": 0,
  "timestamp": 1711085200
}
```

**Dual Vault Liquidity Addition:**
```json
{
  "market": "8dTv3QKyJtLu9T4dhyRcW1zbk7X2GMqYa5hFDcj3pump",
  "amount_a": 10000000000000,
  "amount_b": 25000000000,
  "timestamp": 1711085200
}
```

#### Use Cases

- **Vault Balance Tracking:** Monitor total liquidity available in each vault over time
- **Liquidity Analytics:** Calculate total liquidity provided, growth rate, and rebalancing patterns
- **Administrator Monitoring:** Track which administrator provides liquidity and when
- **Risk Assessment:** Alert on low liquidity levels that may cause swap failures
- **Incentive Programs (Future):** Reward administrators based on liquidity contributions

#### Emission Code

```rust
emit!(LiquidityAdded {
    market: ctx.accounts.market.key(),
    amount_a,
    amount_b,
    timestamp: Clock::get()?.unix_timestamp,
});
```

---

### SwapExecuted

**Event Name:** `SwapExecuted`
**Emitted By:** `swap` instruction
**Purpose:** Records every token swap for transaction history, volume tracking, and user activity monitoring.

**Traceability:** REQ-NF-012, UC-004, UC-005

#### Rust Schema

```rust
#[event]
pub struct SwapExecuted {
    /// Market PDA address
    pub market: Pubkey,

    /// User's public key (trader)
    pub user: Pubkey,

    /// Swap direction (true = A→B, false = B→A)
    pub swap_a_to_b: bool,

    /// Input token amount (base units)
    pub input_amount: u64,

    /// Output token amount calculated (base units)
    pub output_amount: u64,

    /// Unix timestamp when swap was executed
    pub timestamp: i64,
}
```

#### Field Descriptions

| Field | Type | Description | Indexed |
|-------|------|-------------|---------|
| `market` | `Pubkey` (32 bytes) | Market PDA address - identifies which market processed the swap | Yes |
| `user` | `Pubkey` (32 bytes) | User wallet that executed the swap | Yes |
| `swap_a_to_b` | `bool` (1 byte) | Swap direction: `true` = A→B, `false` = B→A | No |
| `input_amount` | `u64` (8 bytes) | Input token amount in base units | No |
| `output_amount` | `u64` (8 bytes) | Output token amount calculated and transferred (base units) | No |
| `timestamp` | `i64` (8 bytes) | Unix timestamp when swap executed | Yes |

#### Swap Direction Interpretation

- **`swap_a_to_b = true`:** User swapped Token A for Token B
  - `input_amount` is in Token A base units
  - `output_amount` is in Token B base units
- **`swap_a_to_b = false`:** User swapped Token B for Token A
  - `input_amount` is in Token B base units
  - `output_amount` is in Token A base units

#### Example Event Data

**Swap A→B:**
```json
{
  "market": "8dTv3QKyJtLu9T4dhyRcW1zbk7X2GMqYa5hFDcj3pump",
  "user": "5XyZabc123456789def...UserPublicKey",
  "swap_a_to_b": true,
  "input_amount": 100000000000,
  "output_amount": 250000000,
  "timestamp": 1711088450
}
```
*Interpretation: User swapped 100 Token A (9 decimals) for 250 Token B (6 decimals)*

**Swap B→A:**
```json
{
  "market": "8dTv3QKyJtLu9T4dhyRcW1zbk7X2GMqYa5hFDcj3pump",
  "user": "5XyZabc123456789def...UserPublicKey",
  "swap_a_to_b": false,
  "input_amount": 500000000,
  "output_amount": 200000000000,
  "timestamp": 1711088500
}
```
*Interpretation: User swapped 500 Token B for 200 Token A*

#### Use Cases

- **Transaction History:** Display user's swap history in UI
- **Volume Tracking:** Calculate total swap volume per market (daily, weekly, monthly)
- **Effective Rate Calculation:** `effective_rate = output_amount / input_amount`
- **User Behavior Analysis:** Track swap patterns, frequency, and amounts
- **Market Activity Monitoring:** Identify most active markets and users
- **Fee Calculation (Future):** If fees are added, calculate total fees collected
- **Compliance and Auditing:** Demonstrate transparent transaction records

#### Emission Code

```rust
emit!(SwapExecuted {
    market: ctx.accounts.market.key(),
    user: ctx.accounts.user.key(),
    swap_a_to_b,
    input_amount: amount,
    output_amount,
    timestamp: Clock::get()?.unix_timestamp,
});
```

---

## Event Querying Guide

### Querying Events via Anchor Program

**Listen for All Events:**
```typescript
const program = anchor.workspace.SolanaSwap as Program<SolanaSwap>;

// Listen for MarketInitialized events
const listener = program.addEventListener('MarketInitialized', (event, slot) => {
  console.log('Market initialized:', {
    market: event.market.toString(),
    tokenA: event.tokenMintA.toString(),
    tokenB: event.tokenMintB.toString(),
    authority: event.authority.toString(),
    timestamp: new Date(event.timestamp * 1000).toISOString(),
  });
});

// Remove listener when done
program.removeEventListener(listener);
```

**Query Historical Events from Transaction:**
```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';

const connection = new Connection('https://api.devnet.solana.com');
const signature = '5XyZabc123...'; // Transaction signature

const tx = await connection.getParsedTransaction(signature, {
  commitment: 'confirmed',
  maxSupportedTransactionVersion: 0
});

// Parse events from logs
const eventParser = new anchor.EventParser(program.programId, program.coder);
const events = [];

for (const log of tx.meta.logMessages) {
  if (log.startsWith('Program data:')) {
    const base64Data = log.slice('Program data: '.length);
    const event = eventParser.parseLogs([log]);
    events.push(event);
  }
}

console.log('Events:', events);
```

---

### Querying Events via WebSocket Subscription

**Subscribe to Program Logs:**
```typescript
const connection = new Connection('wss://api.devnet.solana.com', 'confirmed');
const programId = new PublicKey('Swap11111111111111111111111111111111111111111');

const subscriptionId = connection.onLogs(
  programId,
  (logs, ctx) => {
    console.log('Program logs:', logs);

    // Parse events from logs
    const eventParser = new anchor.EventParser(programId, program.coder);
    const events = eventParser.parseLogs(logs.logs);

    events.forEach((event) => {
      console.log('Event:', event.name, event.data);
    });
  },
  'confirmed'
);

// Unsubscribe later
await connection.removeOnLogsListener(subscriptionId);
```

---

### Filtering Events by Market

**Query Swaps for Specific Market:**
```typescript
async function getMarketSwaps(marketPda: PublicKey, limit: number = 100) {
  const signatures = await connection.getSignaturesForAddress(marketPda, { limit });

  const swaps = [];

  for (const sigInfo of signatures) {
    const tx = await connection.getParsedTransaction(sigInfo.signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    // Parse SwapExecuted events
    const events = parseEventsFromLogs(tx.meta.logMessages);
    const swapEvents = events.filter((e) => e.name === 'SwapExecuted');

    swaps.push(...swapEvents);
  }

  return swaps;
}
```

---

## Event Indexing Strategy

### Off-Chain Indexer Architecture

**Recommended Stack:**
- **Database:** PostgreSQL or MongoDB for event storage
- **Indexer:** Custom Node.js/TypeScript service
- **Real-time Updates:** WebSocket subscription to Solana RPC
- **Historical Sync:** Batch fetch past transactions on startup

### Database Schema (PostgreSQL Example)

```sql
-- Markets table
CREATE TABLE markets (
  pda TEXT PRIMARY KEY,
  token_mint_a TEXT NOT NULL,
  token_mint_b TEXT NOT NULL,
  authority TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  transaction_signature TEXT NOT NULL
);

-- Price history table
CREATE TABLE price_history (
  id SERIAL PRIMARY KEY,
  market_pda TEXT NOT NULL REFERENCES markets(pda),
  old_price BIGINT NOT NULL,
  new_price BIGINT NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  transaction_signature TEXT NOT NULL,
  INDEX idx_market_time (market_pda, updated_at DESC)
);

-- Liquidity events table
CREATE TABLE liquidity_events (
  id SERIAL PRIMARY KEY,
  market_pda TEXT NOT NULL REFERENCES markets(pda),
  amount_a BIGINT NOT NULL,
  amount_b BIGINT NOT NULL,
  added_at TIMESTAMP NOT NULL,
  transaction_signature TEXT NOT NULL,
  INDEX idx_market_time (market_pda, added_at DESC)
);

-- Swaps table
CREATE TABLE swaps (
  id SERIAL PRIMARY KEY,
  market_pda TEXT NOT NULL REFERENCES markets(pda),
  user_pubkey TEXT NOT NULL,
  swap_a_to_b BOOLEAN NOT NULL,
  input_amount BIGINT NOT NULL,
  output_amount BIGINT NOT NULL,
  executed_at TIMESTAMP NOT NULL,
  transaction_signature TEXT NOT NULL,
  INDEX idx_market_time (market_pda, executed_at DESC),
  INDEX idx_user_time (user_pubkey, executed_at DESC)
);
```

### Indexer Service (Pseudo-Code)

```typescript
// Indexer service
class SwapEventIndexer {
  async start() {
    // 1. Sync historical events
    await this.syncHistoricalEvents();

    // 2. Subscribe to real-time events
    await this.subscribeToEvents();
  }

  async syncHistoricalEvents() {
    // Fetch all program accounts
    const accounts = await connection.getProgramAccounts(programId);

    for (const account of accounts) {
      const signatures = await connection.getSignaturesForAddress(account.pubkey);

      for (const sig of signatures) {
        await this.processTransaction(sig.signature);
      }
    }
  }

  async subscribeToEvents() {
    connection.onLogs(programId, async (logs, ctx) => {
      const events = parseEventsFromLogs(logs.logs);

      for (const event of events) {
        await this.indexEvent(event, ctx.signature);
      }
    });
  }

  async indexEvent(event: any, signature: string) {
    switch (event.name) {
      case 'MarketInitialized':
        await db.markets.insert({ ...event.data, signature });
        break;
      case 'PriceSet':
        await db.priceHistory.insert({ ...event.data, signature });
        break;
      case 'LiquidityAdded':
        await db.liquidityEvents.insert({ ...event.data, signature });
        break;
      case 'SwapExecuted':
        await db.swaps.insert({ ...event.data, signature });
        break;
    }
  }
}
```

---

## Analytics Queries

### Total Swap Volume Per Market

```sql
SELECT
  market_pda,
  COUNT(*) as total_swaps,
  SUM(CASE WHEN swap_a_to_b THEN input_amount ELSE 0 END) as total_a_swapped,
  SUM(CASE WHEN NOT swap_a_to_b THEN input_amount ELSE 0 END) as total_b_swapped
FROM swaps
WHERE executed_at >= NOW() - INTERVAL '24 hours'
GROUP BY market_pda;
```

### Price Change Frequency

```sql
SELECT
  market_pda,
  COUNT(*) as price_changes,
  AVG(new_price - old_price) as avg_change,
  MAX(updated_at) - MIN(updated_at) as time_range
FROM price_history
GROUP BY market_pda;
```

### User Swap Activity

```sql
SELECT
  user_pubkey,
  COUNT(*) as swap_count,
  SUM(input_amount) as total_input,
  SUM(output_amount) as total_output,
  MAX(executed_at) as last_swap
FROM swaps
WHERE user_pubkey = '<user_address>'
ORDER BY executed_at DESC
LIMIT 50;
```

---

## Testing Checklist

**Event Emission:**
- [ ] MarketInitialized emitted on market creation
- [ ] PriceSet emitted on price update
- [ ] LiquidityAdded emitted on liquidity addition (single and dual vault)
- [ ] SwapExecuted emitted on swap (both directions)

**Event Data Integrity:**
- [ ] All fields populated with correct values
- [ ] Timestamps match block time
- [ ] Pubkeys match expected accounts
- [ ] Amounts match transaction inputs/outputs

**Event Querying:**
- [ ] Events parsed correctly via Anchor event listener
- [ ] Historical events retrieved from transaction logs
- [ ] WebSocket subscription receives real-time events
- [ ] Filtering by market/user works correctly

**Indexer Integration:**
- [ ] Indexer syncs historical events without errors
- [ ] Real-time events processed and stored in database
- [ ] Database queries return correct aggregated data

---

## References

**Requirements:**
- REQ-NF-009: Event Emission for Market Initialization
- REQ-NF-010: Event Emission for Price Updates
- REQ-NF-011: Event Emission for Liquidity Additions
- REQ-NF-012: Event Emission for Swaps

**Use Cases:**
- UC-001: Initialize Market
- UC-002: Set Exchange Rate
- UC-003: Add Liquidity
- UC-004: Swap Token A to B
- UC-005: Swap Token B to A

**Workflows:**
- WF-001: Market Setup and Operation
- WF-002: Exchange Rate Management

---

**Changelog:**

| Version | Date       | Changes                                     |
|---------|------------|---------------------------------------------|
| 1.0     | 2026-03-22 | Initial event schema specification          |
