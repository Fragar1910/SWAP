# WF-002: Exchange Rate Management

**ID:** WF-002
**Name:** Administrator Workflow for Managing Pricing
**Priority:** Must
**Status:** Active
**Version:** 1.0
**Last Updated:** 2026-03-22

## Overview

**Description:** This workflow describes the administrator's process for monitoring market conditions, calculating appropriate exchange rates, updating prices in the smart contract, validating that the new price takes effect, and monitoring subsequent swaps to ensure the pricing change operates as intended. This is a critical ongoing operational workflow for maintaining market competitiveness and proper token valuation.

**Scope:**
- Market condition monitoring
- Exchange rate calculation and decision-making
- Price update execution on-chain
- Post-update validation and verification
- Swap monitoring at new exchange rate

**Actors:**
- **Administrator (Primary)**: Market authority who manages exchange rates
- **System (Secondary)**: Smart contract, RPC nodes, event monitoring systems
- **Users (Implicit)**: Traders whose swaps are affected by the rate change

**Trigger:**
- Administrator decides exchange rate needs adjustment based on:
  - External market conditions (e.g., centralized exchange rates)
  - Liquidity rebalancing requirements
  - Scheduled rate updates (e.g., daily adjustments)
  - Response to abnormal swap volumes

**Preconditions:**
- Market has been initialized (UC-001 completed)
- Administrator has Phantom wallet connected
- Administrator is the market.authority (has authorization)
- Administrator has sufficient SOL for transaction fees (~0.000005 SOL)

**Postconditions:**
- Market.price updated to new value on-chain
- PriceSet event emitted with old and new prices
- Subsequent swaps execute at new exchange rate
- Price change is auditable via event logs

**Traceability:**
- **Requirements:** REQ-F-002, REQ-F-008, REQ-NF-010, REQ-NF-006
- **Use Cases:** UC-002 (Set Exchange Rate)
- **Entities:** ENT-MKT-001 (Market), ENT-ADMIN-001 (Administrator)

---

## Workflow Steps

### Phase 1: Market Condition Monitoring

**Step 1.1: Administrator Monitors External Market Rates**
- **Actor:** Administrator
- **Action:**
  - Checks external exchange rates (e.g., Binance, Coinbase, Kraken)
  - Observes Token A/Token B trading pairs on centralized exchanges
  - Example observation: Current CEX rate = 1 Token A = 2.8 Token B
  - Compares with on-chain market rate: 1 Token A = 2.5 Token B
  - Identifies 12% premium on external markets
- **System:** N/A (off-chain activity)
- **Output:** Administrator determines rate adjustment is needed

**Step 1.2: Administrator Reviews Current On-Chain State**
- **Actor:** Administrator
- **Action:**
  - Opens web UI or CLI tool
  - Queries market account for current price
  - Observes:
    - Current price: 2,500,000 (representing 2.5)
    - Vault A liquidity: 10,100 Token A
    - Vault B liquidity: 24,750 Token B
    - Recent swap volume: 50 swaps in last 24 hours
- **System:** RPC query to market account
- **Output:** Current state documented for decision-making

**Step 1.3: Administrator Analyzes Liquidity Ratios**
- **Actor:** Administrator
- **Action:**
  - Calculates implied ratio: 24,750 / 10,100 = ~2.45
  - Observes vault ratio (2.45) is lower than current price (2.5)
  - Notes that Vault B is being depleted faster (A→B swaps dominating)
  - Determines higher price may incentivize B→A swaps to rebalance
- **System:** Off-chain calculation
- **Output:** Decision: Increase price to 2.8 to align with external markets and incentivize reverse swaps

**Decision Point 1:**
- **Decision:** Should the price be updated?
  - **Yes**: Significant divergence from external markets (> 10%)
  - **No**: Current rate is within acceptable bounds (< 5% divergence)
- **Outcome (Yes)**: Proceed to Phase 2
- **Outcome (No)**: Return to monitoring, set reminder to check again in N hours

---

### Phase 2: Exchange Rate Calculation

**Step 2.1: Calculate New Exchange Rate**
- **Actor:** Administrator
- **Action:**
  - Target rate: 2.8 (1 Token A = 2.8 Token B)
  - Converts to u64 format: `2.8 × 10^6 = 2,800,000`
  - Validates calculation:
    - Formula verification: `1 Token A = (2,800,000 / 10^6) Token B = 2.8 Token B` ✓
- **System:** Off-chain calculation (may use UI calculator tool)
- **Output:** New price value: `2,800,000`

**Step 2.2: Simulate Impact on Example Swap**
- **Actor:** Administrator
- **Action:**
  - Simulates A→B swap with amount = 100 Token A
  - Old rate calculation:
    ```
    output_b = (100 × 2,500,000 × 10^6) / (10^6 × 10^9) = 250 Token B
    ```
  - New rate calculation:
    ```
    output_b = (100 × 2,800,000 × 10^6) / (10^6 × 10^9) = 280 Token B
    ```
  - Impact: Users swapping A→B will receive 12% more Token B (280 vs 250)
  - Simulates B→A swap with amount = 280 Token B
  - Old rate calculation:
    ```
    output_a = (280 × 10^6 × 10^9) / (2,500,000 × 10^6) = 112 Token A
    ```
  - New rate calculation:
    ```
    output_a = (280 × 10^6 × 10^9) / (2,800,000 × 10^6) = 100 Token A
    ```
  - Impact: Users swapping B→A will receive less Token A (100 vs 112) for same input
- **System:** Off-chain calculation or simulation tool
- **Output:** Impact analysis documented: A→B swaps more attractive, B→A swaps less attractive

**Step 2.3: Validate New Price is Positive and Non-Zero**
- **Actor:** Administrator (or UI validation)
- **Action:**
  - Checks: `2,800,000 > 0` ✓
  - Checks: New price is different from old price ✓
  - Checks: New price is within reasonable bounds (e.g., not > 10× or < 0.1× old price)
- **System:** Client-side validation
- **Output:** Price validated as acceptable

**Decision Point 2:**
- **Decision:** Proceed with price update?
  - **Yes**: Price is reasonable and impact is acceptable
  - **No**: Recalculate or abort update
- **Outcome (Yes)**: Proceed to Phase 3

---

### Phase 3: Price Update Execution

**Step 3.1: Administrator Navigates to Set Price Interface**
- **Actor:** Administrator
- **Action:**
  - Opens web UI
  - Navigates to market dashboard for target market
  - Clicks "Set Exchange Rate" or "Update Price"
- **System:** UI displays set price form with:
  - Current price: 2.5 (displayed in human-readable format)
  - Stored value: 2,500,000 (u64)
  - Input field for new price
- **Output:** Price update form ready

**Step 3.2: Administrator Inputs New Exchange Rate**
- **Actor:** Administrator
- **Action:**
  - Inputs new rate: `2.8` in human-readable field
  - UI converts to u64: `2,800,000`
  - Reviews transaction preview:
    - Old price: 2.5 (2,500,000)
    - New price: 2.8 (2,800,000)
    - Transaction fee: ~0.000005 SOL
  - Clicks "Update Price"
- **System:**
  - Validates administrator is connected wallet
  - Validates new_price != old_price
  - Validates new_price > 0
  - Builds set_price transaction with parameter `new_price = 2,800,000`
  - Includes accounts:
    - `market`: MarketAccount PDA (mut)
    - `authority`: Administrator's wallet (signer)
- **Output:** Transaction ready for signing

**Step 3.3: Transaction Signing**
- **Actor:** Administrator
- **Action:** Reviews and approves transaction in Phantom wallet
- **System:** Phantom displays:
  - Instruction: set_price
  - Parameter: new_price = 2,800,000
  - Fee: ~0.000005 SOL
  - Accounts modified: market
- **Output:** Transaction signed

**Step 3.4: Transaction Submission and Execution**
- **Actor:** System
- **Action:**
  - Submits signed transaction to Solana RPC endpoint
  - Transaction reaches validator
  - Validator executes set_price instruction:
    1. Verifies authority is signer (Anchor constraint)
    2. Verifies authority = market.authority (has_one constraint)
    3. Reads old_price from market.price (2,500,000)
    4. Updates market.price = 2,800,000
    5. Emits PriceSet event:
       ```
       market: 8dTv3QK...
       old_price: 2,500,000
       new_price: 2,800,000
       timestamp: 1711088400
       ```
  - Transaction confirms on-chain (1 block confirmation)
- **System:** Smart contract state updated
- **Output:**
  - Transaction signature: `5XyZabc123...`
  - Confirmation status: Finalized

**Step 3.5: UI Confirmation Display**
- **Actor:** System
- **Action:**
  - UI polls RPC for transaction confirmation
  - Receives confirmation
  - Queries market account to verify price update
  - Displays success message: "Exchange rate updated to 1 Token A = 2.8 Token B"
  - Displays transaction signature with link to Solana Explorer
- **Output:**
  - UI updated with new price
  - Administrator sees confirmation

**Traceability:** UC-002, REQ-F-002, REQ-NF-010

---

### Phase 4: Post-Update Validation

**Step 4.1: Verify On-Chain State Change**
- **Actor:** Administrator (or automated monitoring)
- **Action:**
  - Queries market account via RPC
  - Verifies `market.price = 2,800,000` ✓
  - Compares with expected value: Match confirmed
- **System:** RPC account query
- **Output:** Price update verified on-chain

**Step 4.2: Verify Event Emission**
- **Actor:** Administrator (or automated monitoring)
- **Action:**
  - Queries program logs for PriceSet event
  - Locates event with timestamp matching transaction time
  - Validates event fields:
    - `market`: Correct PDA ✓
    - `old_price`: 2,500,000 ✓
    - `new_price`: 2,800,000 ✓
    - `timestamp`: Matches block time ✓
- **System:** Event log query (via RPC or indexer)
- **Output:** Event emission verified

**Step 4.3: Administrator Documents Price Change**
- **Actor:** Administrator
- **Action:**
  - Records price change in off-chain log or spreadsheet:
    - Date: 2026-03-22
    - Old price: 2.5
    - New price: 2.8
    - Reason: Align with CEX rates (12% premium eliminated)
    - Transaction signature: 5XyZabc123...
  - Updates operational documentation
- **System:** Off-chain documentation system
- **Output:** Price change documented for audit trail

**Decision Point 3:**
- **Decision:** Is price update successful?
  - **Yes**: On-chain state matches expected value
  - **No**: Revert or retry (see Exception Flow EF2)
- **Outcome (Yes)**: Proceed to Phase 5

---

### Phase 5: Swap Monitoring at New Rate

**Step 5.1: Monitor First Swap at New Rate**
- **Actor:** Administrator (or automated monitoring system)
- **Action:**
  - Waits for next user swap transaction
  - Observes first swap event after price update:
    ```
    SwapExecuted event:
      market: 8dTv3QK...
      user: <user_pubkey>
      swap_a_to_b: true
      input_amount: 50
      output_amount: 140  (calculated with new price)
      timestamp: 1711088450
    ```
  - Validates calculation manually:
    ```
    output_b = (50 × 2,800,000 × 10^6) / (10^6 × 10^9) = 140 Token B ✓
    ```
  - Confirms swap used new price (old price would have given 125 Token B)
- **System:** Event monitoring (WebSocket subscription or polling)
- **Output:** First swap at new rate confirmed

**Step 5.2: Monitor Swap Volume and Direction**
- **Actor:** Administrator
- **Action:**
  - Monitors swaps over next 1-4 hours
  - Tracks:
    - Number of A→B swaps
    - Number of B→A swaps
    - Total volume in each direction
  - Example observations after 2 hours:
    - A→B swaps: 15 (users taking advantage of better rate)
    - B→A swaps: 8 (fewer users swapping reverse direction)
    - Net effect: Vault B decreasing faster (expected behavior)
- **System:** Event aggregation and analysis
- **Output:** Swap behavior aligns with expected impact

**Step 5.3: Monitor Vault Liquidity Levels**
- **Actor:** Administrator
- **Action:**
  - Queries vault balances periodically
  - Observes:
    - Vault A: 10,200 Token A (increasing from A→B swaps)
    - Vault B: 23,500 Token B (decreasing from A→B swaps)
  - Checks if either vault is approaching depletion (< 10% of initial liquidity)
  - Determines if additional liquidity is needed
- **System:** Token account queries via RPC
- **Output:** Liquidity levels monitored

**Step 5.4: Validate No Unexpected Errors**
- **Actor:** Administrator (or automated monitoring)
- **Action:**
  - Reviews failed transactions (if any)
  - Checks for error patterns related to price update
  - Example: No "PriceNotSet" errors ✓
  - Example: No "ArithmeticOverflow" errors ✓
  - Confirms all swap failures are due to user-side issues (insufficient balance, etc.)
- **System:** Transaction failure analysis
- **Output:** No systemic errors detected

**Decision Point 4:**
- **Decision:** Is new price operating correctly?
  - **Yes**: Swaps execute at new rate, no unexpected errors
  - **No**: Investigate anomalies or revert price (see Exception Flow EF5)
- **Outcome (Yes)**: Price update workflow complete

---

## Workflow Sequence Diagram

```mermaid
sequenceDiagram
    participant Admin as Administrator
    participant CEX as External Exchange (CEX)
    participant UI as Web UI
    participant Wallet as Phantom Wallet
    participant RPC as Solana RPC
    participant Program as Swap Program
    participant Events as Event Monitor

    Note over Admin,Events: PHASE 1: MARKET CONDITION MONITORING
    Admin->>CEX: Check Token A/B rate
    CEX-->>Admin: Current rate: 1 A = 2.8 B
    Admin->>UI: Query current on-chain price
    UI->>RPC: Get market account
    RPC-->>UI: market.price = 2,500,000 (2.5)
    UI-->>Admin: Display: 1 A = 2.5 B
    Admin->>Admin: Analyze divergence: 12% premium
    Admin->>UI: Query vault balances
    UI->>RPC: Get vault_a, vault_b accounts
    RPC-->>UI: Vault A: 10,100; Vault B: 24,750
    UI-->>Admin: Display liquidity levels
    Admin->>Admin: Decision: Update price to 2.8

    Note over Admin,Events: PHASE 2: EXCHANGE RATE CALCULATION
    Admin->>Admin: Calculate new price: 2.8 × 10^6 = 2,800,000
    Admin->>Admin: Simulate swap impact
    Admin->>Admin: Validate new price > 0

    Note over Admin,Events: PHASE 3: PRICE UPDATE EXECUTION
    Admin->>UI: Navigate to "Set Price"
    UI-->>Admin: Display current price: 2.5
    Admin->>UI: Input new price: 2.8
    UI->>UI: Convert to u64: 2,800,000
    UI-->>Admin: Show transaction preview
    Admin->>UI: Click "Update Price"
    UI->>Wallet: Request signature (set_price)
    Wallet-->>Admin: Show approval prompt
    Admin->>Wallet: Approve
    Wallet->>RPC: Submit transaction
    RPC->>Program: Execute set_price(2,800,000)
    Program->>Program: Verify authority signer
    Program->>Program: Read old_price = 2,500,000
    Program->>Program: Update market.price = 2,800,000
    Program->>Events: Emit PriceSet event
    Program-->>RPC: Transaction confirmed
    RPC-->>UI: Confirmation
    UI->>RPC: Query market account
    RPC-->>UI: market.price = 2,800,000
    UI-->>Admin: "Rate updated: 1 A = 2.8 B"

    Note over Admin,Events: PHASE 4: POST-UPDATE VALIDATION
    Admin->>UI: Verify on-chain state
    UI->>RPC: Query market.price
    RPC-->>UI: 2,800,000
    UI-->>Admin: Verification: Price = 2.8 ✓
    Admin->>Events: Query PriceSet event
    Events-->>Admin: Event confirmed with correct values
    Admin->>Admin: Document price change

    Note over Admin,Events: PHASE 5: SWAP MONITORING
    Note over Admin,Events: ... time passes, user executes swap ...
    Events->>Events: Detect SwapExecuted event
    Events->>Admin: Alert: New swap detected
    Admin->>Events: Query swap details
    Events-->>Admin: input=50, output=140, new rate used ✓
    Admin->>Admin: Validate calculation: 50 → 140 at 2.8 rate ✓
    Admin->>UI: Monitor swap volume over 2 hours
    UI->>Events: Aggregate swap events
    Events-->>UI: A→B: 15, B→A: 8
    UI-->>Admin: Display swap statistics
    Admin->>UI: Check vault balances
    UI->>RPC: Query vaults
    RPC-->>UI: Vault A: 10,200, Vault B: 23,500
    UI-->>Admin: Display balances
    Admin->>Admin: Validate no unexpected errors ✓
    Admin->>Admin: Price update workflow complete
```

---

## Exception Handling

### EF1: Unauthorized Price Update Attempt
- **Trigger:** Non-administrator attempts to call set_price
- **Response:**
  - Anchor signer validation fails: `authority` is not a signer
  - OR Anchor has_one constraint fails: `authority.key() != market.authority`
  - Transaction fails before execution
  - Error message: "A has_one constraint was violated. Authority mismatch."
- **Recovery:**
  - Only market.authority can update price
  - Unauthorized user must contact administrator

### EF2: Price Update Transaction Fails
- **Trigger:** Transaction submission fails (e.g., RPC timeout, network error)
- **Response:**
  - Transaction not confirmed within timeout (30s)
  - UI displays: "Transaction timeout. Status unknown."
- **Recovery:**
  - Administrator queries market.price to check if update succeeded
  - If price unchanged, retry transaction
  - If price updated, workflow continues to Phase 4

### EF3: Administrator Sets Price to Zero
- **Trigger:** Administrator inputs price = 0 (intentionally or by mistake)
- **Response:**
  - Client-side validation should warn: "Setting price to 0 will disable B→A swaps (division by zero)"
  - If transaction is submitted, on-chain validation does not prevent it (price >= 0 is valid)
  - Subsequent B→A swaps will fail with PriceNotSet or DivisionByZero error
- **Recovery:**
  - Administrator must immediately set price to non-zero value
  - A→B swaps still function (no division by price in that direction)

### EF4: Excessive Price Change (> 100% increase or > 50% decrease)
- **Trigger:** Administrator sets price with extreme divergence from old price
- **Response:**
  - Client-side validation warns: "Price change is extreme (>100%). Are you sure?"
  - Displays confirmation dialog with impact analysis
  - Administrator must explicitly confirm
- **Recovery:**
  - If intentional: Proceed with update
  - If mistake: Cancel and recalculate

### EF5: Swaps Fail After Price Update (Unexpected Behavior)
- **Trigger:** Swaps consistently fail with errors after price change
- **Response:**
  - Investigate error pattern:
    - ArithmeticOverflow: New price causes u64 overflow in calculations
    - InsufficientLiquidity: Vault depleted due to increased swap volume
  - Identify root cause
- **Recovery:**
  - If overflow: Revert to lower price or adjust decimal handling
  - If liquidity issue: Add more liquidity to affected vault
  - If systemic bug: Pause market and investigate

### EF6: Event Emission Failure (Event Not Logged)
- **Trigger:** PriceSet event not emitted (rare, indicates smart contract bug)
- **Response:**
  - Administrator detects missing event in monitoring system
  - Verifies price actually updated by querying market.price directly
  - If price updated but event missing: Log discrepancy
- **Recovery:**
  - Price update is still valid (events are informational, not critical for operation)
  - Report missing event for investigation
  - Future price updates should emit events correctly

---

## Business Rules

- **BR-WF-010**: Only market.authority can invoke set_price (REQ-F-008)
- **BR-WF-011**: Price can be updated at any time (no cooldown period in MVP)
- **BR-WF-012**: Price must be non-negative (u64, >= 0)
- **BR-WF-013**: Price = 0 is technically valid but disables B→A swaps (REQ-NF-002)
- **BR-WF-014**: Price changes take effect immediately for subsequent swaps
- **BR-WF-015**: In-flight transactions use the price at execution time, not submission time
- **BR-WF-016**: All price changes must emit PriceSet event (REQ-NF-010)
- **BR-WF-017**: Administrator should monitor swaps after price change to validate correctness

---

## Success Criteria

- **SC1**: Market.price updated to new value on-chain
- **SC2**: Old and new prices differ (state change occurred)
- **SC3**: PriceSet event emitted with correct old_price, new_price, timestamp
- **SC4**: First swap after update uses new price (verified via calculation check)
- **SC5**: No unexpected swap failures related to price change
- **SC6**: Vault liquidity levels remain adequate after rate change
- **SC7**: Price change is auditable via event logs and transaction signature

---

## Performance Characteristics

| Metric | Target | Actual (Typical) | Notes |
|--------|--------|------------------|-------|
| Price Update Transaction Time | < 2 seconds | ~600ms | Lightweight state update |
| Event Emission Latency | < 1 second | ~200ms | Event emitted in same block as transaction |
| First Swap After Update | < 5 seconds | ~1-3 seconds | Depends on user action timing |
| Monitoring Detection Latency | < 10 seconds | ~5 seconds | WebSocket subscription or polling interval |

---

## Monitoring and Alerting

### Recommended Monitoring Metrics

1. **Price Change Frequency**
   - Alert if > 10 price changes per hour (potential manipulation or automation issue)

2. **Price Divergence from External Markets**
   - Alert if on-chain price diverges > 20% from CEX average
   - Indicates administrator may have set incorrect value

3. **Swap Failure Rate After Price Update**
   - Alert if failure rate > 10% within 1 hour of price change
   - May indicate arithmetic overflow or liquidity issue

4. **Vault Depletion Risk**
   - Alert if either vault balance < 10% of historical average
   - Administrator should add liquidity before swaps fail

5. **Event Emission Gaps**
   - Alert if PriceSet event not detected within 2 blocks of set_price transaction
   - May indicate event emission bug

---

## Integration with Other Workflows

**Related Workflows:**
- **WF-001 (Market Setup)**: Initial price setting occurs in Phase 2 of WF-001
- **WF-003 (Liquidity Management - Future)**: Price changes may require liquidity rebalancing

**Workflow Triggers:**
- WF-002 may trigger liquidity additions if vaults become imbalanced
- Abnormal swap volumes may trigger WF-002 (price adjustment)

---

## Audit Trail

**Auditability Requirements:**
- All price changes MUST emit PriceSet event (REQ-NF-010)
- Events include:
  - Market PDA address (which market was updated)
  - Old price (previous value)
  - New price (updated value)
  - Timestamp (when change occurred)
- Transaction signature provides additional audit trail (who submitted, when confirmed)

**Querying Historical Prices:**
```typescript
// Example: Query all PriceSet events for a market
const events = await program.account.marketAccount.fetch(marketPda);
const priceSetEvents = await connection.getProgramAccounts(
  programId,
  {
    filters: [
      { memcmp: { offset: 8, bytes: marketPda.toBase58() } }
    ]
  }
);
```

---

## Extensions and Variations

### Extension 1: Scheduled Automated Price Updates
- Administrator configures automated price oracle
- Oracle queries CEX rates every N hours
- If divergence > threshold, automatically calls set_price
- Requires off-chain bot with administrator keypair

### Extension 2: Price Change Governance (Multi-Sig)
- Upgrade authority to multi-sig account (e.g., Squads Protocol)
- Price changes require M-of-N administrator approvals
- Adds security and decentralization
- Not in MVP scope (REQ-C-010: single administrator)

### Extension 3: Price Change Rate Limiting
- Smart contract enforces cooldown period (e.g., 1 hour between updates)
- Prevents rapid price manipulation
- Stored as `last_price_update: i64` in MarketAccount
- Future enhancement for production systems

### Extension 4: Slippage-Protected Swaps
- Users specify `min_output_amount` in swap instruction
- If price changes between submission and execution, transaction fails if output < min
- Protects users from adverse price movements (REQ-NF-007)

---

## Validation Checklist

**Pre-Price Update:**
- [ ] Administrator is market.authority
- [ ] New price calculated correctly (formula verified)
- [ ] New price > 0 (or explicitly setting to 0 with understanding of consequences)
- [ ] New price differs from old price (state change required)
- [ ] Administrator wallet has sufficient SOL for transaction fee

**During Price Update:**
- [ ] Transaction signed by administrator
- [ ] Transaction submitted to RPC
- [ ] Transaction confirmed on-chain
- [ ] No errors in transaction logs

**Post-Price Update Validation:**
- [ ] market.price == expected new value (query on-chain)
- [ ] PriceSet event emitted with correct fields
- [ ] Event timestamp matches block time
- [ ] Transaction signature recorded for audit

**Swap Monitoring Validation:**
- [ ] First swap uses new price (calculation verified)
- [ ] Swap volume patterns align with expected behavior
- [ ] No unexpected swap failures
- [ ] Vault liquidity levels adequate

---

## References

**Use Cases:**
- UC-002: Set Exchange Rate

**Requirements:**
- REQ-F-002: Set Exchange Rate
- REQ-F-008: Authority-Only Market Modification
- REQ-NF-002: Division by Zero Protection
- REQ-NF-006: Signer Verification
- REQ-NF-010: Event Emission for Price Updates

**Domain Entities:**
- ENT-MKT-001: Market
- ENT-ADMIN-001: Administrator

**Related Workflows:**
- WF-001: Market Setup and Operation (includes initial price setting)

---

**Changelog:**

| Version | Date       | Changes                                     |
|---------|------------|---------------------------------------------|
| 1.0     | 2026-03-22 | Initial workflow specification              |
