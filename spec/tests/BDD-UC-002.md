# BDD-UC-002: Set Exchange Rate Test Scenarios

**Feature:** Administrator Exchange Rate Management
**Use Case:** UC-002
**Requirements:** REQ-F-002, REQ-F-008, REQ-NF-002, REQ-NF-006, REQ-NF-010
**Invariants:** INV-MKT-002, INV-MKT-004, INV-AUTH-001, INV-AUTH-002, INV-EVT-001, INV-EVT-002

## Background

```gherkin
Given a Solana test validator is running
And the SWAP program is deployed
And a market exists at PDA "MarketPDAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
And the market has authority = "AdminXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
And the market has token_mint_a with 9 decimals
And the market has token_mint_b with 6 decimals
And the market has initial price = 0
And the administrator wallet is connected via Phantom
```

---

## Happy Path Scenarios

### Scenario 1: Set Initial Exchange Rate (First Time)

```gherkin
Feature: Exchange Rate Configuration

Scenario: Administrator sets exchange rate for the first time
  Given the market price is currently 0 (not yet set)
  And the administrator is the market authority
  When the administrator invokes set_price with new_price = 2500000
  And the transaction is signed by the administrator's wallet
  Then the market.price field is updated from 0 to 2500000
  And the new price represents "1 Token A = 2.5 Token B" (2500000 / 10^6)
  And a PriceSet event is emitted with:
    | Field      | Value                                    |
    | market     | MarketPDAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX |
    | old_price  | 0                                        |
    | new_price  | 2500000                                  |
    | timestamp  | <current Unix timestamp>                 |
  And the transaction confirms successfully on-chain
  And the market is now operational for swaps (price > 0)
  And the UI displays: "Exchange rate updated to 2.5 Token B per 1 Token A"
```

**Traceability:** REQ-F-002 (AC1-AC6), UC-002 AF1

---

### Scenario 2: Update Existing Exchange Rate

```gherkin
Scenario: Administrator adjusts the exchange rate
  Given the market price is currently 2500000 (1 A = 2.5 B)
  And the administrator decides to change the rate to 1 A = 3.2 B
  When the administrator invokes set_price with new_price = 3200000
  Then the market.price field is updated from 2500000 to 3200000
  And a PriceSet event is emitted with old_price = 2500000, new_price = 3200000
  And subsequent swaps use the new rate (3.2)
  And previously calculated swap previews are invalidated
  And the UI refreshes to display the new rate
```

**Traceability:** REQ-F-002 (AC1-AC6), UC-002 Normal Flow

---

### Scenario 3: Set 1:1 Exchange Rate

```gherkin
Scenario: Set equal value exchange (1 Token A = 1 Token B)
  Given the administrator wants a 1:1 exchange ratio
  When the administrator invokes set_price with new_price = 1000000
  And 1000000 / 10^6 = 1.0
  Then the market price is set to 1000000
  And swaps execute at exact 1:1 ratio (ignoring decimal differences)
  And for input = 100 Token A, output = 100 Token B (in base units)
```

**Traceability:** REQ-F-002, UC-002 Normal Flow

---

## Alternative Flow Scenarios

### Scenario 4: Set Price via CLI Script

```gherkin
Scenario: Automated price update from command-line script
  Given the administrator has a Node.js script with market PDA and authority keypair
  When the script calls program.methods.setPrice(1500000).accounts({market, authority}).signers([authorityKeypair]).rpc()
  Then the transaction is submitted programmatically
  And the script waits for confirmation using connection.confirmTransaction()
  And the script logs: "Price updated from 2500000 to 1500000"
  And the script queries the updated market account
  And the script verifies market.price == 1500000
```

**Traceability:** UC-002 AF2

---

### Scenario 5: Gradual Price Adjustment (Multi-Step)

```gherkin
Scenario: Administrator updates price in small increments to reduce impact
  Given the current price is 2000000 (1 A = 2.0 B)
  And the target price is 3000000 (1 A = 3.0 B)
  And the administrator wants 10 incremental steps
  When the administrator runs a script that:
    - Step 1: set_price(2100000)
    - Step 2: set_price(2200000)
    - ...
    - Step 10: set_price(3000000)
  Then 10 PriceSet events are emitted
  And the final price is 3000000
  And active traders experience gradual price changes instead of a shock
```

**Traceability:** UC-002 AF4

---

### Scenario 6: Price Based on External Oracle

```gherkin
Scenario: Update price using data from Pyth Network oracle
  Given an external price feed reports SOL/USDC = 150.00
  And the administrator's script monitors this feed
  When the oracle price deviates from the market price by > 2%
  Then the script calculates new_price = 150000000 (150.0 in u64 format)
  And the script invokes set_price(150000000)
  And the market price is synchronized with the oracle
  And a log entry records: "Price adjusted to 150.0 based on Pyth oracle"
```

**Traceability:** UC-002 AF3

---

## Exception Flow Scenarios

### Scenario 7: Unauthorized User Attempts to Set Price

```gherkin
Scenario: Non-authority account tries to modify exchange rate
  Given the market authority is "AdminXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  And an unauthorized user with public key "MaliciousUserXXXXXXXXXXXXXXXXXXXXXXXXXXX" attempts to set price
  When the unauthorized user invokes set_price with new_price = 9999999999
  And the transaction is signed by "MaliciousUserXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  Then Anchor's account constraint checks fail
  And the constraint `authority.key() == market.authority` evaluates to false
  And the transaction is rejected before the instruction handler executes
  And the error code is "ConstraintSigner" or "ConstraintHasOne"
  And the UI displays: "Unauthorized: Only the market authority can set the price. Current authority: AdminXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX. Your address: MaliciousUserXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  And the market price remains unchanged
  And no PriceSet event is emitted
```

**Traceability:** REQ-F-002 (AC7-AC9), REQ-F-008, REQ-NF-006, INV-AUTH-001, UC-002 EF1

---

### Scenario 8: Set Price to Zero (Division by Zero Risk)

```gherkin
Scenario: Administrator sets price = 0 (creates operational issues)
  Given the current price is 2500000
  When the administrator invokes set_price with new_price = 0
  Then the transaction succeeds (no on-chain validation prevents price = 0)
  And the market.price field is updated to 0
  And a PriceSet event is emitted with old_price = 2500000, new_price = 0
  But subsequent Token B → Token A swaps fail with error "PriceNotSet" or "DivisionByZero"
  Because the calculation (amount × 10^6 × 10^decimals_a) / (0 × 10^decimals_b) is undefined
  And Token A → Token B swaps result in zero output (caught by zero-amount validation)
  And the UI should display warning: "Price = 0 will prevent swaps. Are you sure?"
```

**Traceability:** REQ-F-002 (AC10), REQ-NF-002, INV-SWP-005, UC-002 EF2

---

### Scenario 9: Price Overflow (Extremely Large Value)

```gherkin
Scenario: Administrator sets unrealistically high price
  Given the administrator inputs new_price = 18446744073709551615 (u64::MAX)
  When the set_price transaction is submitted
  Then the transaction succeeds (price is stored as u64)
  And the market.price = 18446744073709551615
  But subsequent swap calculations overflow
  And swaps fail with "ArithmeticOverflow" error
  And the UI should implement client-side validation: "Price exceeds safe maximum (1e15). Please use a realistic value."
```

**Traceability:** REQ-NF-001, INV-SWP-006, UC-002 EF3

---

### Scenario 10: Wallet Not Connected

```gherkin
Scenario: User tries to access price management without wallet connection
  Given the administrator has not connected their Phantom wallet
  When the administrator navigates to the "Set Price" page
  Then the UI detects no wallet connection
  And the UI displays: "Please connect your Phantom wallet to continue"
  And the "Set Price" form is disabled or hidden
  And a "Connect Wallet" button is prominently displayed
  And the administrator cannot submit the set_price transaction
```

**Traceability:** UC-002 EF4

---

### Scenario 11: Insufficient SOL for Transaction Fee

```gherkin
Scenario: Administrator wallet lacks SOL for transaction fees
  Given the administrator's SOL balance is 0.000002 SOL
  And the transaction fee is approximately 0.000005 SOL
  When the administrator attempts to submit set_price
  Then the transaction simulation fails
  And the error is "Insufficient SOL for transaction fee"
  And the UI displays: "Insufficient SOL for transaction fee. Please add SOL to your wallet."
  And the transaction is NOT submitted
  And the market price remains unchanged
```

**Traceability:** UC-002 EF5

---

### Scenario 12: RPC Node Error (503 Service Unavailable)

```gherkin
Scenario: RPC node is down or rate-limited
  Given the administrator submits set_price transaction
  When the RPC node returns HTTP 503 "Service Unavailable"
  Or the RPC node returns HTTP 429 "Too Many Requests"
  Then the transaction is not processed
  And the UI displays error: "RPC error: Unable to process transaction. Please try again."
  And the UI suggests: "Wait a moment and retry, or switch to a different RPC endpoint"
  And no state changes occur on-chain
  And the administrator can retry after switching RPC endpoints
```

**Traceability:** UC-002 EF6

---

### Scenario 13: Concurrent Price Updates (Race Condition)

```gherkin
Scenario: Two administrators attempt simultaneous price updates
  Given the market has multi-sig authority (hypothetically, not implemented)
  And Admin1 submits set_price(1500000) at timestamp T
  And Admin2 submits set_price(2000000) at timestamp T+0.1s
  When both transactions are processed
  Then one transaction confirms first (e.g., Admin1's at slot N)
  And the second transaction confirms after (Admin2's at slot N+1)
  And the market.price after slot N = 1500000
  And the market.price after slot N+1 = 2000000 (last write wins)
  And both PriceSet events are emitted:
    - Event 1: old_price=0, new_price=1500000
    - Event 2: old_price=1500000, new_price=2000000 (if Admin2 reads updated state)
    - Or Event 2: old_price=0, new_price=2000000 (if Admin2 reads stale state)
  And the final price = 2000000
  And this demonstrates lack of optimistic locking
```

**Traceability:** UC-002 EF7

---

## Negative Test Scenarios

### Scenario 14: Set Negative Price (Type System Prevention)

```gherkin
Scenario: Attempt to set negative exchange rate (impossible due to u64)
  Given the administrator tries to set new_price = -1000000
  When the value is processed by Rust/TypeScript
  Then the Rust compiler rejects negative u64 literals at compile time
  Or the TypeScript client throws TypeError before transaction creation
  And the transaction cannot be constructed
  And this scenario is prevented by type safety
```

**Traceability:** REQ-F-002, INV-MKT-004

---

### Scenario 15: Set Price with Wrong Market Account

```gherkin
Scenario: Transaction references incorrect market PDA
  Given Market A exists at "MarketA_PDAXXXXXXXXXXXXXXXXXXXXXXXXX"
  And Market B exists at "MarketB_PDAXXXXXXXXXXXXXXXXXXXXXXXXX"
  When the administrator intends to update Market A price
  But the transaction mistakenly references Market B in the accounts
  Then the signer constraint fails (if authority differs)
  Or the wrong market's price is updated (if same authority)
  And this highlights the importance of correct account derivation
```

**Traceability:** Account validation

---

## Summary

**Total Scenarios:** 15
- Happy Path: 3
- Alternative Flows: 4
- Exception Flows: 7
- Negative Tests: 2

**Coverage:**
- Requirements: REQ-F-002, REQ-F-008, REQ-NF-001, REQ-NF-002, REQ-NF-006, REQ-NF-010
- Invariants: INV-MKT-002, INV-MKT-004, INV-AUTH-001, INV-AUTH-002, INV-EVT-001, INV-EVT-002, INV-SWP-005, INV-SWP-006
- Use Case Flows: UC-002 Normal Flow, AF1-AF4, EF1-EF7
- Business Rules: BR-006, BR-007, BR-008, BR-009, BR-010, BR-011

**Test Oracles:**
- Only market authority can set price (authorization check)
- Price changes take effect immediately for all swaps
- PriceSet events accurately record old and new prices
- Price = 0 prevents B→A swaps (division by zero)
- Authority remains immutable (cannot be changed via set_price)
