# BDD-UC-005: Swap Token B to A Test Scenarios

**Feature:** User Token Swap (B → A Direction - Inverse)
**Use Case:** UC-005
**Requirements:** REQ-F-007, REQ-F-009, REQ-NF-001, REQ-NF-002, REQ-NF-003, REQ-NF-004, REQ-NF-012
**Invariants:** INV-SWP-001, INV-SWP-002, INV-SWP-003, INV-SWP-004, INV-SWP-005, INV-SWP-006, INV-VLT-005

## Background

```gherkin
Given a Solana test validator is running
And the SWAP program is deployed
And a market exists with price = 2500000 (1 Token A = 2.5 Token B)
And the market has decimals_a = 9, decimals_b = 6
And vault_a has balance = 3000 Token A (in base units: 3000 × 10^9)
And vault_b has balance = 7500 Token B (in base units: 7500 × 10^6)
And a user wallet "UserXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" is connected
And the user has Token A ATA with balance = 500 Token A
And the user has Token B ATA with balance = 1000 Token B
And the user's wallet has SOL balance >= 0.01 SOL
```

---

## Happy Path Scenarios

### Scenario 1: Successful Swap from Token B to Token A (Inverse Direction)

```gherkin
Feature: Token Exchange B→A

Scenario: User swaps Token B for Token A using inverse rate
  Given the user has Token B balance = 1000
  And the market price = 2500000 (1 A = 2.5 B, so 1 B = 0.4 A)
  And vault_a balance = 3000 (sufficient liquidity)
  When the user invokes swap with amount = 250, swap_a_to_b = false
  And the transaction is signed by the user
  Then the system validates amount > 0 (satisfied: 250 > 0)
  And the system validates price > 0 (satisfied: 2500000 > 0) - **CRITICAL for B→A**
  And the system calculates output using inverse formula:
    amount_a = (250 × 10^6 × 10^9) / (2500000 × 10^6)
    amount_a = (250 × 10^9) / 2500000
    amount_a = 250000000000 / 2500000
    amount_a = 100 (in Token A base units, accounting for 9 decimals)
  And the system validates vault_a.amount >= 100 (satisfied: 3000 >= 100)
  And a CPI transfers 250 Token B from user's ATA to vault_b (user signs)
  And a CPI transfers 100 Token A from vault_a to user's ATA (market PDA signs with bump)
  And the user's Token B balance decreases from 1000 to 750
  And the user's Token A balance increases from 500 to 600
  And vault_b balance increases from 7500 to 7750
  And vault_a balance decreases from 3000 to 2900
  And a SwapExecuted event is emitted with:
    | Field          | Value                                       |
    | market         | MarketPDAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX    |
    | user           | UserXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX    |
    | swap_a_to_b    | false                                       |
    | input_amount   | 250                                         |
    | output_amount  | 100                                         |
    | timestamp      | <current Unix timestamp>                    |
  And the transaction confirms on-chain
  And the UI displays: "Swap successful! You exchanged 250 Token B for 100 Token A"
```

**Traceability:** REQ-F-007 (AC1-AC17), INV-SWP-003, INV-VLT-005, UC-005 Normal Flow

---

### Scenario 2: Swap with Maximum Input Amount

```gherkin
Scenario: User swaps entire Token B balance
  Given the user has Token B balance = 1000
  When the user clicks "Max" button in the UI
  Then the UI auto-fills amount = 1000
  And the UI calculates expected output using inverse formula:
    amount_a = (1000 × 10^6 × 10^9) / (2500000 × 10^6) = 400 Token A
  And the user confirms the swap
  Then 1000 Token B is transferred from user to vault_b
  And 400 Token A is transferred from vault_a to user
  And the user's Token B balance becomes 0
  And the user's Token A balance increases by 400
```

**Traceability:** UC-005 AF1

---

### Scenario 3: Bidirectional Symmetry Test

```gherkin
Scenario: Verify A→B and B→A swaps are inverse operations
  Given the user performs swap A→B: 100 Token A → 250 Token B
  And then immediately performs swap B→A: 250 Token B → 100 Token A
  Then the user returns to the original token balances (ignoring rounding)
  And the swaps are symmetric inverse operations
  And this validates the inverse formula correctness
```

**Traceability:** REQ-F-007 (AC17)

---

## Alternative Flow Scenarios

### Scenario 4: Display Reverse Exchange Rate

```gherkin
Scenario: UI shows both forward and reverse rates
  Given the market price = 2500000 (1 A = 2.5 B)
  When the UI displays exchange rates
  Then the forward rate is shown: "1 Token A = 2.5 Token B"
  And the reverse rate is shown: "1 Token B = 0.4 Token A"
  And users understand the conversion in both directions
```

**Traceability:** UC-005 AF2

---

### Scenario 5: Arbitrage Trading Opportunity

```gherkin
Scenario: Trader exploits price difference between markets
  Given this market has price = 2500000 (1 A = 2.5 B)
  And an external exchange offers 1 Token A for 3.0 Token B
  When the trader swaps 250 Token B → 100 Token A on this market
  And sells 100 Token A → 300 Token B on the external exchange
  Then the trader captures 50 Token B profit (300 - 250)
  And this arbitrage helps price discovery
```

**Traceability:** UC-005 AF4

---

## Exception Flow Scenarios

### Scenario 6: Insufficient Token B Balance

```gherkin
Scenario: User attempts to swap more Token B than owned
  Given the user's Token B balance is 200
  When the user attempts to swap amount = 250
  Then the client-side validation fails
  And the UI displays error: "Insufficient Token B balance. You have 200 but tried to swap 250."
  And the submit button remains disabled
  And if validation is bypassed:
    - The Token Program CPI fails with "InsufficientFunds"
    - The transaction reverts atomically
    - The UI displays: "Transaction failed: Insufficient Token B in your wallet"
  And no balances change
```

**Traceability:** UC-005 EF1

---

### Scenario 7: Insufficient Liquidity in Vault A

```gherkin
Scenario: Vault A lacks tokens to fulfill swap output
  Given vault_a balance = 50 Token A
  When the user swaps 250 Token B (expecting 100 Token A output)
  Then the system calculates amount_a = 100
  And the system validates vault_a.amount >= 100
  And the validation fails (50 < 100)
  And the transaction fails with "InsufficientLiquidity" error
  And the UI displays: "Insufficient liquidity in Vault A. Requested 100 Token A, but only 50 available. Try a smaller amount."
  And no transfers occur
```

**Traceability:** REQ-NF-003, INV-SWP-004, INV-VLT-004, UC-005 EF2

---

### Scenario 8: Price Not Set - CRITICAL CASE for B→A

```gherkin
Scenario: Market price is zero (division by zero hazard)
  Given the market was initialized with price = 0
  And the administrator has not yet called set_price
  When the user attempts to swap Token B to Token A
  Then the system validates price > 0 before calculation
  And the validation fails (price = 0)
  And the transaction reverts with "PriceNotSet" or "DivisionByZero" error
  And the UI displays: "Swap unavailable: Exchange rate not set for this direction (Token B → Token A). Contact market administrator."
  And the submit button is disabled
  And the user cannot proceed
  And **THIS IS SPECIFIC TO B→A DIRECTION** due to division by price
```

**Traceability:** REQ-F-007 (AC13), REQ-NF-002, INV-SWP-005, UC-005 EF3

---

### Scenario 9: Zero Amount Input

```gherkin
Scenario: User submits swap with amount = 0
  Given the user inputs amount = 0
  When the transaction is submitted
  Then the on-chain validation fails
  And the error is "InvalidAmount: amount must be greater than 0"
  And the UI displays: "Amount must be greater than 0"
  And no transfers are executed
```

**Traceability:** REQ-F-007 (AC12), REQ-NF-004, INV-SWP-001, UC-005 EF4

---

### Scenario 10: Arithmetic Overflow in Calculation

```gherkin
Scenario: Very large swap amount causes calculation overflow
  Given the user inputs amount = 9223372036854775807 (near u64::MAX / 2)
  When the system calculates amount_a = (amount × 10^6 × 10^decimals_a)
  Then the intermediate multiplication overflows u64
  And checked_mul returns None
  And the transaction fails with "ArithmeticOverflow" error
  And the UI displays: "Swap calculation overflow. Please reduce the swap amount."
```

**Traceability:** REQ-NF-001, INV-SWP-006, UC-005 EF5

---

### Scenario 11: Division by Zero Edge Case (Should Never Occur)

```gherkin
Scenario: Price validation bypassed (bug or attack scenario)
  Given price validation is somehow bypassed (system bug)
  And price = 0
  When the system attempts calculation: amount_a = (amount × 10^6 × 10^decimals_a) / (0 × 10^decimals_b)
  Then checked_div with denominator = 0 returns None
  And the transaction fails with "DivisionByZero" or "ArithmeticError"
  And the UI displays: "Critical error: Division by zero in swap calculation"
  And this indicates a system bug (should be caught by price > 0 validation)
```

**Traceability:** REQ-NF-002, INV-SWP-005, UC-005 EF6

---

### Scenario 12: User Token Account Not Found

```gherkin
Scenario: User's Token B ATA does not exist
  Given the user's wallet has no Token B Associated Token Account
  When the user attempts to swap
  Then the Token Program CPI fails with "AccountNotFound"
  And the transaction reverts
  And the UI displays: "Token B account not found. Please create an Associated Token Account first."
```

**Traceability:** UC-005 EF7

---

### Scenario 13: Vault Authority Mismatch

```gherkin
Scenario: Vault A authority does not match market PDA
  Given vault_a has corrupted authority != market PDA
  When the system attempts to transfer from vault_a using market PDA signer
  Then the Token Program CPI fails with "InvalidAuthority"
  And the transaction reverts (user→vault transfer is also rolled back)
  And the UI displays: "Critical error: Vault authority mismatch. Contact support."
```

**Traceability:** INV-VLT-002, UC-005 EF8

---

### Scenario 14: Precision Loss Warning

```gherkin
Scenario: Swap output rounds to near-zero
  Given the user swaps very small amount of Token B
  When the calculated amount_a = 0.00001 Token A
  And after decimal conversion, output rounds to 0 base units
  Then the UI displays warning: "Output amount too small (rounds to 0). Increase swap amount."
  And the submit button is disabled
  And the user must input larger amount
```

**Traceability:** UC-005 EF11

---

## Negative Test Scenarios

### Scenario 15: Verify Correct Inverse Formula

```gherkin
Scenario: Validate B→A calculation with specific values
  Given Token A has 9 decimals, Token B has 6 decimals
  And price = 2500000 (1 A = 2.5 B)
  When the user swaps 2.5 Token B (2500000 base units, 6 decimals)
  Then the calculation is:
    amount_a = (2500000 × 10^6 × 10^9) / (2500000 × 10^6)
    amount_a = 10^9 = 1 Token A (in 9 decimal base units)
  And the output is exactly 1 Token A
  And this validates the inverse formula
```

**Traceability:** REQ-F-007 (AC4), INV-SWP-003

---

### Scenario 16: Price Sensitivity Comparison (A→B vs B→A)

```gherkin
Scenario: B→A direction is more sensitive to price = 0
  Given A→B formula: amount_b = (amount × price × 10^decimals_b) / (10^6 × 10^decimals_a)
  And B→A formula: amount_a = (amount × 10^6 × 10^decimals_a) / (price × 10^decimals_b)
  When price = 0:
    - A→B: amount_b = (amount × 0 × ...) / ... = 0 (caught by zero-amount validation)
    - B→A: amount_a = ... / (0 × ...) = UNDEFINED (division by zero error)
  Then B→A **MUST** have explicit price > 0 check
  And A→B technically can proceed but results in zero output
  And this asymmetry is captured in BR-037
```

**Traceability:** REQ-NF-002, UC-005 EF3, Business Rule BR-037

---

### Scenario 17: Permissionless Swap (Same as A→B)

```gherkin
Scenario: Any user can execute B→A swap
  Given User A is not the market authority
  When User A executes a B→A swap
  Then the transaction succeeds (no authorization check)
  And swaps are permissionless in both directions
```

**Traceability:** REQ-F-009 (AC16), REQ-F-007

---

## Summary

**Total Scenarios:** 17
- Happy Path: 3
- Alternative Flows: 2
- Exception Flows: 9
- Negative Tests: 3

**Coverage:**
- Requirements: REQ-F-007, REQ-F-009, REQ-NF-001, REQ-NF-002, REQ-NF-003, REQ-NF-004, REQ-NF-012
- Invariants: INV-SWP-001, INV-SWP-002, INV-SWP-003, INV-SWP-004, INV-SWP-005, INV-SWP-006, INV-VLT-002, INV-VLT-004, INV-VLT-005
- Use Case Flows: UC-005 Normal Flow, AF1-AF2, AF4, EF1-EF11
- Business Rules: BR-029, BR-030, BR-031, BR-032, BR-033, BR-034, BR-035, BR-036, BR-037

**Test Oracles:**
- Output calculation formula: amount_a = (amount × 10^6 × 10^decimals_a) / (price × 10^decimals_b)
- **CRITICAL**: price > 0 validation before calculation (prevents division by zero)
- Atomic transfers (both succeed or both fail)
- Balance conservation (tokens not created/destroyed)
- Bidirectional symmetry (A→B and B→A are inverse operations)
- Swaps are permissionless
- B→A is MORE sensitive to price = 0 than A→B
