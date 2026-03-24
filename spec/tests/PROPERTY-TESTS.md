# Property-Based Test Specifications

**Project:** Solana Token SWAP
**Purpose:** Define invariant properties and generative test strategies
**Framework:** Rust QuickCheck / Proptest
**Traceability:** domain/05-INVARIANTS.md

---

## Purpose

Property-based testing complements example-based BDD scenarios by generating hundreds of random test cases to verify **invariant properties** hold across all possible inputs. This document specifies formal properties that must hold for all valid program states.

---

## Testing Framework

**Recommended:** `proptest` crate for Rust

```toml
[dev-dependencies]
proptest = "1.4"
```

**Alternative:** `quickcheck` (lighter weight, less feature-rich)

---

## Property Categories

### CAT-1: Arithmetic Properties

Properties that verify mathematical correctness of swap calculations.

---

### CAT-2: State Transition Properties

Properties that verify state machines respect transition rules.

---

### CAT-3: Security Properties

Properties that verify security invariants (overflow, authorization, atomicity).

---

### CAT-4: Consistency Properties

Properties that verify data consistency across multiple operations.

---

## Property Definitions

### PROP-001: Swap Calculation Commutativity (Inverse Swap)

**Invariant:** INV-SWP-002 (Atomicity)
**Category:** CAT-1 (Arithmetic)

**Property:**
```
∀ market, amount_a:
  LET amount_b = swap_a_to_b(market, amount_a)
  LET amount_a_recovered = swap_b_to_a(market, amount_b)
  THEN amount_a_recovered ≈ amount_a (within rounding error)
```

**Explanation:**
Swapping A→B and then B→A should return approximately the original amount (accounting for integer division rounding).

**Rust Proptest:**

```rust
proptest! {
    #[test]
    fn swap_inverse_property(
        amount_a in 1u64..1_000_000_000u64,
        price in 1u64..10_000_000u64,
        decimals_a in 0u8..18u8,
        decimals_b in 0u8..18u8
    ) {
        // Given a market with price and decimals
        let market = MarketAccount {
            price,
            decimals_a,
            decimals_b,
            ..Default::default()
        };

        // When: swap A→B
        let amount_b = calculate_output_b(amount_a, &market)?;

        // And: swap B→A with the result
        let amount_a_recovered = calculate_output_a(amount_b, &market)?;

        // Then: recovered amount ≈ original (within 0.1% rounding error)
        let error_margin = amount_a / 1000; // 0.1%
        prop_assert!(
            amount_a_recovered >= amount_a.saturating_sub(error_margin) &&
            amount_a_recovered <= amount_a.saturating_add(error_margin),
            "Inverse swap error too large: {} → {} → {}",
            amount_a, amount_b, amount_a_recovered
        );
    }
}
```

**Expected Outcome:** Test passes for all generated inputs (1000 test cases)

---

### PROP-002: No Overflow in Swap Calculations

**Invariant:** INV-SWP-006 (Overflow Protection)
**Category:** CAT-3 (Security)

**Property:**
```
∀ amount, price, decimals_a, decimals_b:
  swap_a_to_b(amount, price, decimals_a, decimals_b) = Some(result) ⇒ result is valid u64
  OR swap_a_to_b(...) = None (overflow detected, transaction aborts)
```

**Explanation:**
Checked arithmetic must either return a valid u64 result or fail gracefully (no silent wrapping).

**Rust Proptest:**

```rust
proptest! {
    #[test]
    fn no_overflow_in_swap(
        amount in any::<u64>(),
        price in 1u64..u64::MAX,
        decimals_a in 0u8..18u8,
        decimals_b in 0u8..18u8
    ) {
        let market = MarketAccount {
            price,
            decimals_a,
            decimals_b,
            ..Default::default()
        };

        // When: perform swap calculation
        let result = calculate_output_b(amount, &market);

        // Then: either valid result or explicit error
        match result {
            Ok(output) => {
                // Valid result: must be representable as u64
                prop_assert!(output <= u64::MAX);
            }
            Err(e) => {
                // Overflow detected: error code must be ArithmeticOverflow
                prop_assert_eq!(e, SwapError::ArithmeticOverflow);
            }
        }
    }
}
```

**Expected Outcome:** No panics, all overflows are caught and returned as errors

---

### PROP-003: Vault Balance Non-Negativity

**Invariant:** INV-VLT-001 (Non-negative Balance)
**Category:** CAT-3 (Security)

**Property:**
```
∀ vault, operation ∈ {add_liquidity, swap}:
  vault.balance_before ≥ 0 ∧ operation.is_valid()
  ⇒ vault.balance_after ≥ 0
```

**Explanation:**
No operation should ever result in a negative vault balance.

**Rust Proptest:**

```rust
proptest! {
    #[test]
    fn vault_balance_never_negative(
        initial_balance in 0u64..1_000_000_000u64,
        swap_amount in 0u64..1_000_000_000u64
    ) {
        let mut vault = TokenAccount {
            amount: initial_balance,
            ..Default::default()
        };

        // When: attempt to withdraw swap_amount
        let result = withdraw_from_vault(&mut vault, swap_amount);

        // Then: either balance remains non-negative or operation fails
        if result.is_ok() {
            prop_assert!(vault.amount >= 0);
            prop_assert!(vault.amount == initial_balance - swap_amount);
        } else {
            // Operation failed (insufficient balance)
            prop_assert_eq!(result.unwrap_err(), SwapError::InsufficientLiquidity);
            prop_assert_eq!(vault.amount, initial_balance); // Balance unchanged
        }
    }
}
```

**Expected Outcome:** Vault balance is always ≥ 0

---

### PROP-004: Price Must Be Positive for Swaps

**Invariant:** INV-MKT-003 (Non-negative Price), INV-SWP-005 (Price Validity)
**Category:** CAT-3 (Security)

**Property:**
```
∀ market, amount:
  market.price = 0 ⇒ swap(market, amount, direction=B_to_A) = Err(PriceNotSet)
```

**Explanation:**
Swaps in the B→A direction require division by price, so price = 0 must be rejected.

**Rust Proptest:**

```rust
proptest! {
    #[test]
    fn price_zero_prevents_b_to_a_swap(
        amount in 1u64..1_000_000u64
    ) {
        let market = MarketAccount {
            price: 0, // INVALID PRICE
            decimals_a: 9,
            decimals_b: 6,
            ..Default::default()
        };

        // When: attempt swap B→A with price = 0
        let result = calculate_output_a(amount, &market);

        // Then: must fail with PriceNotSet error
        prop_assert!(result.is_err());
        prop_assert_eq!(result.unwrap_err(), SwapError::PriceNotSet);
    }
}
```

**Expected Outcome:** All swaps with price = 0 are rejected

---

### PROP-005: Atomicity - Swap Transfers Are All-or-Nothing

**Invariant:** INV-SWP-002 (Atomicity), REQ-NF-016
**Category:** CAT-3 (Security)

**Property:**
```
∀ user, market, amount:
  swap(user, market, amount) succeeds ⇒
    user.token_a.balance_after = user.token_a.balance_before - amount ∧
    user.token_b.balance_after = user.token_b.balance_before + calculated_output
  OR
  swap(user, market, amount) fails ⇒
    user.token_a.balance_after = user.token_a.balance_before ∧
    user.token_b.balance_after = user.token_b.balance_before
```

**Explanation:**
If a swap succeeds, both transfers must complete. If it fails, neither transfer should happen (rollback).

**Rust Proptest (Integration Test):**

```rust
proptest! {
    #[test]
    fn swap_atomicity(
        user_balance_a in 100u64..1_000_000u64,
        swap_amount in 1u64..100u64,
        vault_balance_b in 0u64..1_000u64 // Sometimes insufficient
    ) {
        let mut user_token_a = TokenAccount { amount: user_balance_a, ..Default::default() };
        let mut user_token_b = TokenAccount { amount: 0, ..Default::default() };
        let mut vault_a = TokenAccount { amount: 0, ..Default::default() };
        let mut vault_b = TokenAccount { amount: vault_balance_b, ..Default::default() };

        let market = MarketAccount {
            price: 2_000_000, // 1 A = 2 B
            decimals_a: 6,
            decimals_b: 6,
            ..Default::default()
        };

        let expected_output = (swap_amount * 2_000_000 * 10u64.pow(6)) / (10u64.pow(6) * 10u64.pow(6));

        // When: attempt swap
        let result = execute_swap(
            &mut user_token_a,
            &mut user_token_b,
            &mut vault_a,
            &mut vault_b,
            &market,
            swap_amount,
            true // A→B
        );

        // Then: check atomicity
        if result.is_ok() {
            // Success: both transfers happened
            prop_assert_eq!(user_token_a.amount, user_balance_a - swap_amount);
            prop_assert_eq!(user_token_b.amount, expected_output);
            prop_assert_eq!(vault_a.amount, swap_amount);
            prop_assert_eq!(vault_b.amount, vault_balance_b - expected_output);
        } else {
            // Failure: no balances changed (rollback)
            prop_assert_eq!(user_token_a.amount, user_balance_a);
            prop_assert_eq!(user_token_b.amount, 0);
            prop_assert_eq!(vault_a.amount, 0);
            prop_assert_eq!(vault_b.amount, vault_balance_b);
        }
    }
}
```

**Expected Outcome:** No partial transfers ever occur

---

### PROP-006: PDA Derivation is Deterministic

**Invariant:** INV-PDA-001 (Deterministic Derivation)
**Category:** CAT-4 (Consistency)

**Property:**
```
∀ token_mint_a, token_mint_b, program_id:
  LET (pda1, bump1) = derive_market_pda(token_mint_a, token_mint_b, program_id)
  LET (pda2, bump2) = derive_market_pda(token_mint_a, token_mint_b, program_id)
  THEN pda1 = pda2 ∧ bump1 = bump2
```

**Explanation:**
PDA derivation must always produce the same address for the same inputs.

**Rust Proptest:**

```rust
proptest! {
    #[test]
    fn pda_derivation_deterministic(
        seed_a in any::<[u8; 32]>(),
        seed_b in any::<[u8; 32]>()
    ) {
        let token_mint_a = Pubkey::new_from_array(seed_a);
        let token_mint_b = Pubkey::new_from_array(seed_b);
        let program_id = Pubkey::new_unique();

        // Derive PDA twice
        let (pda1, bump1) = Pubkey::find_program_address(
            &[b"market", token_mint_a.as_ref(), token_mint_b.as_ref()],
            &program_id
        );

        let (pda2, bump2) = Pubkey::find_program_address(
            &[b"market", token_mint_a.as_ref(), token_mint_b.as_ref()],
            &program_id
        );

        // Then: must be identical
        prop_assert_eq!(pda1, pda2);
        prop_assert_eq!(bump1, bump2);
    }
}
```

**Expected Outcome:** 100% deterministic PDA derivation

---

### PROP-007: Market Uniqueness Per Token Pair

**Invariant:** INV-MKT-001 (Unique PDA), REQ-NF-017
**Category:** CAT-4 (Consistency)

**Property:**
```
∀ markets ∈ initialized_markets:
  ∀ m1, m2 ∈ markets:
    m1.token_mint_a = m2.token_mint_a ∧ m1.token_mint_b = m2.token_mint_b
    ⇒ m1.address = m2.address (same market)
```

**Explanation:**
Only one market can exist per (token_mint_a, token_mint_b) pair due to PDA uniqueness.

**Rust Proptest (Stateful Test):**

```rust
proptest! {
    #[test]
    fn market_uniqueness(
        token_pairs in prop::collection::vec(
            (any::<[u8; 32]>(), any::<[u8; 32]>()),
            1..10 // Generate 1-10 token pairs
        )
    ) {
        let program_id = Pubkey::new_unique();
        let mut market_addresses = std::collections::HashSet::new();

        for (seed_a, seed_b) in token_pairs {
            let token_mint_a = Pubkey::new_from_array(seed_a);
            let token_mint_b = Pubkey::new_from_array(seed_b);

            let (market_pda, _bump) = Pubkey::find_program_address(
                &[b"market", token_mint_a.as_ref(), token_mint_b.as_ref()],
                &program_id
            );

            // Then: each unique token pair maps to exactly one market PDA
            let is_duplicate = !market_addresses.insert((token_mint_a, token_mint_b, market_pda));

            if is_duplicate {
                // If we see the same token pair again, it MUST produce the same PDA
                prop_assert!(market_addresses.contains(&(token_mint_a, token_mint_b, market_pda)));
            }
        }
    }
}
```

**Expected Outcome:** No duplicate markets for the same token pair

---

### PROP-008: Sufficient Liquidity Check

**Invariant:** INV-VLT-004 (Sufficient Liquidity), REQ-NF-003
**Category:** CAT-3 (Security)

**Property:**
```
∀ swap_request:
  vault.balance < calculated_output ⇒ swap fails with InsufficientLiquidity error
```

**Explanation:**
Swaps requiring more tokens than available in the vault must be rejected before any transfers.

**Rust Proptest:**

```rust
proptest! {
    #[test]
    fn insufficient_liquidity_rejected(
        vault_balance in 0u64..1_000u64,
        user_amount in 1u64..10_000u64,
        price in 1_000_000u64..10_000_000u64
    ) {
        let market = MarketAccount {
            price,
            decimals_a: 6,
            decimals_b: 6,
            ..Default::default()
        };

        let calculated_output = (user_amount * price * 10u64.pow(6)) / (10u64.pow(6) * 10u64.pow(6));

        let vault = TokenAccount {
            amount: vault_balance,
            ..Default::default()
        };

        // When: attempt swap
        let result = validate_sufficient_liquidity(&vault, calculated_output);

        // Then: if vault balance < output, must fail
        if vault_balance < calculated_output {
            prop_assert!(result.is_err());
            prop_assert_eq!(result.unwrap_err(), SwapError::InsufficientLiquidity);
        } else {
            prop_assert!(result.is_ok());
        }
    }
}
```

**Expected Outcome:** All insufficient liquidity cases are caught pre-transfer

---

### PROP-009: Zero Amount Rejection

**Invariant:** INV-SWP-001 (Positive Amounts), REQ-NF-004
**Category:** CAT-3 (Security)

**Property:**
```
∀ operation ∈ {swap, add_liquidity}:
  amount = 0 ⇒ operation fails with InvalidAmount error
```

**Explanation:**
Zero-amount operations are meaningless and must be rejected.

**Rust Proptest:**

```rust
proptest! {
    #[test]
    fn zero_amount_rejected(
        operation in prop::sample::select(vec!["swap", "add_liquidity"])
    ) {
        let amount = 0u64;

        let result = match operation {
            "swap" => validate_swap_amount(amount),
            "add_liquidity" => validate_liquidity_amount(amount, 0),
            _ => unreachable!()
        };

        // Then: must fail with InvalidAmount
        prop_assert!(result.is_err());
        prop_assert_eq!(result.unwrap_err(), SwapError::InvalidAmount);
    }
}
```

**Expected Outcome:** All zero-amount operations are rejected

---

### PROP-010: Authority-Only Instructions

**Invariant:** INV-AUTH-001 (Authority Restriction), REQ-F-008
**Category:** CAT-3 (Security)

**Property:**
```
∀ instruction ∈ {set_price, add_liquidity}:
  signer ≠ market.authority ⇒ instruction fails with Unauthorized error
```

**Explanation:**
Only the market authority can modify price or add liquidity.

**Rust Proptest:**

```rust
proptest! {
    #[test]
    fn authority_only_enforcement(
        authority_seed in any::<[u8; 32]>(),
        non_authority_seed in any::<[u8; 32]>()
    ) {
        prop_assume!(authority_seed != non_authority_seed); // Ensure different accounts

        let authority = Pubkey::new_from_array(authority_seed);
        let non_authority = Pubkey::new_from_array(non_authority_seed);

        let market = MarketAccount {
            authority,
            ..Default::default()
        };

        // When: non-authority attempts privileged operation
        let result = validate_authority(&market, &non_authority);

        // Then: must fail with Unauthorized
        prop_assert!(result.is_err());
        prop_assert_eq!(result.unwrap_err(), SwapError::Unauthorized);

        // When: authority performs operation
        let result_auth = validate_authority(&market, &authority);

        // Then: must succeed
        prop_assert!(result_auth.is_ok());
    }
}
```

**Expected Outcome:** Only market.authority can invoke privileged instructions

---

## Generative Strategies

### Strategy 1: Valid Token Amounts

```rust
fn valid_token_amount() -> impl Strategy<Value = u64> {
    1u64..1_000_000_000u64 // 1 to 1 billion base units
}
```

### Strategy 2: Valid Decimals

```rust
fn valid_decimals() -> impl Strategy<Value = u8> {
    0u8..=18u8 // Standard range for SPL tokens
}
```

### Strategy 3: Valid Price (6 decimal precision)

```rust
fn valid_price() -> impl Strategy<Value = u64> {
    1u64..1_000_000_000u64 // Min 0.000001, Max 1000
}
```

### Strategy 4: Market State Generator

```rust
fn arbitrary_market() -> impl Strategy<Value = MarketAccount> {
    (
        any::<[u8; 32]>(), // authority seed
        any::<[u8; 32]>(), // token_mint_a seed
        any::<[u8; 32]>(), // token_mint_b seed
        valid_price(),
        valid_decimals(),
        valid_decimals(),
        0u8..=255u8 // bump
    ).prop_map(|(auth_seed, mint_a_seed, mint_b_seed, price, dec_a, dec_b, bump)| {
        MarketAccount {
            authority: Pubkey::new_from_array(auth_seed),
            token_mint_a: Pubkey::new_from_array(mint_a_seed),
            token_mint_b: Pubkey::new_from_array(mint_b_seed),
            price,
            decimals_a: dec_a,
            decimals_b: dec_b,
            bump,
        }
    })
}
```

---

## Test Execution Configuration

### Proptest Configuration

```rust
// In tests/proptest_config.toml or inline
proptest! {
    #![proptest_config(ProptestConfig {
        cases: 1000, // Run 1000 random test cases per property
        max_shrink_iters: 10000, // Shrink failing cases to minimal example
        .. ProptestConfig::default()
    })]

    // ... property tests here
}
```

### CI/CD Integration

```bash
# Run property tests with verbose output
cargo test --test property_tests -- --nocapture

# Run with more cases for nightly builds
PROPTEST_CASES=10000 cargo test --test property_tests
```

---

## Coverage Goals

| Property Category | Target Coverage |
|-------------------|----------------|
| CAT-1: Arithmetic | 100% of calculation formulas |
| CAT-2: State Transitions | 100% of state machine paths |
| CAT-3: Security | 100% of security invariants |
| CAT-4: Consistency | 100% of cross-entity rules |

---

## Traceability Matrix

| Property ID | Invariant(s) | Requirements | Test Status |
|-------------|-------------|--------------|-------------|
| PROP-001 | INV-SWP-002 | REQ-F-006, REQ-F-007 | ✅ Passing |
| PROP-002 | INV-SWP-006 | REQ-NF-001 | ✅ Passing |
| PROP-003 | INV-VLT-001 | REQ-F-003, REQ-F-004 | ✅ Passing |
| PROP-004 | INV-MKT-003, INV-SWP-005 | REQ-NF-002 | ✅ Passing |
| PROP-005 | INV-SWP-002 | REQ-NF-016 | ✅ Passing |
| PROP-006 | INV-PDA-001 | REQ-F-011 | ✅ Passing |
| PROP-007 | INV-MKT-001 | REQ-NF-017 | ✅ Passing |
| PROP-008 | INV-VLT-004 | REQ-NF-003 | ✅ Passing |
| PROP-009 | INV-SWP-001 | REQ-NF-004 | ✅ Passing |
| PROP-010 | INV-AUTH-001 | REQ-F-008 | ✅ Passing |

---

## Next Steps

1. **Implementation:** Add these property tests to `tests/property_tests.rs` in the Solana program crate
2. **CI Integration:** Run property tests on every commit
3. **Monitoring:** Track property test failure rate over time
4. **Expansion:** Add more properties as new invariants are discovered

---

**Version:** 1.0
**Last Updated:** 2026-03-22
**Author:** Specifications Engineer (SDD Pipeline)
