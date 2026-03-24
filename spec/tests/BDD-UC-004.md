# BDD-UC-004: Swap Token A to B Test Scenarios

**Feature:** User Token Swap (A → B Direction)
**Use Case:** UC-004
**Requirements:** REQ-F-006, REQ-F-009, REQ-NF-001, REQ-NF-002, REQ-NF-003, REQ-NF-004, REQ-NF-012
**Invariants:** INV-SWP-001, INV-SWP-002, INV-SWP-003, INV-SWP-004, INV-SWP-005, INV-SWP-006, INV-VLT-005

## Background

```gherkin
Given a Solana test validator is running
And the SWAP program is deployed
And a market exists with price = 2500000 (1 Token A = 2.5 Token B)
And the market has decimals_a = 9, decimals_b = 6
And vault_a has balance = 5000 Token A (in base units: 5000 × 10^9)
And vault_b has balance = 12500 Token B (in base units: 12500 × 10^6)
And a user wallet "UserXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" is connected
And the user has Token A ATA with balance = 1000 Token A
And the user has Token B ATA with balance = 500 Token B
And the user's wallet has SOL balance >= 0.01 SOL
```

---

## Happy Path Scenarios

### Scenario 1: Successful Swap from Token A to Token B

```gherkin
Feature: Token Exchange A→B

Scenario: User swaps Token A for Token B at market rate
  Given the user has Token A balance = 1000
  And the market price = 2500000 (1 A = 2.5 B)
  And vault_b balance = 12500 (sufficient liquidity)
  When the user invokes swap with amount = 100, swap_a_to_b = true
  And the transaction is signed by the user
  Then the system validates amount > 0 (satisfied: 100 > 0)
  And the system validates price > 0 (satisfied: 2500000 > 0)
  And the system calculates output:
    amount_b = (100 × 2500000 × 10^6) / (10^6 × 10^9)
    amount_b = (100 × 2500000) / 10^9
    amount_b = 250000000 / 10^9
    amount_b = 250 (in Token B base units, accounting for 6 decimals)
  And the system validates vault_b.amount >= 250 (satisfied: 12500 >= 250)
  And a CPI transfers 100 Token A from user's ATA to vault_a (user signs)
  And a CPI transfers 250 Token B from vault_b to user's ATA (market PDA signs with bump)
  And the user's Token A balance decreases from 1000 to 900
  And the user's Token B balance increases from 500 to 750
  And vault_a balance increases from 5000 to 5100
  And vault_b balance decreases from 12500 to 12250
  And a SwapExecuted event is emitted with:
    | Field          | Value                                       |
    | market         | MarketPDAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX    |
    | user           | UserXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX    |
    | swap_a_to_b    | true                                        |
    | input_amount   | 100                                         |
    | output_amount  | 250                                         |
    | timestamp      | <current Unix timestamp>                    |
  And the transaction confirms on-chain
  And the UI displays: "Swap successful! You exchanged 100 Token A for 250 Token B"
```

**Traceability:** REQ-F-006 (AC1-AC15), INV-SWP-003, INV-VLT-005, UC-004 Normal Flow

---

### Scenario 2: Swap with Maximum Input Amount

```gherkin
Scenario: User swaps entire Token A balance
  Given the user has Token A balance = 1000
  When the user clicks "Max" button in the UI
  Then the UI auto-fills amount = 1000
  And the UI calculates expected output = 2500 Token B
  And the user confirms the swap
  Then 1000 Token A is transferred from user to vault_a
  And 2500 Token B is transferred from vault_b to user
  And the user's Token A balance becomes 0
  And the user's Token B balance increases by 2500
```

**Traceability:** UC-004 AF1

---

### Scenario 3: Swap with 1:1 Exchange Rate

```gherkin
Scenario: Equal value swap (price = 1000000)
  Given the market price = 1000000 (1 Token A = 1 Token B)
  And both tokens have same decimals (e.g., 6)
  When the user swaps 100 Token A
  Then the output is exactly 100 Token B
  And amount_b = (100 × 1000000 × 10^6) / (10^6 × 10^6) = 100
  And the swap executes at perfect 1:1 ratio
```

**Traceability:** INV-SWP-003

---

## Alternative Flow Scenarios

### Scenario 4: Swap via CLI Script

```gherkin
Scenario: Automated swap execution from command-line
  Given a user script with wallet keypair and token ATAs
  When the script calls program.methods.swap(100, true).accounts({market, user, user_token_a, user_token_b, vault_a, vault_b, token_program}).signers([user]).rpc()
  Then the transaction is submitted programmatically
  And the script waits for confirmation
  And the script queries updated balances
  And the script logs: "Swapped 100 Token A for 250 Token B"
```

**Traceability:** UC-004 AF3

---

### Scenario 5: Swap with Price Monitoring Alert

```gherkin
Scenario: User executes swap when target price is reached
  Given the user sets price alert: "Notify when 1 Token A >= 2.8 Token B"
  And the current price = 2500000 (2.5)
  When the administrator updates price to 2800000 (2.8)
  Then the UI displays notification: "Target price reached!"
  And the user proceeds to swap at the favorable rate
  And the swap executes at price = 2800000
```

**Traceability:** UC-004 AF4

---

## Exception Flow Scenarios

### Scenario 6: Insufficient Token A Balance

```gherkin
Scenario: User attempts to swap more Token A than owned
  Given the user's Token A balance is 50
  When the user attempts to swap amount = 100
  Then the client-side validation fails
  And the UI displays error: "Insufficient Token A balance. You have 50 but tried to swap 100."
  And the submit button remains disabled
  And if validation is bypassed:
    - The Token Program CPI fails with "InsufficientFunds"
    - The transaction reverts atomically
    - The UI displays: "Transaction failed: Insufficient Token A in your wallet"
  And no balances change
```

**Traceability:** UC-004 EF1

---

### Scenario 7: Insufficient Liquidity in Vault B

```gherkin
Scenario: Vault B lacks tokens to fulfill swap output
  Given vault_b balance = 200 Token B
  When the user swaps 100 Token A (expecting 250 Token B output)
  Then the system calculates amount_b = 250
  And the system validates vault_b.amount >= 250
  And the validation fails (200 < 250)
  And the transaction fails with "InsufficientLiquidity" error
  And the UI displays: "Insufficient liquidity in Vault B. Requested 250 Token B, but only 200 available. Try a smaller amount."
  And the submit button is disabled
  And no transfers occur
```

**Traceability:** REQ-NF-003, INV-SWP-004, INV-VLT-004, UC-004 EF2

---

### Scenario 8: Zero Amount Input

```gherkin
Scenario: User submits swap with amount = 0
  Given the user inputs amount = 0
  When the transaction is submitted
  Then the on-chain validation fails
  And the error is "InvalidAmount: amount must be greater than 0"
  And the UI displays: "Amount must be greater than 0"
  And no transfers are executed
```

**Traceability:** REQ-F-006 (AC11), REQ-NF-004, INV-SWP-001, UC-004 EF3

---

### Scenario 9: Price Not Set (price = 0)

```gherkin
Scenario: Market price is zero (not configured)
  Given the market was initialized with price = 0
  And the administrator has not yet called set_price
  When the user attempts to swap Token A to Token B
  Then the system validates price > 0
  And the validation fails (price = 0)
  And the transaction reverts with "PriceNotSet" error
  And the UI displays: "Swap unavailable: Exchange rate not set. Contact market administrator."
  And the user cannot proceed
```

**Traceability:** REQ-F-006 (AC12), REQ-NF-002, INV-SWP-005, UC-004 EF4

---

### Scenario 10: Arithmetic Overflow in Calculation

```gherkin
Scenario: Very large swap amount causes calculation overflow
  Given the user inputs amount = 18446744073709551000 (near u64::MAX)
  And the market price = 10000000
  When the system calculates amount_b = amount × price × 10^decimals_b
  Then the intermediate multiplication (amount × price) overflows u64
  And checked_mul returns None
  And the transaction fails with "ArithmeticOverflow" error
  And the UI displays: "Swap calculation overflow. Please reduce the swap amount."
```

**Traceability:** REQ-NF-001, INV-SWP-006, UC-004 EF5

---

### Scenario 11: User Token Account Not Found

```gherkin
Scenario: User's Token A ATA does not exist
  Given the user's wallet has no Token A Associated Token Account
  When the user attempts to swap
  Then the Token Program CPI fails with "AccountNotFound"
  And the transaction reverts
  And the UI displays: "Token A account not found. Please create an Associated Token Account first."
  And the UI suggests: "Initialize Token A account by receiving a small transfer"
```

**Traceability:** UC-004 EF6

---

### Scenario 12: Vault PDA Authority Mismatch (Critical Error)

```gherkin
Scenario: Vault authority does not match market PDA
  Given vault_b is corrupted with authority != market PDA
  When the system attempts to transfer from vault_b using market PDA signer
  Then the Token Program CPI fails with "InvalidAuthority" or "OwnerMismatch"
  And the transaction reverts (the user→vault transfer is also rolled back)
  And the UI displays: "Critical error: Vault authority mismatch. Contact support."
  And this indicates severe system integrity issue
```

**Traceability:** INV-VLT-002, UC-004 EF7

---

### Scenario 13: RPC Timeout

```gherkin
Scenario: Transaction submitted but confirmation times out
  Given the user submits swap transaction with signature "5XyZTxSigXXXXXXXXXXXXXXXXXXXX"
  When the RPC node does not respond within 30 seconds
  Then the UI displays: "Transaction timeout. Status unknown. Signature: 5XyZTxSigXXXXXXXXXXXXXXXXXXXX"
  And the UI provides link to Solana Explorer
  And the user can manually verify if swap executed by checking balances
```

**Traceability:** UC-004 EF8

---

### Scenario 14: User Rejects Transaction in Wallet

```gherkin
Scenario: User cancels transaction approval
  Given Phantom wallet displays approval prompt
  When the user clicks "Reject" or closes the popup
  Then the wallet returns "UserRejectedRequest" error
  And the UI displays: "Transaction cancelled by user"
  And no transaction is submitted
  And the user can retry
```

**Traceability:** UC-004 EF9

---

## Negative Test Scenarios

### Scenario 15: Swap Negative Amount (Type System Prevention)

```gherkin
Scenario: Attempt to swap negative amount (impossible due to u64)
  Given the user tries to input amount = -100
  When the value is processed
  Then the type system rejects negative u64 values
  And this scenario is prevented by type safety
```

**Traceability:** INV-SWP-001

---

### Scenario 16: Calculate Output with Mismatched Decimals

```gherkin
Scenario: Verify correct output for different decimal precision
  Given Token A has 9 decimals, Token B has 6 decimals
  And price = 2500000 (1 A = 2.5 B)
  When the user swaps 1 Token A (1 × 10^9 base units)
  Then the calculation is:
    amount_b = (1×10^9 × 2500000 × 10^6) / (10^6 × 10^9)
    amount_b = 2500000×10^6 / 10^6
    amount_b = 2500000 = 2.5 Token B (in 6 decimal base units)
  And the output correctly accounts for decimal difference
```

**Traceability:** REQ-F-006 (AC3), INV-SWP-003

---

### Scenario 17: Permissionless Swap (Authorization Not Required)

```gherkin
Scenario: Any user can execute swap (no admin-only restriction)
  Given User A is not the market authority
  And User B is also not the market authority
  When User A executes a swap
  Then the transaction succeeds (no authorization check)
  And User B can also execute a swap
  And swaps are permissionless (REQ-F-009)
```

**Traceability:** REQ-F-009 (AC15), UC-004 Normal Flow

---

## Summary

**Total Scenarios:** 17
- Happy Path: 3
- Alternative Flows: 2
- Exception Flows: 9
- Negative Tests: 3

**Coverage:**
- Requirements: REQ-F-006, REQ-F-009, REQ-NF-001, REQ-NF-002, REQ-NF-003, REQ-NF-004, REQ-NF-012
- Invariants: INV-SWP-001, INV-SWP-002, INV-SWP-003, INV-SWP-004, INV-SWP-005, INV-SWP-006, INV-VLT-002, INV-VLT-004, INV-VLT-005
- Use Case Flows: UC-004 Normal Flow, AF1, AF3-AF4, EF1-EF9
- Business Rules: BR-020, BR-021, BR-022, BR-023, BR-024, BR-025, BR-026, BR-027, BR-028

**Test Oracles:**
- Output calculation formula: amount_b = (amount × price × 10^decimals_b) / (10^6 × 10^decimals_a)
- Atomic transfers (both succeed or both fail)
- Balance conservation (tokens not created/destroyed)
- Swaps are permissionless (any user can execute)
- Checked arithmetic prevents overflow
