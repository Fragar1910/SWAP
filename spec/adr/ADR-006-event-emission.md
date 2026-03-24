# ADR-006: Event Emission for Auditability and Observability

**Status:** Accepted
**Date:** 2026-03-22
**Deciders:** Technical Architect, Product Owner
**Traceability:** REQ-NF-009, REQ-NF-010, REQ-NF-011, REQ-NF-012

## Context

The Solana SWAP program needs to provide transparency and auditability for critical operations:
1. **Market initialization**: Tracking which markets are created and by whom
2. **Price updates**: Recording exchange rate changes over time
3. **Liquidity additions**: Monitoring vault funding by administrators
4. **Swaps**: Auditing all token exchanges (amounts, users, timestamps)

Solana provides two mechanisms for emitting information:
1. **Events** (Anchor framework): Structured data emitted via `emit!()` macro, logged to transaction metadata
2. **Logs** (msg! macro): Unstructured text messages written to transaction logs

We must choose the mechanism(s) that best support auditability (REQ-NF-009 to REQ-NF-012), off-chain indexing, analytics, and regulatory compliance.

## Decision

We will use **Anchor Events** (`emit!()` macro) for all structured auditability data. Events will be emitted for:
1. **MarketInitialized**: Market creation with token mints, authority, timestamp
2. **PriceSet**: Exchange rate changes with old/new values
3. **LiquidityAdded**: Token deposits to vaults
4. **SwapExecuted**: Token swaps with direction, amounts, user

Logs (`msg!()`) will be used sparingly for debugging information in development, but not for production auditability.

## Rationale

1. **Structured Data**: Anchor events serialize to JSON-compatible format, enabling off-chain indexing via tools like Helius, QuickNode, or custom indexers. Logs are unstructured strings requiring regex parsing.

2. **Automatic Serialization**: Anchor's `#[event]` macro generates borsh serialization, ensuring consistent encoding:
   ```rust
   #[event]
   pub struct SwapExecuted {
       pub market: Pubkey,
       pub user: Pubkey,
       pub swap_a_to_b: bool,
       pub input_amount: u64,
       pub output_amount: u64,
       pub timestamp: i64,
   }

   emit!(SwapExecuted { ... });  // Automatically serialized to tx metadata
   ```

3. **Client Parsing**: Frontend can decode events using Anchor's IDL, without custom parsing logic:
   ```typescript
   program.addEventListener("SwapExecuted", (event, slot) => {
       console.log(`Swap: ${event.inputAmount} → ${event.outputAmount} at slot ${slot}`);
   });
   ```

4. **Historical Queries**: RPC nodes index events by program ID, enabling queries like "show all swaps for market X in last 24h" without scanning entire chain.

5. **Auditability Compliance**: Events provide tamper-proof audit trail (stored in finalized transactions), meeting REQ-NF-009's requirement for 100% event emission.

6. **Analytics Integration**: Events integrate with existing Solana analytics tools (Dune Analytics, Flipside Crypto, Messari) via standard event schemas.

7. **Compute Efficiency**: Events are ~100 CU overhead vs ~500 CU for equivalent `msg!()` logs (events are written to transaction metadata, not serialized to logs).

## Alternatives Considered

### Alternative 1: msg!() Logs Only
- **Pros:**
  - Simpler implementation (just `msg!("Swap executed: {} -> {}", amount_in, amount_out)`)
  - No struct definitions needed
  - Lower binary size (no event serialization code)
  - Visible in standard transaction logs (easy debugging)

- **Cons:**
  - **Unstructured**: Requires regex parsing to extract data (fragile, error-prone)
  - **No Schema**: Log format can change without breaking compilation (silent breakage in indexers)
  - **Not Indexed**: RPC nodes don't index log contents, requiring full transaction scanning
  - **Parsing Overhead**: Off-chain indexers must parse strings on every transaction
  - **Internationalization**: Hard to localize log messages (embedded English strings)
  - **No Type Safety**: Easy to log wrong data or skip fields

- **Why Rejected:** Logs are suitable for debugging but not production auditability. Unstructured data makes off-chain analytics painful and error-prone.

### Alternative 2: Account-Based State History
- **Pros:**
  - Persistent storage: Historical data stored in on-chain accounts (e.g., `SwapHistoryAccount`)
  - Queryable: Clients can fetch historical swaps directly from accounts
  - No event parsing needed

- **Cons:**
  - **Expensive**: Each swap creates a new account or grows existing account (~0.01 SOL rent per swap record)
  - **Storage Bloat**: Unlimited history would exceed account size limits (10MB per account)
  - **Slow Queries**: Fetching 1000 swaps requires 1000 RPC calls (vs single event query)
  - **No Deletion**: Cannot reclaim rent from old history (Solana accounts are persistent)
  - **Compute Overhead**: Writing to accounts costs ~5,000 CU per write vs ~100 CU for events

- **Why Rejected:** Account storage is expensive and doesn't scale for high-frequency auditability. Events are archived off-chain (BigTable, RPC providers) at zero cost to program.

### Alternative 3: Hybrid (Events + Aggregate State)
- **Pros:**
  - Events for detailed history (every swap)
  - Aggregate accounts for summary stats (total volume, swap count)
  - Best of both worlds: Granular audit trail + efficient queries

- **Cons:**
  - Increased complexity: Must maintain both event emission and state updates
  - Potential inconsistency: If aggregate update fails but event emits, state diverges
  - Higher compute cost: Writing aggregates adds ~2,000 CU per instruction
  - Not required by current specs: REQ-NF-009 to REQ-NF-012 only mention events

- **Why Rejected:** While useful for production DEXes (e.g., Serum stores 24h volume), it's overengineering for educational scope. Can be added later if analytics requirements emerge.

### Alternative 4: Off-Chain Indexer with No Events
- **Pros:**
  - Zero on-chain overhead (no events or logs)
  - Saves compute units (~100 CU per event)

- **Cons:**
  - **No Transparency**: Users cannot verify swap history (must trust off-chain indexer)
  - **Single Point of Failure**: If indexer goes down, no historical data accessible
  - **Not Auditable**: Cannot prove swap occurred (no on-chain record)
  - **Violates Requirements**: REQ-NF-009 to REQ-NF-012 explicitly require event emission

- **Why Rejected:** Eliminates auditability entirely. Events are critical for trustless verification (users can independently verify swap history by parsing transactions).

### Alternative 5: External Oracle / Data Availability Layer
- **Pros:**
  - Offloads storage to specialized layer (e.g., Arweave, Ceramic)
  - Unlimited history storage
  - Decentralized archival

- **Cons:**
  - Extreme complexity: Requires oracle integration, data proofs, cross-chain communication
  - External dependencies: Adds failure modes (oracle downtime, proof verification)
  - Not standard in Solana ecosystem (most dApps use events)
  - Overkill for educational project

- **Why Rejected:** External data layers are cutting-edge research (e.g., Solana's upcoming Solana History Archive), not suitable for educational scope.

## Consequences

### Positive:
- **Structured Auditability**: 100% of critical operations emit events (REQ-NF-009 to REQ-NF-012)
- **Off-Chain Analytics**: Events integrate with Helius, QuickNode, Dune Analytics, Flipside Crypto
- **Client-Side Parsing**: Anchor IDL enables automatic event decoding in TypeScript/JavaScript
- **Historical Queries**: RPC nodes index events by program ID, enabling efficient lookups
- **Type Safety**: Event structs are validated at compile time (can't forget fields)
- **Tamper-Proof**: Events are stored in finalized transactions (immutable audit trail)
- **Low Overhead**: Events cost ~100 CU per emission (negligible impact on REQ-NF-014's 50,000 CU budget)
- **Composability**: Other programs can listen to events (e.g., analytics aggregators, bots)

### Negative:
- **Event Size Limits**: Events are stored in transaction metadata (max ~10KB per transaction). Very large events may hit limits.
  - **Mitigation**: Current events are small (~200 bytes each), well under limits.

- **No Guaranteed Delivery**: If transaction fails, events are discarded. Cannot use events for critical state updates.
  - **Mitigation**: Events are for auditability only, not state management. State updates happen in accounts.

- **RPC Node Dependency**: Historical event queries rely on RPC nodes retaining transaction history. Nodes may prune old data.
  - **Mitigation**: Use archival RPC nodes (Helius, QuickNode) or run own archival node. Solana Foundation maintains permanent BigTable archives.

- **Binary Size**: Event serialization code adds ~2-3KB to program binary.
  - **Mitigation**: Negligible compared to total program size (~50KB). Can be optimized with feature flags if needed.

- **Compute Overhead**: Each event costs ~100 CU. Emitting 4 events per swap = ~400 CU total.
  - **Mitigation**: 400 CU is <1% of 50,000 CU budget, acceptable trade-off for auditability.

## Implementation Notes

### Technical Details:

1. **Event Struct Definitions**:
   ```rust
   use anchor_lang::prelude::*;

   #[event]
   pub struct MarketInitialized {
       pub market: Pubkey,
       pub token_mint_a: Pubkey,
       pub token_mint_b: Pubkey,
       pub authority: Pubkey,
       #[index]  // Indexable field (faster queries)
       pub timestamp: i64,
   }

   #[event]
   pub struct PriceSet {
       #[index]
       pub market: Pubkey,
       pub old_price: u64,
       pub new_price: u64,
       pub timestamp: i64,
   }

   #[event]
   pub struct LiquidityAdded {
       #[index]
       pub market: Pubkey,
       pub amount_a: u64,
       pub amount_b: u64,
       pub timestamp: i64,
   }

   #[event]
   pub struct SwapExecuted {
       #[index]
       pub market: Pubkey,
       pub user: Pubkey,
       pub swap_a_to_b: bool,
       pub input_amount: u64,
       pub output_amount: u64,
       pub timestamp: i64,
   }
   ```

2. **Event Emission in Instructions**:
   ```rust
   pub fn initialize_market(ctx: Context<InitializeMarket>) -> Result<()> {
       let market = &mut ctx.accounts.market;
       let clock = Clock::get()?;

       // ... initialization logic ...

       emit!(MarketInitialized {
           market: market.key(),
           token_mint_a: market.token_mint_a,
           token_mint_b: market.token_mint_b,
           authority: market.authority,
           timestamp: clock.unix_timestamp,
       });

       Ok(())
   }

   pub fn swap(ctx: Context<Swap>, amount: u64, swap_a_to_b: bool) -> Result<()> {
       let clock = Clock::get()?;

       // ... swap logic ...

       emit!(SwapExecuted {
           market: ctx.accounts.market.key(),
           user: ctx.accounts.user.key(),
           swap_a_to_b,
           input_amount: amount,
           output_amount: amount_out,
           timestamp: clock.unix_timestamp,
       });

       Ok(())
   }
   ```

3. **Client-Side Event Listening (TypeScript)**:
   ```typescript
   import * as anchor from "@coral-xyz/anchor";

   // Real-time event listener
   const listenerId = program.addEventListener("SwapExecuted", (event, slot, signature) => {
       console.log(`Swap executed in slot ${slot}:`);
       console.log(`  Market: ${event.market.toString()}`);
       console.log(`  User: ${event.user.toString()}`);
       console.log(`  Direction: ${event.swapAToB ? "A→B" : "B→A"}`);
       console.log(`  Input: ${event.inputAmount.toString()}`);
       console.log(`  Output: ${event.outputAmount.toString()}`);
       console.log(`  Timestamp: ${new Date(event.timestamp * 1000).toISOString()}`);
   });

   // Remove listener when done
   await program.removeEventListener(listenerId);
   ```

4. **Historical Event Query (via RPC)**:
   ```typescript
   // Fetch swap events for specific market
   const signatures = await connection.getSignaturesForAddress(
       marketPDA,
       { limit: 100 }
   );

   const swapEvents = [];
   for (const sig of signatures) {
       const tx = await connection.getTransaction(sig.signature, {
           commitment: "confirmed",
           maxSupportedTransactionVersion: 0,
       });

       // Parse events from transaction logs
       const events = anchorProvider.utils.parseEvents(program.idl, tx);
       const swaps = events.filter(e => e.name === "SwapExecuted");
       swapEvents.push(...swaps);
   }

   console.log(`Found ${swapEvents.length} swaps for market ${marketPDA}`);
   ```

5. **Analytics Query (via Helius/QuickNode)**:
   ```typescript
   // Using Helius Enhanced Transactions API
   const response = await fetch("https://api.helius.xyz/v0/addresses/<market_pda>/transactions", {
       method: "GET",
       headers: { "api-key": process.env.HELIUS_API_KEY },
   });

   const txs = await response.json();
   const swapEvents = txs
       .flatMap(tx => tx.events || [])
       .filter(event => event.type === "SwapExecuted");
   ```

### Timestamp Best Practices:

```rust
use anchor_lang::prelude::*;

pub fn get_current_timestamp(ctx: &Context) -> Result<i64> {
    let clock = Clock::get()?;
    Ok(clock.unix_timestamp)  // Unix timestamp (seconds since epoch)
}

// Alternative: Solana slot number (useful for block-based queries)
pub fn get_current_slot(ctx: &Context) -> Result<u64> {
    let clock = Clock::get()?;
    Ok(clock.slot)
}
```

### Testing Strategy:

```typescript
describe("Event Emission", () => {
    it("Emits MarketInitialized event on market creation", async () => {
        let eventEmitted = false;
        const listener = program.addEventListener("MarketInitialized", (event) => {
            expect(event.market.toString()).to.equal(marketPDA.toString());
            expect(event.tokenMintA.toString()).to.equal(mintA.toString());
            expect(event.authority.toString()).to.equal(initializer.publicKey.toString());
            eventEmitted = true;
        });

        await program.methods.initializeMarket().accounts({...}).rpc();

        await sleep(1000);  // Wait for event propagation
        expect(eventEmitted).to.be.true;

        await program.removeEventListener(listener);
    });

    it("Emits SwapExecuted event on successful swap", async () => {
        const events = [];
        const listener = program.addEventListener("SwapExecuted", (event) => {
            events.push(event);
        });

        await program.methods.swap(new BN(1000), true).accounts({...}).rpc();

        await sleep(1000);
        expect(events).to.have.lengthOf(1);
        expect(events[0].inputAmount.toString()).to.equal("1000");

        await program.removeEventListener(listener);
    });
});
```

### Indexer Implementation (Optional):

For advanced use cases, deploy a custom indexer:
```typescript
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";

async function indexSwaps(programId: PublicKey) {
    const connection = new Connection("https://api.mainnet-beta.solana.com");
    const program = new Program(idl, programId, provider);

    // Subscribe to all program transactions
    const subscriptionId = connection.onLogs(
        programId,
        async (logs, ctx) => {
            if (logs.err) return;  // Skip failed transactions

            const tx = await connection.getTransaction(logs.signature, {
                commitment: "confirmed",
                maxSupportedTransactionVersion: 0,
            });

            const events = parseEvents(program.idl, tx);
            for (const event of events) {
                if (event.name === "SwapExecuted") {
                    // Store in database (PostgreSQL, MongoDB, etc.)
                    await db.swaps.insert({
                        signature: logs.signature,
                        market: event.data.market.toString(),
                        user: event.data.user.toString(),
                        direction: event.data.swapAToB ? "A→B" : "B→A",
                        inputAmount: event.data.inputAmount.toString(),
                        outputAmount: event.data.outputAmount.toString(),
                        timestamp: new Date(event.data.timestamp * 1000),
                        slot: ctx.slot,
                    });
                }
            }
        }
    );
}
```

## References

- [Anchor Events Documentation](https://book.anchor-lang.com/anchor_in_depth/events.html)
- [Solana Transaction Structure](https://docs.solana.com/developing/programming-model/transactions)
- [Helius Enhanced Transactions API](https://docs.helius.dev/api-reference/enhanced-transactions-api)
- [Dune Analytics Solana Events](https://dune.com/docs/reference/tables/solana-events)
- [Flipside Crypto Solana Events](https://docs.flipsidecrypto.com/flipside-api/sql-api/tables/solana-core-tables)
- [Anchor IDL Specification](https://book.anchor-lang.com/anchor_references/idl.html)
- REQ-NF-009: Event Emission for Market Initialization
- REQ-NF-010: Event Emission for Price Updates
- REQ-NF-011: Event Emission for Liquidity Additions
- REQ-NF-012: Event Emission for Swaps
