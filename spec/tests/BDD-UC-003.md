# BDD-UC-003: Add Liquidity Test Scenarios

**Feature:** Administrator Liquidity Provisioning
**Use Case:** UC-003
**Requirements:** REQ-F-003, REQ-F-004, REQ-F-005, REQ-F-008, REQ-NF-004, REQ-NF-006, REQ-NF-011, REQ-NF-016
**Invariants:** INV-VLT-001, INV-VLT-002, INV-VLT-003, INV-VLT-004, INV-AUTH-001, INV-EVT-001

## Background

```gherkin
Given a Solana test validator is running
And the SWAP program is deployed
And a market exists with authority = "AdminXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
And vault_a exists at PDA "VaultA_PDAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" with mint = Token A, balance = 1000
And vault_b exists at PDA "VaultB_PDAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" with mint = Token B, balance = 2500
And the administrator has Token A ATA with balance = 5000
And the administrator has Token B ATA with balance = 10000
And the administrator's wallet has SOL balance >= 0.01 SOL
And the administrator is connected via Phantom wallet
```

---

## Happy Path Scenarios

### Scenario 1: Add Liquidity to Both Vaults Atomically

```gherkin
Feature: Liquidity Management

Scenario: Administrator deposits tokens to both vaults in single transaction
  Given the administrator wants to add 1500 Token A and 3000 Token B
  And the administrator's Token A balance (5000) >= 1500
  And the administrator's Token B balance (10000) >= 3000
  When the administrator invokes add_liquidity with amount_a = 1500, amount_b = 3000
  And the transaction is signed by the administrator
  Then a CPI transfer moves 1500 Token A from administrator's ATA to vault_a
  And a CPI transfer moves 3000 Token B from administrator's ATA to vault_b
  And the administrator's Token A balance decreases from 5000 to 3500
  And the administrator's Token B balance decreases from 10000 to 7000
  And vault_a balance increases from 1000 to 2500
  And vault_b balance increases from 2500 to 5500
  And both transfers succeed atomically (all-or-nothing)
  And a LiquidityAdded event is emitted with:
    | Field     | Value                                       |
    | market    | MarketPDAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX    |
    | amount_a  | 1500                                        |
    | amount_b  | 3000                                        |
    | timestamp | <current Unix timestamp>                    |
  And the transaction confirms on-chain
  And the UI displays: "Liquidity added successfully"
```

**Traceability:** REQ-F-005 (AC3.1-AC3.5), REQ-NF-016, INV-VLT-005, UC-003 Normal Flow

---

### Scenario 2: Add Token A Only

```gherkin
Scenario: Administrator adds liquidity to vault_a exclusively
  Given the administrator wants to add only Token A liquidity
  When the administrator invokes add_liquidity with amount_a = 2000, amount_b = 0
  Then only the Token A transfer is executed
  And 2000 Token A is moved from administrator's ATA to vault_a
  And vault_a balance increases from 1000 to 3000
  And vault_b balance remains 2500 (unchanged)
  And the administrator's Token A balance decreases by 2000
  And the administrator's Token B balance remains unchanged
  And a LiquidityAdded event is emitted with amount_a = 2000, amount_b = 0
```

**Traceability:** REQ-F-003 (AC1.1-AC1.6), UC-003 AF1

---

### Scenario 3: Add Token B Only

```gherkin
Scenario: Administrator adds liquidity to vault_b exclusively
  Given the administrator wants to add only Token B liquidity
  When the administrator invokes add_liquidity with amount_a = 0, amount_b = 5000
  Then only the Token B transfer is executed
  And 5000 Token B is moved from administrator's ATA to vault_b
  And vault_b balance increases from 2500 to 7500
  And vault_a balance remains 1000 (unchanged)
  And the administrator's Token B balance decreases by 5000
  And the administrator's Token A balance remains unchanged
  And a LiquidityAdded event is emitted with amount_a = 0, amount_b = 5000
```

**Traceability:** REQ-F-004 (AC2.1-AC2.6), UC-003 AF2

---

## Alternative Flow Scenarios

### Scenario 4: Add Maximum Available Balance

```gherkin
Scenario: Administrator deposits entire token balance into vaults
  Given the administrator has Token A balance = 5000
  And the administrator has Token B balance = 10000
  When the administrator clicks "Max" for both Token A and Token B fields
  Then the UI auto-fills amount_a = 5000, amount_b = 10000
  And the administrator confirms the transaction
  Then 5000 Token A is transferred to vault_a
  And 10000 Token B is transferred to vault_b
  And the administrator's Token A balance becomes 0
  And the administrator's Token B balance becomes 0
  And vault_a balance increases by 5000
  And vault_b balance increases by 10000
```

**Traceability:** UC-003 AF3

---

### Scenario 5: Add Liquidity via CLI Script

```gherkin
Scenario: Automated liquidity provisioning from command-line
  Given a Node.js script with market PDA, authority keypair, and token ATAs
  When the script calls program.methods.addLiquidity(1000, 2000).accounts({market, authority, authority_token_a, authority_token_b, vault_a, vault_b, token_program}).signers([authority]).rpc()
  Then the transaction is submitted programmatically
  And the script waits for confirmation
  And the script queries vault balances after confirmation
  And the script logs: "Liquidity added: 1000 Token A, 2000 Token B"
  And the script verifies vault_a.amount increased by 1000
  And the script verifies vault_b.amount increased by 2000
```

**Traceability:** UC-003 AF4

---

### Scenario 6: Recurring Liquidity Top-Up (Scheduled)

```gherkin
Scenario: Daily automated script maintains minimum vault levels
  Given a cron job runs daily at midnight
  And the script queries vault_a balance
  And vault_a balance = 800 (below threshold of 1000)
  When the script calculates top_up_a = 1000 - 800 = 200
  Then the script invokes add_liquidity(200, 0)
  And vault_a balance is restored to 1000
  And this ensures continuous swap availability
```

**Traceability:** UC-003 AF5

---

## Exception Flow Scenarios

### Scenario 7: Insufficient Token A Balance

```gherkin
Scenario: Administrator attempts to deposit more Token A than owned
  Given the administrator's Token A balance is 1000
  When the administrator attempts to invoke add_liquidity with amount_a = 1500, amount_b = 0
  Then the client-side validation fails (if implemented)
  And the UI displays error: "Insufficient Token A balance. You have 1000 but tried to deposit 1500."
  And the submit button remains disabled
  And if validation is bypassed and transaction is submitted:
    - The Token Program CPI fails with "InsufficientFunds"
    - The transaction reverts atomically
    - The UI displays: "Transaction failed: Insufficient Token A in your wallet"
  And vault_a balance remains unchanged
  And administrator's balance remains unchanged
```

**Traceability:** UC-003 EF1

---

### Scenario 8: Insufficient Token B Balance

```gherkin
Scenario: Administrator attempts to deposit more Token B than owned
  Given the administrator's Token B balance is 2000
  When the administrator attempts to invoke add_liquidity with amount_a = 0, amount_b = 3000
  Then the client-side validation fails
  And the UI displays error: "Insufficient Token B balance. You have 2000 but tried to deposit 3000."
  And the submit button is disabled
  And no transaction is submitted
```

**Traceability:** UC-003 EF2

---

### Scenario 9: Both Amounts Are Zero (Invalid Input)

```gherkin
Scenario: Administrator submits add_liquidity with both amounts = 0
  Given the administrator inputs amount_a = 0, amount_b = 0
  When the transaction is submitted
  Then the on-chain validation fails
  And the error is "InvalidAmount: at least one amount must be greater than 0"
  And the UI displays: "You must specify at least one token amount to deposit."
  And no transfers are executed
  And vault balances remain unchanged
```

**Traceability:** REQ-F-005 (AC4.1-AC4.4), REQ-NF-004, UC-003 EF3

---

### Scenario 10: Unauthorized Access Attempt

```gherkin
Scenario: Non-authority user tries to add liquidity
  Given the market authority is "AdminXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  And an unauthorized user "MaliciousUserXXXXXXXXXXXXXXXXXXXXXXXXXXX" attempts to add liquidity
  When the unauthorized user invokes add_liquidity with amount_a = 1000, amount_b = 1000
  And the transaction is signed by "MaliciousUserXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  Then Anchor's signer constraint fails
  And the constraint `authority.key() == market.authority` evaluates to false
  And the transaction is rejected before execution
  And the error is "Unauthorized: Only the market authority can add liquidity. Current authority: AdminXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX. Your address: MaliciousUserXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  And no tokens are transferred
  And vault balances remain unchanged
```

**Traceability:** REQ-F-008 (AC5.1-AC5.4), REQ-NF-006, INV-AUTH-001, UC-003 EF4

---

### Scenario 11: Token Account Not Found (ATA Missing)

```gherkin
Scenario: Administrator's Token A ATA does not exist
  Given the administrator's wallet has no Token A Associated Token Account
  When the administrator attempts to add liquidity with amount_a = 1000
  Then the Token Program CPI fails with "AccountNotFound"
  And the transaction reverts
  And the UI displays: "Token A account not found for your wallet. Please create an Associated Token Account first."
  And the UI suggests: "Initialize Token A account by receiving a small transfer or clicking 'Create Account'"
  And the administrator must create the ATA before retrying
```

**Traceability:** UC-003 EF5

---

### Scenario 12: Partial Transfer Failure (Atomicity Test)

```gherkin
Scenario: First transfer succeeds but second fails, entire transaction reverts
  Given the administrator invokes add_liquidity with amount_a = 1500, amount_b = 3000
  And the Token A transfer (1500) succeeds
  But the Token B transfer (3000) fails due to vault_b PDA authority mismatch
  When the transaction is processed
  Then Solana's atomic transaction model reverts all state changes
  And the Token A transfer is rolled back (1500 returned to administrator)
  And the administrator's Token A balance remains 5000 (unchanged)
  And vault_a balance remains 1000 (unchanged)
  And vault_b balance remains 2500 (unchanged)
  And the error from the second transfer is propagated to the UI
  And the UI displays: "Transaction failed: Token B transfer error. No tokens were moved."
```

**Traceability:** REQ-F-005 (AC3.4-AC3.5), REQ-NF-016, INV-VLT-005, INV-GLOBAL-001, UC-003 EF6

---

### Scenario 13: Insufficient SOL for Transaction Fee

```gherkin
Scenario: Administrator wallet lacks SOL for fees
  Given the administrator's SOL balance is 0.000002 SOL
  And the transaction fee is approximately 0.000005 SOL
  When the administrator signs the add_liquidity transaction
  Then the transaction simulation fails
  And the error is "Insufficient SOL for transaction fee"
  And the UI displays: "Insufficient SOL for transaction fee. Please add SOL to your wallet."
  And the transaction is NOT submitted
  And no tokens are transferred
```

**Traceability:** UC-003 EF7

---

### Scenario 14: Vault PDA Not Initialized (Critical Error)

```gherkin
Scenario: Vault account does not exist (incomplete market initialization)
  Given the market was initialized but vault_a PDA creation failed
  When the administrator attempts to add liquidity
  Then the Token Program CPI to vault_a fails with "InvalidAccountData" or "AccountNotFound"
  And the transaction reverts
  And the UI displays: "Market vault not found. The market may not be properly initialized."
  And the UI suggests: "Contact support or re-initialize the market"
  And this indicates a critical system state error
```

**Traceability:** UC-003 EF8

---

### Scenario 15: Amount Exceeds u64::MAX (Overflow)

```gherkin
Scenario: Administrator inputs extremely large amount from script
  Given the administrator's script mistakenly calculates amount_a = 18446744073709551616 (> u64::MAX)
  When the value is passed to the add_liquidity instruction
  Then the client-side parsing fails
  And the error is "Amount too large. Maximum value is 18446744073709551615."
  And the transaction cannot be constructed
  And alternatively, if checked arithmetic is used on-chain:
    - The arithmetic overflow is caught
    - The transaction fails with "ArithmeticOverflow"
```

**Traceability:** REQ-NF-001, UC-003 EF9

---

## Negative Test Scenarios

### Scenario 16: Add Negative Amount (Type System Prevention)

```gherkin
Scenario: Attempt to add negative liquidity (impossible due to u64)
  Given the administrator tries to set amount_a = -1000
  When the value is processed by Rust/TypeScript
  Then the Rust compiler rejects negative u64 literals at compile time
  Or the TypeScript client throws TypeError before transaction creation
  And this scenario is prevented by type safety
```

**Traceability:** REQ-NF-004, INV-VLT-001

---

### Scenario 17: Add Liquidity to Wrong Market

```gherkin
Scenario: Transaction references incorrect vault PDAs
  Given Market A has vault_a at "VaultA_Market_A_PDAXXXXXXXXXXXXXX"
  And Market B has vault_a at "VaultA_Market_B_PDAXXXXXXXXXXXXXX"
  When the administrator intends to add liquidity to Market A
  But the transaction mistakenly references Market B's vaults
  Then the account constraint checks fail (seeds mismatch)
  Or tokens are added to the wrong market (if seeds happen to pass)
  And this highlights the importance of correct PDA derivation
```

**Traceability:** Account validation, INV-PDA-001

---

## Summary

**Total Scenarios:** 17
- Happy Path: 3
- Alternative Flows: 3
- Exception Flows: 9
- Negative Tests: 2

**Coverage:**
- Requirements: REQ-F-003, REQ-F-004, REQ-F-005, REQ-F-008, REQ-NF-001, REQ-NF-004, REQ-NF-006, REQ-NF-011, REQ-NF-016
- Invariants: INV-VLT-001, INV-VLT-002, INV-VLT-003, INV-VLT-004, INV-VLT-005, INV-AUTH-001, INV-EVT-001, INV-GLOBAL-001
- Use Case Flows: UC-003 Normal Flow, AF1-AF5, EF1-EF9
- Business Rules: BR-012, BR-013, BR-014, BR-015, BR-016, BR-017, BR-018, BR-019

**Test Oracles:**
- Only market authority can add liquidity (authorization)
- At least one amount must be > 0 (input validation)
- Token transfers are atomic (all succeed or all fail)
- Vault balances accurately reflect transferred amounts
- LiquidityAdded events accurately record amounts
