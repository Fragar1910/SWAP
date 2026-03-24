# Domain Invariants and Business Rules

> **Domain:** Solana Token SWAP - Decentralized Exchange
> **Version:** 1.0
> **Last updated:** 2026-03-22

## Purpose

This document expresses business rules and constraints as **formal invariants** using mathematical logic. Invariants are properties that must hold true at all times during system operation. They serve as:

- **Correctness Criteria**: Specifications for implementation validation
- **Test Oracle**: Expected properties for automated test assertions
- **Audit Checklist**: Security review criteria
- **Documentation**: Precise, unambiguous statement of business rules

**Notation:**
- **Quantifiers**: `∀` (for all), `∃` (there exists), `∃!` (there exists exactly one)
- **Logical Operators**: `∧` (and), `∨` (or), `¬` (not), `⇒` (implies), `⇔` (if and only if)
- **Predicates**: `P(x)` is true or false for entity `x`
- **Relations**: `=`, `≠`, `<`, `>`, `≤`, `≥`, `∈` (element of)

---

## Invariant Catalog

| ID | Category | Entity | Priority | Traceability |
|----|----------|--------|----------|--------------|
| INV-MKT-001 | Uniqueness | Market | Must | REQ-F-001, REQ-NF-017 |
| INV-MKT-002 | Immutability | Market | Must | REQ-F-008 |
| INV-MKT-003 | Immutability | Market | Must | REQ-F-001 |
| INV-MKT-004 | Non-negativity | Market | Must | REQ-F-002 |
| INV-MKT-005 | Range | Market | Must | REQ-F-010 |
| INV-VLT-001 | Non-negativity | Vault | Must | REQ-NF-003 |
| INV-VLT-002 | Authority | Vault | Must | REQ-F-011, REQ-NF-005 |
| INV-VLT-003 | Single Mint | Vault | Must | REQ-F-001 |
| INV-VLT-004 | Liquidity | Vault | Must | REQ-NF-003 |
| INV-VLT-005 | Balance Conservation | Vault | Must | REQ-NF-016 |
| INV-SWP-001 | Positive Amounts | Swap | Must | REQ-NF-004 |
| INV-SWP-002 | Atomicity | Swap | Must | REQ-NF-016 |
| INV-SWP-003 | Calculation Correctness | Swap | Must | REQ-F-006, REQ-F-007 |
| INV-SWP-004 | Sufficient Liquidity | Swap | Must | REQ-NF-003 |
| INV-SWP-005 | Price Validity | Swap | Must | REQ-NF-002 |
| INV-SWP-006 | Overflow Protection | Swap | Must | REQ-NF-001 |
| INV-AUTH-001 | Signature | Authority | Must | REQ-F-008, REQ-NF-006 |
| INV-AUTH-002 | Immutability | Authority | Must | REQ-F-001 |
| INV-PDA-001 | Determinism | PDA | Must | REQ-F-011 |
| INV-PDA-002 | Ownership | PDA | Must | REQ-NF-005 |
| INV-PDA-003 | Uniqueness | PDA | Must | REQ-NF-017 |
| INV-EVT-001 | Emission | Event | Should | REQ-NF-009–012 |
| INV-EVT-002 | Accuracy | Event | Must | REQ-NF-012 |
| INV-GLOBAL-001 | No State Leaks | Global | Must | REQ-NF-016 |

---

## Market Invariants

### INV-MKT-001: Market PDA Uniqueness

**Category:** Uniqueness

**Formal Statement:**
```
∀ m1, m2 ∈ Markets:
  (m1.token_mint_a = m2.token_mint_a ∧ m1.token_mint_b = m2.token_mint_b)
  ⇒ m1.pda = m2.pda
```

**English:**
For any two markets `m1` and `m2`, if they reference the same token mint pair, then they must have the same PDA address (i.e., they are the same market).

**Rationale:**
PDA derivation is deterministic. The same seeds always produce the same address. This prevents duplicate markets for the same token pair.

**Enforcement:**
- Anchor's `init` constraint checks if account already exists
- `find_program_address` guarantees deterministic derivation

**Violation Detection:**
Attempt to initialize market with duplicate token pair → Transaction fails with "Account already exists"

**Test Assertion:**
```rust
#[tokio::test]
async fn test_market_uniqueness() {
    // Initialize market once
    initialize_market(token_a, token_b).await.unwrap();

    // Attempt to initialize again with same pair
    let result = initialize_market(token_a, token_b).await;
    assert!(result.is_err()); // Must fail
}
```

**Traceability:** REQ-F-001, REQ-NF-017

---

### INV-MKT-002: Authority Immutability

**Category:** Immutability

**Formal Statement:**
```
∀ m ∈ Markets, ∀ t1, t2 ∈ Time: t1 < t2 ⇒
  m.authority(t1) = m.authority(t2)
```

**English:**
For any market `m` and any two time points `t1` and `t2` where `t1` is before `t2`, the market's authority at `t1` equals the authority at `t2`. In other words, the authority never changes.

**Rationale:**
Administrator identity is set at market creation and cannot be transferred. This prevents unauthorized takeover.

**Enforcement:**
- `authority` field is not marked as `mut` in any instruction context
- No instruction exists to update `authority`

**Violation Detection:**
Attempt to modify `authority` → Compilation error (no mutable reference exists)

**Test Assertion:**
```rust
#[tokio::test]
async fn test_authority_immutability() {
    let market = initialize_market(token_a, token_b).await.unwrap();
    let original_authority = market.authority;

    // Perform operations
    set_price(&market, 1_500_000).await.unwrap();
    add_liquidity(&market, 1000, 1000).await.unwrap();

    // Verify authority unchanged
    let market_after = fetch_market_account().await;
    assert_eq!(market_after.authority, original_authority);
}
```

**Traceability:** REQ-F-008

---

### INV-MKT-003: Token Mint Immutability

**Category:** Immutability

**Formal Statement:**
```
∀ m ∈ Markets, ∀ t1, t2 ∈ Time: t1 < t2 ⇒
  (m.token_mint_a(t1) = m.token_mint_a(t2)) ∧
  (m.token_mint_b(t1) = m.token_mint_b(t2))
```

**English:**
Token mint addresses never change after market creation.

**Rationale:**
Changing token mints would break vault associations and invalidate the market's identity.

**Enforcement:**
- `token_mint_a` and `token_mint_b` fields not mutable
- No instruction exists to update these fields

**Violation Detection:**
Attempt to modify mint fields → Compilation error

**Test Assertion:**
```rust
#[tokio::test]
async fn test_mint_immutability() {
    let market = initialize_market(token_a, token_b).await.unwrap();

    // Perform operations
    swap_a_to_b(&market, 100).await.unwrap();

    // Verify mints unchanged
    let market_after = fetch_market_account().await;
    assert_eq!(market_after.token_mint_a, token_a);
    assert_eq!(market_after.token_mint_b, token_b);
}
```

**Traceability:** REQ-F-001

---

### INV-MKT-004: Price Non-Negativity

**Category:** Non-negativity

**Formal Statement:**
```
∀ m ∈ Markets, ∀ t ∈ Time:
  m.price(t) ≥ 0
```

**English:**
The exchange rate is always non-negative (u64 type guarantees this, but 0 is a valid initial state).

**Rationale:**
Negative prices are nonsensical. Price = 0 represents "not yet set."

**Enforcement:**
- `price` is u64 type (cannot be negative)
- Initial value is 0 (before `set_price` is called)

**Violation Detection:**
Impossible due to type system (u64 cannot be negative)

**Additional Constraint (Price Set for Swaps):**
See INV-SWP-005

**Traceability:** REQ-F-002

---

### INV-MKT-005: Decimals Range

**Category:** Range Constraint

**Formal Statement:**
```
∀ m ∈ Markets:
  (0 ≤ m.decimals_a ≤ 18) ∧ (0 ≤ m.decimals_b ≤ 18)
```

**English:**
Decimal values for both tokens are in the range [0, 18] inclusive.

**Rationale:**
SPL Token standard supports decimals from 0 to 18 (though most tokens use 6 or 9).

**Enforcement:**
- Decimals are read from mint metadata during initialization
- Mint metadata is validated by SPL Token Program

**Violation Detection:**
Invalid mint (decimals > 18) → SPL Token Program rejects mint creation (cannot occur)

**Test Assertion:**
```rust
#[tokio::test]
async fn test_decimals_range() {
    let market = initialize_market(token_a, token_b).await.unwrap();

    assert!(market.decimals_a <= 18);
    assert!(market.decimals_b <= 18);
}
```

**Traceability:** REQ-F-010

---

### INV-MKT-006: Token Mint Distinctness

**Category:** Market Invariant

**Formal Statement:**
```
∀ market ∈ Markets: market.token_mint_a ≠ market.token_mint_b
```

**English:**
All markets must have distinct token mints. A market cannot swap a token with itself.

**Rationale:**
Prevents nonsensical markets (USDC/USDC) and undefined swap behavior (output = input × price / price = input).

**Enforcement:**
Initialization-time validation

**Violation Detection:**
Attempt to initialize market with same mint for both sides → Transaction fails with `SameTokenSwapDisallowed` error

**Test Assertion:**
```rust
#[test]
fn test_same_token_market_rejected() {
    let result = initialize_market_ix(usdc_mint, usdc_mint);
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), ErrorCode::SameTokenSwapDisallowed);
}
```

**Traceability:** REQ-F-001, BR-MKT-004

---

## Vault Invariants

### INV-VLT-001: Non-Negative Balance

**Category:** Non-negativity

**Formal Statement:**
```
∀ v ∈ Vaults, ∀ t ∈ Time:
  v.balance(t) ≥ 0
```

**English:**
Vault token balance is always non-negative.

**Rationale:**
Negative balances are impossible in blockchain token systems. SPL Token Program enforces this.

**Enforcement:**
- SPL Token Program prevents transfers that would result in negative balance
- Checked at CPI call (transfer fails if insufficient balance)

**Violation Detection:**
Attempt to transfer more than balance → CPI fails with "InsufficientFunds" error

**Test Assertion:**
```rust
#[tokio::test]
async fn test_vault_non_negative() {
    let vault = fetch_vault_account().await;
    assert!(vault.amount >= 0); // Always true for u64, but conceptually important
}
```

**Traceability:** REQ-NF-003

---

### INV-VLT-002: PDA Authority Ownership

**Category:** Authority

**Formal Statement:**
```
∀ v ∈ Vaults, ∃! m ∈ Markets:
  (v.authority = m.pda) ∧
  (v.pda = derive_pda(seeds, program_id))
```

**English:**
Every vault is controlled by exactly one market PDA, and the vault's PDA is correctly derived.

**Rationale:**
Vaults must be controlled by the swap program (via market PDA) to enable CPI transfers.

**Enforcement:**
- Vault creation uses `seeds` and `bump` constraints in Anchor
- Authority is set to market PDA during initialization

**Violation Detection:**
Incorrect vault authority → CPI transfer fails (cannot sign with non-PDA authority)

**Test Assertion:**
```rust
#[tokio::test]
async fn test_vault_authority() {
    let market = initialize_market(token_a, token_b).await.unwrap();
    let vault_a = fetch_vault_a_account(&market).await;

    assert_eq!(vault_a.authority, market.pda);
}
```

**Traceability:** REQ-F-011, REQ-NF-005

---

### INV-VLT-003: Single Mint Constraint

**Category:** Single Mint

**Formal Statement:**
```
∀ v ∈ Vaults:
  v.mint = v.associated_token_mint ∧
  (v = vault_a ⇒ v.mint = m.token_mint_a) ∧
  (v = vault_b ⇒ v.mint = m.token_mint_b)
```

**English:**
Each vault stores tokens of exactly one mint, matching the market's corresponding token mint.

**Rationale:**
Vaults must not mix tokens. Vault A holds only Token A; Vault B holds only Token B.

**Enforcement:**
- Vault is created with specific mint during initialization
- SPL Token Program enforces mint immutability for token accounts

**Violation Detection:**
Attempt to transfer wrong token type to vault → CPI fails with "MintMismatch"

**Test Assertion:**
```rust
#[tokio::test]
async fn test_vault_mint_constraint() {
    let market = initialize_market(token_a, token_b).await.unwrap();
    let vault_a = fetch_vault_a_account(&market).await;
    let vault_b = fetch_vault_b_account(&market).await;

    assert_eq!(vault_a.mint, token_a);
    assert_eq!(vault_b.mint, token_b);
}
```

**Traceability:** REQ-F-001

---

### INV-VLT-004: Sufficient Liquidity for Swaps

**Category:** Liquidity

**Formal Statement:**
```
∀ swap ∈ SwapTransactions:
  let output_vault = if swap.direction = AtoB then vault_b else vault_a;
  let output_amount = calculate_output(swap.input_amount, swap.direction);

  swap.can_execute ⇒ output_vault.balance ≥ output_amount
```

**English:**
A swap can execute only if the output vault has sufficient balance to fulfill the calculated output amount.

**Rationale:**
Cannot transfer tokens that don't exist. This prevents swap failures at CPI level.

**Enforcement:**
- Pre-check in swap instruction (before CPI)
- Backup enforcement: SPL Token Program rejects insufficient balance transfers

**Violation Detection:**
Swap with insufficient liquidity → Instruction fails with "InsufficientLiquidity" error

**Test Assertion:**
```rust
#[tokio::test]
async fn test_insufficient_liquidity() {
    let market = initialize_market(token_a, token_b).await.unwrap();
    // Add only 100 tokens to vault_b
    add_liquidity(&market, 0, 100).await.unwrap();

    // Attempt swap requiring 200 tokens output
    let result = swap_a_to_b(&market, 1000).await;
    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), SwapError::InsufficientLiquidity));
}
```

**Traceability:** REQ-NF-003

---

### INV-VLT-005: Balance Conservation

**Category:** Conservation Law

**Formal Statement:**
```
∀ swap ∈ SwapTransactions, swap.state = CONFIRMED:
  let Δvault_a = vault_a.balance(after) - vault_a.balance(before);
  let Δvault_b = vault_b.balance(after) - vault_b.balance(before);
  let Δuser_a = user_token_a.balance(after) - user_token_a.balance(before);
  let Δuser_b = user_token_b.balance(after) - user_token_b.balance(before);

  (swap.direction = AtoB) ⇒
    (Δvault_a = +swap.input_amount ∧ Δuser_a = -swap.input_amount ∧
     Δvault_b = -swap.output_amount ∧ Δuser_b = +swap.output_amount)

  ∧

  (swap.direction = BtoA) ⇒
    (Δvault_b = +swap.input_amount ∧ Δuser_b = -swap.input_amount ∧
     Δvault_a = -swap.output_amount ∧ Δuser_a = +swap.output_amount)
```

**English:**
For a confirmed swap:
- Tokens leaving user account = tokens entering vault
- Tokens leaving vault = tokens entering user account
- No tokens are created or destroyed

**Rationale:**
Conservation of value: swaps are zero-sum transfers.

**Enforcement:**
- SPL Token Program enforces balance updates
- Solana transaction atomicity guarantees consistency

**Violation Detection:**
Balance mismatch → Indicates critical bug (impossible under correct SPL Token Program operation)

**Test Assertion:**
```rust
#[tokio::test]
async fn test_balance_conservation() {
    let user_a_before = get_token_balance(user, token_a).await;
    let vault_a_before = get_token_balance(vault_a, token_a).await;
    let user_b_before = get_token_balance(user, token_b).await;
    let vault_b_before = get_token_balance(vault_b, token_b).await;

    let input_amount = 100;
    let output_amount = swap_a_to_b(&market, input_amount).await.unwrap();

    let user_a_after = get_token_balance(user, token_a).await;
    let vault_a_after = get_token_balance(vault_a, token_a).await;
    let user_b_after = get_token_balance(user, token_b).await;
    let vault_b_after = get_token_balance(vault_b, token_b).await;

    assert_eq!(user_a_before - input_amount, user_a_after);
    assert_eq!(vault_a_before + input_amount, vault_a_after);
    assert_eq!(user_b_before + output_amount, user_b_after);
    assert_eq!(vault_b_before - output_amount, vault_b_after);
}
```

**Traceability:** REQ-NF-016

---

### INV-VLT-005: Monotonic Vault Balance (No Withdrawal in MVP)

**Category:** Vault Invariant

**Formal Statement:**
```
∀ vault ∈ Vaults, ∀ t1, t2 ∈ Time WHERE t2 > t1:
  vault.balance(t2) ≥ vault.balance(t1) - total_swaps_out(t1, t2)
```

**English:**
Vault balances are monotonically non-decreasing except for swap withdrawals. Direct liquidity withdrawal by authority is not permitted in MVP.

**Rationale:**
Prevents liquidity rug-pulls. In MVP, vaults are write-only (add_liquidity) and read-only for swaps. Future versions may add withdrawal with timelock/governance.

**Enforcement:**
Omission (no withdraw_liquidity instruction exists)

**Out of scope:**
Emergency withdrawal, partial withdrawal, liquidity migration (see ADR-008)

**Violation Detection:**
Attempt to call non-existent withdraw_liquidity → Instruction not found error

**Test Assertion:**
```rust
#[test]
fn test_no_withdrawal_instruction_exists() {
    // Verify program IDL does not contain withdraw_liquidity instruction
    let idl = load_idl();
    assert!(!idl.instructions.iter().any(|i| i.name == "withdraw_liquidity"));
}
```

**Traceability:** REQ-F-003, REQ-F-004, BR-VLT-003

---

## Swap Invariants

### INV-SWP-001: Positive Input and Output Amounts

**Category:** Positive Amounts

**Formal Statement:**
```
∀ swap ∈ SwapTransactions, swap.state ≠ FAILED:
  (swap.input_amount > 0) ∧ (swap.output_amount > 0)
```

**English:**
All successful swaps have positive input and output amounts (zero amounts are rejected).

**Rationale:**
Zero-amount swaps are meaningless and waste compute resources.

**Enforcement:**
- Input validation at start of `swap` instruction
- Output calculation guaranteed positive (if input positive and price positive)

**Violation Detection:**
Swap with amount = 0 → Instruction fails with "ZeroAmount" error

**Test Assertion:**
```rust
#[tokio::test]
async fn test_zero_amount_rejection() {
    let result = swap_a_to_b(&market, 0).await;
    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), SwapError::ZeroAmount));
}
```

**Traceability:** REQ-NF-004

---

### INV-SWP-002: Atomicity of Token Transfers

**Category:** Atomicity

**Formal Statement:**
```
∀ swap ∈ SwapTransactions:
  (swap.state = CONFIRMED) ⇒
    (transfer_user_to_vault.success ∧ transfer_vault_to_user.success)

  ∧

  (swap.state = FAILED) ⇒
    (¬transfer_user_to_vault.applied ∧ ¬transfer_vault_to_user.applied)
```

**English:**
Both token transfers in a swap succeed together or both fail together. No partial execution.

**Rationale:**
Atomicity prevents loss of funds. If one transfer fails, the other must be rolled back.

**Enforcement:**
- Solana transaction model: all instructions atomic
- Both transfers occur within single transaction

**Violation Detection:**
Partial transfer → Blockchain automatically reverts entire transaction

**Test Assertion:**
```rust
#[tokio::test]
async fn test_swap_atomicity() {
    // Setup: insufficient liquidity in vault_b
    add_liquidity(&market, 1000, 50).await.unwrap(); // Only 50 tokens in vault_b

    let user_a_before = get_token_balance(user, token_a).await;
    let vault_a_before = get_token_balance(vault_a, token_a).await;

    // Attempt swap requiring 100 tokens output (will fail)
    let result = swap_a_to_b(&market, 1000).await;
    assert!(result.is_err());

    // Verify user and vault balances unchanged (atomicity)
    let user_a_after = get_token_balance(user, token_a).await;
    let vault_a_after = get_token_balance(vault_a, token_a).await;

    assert_eq!(user_a_before, user_a_after);
    assert_eq!(vault_a_before, vault_a_after);
}
```

**Traceability:** REQ-NF-016

---

### INV-SWP-003: Correct Output Calculation

**Category:** Calculation Correctness

**Formal Statement:**
```
∀ swap ∈ SwapTransactions, swap.state = CONFIRMED:
  (swap.direction = AtoB) ⇒
    swap.output_amount = (swap.input_amount × market.price × 10^market.decimals_b)
                         / (10^6 × 10^market.decimals_a)

  ∧

  (swap.direction = BtoA) ⇒
    swap.output_amount = (swap.input_amount × 10^6 × 10^market.decimals_a)
                         / (market.price × 10^market.decimals_b)
```

**English:**
Output amount is calculated according to the specified formulas, accounting for exchange rate and token decimals.

**Rationale:**
Correct pricing ensures fair value exchange for users.

**Enforcement:**
- Implementation uses checked arithmetic
- Formula hardcoded in swap instruction

**Violation Detection:**
Incorrect output amount → Test assertion failure (calculation logic bug)

**Test Assertion:**
```rust
#[tokio::test]
async fn test_swap_calculation_a_to_b() {
    set_price(&market, 1_500_000).await.unwrap(); // 1 A = 1.5 B
    // Assume both tokens have 6 decimals

    let input = 1_000_000; // 1 token A
    let expected_output = 1_500_000; // 1.5 token B

    let actual_output = swap_a_to_b(&market, input).await.unwrap();
    assert_eq!(actual_output, expected_output);
}

#[tokio::test]
async fn test_swap_calculation_b_to_a() {
    set_price(&market, 1_500_000).await.unwrap(); // 1 A = 1.5 B

    let input = 1_500_000; // 1.5 token B
    let expected_output = 1_000_000; // 1 token A

    let actual_output = swap_b_to_a(&market, input).await.unwrap();
    assert_eq!(actual_output, expected_output);
}
```

**Traceability:** REQ-F-006, REQ-F-007

---

### INV-SWP-004: Sufficient Liquidity Pre-Check

**Category:** Pre-condition

**Formal Statement:**
```
∀ swap ∈ SwapTransactions:
  let output_vault = if swap.direction = AtoB then vault_b else vault_a;
  let output_amount = calculate_output(swap);

  swap.execute() requires output_vault.balance ≥ output_amount
```

**English:**
Before executing a swap, the system must verify that the output vault has sufficient balance.

**Rationale:**
Early validation prevents wasted compute and provides clear error messages.

**Enforcement:**
- Explicit check in swap instruction before CPI calls

**Violation Detection:**
Swap without liquidity check → CPI fails later (less efficient, unclear error)

**Test Assertion:**
```rust
#[tokio::test]
async fn test_liquidity_precheck() {
    add_liquidity(&market, 1000, 100).await.unwrap(); // Limited vault_b

    // Swap requiring more than available
    let result = swap_a_to_b(&market, 10000).await;

    // Should fail with specific error (not generic CPI error)
    assert!(matches!(result.unwrap_err(), SwapError::InsufficientLiquidity));
}
```

**Traceability:** REQ-NF-003

---

### INV-SWP-005: Non-Zero Exchange Rate for All Swaps

**Category:** Pre-condition

**Formal Statement:**
```
∀ swap ∈ SwapTransactions: swap.can_execute ⇒ market.price > 0
```

**English:**
All swap transactions require a positive exchange rate, regardless of direction.

**Rationale:**
- **B→A direction:** Prevents division by zero (output_a = input_b / price)
- **A→B direction:** Prevents zero-output swaps (output_b = input_a × 0 = 0), which are economically nonsensical (user donates tokens to vault)

**Enforcement:**
- Runtime validation in `swap` instruction (applies to both directions)
- Already implemented at API-solana-program.md:530

**Violation Detection:**
Any swap with price = 0 → Instruction fails with "PriceNotSet" error

**Test Assertion:**
```rust
#[tokio::test]
async fn test_price_not_set_b_to_a() {
    let market = initialize_market(token_a, token_b).await.unwrap();
    // Price is 0 (not set)

    let result = swap_b_to_a(&market, 100).await;
    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), SwapError::PriceNotSet));
}

#[tokio::test]
async fn test_price_not_set_a_to_b() {
    let market = initialize_market(token_a, token_b).await.unwrap();
    // Price is 0 (not set)

    // A→B swap should also fail (output would be zero)
    let result = swap_a_to_b(&market, 100).await;
    assert!(result.is_err());
}
```

**Traceability:** REQ-NF-002

---

### INV-SWP-006: Overflow Protection

**Category:** Security

**Formal Statement:**
```
∀ swap ∈ SwapTransactions, ∀ arithmetic_op ∈ [mul, div, add, sub]:
  arithmetic_op.uses_checked_method ∧
  (arithmetic_op.result = None ⇒ swap.state = FAILED)
```

**English:**
All arithmetic operations use checked methods (checked_mul, checked_div, etc.). If any operation overflows, the swap fails.

**Rationale:**
Integer overflow/underflow can produce incorrect results or panics. Checked arithmetic prevents this.

**Enforcement:**
- Code review: all arithmetic uses `.checked_*()` methods
- Test with extreme values

**Violation Detection:**
Overflow → Instruction fails with "ArithmeticOverflow" error (or panic in debug)

**Test Assertion:**
```rust
#[tokio::test]
async fn test_overflow_protection() {
    set_price(&market, u64::MAX).await.unwrap();

    // Attempt swap that would overflow during calculation
    let result = swap_a_to_b(&market, u64::MAX / 2).await;
    assert!(result.is_err());
    // Error should be handled gracefully (not panic)
}
```

**Traceability:** REQ-NF-001

---

## Authority Invariants

### INV-AUTH-001: Signer Requirement for Privileged Operations

**Category:** Authorization

**Formal Statement:**
```
∀ instruction ∈ [set_price, add_liquidity]:
  instruction.execute() requires
    (instruction.authority_account.is_signer = true) ∧
    (instruction.authority_account.key = market.authority)
```

**English:**
Privileged instructions (set_price, add_liquidity) can only be executed if the authority account is both a signer and matches the market's stored authority.

**Rationale:**
Prevents unauthorized modification of market parameters.

**Enforcement:**
- Anchor `Signer` constraint on authority account
- Account constraint: `constraint = authority.key() == market.authority`

**Violation Detection:**
Unauthorized call → Anchor rejects with "MissingSigner" or "ConstraintViolation"

**Test Assertion:**
```rust
#[tokio::test]
async fn test_unauthorized_set_price() {
    let market = initialize_market(token_a, token_b).await.unwrap();

    // Attempt to call set_price with wrong signer
    let unauthorized_wallet = generate_new_wallet();
    let result = set_price_with_signer(&market, 1_000_000, unauthorized_wallet).await;

    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), AnchorError::ConstraintSigner));
}
```

**Traceability:** REQ-F-008, REQ-NF-006

---

### INV-AUTH-002: Authority Immutability

**Category:** Immutability

**Formal Statement:**
(Same as INV-MKT-002)

**Traceability:** REQ-F-001

---

## PDA Invariants

### INV-PDA-001: Deterministic Derivation

**Category:** Determinism

**Formal Statement:**
```
∀ seeds ∈ SeedSets, ∀ program_id ∈ ProgramIDs:
  let (pda1, bump1) = find_program_address(seeds, program_id);
  let (pda2, bump2) = find_program_address(seeds, program_id);

  (pda1 = pda2) ∧ (bump1 = bump2)
```

**English:**
Calling `find_program_address` with the same seeds and program ID always produces the same PDA and bump seed.

**Rationale:**
Determinism is required for clients to locate accounts and for program CPI signing.

**Enforcement:**
- Solana's PDA algorithm is deterministic by design
- Cryptographic hash function (SHA-256) ensures consistency

**Violation Detection:**
Non-deterministic PDA → Account not found (critical bug in Solana runtime, not application)

**Test Assertion:**
```rust
#[test]
fn test_pda_determinism() {
    let program_id = Pubkey::new_unique();
    let seeds = &[b"market", &[1u8; 32], &[2u8; 32]];

    let (pda1, bump1) = Pubkey::find_program_address(seeds, &program_id);
    let (pda2, bump2) = Pubkey::find_program_address(seeds, &program_id);

    assert_eq!(pda1, pda2);
    assert_eq!(bump1, bump2);
}
```

**Traceability:** REQ-F-011

---

### INV-PDA-002: Program Ownership

**Category:** Ownership

**Formal Statement:**
```
∀ pda ∈ PDAs:
  pda.owner = swap_program_id
```

**English:**
All PDAs created by the swap program are owned by the swap program.

**Rationale:**
Only the program can modify its own accounts.

**Enforcement:**
- Anchor `init` constraint sets owner to program ID automatically
- Solana runtime enforces ownership rules

**Violation Detection:**
Incorrect owner → Anchor deserialization fails with "AccountOwnedByWrongProgram"

**Test Assertion:**
```rust
#[tokio::test]
async fn test_pda_ownership() {
    let market = initialize_market(token_a, token_b).await.unwrap();
    let market_account_info = fetch_account_info(market.pda).await;

    assert_eq!(market_account_info.owner, swap_program_id());
}
```

**Traceability:** REQ-NF-005

---

### INV-PDA-003: Uniqueness Per Seed Combination

**Category:** Uniqueness

**Formal Statement:**
```
∀ seeds1, seeds2 ∈ SeedSets:
  (seeds1 ≠ seeds2) ⇒ (derive_pda(seeds1) ≠ derive_pda(seeds2))
```

**English:**
Different seed combinations produce different PDAs (collision-resistant).

**Rationale:**
Uniqueness prevents account conflicts.

**Enforcement:**
- SHA-256 hash collision resistance (cryptographic guarantee)
- PDA derivation includes program ID (namespace isolation)

**Violation Detection:**
PDA collision → Cryptographic hash collision (astronomically unlikely)

**Test Assertion:**
```rust
#[test]
fn test_pda_uniqueness() {
    let program_id = Pubkey::new_unique();
    let seeds1 = &[b"market", &[1u8; 32], &[2u8; 32]];
    let seeds2 = &[b"market", &[3u8; 32], &[4u8; 32]];

    let (pda1, _) = Pubkey::find_program_address(seeds1, &program_id);
    let (pda2, _) = Pubkey::find_program_address(seeds2, &program_id);

    assert_ne!(pda1, pda2);
}
```

**Traceability:** REQ-NF-017

---

## Event Invariants

### INV-EVT-001: Event Emission for State Changes

**Category:** Auditability

**Formal Statement:**
```
∀ instruction ∈ [initialize_market, set_price, add_liquidity, swap]:
  instruction.state = SUCCESS ⇒
    ∃ event ∈ Events: event.corresponds_to(instruction)
```

**English:**
Every successful state-changing instruction emits a corresponding event.

**Rationale:**
Events provide audit trail and enable off-chain indexing.

**Enforcement:**
- `emit!` macro called at end of each instruction handler
- Code review ensures event emission

**Violation Detection:**
Missing event → Off-chain indexer does not record transaction (detectable via audit)

**Test Assertion:**
```rust
#[tokio::test]
async fn test_event_emission() {
    let events_before = fetch_program_events().await;

    swap_a_to_b(&market, 100).await.unwrap();

    let events_after = fetch_program_events().await;
    assert_eq!(events_after.len(), events_before.len() + 1);

    let latest_event = events_after.last().unwrap();
    assert!(matches!(latest_event, Event::SwapExecuted { .. }));
}
```

**Traceability:** REQ-NF-009 through REQ-NF-012

---

### INV-EVT-002: Event Data Accuracy

**Category:** Correctness

**Formal Statement:**
```
∀ event ∈ SwapExecutedEvents:
  (event.input_amount = swap.input_amount) ∧
  (event.output_amount = swap.output_amount) ∧
  (event.user = swap.user) ∧
  (event.market = swap.market)
```

**English:**
Event data accurately reflects the swap that occurred.

**Rationale:**
Inaccurate events mislead auditors and indexers.

**Enforcement:**
- Event fields populated directly from instruction parameters and calculations
- Code review

**Violation Detection:**
Incorrect event data → Audit discrepancy (detectable via cross-reference with transaction logs)

**Test Assertion:**
```rust
#[tokio::test]
async fn test_event_accuracy() {
    let input_amount = 100;
    let output_amount = swap_a_to_b(&market, input_amount).await.unwrap();

    let event = fetch_latest_event::<SwapExecuted>().await.unwrap();
    assert_eq!(event.input_amount, input_amount);
    assert_eq!(event.output_amount, output_amount);
    assert_eq!(event.user, user_wallet.key());
    assert_eq!(event.market, market.pda);
}
```

**Traceability:** REQ-NF-012

---

## Global System Invariants

### INV-GLOBAL-001: No Unauthorized State Leaks

**Category:** Security

**Formal Statement:**
```
∀ failed_transaction ∈ FailedTransactions:
  ∀ account ∈ Accounts:
    account.state(before_tx) = account.state(after_tx)
```

**English:**
Failed transactions do not modify any account state.

**Rationale:**
State leaks can be exploited to manipulate balances or bypass constraints.

**Enforcement:**
- Solana transaction atomicity (runtime guarantee)
- All state changes reverted on instruction failure

**Violation Detection:**
State change after failure → Critical blockchain bug (not application-level)

**Test Assertion:**
```rust
#[tokio::test]
async fn test_no_state_leak_on_failure() {
    let market_before = fetch_market_account().await;
    let vault_a_before = fetch_vault_balance(vault_a).await;

    // Attempt invalid operation (zero amount)
    let result = swap_a_to_b(&market, 0).await;
    assert!(result.is_err());

    // Verify no state changed
    let market_after = fetch_market_account().await;
    let vault_a_after = fetch_vault_balance(vault_a).await;

    assert_eq!(market_before.price, market_after.price);
    assert_eq!(vault_a_before, vault_a_after);
}
```

**Traceability:** REQ-NF-016

---

## Invariant Verification Strategy

### Compile-Time Verification

**Tools:**
- Rust type system (prevents negative amounts, enforces mutability)
- Anchor constraints (account ownership, signers, seeds)

**Coverage:**
- INV-MKT-002, INV-MKT-003 (immutability)
- INV-PDA-002 (ownership)
- INV-AUTH-001 (signer requirements)

---

### Runtime Verification

**Tools:**
- Explicit checks in instruction handlers (require! macros)
- SPL Token Program validation (balance checks)

**Coverage:**
- INV-SWP-001, INV-SWP-004, INV-SWP-005 (pre-conditions)
- INV-VLT-004 (liquidity)
- INV-SWP-006 (overflow protection)

---

### Test-Based Verification

**Tools:**
- Unit tests (calculation correctness)
- Integration tests (end-to-end flows)
- Property-based tests (fuzzing with arbitrary inputs)

**Coverage:**
- INV-SWP-003 (calculation correctness)
- INV-VLT-005 (balance conservation)
- INV-SWP-002 (atomicity)
- INV-EVT-002 (event accuracy)

**Traceability:** REQ-NF-020, REQ-NF-021

---

### Audit-Based Verification

**Tools:**
- Manual code review
- Security audit by third party
- Event log analysis

**Coverage:**
- INV-EVT-001 (event emission)
- INV-GLOBAL-001 (no state leaks)
- All invariants (comprehensive review)

**Traceability:** REQ-NF-009 through REQ-NF-012

---

## Changelog

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 1.0     | 2026-03-22 | Initial invariant specifications |

---

**Traceability:** This document derives invariants from:
- All functional requirements (REQ-F-001 through REQ-F-016)
- All nonfunctional requirements (REQ-NF-001 through REQ-NF-026)
- Entity definitions (02-ENTITIES.md)
- Value object specifications (03-VALUE-OBJECTS.md)
- State machine definitions (04-STATES.md)
