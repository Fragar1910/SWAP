# Domain State Machines

> **Domain:** Solana Token SWAP - Decentralized Exchange
> **Version:** 1.0
> **Last updated:** 2026-03-22

## Purpose

This document defines state machines for stateful entities in the swap domain. A state machine specifies:
- **States**: Discrete conditions an entity can be in
- **Transitions**: Valid paths between states
- **Guards**: Conditions that must be satisfied for a transition
- **Actions**: Side effects that occur during transitions
- **Invariants**: Properties that must hold in each state

**Note:** Most entities in this system have trivial or implicit state:
- **Market**: Always "active" (no explicit state field)
- **Vault**: Always "active" (balance is a quantity, not a state)
- **Token Mint**: External entity (state managed by SPL Token Program)

The primary state machine of interest is the **Swap Transaction Lifecycle**, which models the progression from submission to finality.

---

## State Machine Catalog

| ID | Entity | States | Transitions | Complexity | Traceability |
|----|--------|--------|-------------|------------|--------------|
| SM-SWP-001 | Swap Transaction | 4 states | 5 transitions | Medium | REQ-F-006, REQ-F-007, REQ-NF-012 |
| SM-MKT-001 | Market (Implicit) | 1 state (Active) | 0 transitions | Trivial | REQ-F-001 |
| SM-VLT-001 | Vault (Implicit) | 2 informal states | N/A | Trivial | REQ-F-003, REQ-F-004 |

---

## SM-SWP-001: Swap Transaction Lifecycle

**Definition:** The swap transaction lifecycle models the progression of a swap from user submission to on-chain finality or failure.

### State Diagram

```
                              ┌─────────────────┐
                              │   NOT_STARTED   │ (Initial: user has not submitted)
                              └────────┬────────┘
                                       │
                                       │ User submits transaction
                                       │ (signs with wallet)
                                       ▼
                              ┌─────────────────┐
                    ┌─────────│     PENDING     │◄─────────┐
                    │         │                 │          │
                    │         └────────┬────────┘          │
                    │                  │                   │
                    │                  │ Validators process│
                    │                  │ transaction       │
                    │                  ▼                   │
                    │         ┌─────────────────┐          │
                    │         │   CONFIRMING    │          │
                    │         │                 │          │
                    │         └────┬──────┬─────┘          │
                    │              │      │                │
                    │ Validation   │      │ Constraint     │
                    │ fails        │      │ violation      │
                    │ (e.g.,       │      │ (e.g.,         │
                    │ insufficient │      │ insufficient   │
                    │ funds)       │      │ liquidity)     │
                    │              │      │                │
                    ▼              │      ▼                │
           ┌─────────────────┐    │  ┌─────────────────┐ │
           │     FAILED      │◄───┘  │    CONFIRMED    │ │
           │                 │       │                 │ │
           └─────────────────┘       └─────────┬───────┘ │
                                               │         │
                                               │ Event   │
                                               │ emitted │
                                               ▼         │
                                        [Swap Complete]  │
                                               │         │
                                               └─────────┘
                                             (Finalized)
```

### State Definitions

#### State: NOT_STARTED

**Description:** Initial state before user initiates a swap. The transaction does not exist on-chain or in the mempool.

**Invariants:**
- No transaction signature exists
- No blockchain resources consumed
- User balances unchanged

**Allowed Transitions:**
- → `PENDING` (user submits transaction)

---

#### State: PENDING

**Description:** Transaction has been submitted to an RPC node and is awaiting inclusion in a block by validators.

**Properties:**
- Transaction signature assigned
- Transaction in mempool (not yet in a block)
- No state changes on-chain

**Invariants:**
- `INV-SWP-TX-001`: Transaction signature is unique
- `INV-SWP-TX-002`: User has signed the transaction
- `INV-SWP-TX-003`: Transaction contains valid instruction data

**Entry Actions:**
- Generate transaction signature
- Submit to RPC node
- UI displays "Pending..." status

**Exit Actions:**
- (None until next state)

**Allowed Transitions:**
- → `CONFIRMING` (transaction included in a block)
- → `FAILED` (transaction rejected before block inclusion, e.g., invalid signature, insufficient SOL for fees)

**Timeout:**
- If transaction is not included in a block within ~30 seconds, it may expire
- User may need to resubmit with updated blockhash

**Traceability:** REQ-NF-015 (UI responsiveness), REQ-NF-013 (confirmation time)

---

#### State: CONFIRMING

**Description:** Transaction has been included in a block and is awaiting finality (sufficient confirmations).

**Properties:**
- Transaction in a confirmed block
- Awaiting finality (confirmations < threshold, e.g., 31 confirmations for finalized)
- Instruction logic executed (success or failure determined)
- State changes applied or reverted

**Invariants:**
- `INV-SWP-TX-004`: Transaction is in a valid block
- `INV-SWP-TX-005`: Block is on the canonical chain (not orphaned)

**Entry Actions:**
- Instruction handler executes (swap logic runs)
- If successful: Tokens transferred, event emitted
- If failed: State reverted, error logged

**Exit Actions:**
- Finality reached (typically ~400-800ms on mainnet)
- UI updated with final status

**Allowed Transitions:**
- → `CONFIRMED` (transaction finalized successfully, all constraints passed)
- → `FAILED` (transaction reverted due to constraint violation)

**Confirmation Levels (Solana):**
- **Processed**: Transaction in a block (not yet finalized, may be rolled back)
- **Confirmed**: 1-31 confirmations (default UI threshold: ~66% stake consensus)
- **Finalized**: 31+ confirmations (guaranteed, cannot be rolled back)

**Traceability:** REQ-NF-013 (confirmation time), REQ-NF-016 (atomicity)

---

#### State: CONFIRMED

**Description:** Transaction has been finalized successfully. All state changes are permanent and irreversible.

**Properties:**
- Transaction finalized (31+ confirmations)
- Tokens successfully transferred (user → vault, vault → user)
- Event emitted (`SwapExecuted`)
- Transaction signature permanently recorded on-chain

**Invariants:**
- `INV-SWP-TX-006`: User balance decreased by `input_amount`
- `INV-SWP-TX-007`: User balance increased by `output_amount`
- `INV-SWP-TX-008`: Vault A balance changed by +/- `amount_a`
- `INV-SWP-TX-009`: Vault B balance changed by +/- `amount_b`
- `INV-SWP-TX-010`: Event `SwapExecuted` emitted with correct parameters

**Entry Actions:**
- Mark transaction as finalized in UI
- Update displayed balances
- Log transaction signature for audit

**Exit Actions:**
- (Terminal state: no further transitions)

**Allowed Transitions:**
- (None: terminal state)

**Traceability:** REQ-F-006, REQ-F-007, REQ-NF-012, REQ-NF-016

---

#### State: FAILED

**Description:** Transaction failed due to validation error, constraint violation, or blockchain rejection.

**Properties:**
- Transaction rejected or reverted
- No state changes persisted
- Error message available in logs
- User balances unchanged

**Invariants:**
- `INV-SWP-TX-011`: All state changes reverted (atomicity)
- `INV-SWP-TX-012`: No tokens transferred
- `INV-SWP-TX-013`: No event emitted
- `INV-SWP-TX-014`: Error code/message logged

**Common Failure Reasons:**
- **Insufficient liquidity**: Vault balance < required output (REQ-NF-003)
- **Zero amount**: Input amount = 0 (REQ-NF-004)
- **Price not set**: `market.price = 0` for B→A swap (REQ-NF-002)
- **Overflow**: Arithmetic operation exceeded u64 range (REQ-NF-001)
- **Unauthorized**: Non-authority attempted privileged operation (REQ-F-008)
- **Insufficient SOL**: User cannot pay transaction fees
- **Insufficient token balance**: User balance < input amount

**Entry Actions:**
- Log error details
- UI displays user-friendly error message (REQ-NF-024)
- Suggest corrective action (reduce amount, check balance, etc.)

**Exit Actions:**
- (Terminal state: no further transitions)
- User may retry with corrected parameters (new transaction)

**Allowed Transitions:**
- (None: terminal state)

**Traceability:** REQ-NF-001 through REQ-NF-006, REQ-NF-016, REQ-NF-024

---

### Transition Table

| From State | To State | Trigger | Guard Conditions | Actions | Traceability |
|------------|----------|---------|------------------|---------|--------------|
| NOT_STARTED | PENDING | User submits transaction | • User signs with wallet<br>• Valid instruction data<br>• Sufficient SOL for fees | • Generate signature<br>• Submit to RPC<br>• UI: "Pending" | REQ-F-006, REQ-F-007 |
| PENDING | CONFIRMING | Transaction included in block | • Block produced by validator<br>• Transaction not expired | • Execute instruction logic<br>• Apply state changes (if valid) | REQ-NF-013 |
| PENDING | FAILED | Transaction rejected | • Invalid signature<br>• Insufficient SOL for fees<br>• Transaction expired | • Log error<br>• UI: "Failed" | REQ-NF-013 |
| CONFIRMING | CONFIRMED | Transaction finalized | • All constraints passed<br>• Tokens transferred successfully<br>• 31+ confirmations | • Emit `SwapExecuted` event<br>• UI: "Confirmed" | REQ-NF-012, REQ-NF-016 |
| CONFIRMING | FAILED | Constraint violation | • Insufficient liquidity<br>• Zero amount<br>• Price not set<br>• Overflow | • Revert state changes<br>• Log error<br>• UI: "Failed" | REQ-NF-001–006, REQ-NF-016 |

---

### Guard Conditions (Detailed)

#### Guard: Sufficient Liquidity

**Condition:**
```
vault_balance(output_token) >= calculated_output_amount
```

**Check Location:** During `CONFIRMING` state (instruction execution)

**Failure State:** → `FAILED`

**Error Code:** `InsufficientLiquidity`

**Traceability:** REQ-NF-003

---

#### Guard: Non-Zero Amount

**Condition:**
```
input_amount > 0
```

**Check Location:** Start of `swap` instruction

**Failure State:** → `FAILED`

**Error Code:** `ZeroAmount` or `InvalidAmount`

**Traceability:** REQ-NF-004

---

#### Guard: Price Set

**Condition:**
```
market.price > 0  (for B→A swaps)
```

**Check Location:** During output calculation in `swap` instruction

**Failure State:** → `FAILED`

**Error Code:** `PriceNotSet` or `DivisionByZero`

**Traceability:** REQ-NF-002

---

#### Guard: No Overflow

**Condition:**
```
All arithmetic operations use checked methods (checked_mul, checked_div, etc.)
```

**Check Location:** Throughout output calculation

**Failure State:** → `FAILED`

**Error Code:** `Overflow` or `CalculationError`

**Traceability:** REQ-NF-001

---

#### Guard: User Balance Sufficient

**Condition:**
```
user_token_account.amount >= input_amount
```

**Check Location:** During CPI transfer (user → vault)

**Failure State:** → `FAILED`

**Error Code:** `InsufficientFunds` (from SPL Token Program)

**Traceability:** REQ-F-006, REQ-F-007

---

### State Invariants (Formal Specifications)

#### Invariant: Atomic State Transitions

**Formal Statement:**
```
∀ tx ∈ SwapTransactions:
  (tx.state = CONFIRMED) ⇒
    (user_balance_a.before - input_amount = user_balance_a.after) ∧
    (user_balance_b.before + output_amount = user_balance_b.after) ∧
    (vault_balance_a.before + input_amount = vault_balance_a.after) ∧
    (vault_balance_b.before - output_amount = vault_balance_b.after)

  ∧

  (tx.state = FAILED) ⇒
    (user_balance_a.before = user_balance_a.after) ∧
    (user_balance_b.before = user_balance_b.after) ∧
    (vault_balance_a.before = vault_balance_a.after) ∧
    (vault_balance_b.before = vault_balance_b.after)
```

**Meaning:** A confirmed transaction changes all balances atomically. A failed transaction changes nothing.

**Traceability:** REQ-NF-016

---

#### Invariant: Event Emission

**Formal Statement:**
```
∀ tx ∈ SwapTransactions:
  (tx.state = CONFIRMED) ⇒ ∃ event ∈ SwapExecutedEvents:
    (event.market = tx.market) ∧
    (event.user = tx.user) ∧
    (event.input_amount = tx.input_amount) ∧
    (event.output_amount = tx.output_amount) ∧
    (event.timestamp = tx.timestamp)
```

**Meaning:** Every confirmed swap must emit a `SwapExecuted` event with accurate data.

**Traceability:** REQ-NF-012

---

#### Invariant: Non-Negative Balances

**Formal Statement:**
```
∀ tx ∈ SwapTransactions, ∀ states ∈ [PENDING, CONFIRMING, CONFIRMED, FAILED]:
  (user_token_account.amount >= 0) ∧
  (vault_token_account.amount >= 0)
```

**Meaning:** Token balances can never go negative in any state.

**Traceability:** REQ-NF-003, INV-VLT-001 (from 05-INVARIANTS.md)

---

### Timing Constraints

| State | Max Duration (Mainnet) | Notes | Traceability |
|-------|------------------------|-------|--------------|
| PENDING | ~30 seconds | Transaction expires if not included in a block | REQ-NF-013 |
| CONFIRMING | 400-800ms (1-2 blocks) | Time to finality (31 confirmations) | REQ-NF-013 |
| CONFIRMED | Permanent | Irreversible | REQ-NF-016 |
| FAILED | Immediate | Error logged, no retry | REQ-NF-024 |

**Performance Target:**
- p99 confirmation time < 800ms (REQ-NF-013)
- UI update latency < 500ms after on-chain confirmation (REQ-NF-015)

---

## SM-MKT-001: Market State (Implicit)

**Definition:** Markets in this system do not have explicit state transitions. Once initialized, a market remains "active" indefinitely.

### Implicit State: Active

**Description:** The market is operational and can process swaps, price updates, and liquidity additions.

**Properties:**
- `market.authority` is set
- `market.token_mint_a` and `market.token_mint_b` are immutable
- `market.price` can be 0 (not set) or > 0 (set)
- Vaults exist and are accessible

**Invariants:**
- `INV-MKT-ACTIVE-001`: Market PDA exists on-chain
- `INV-MKT-ACTIVE-002`: Vaults exist on-chain
- `INV-MKT-ACTIVE-003`: Market is owned by swap program

**Entry Actions:**
- Created via `initialize_market` instruction (REQ-F-001)
- `MarketInitialized` event emitted (REQ-NF-009)

**Exit Actions:**
- (None: no state transitions in MVP)

**Future States (Not in MVP):**
- **Paused**: Administrator temporarily disables swaps
- **Closed**: Market permanently deactivated (liquidity withdrawn)
- **Deprecated**: Market marked obsolete (redirect to new market)

**Traceability:** REQ-F-001, REQ-NF-009

---

## SM-VLT-001: Vault State (Informal)

**Definition:** Vaults do not have explicit state fields, but can be conceptually categorized based on balance.

### Informal State: Empty

**Description:** Vault balance is zero. Swaps requiring output from this vault will fail.

**Properties:**
- `vault.amount = 0`
- Cannot fulfill swap requests in the direction that withdraws from this vault

**Guard Condition:**
```
vault.amount >= required_output_amount
```

**Failure:** Swap fails with `InsufficientLiquidity` (REQ-NF-003)

---

### Informal State: Liquid

**Description:** Vault balance is positive. Swaps can be fulfilled (up to available liquidity).

**Properties:**
- `vault.amount > 0`
- Can fulfill swap requests (limited by balance)

**Transitions:**
- **Empty → Liquid**: Administrator adds liquidity (REQ-F-003, REQ-F-004)
- **Liquid → Empty**: All liquidity consumed by swaps (edge case)
- **Liquid → More Liquid**: Additional liquidity added

**Traceability:** REQ-F-003, REQ-F-004, REQ-NF-003

---

## State Persistence and Recovery

### On-Chain State

**Persisted:**
- Market account data (authority, mints, price, decimals, bump)
- Vault token account balances
- Transaction logs (events)

**Not Persisted:**
- Swap transaction state (transient: tracked off-chain by UI/indexers)

### Off-Chain State Tracking

**UI/Client Responsibility:**
- Poll transaction status (`pending`, `confirming`, `confirmed`, `failed`)
- Subscribe to websocket updates for real-time status
- Cache recent transaction signatures for user history

**Indexer Responsibility:**
- Listen for `SwapExecuted` events
- Build transaction history database
- Provide analytics (volume, price history, user activity)

**Traceability:** REQ-NF-012 (event emission), REQ-NF-015 (UI responsiveness)

---

## Error Handling and Rollback

### Solana Transaction Atomicity

**Guarantee:** All instructions in a transaction are atomic. If any instruction fails, all state changes are reverted.

**Applied to Swaps:**
```
Transaction:
  1. Instruction: Transfer user → vault (amount_a)
  2. Instruction: Transfer vault → user (amount_b)

Scenarios:
  - Both succeed → CONFIRMED
  - Either fails → FAILED (both reverted)
```

**Traceability:** REQ-NF-016

---

### Retry Strategies

**UI Guidance:**
- **Insufficient liquidity**: Reduce swap amount or wait for liquidity
- **Price not set**: Contact administrator to set exchange rate
- **Zero amount**: Enter a positive amount
- **Insufficient SOL**: Add SOL to wallet for transaction fees
- **Insufficient token balance**: Add tokens to wallet or reduce swap amount

**Automatic Retries:**
- Not recommended: User should review error and correct parameters
- Exception: Transaction dropped from mempool (can resubmit with new blockhash)

**Traceability:** REQ-NF-024

---

## Changelog

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 1.0     | 2026-03-22 | Initial state machine definitions|

---

**Traceability:** This document derives state machines from:
- REQ-F-006, REQ-F-007 (swap instructions)
- REQ-NF-001 through REQ-NF-006 (validation requirements)
- REQ-NF-012 (event emission)
- REQ-NF-013 (confirmation time)
- REQ-NF-015 (UI responsiveness)
- REQ-NF-016 (atomicity)
- REQ-NF-024 (error messaging)
- Entities (02-ENTITIES.md) and Value Objects (03-VALUE-OBJECTS.md)
