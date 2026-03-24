# Corrections Plan: AUDIT-v1.0

> **Generated:** 2026-03-22
> **Audit Source:** AUDIT-v1.0.md
> **Total Findings:** 78 (3 Critical, 19 High, 40 Medium, 16 Low)
> **Execution Mode:** BATCH (Auto-apply all recommended solutions)

---

## 📋 Executive Summary

This plan provides **2 solutions** for each of the 78 findings from AUDIT-v1.0:
1. **Recommended Solution** (marked ✅) - Will be auto-applied in batch mode
2. **Alternative Solution** - Available if user prefers different approach

**Batch Execution Strategy:**
- Apply all critical fixes first (blocking issues)
- Apply high-priority fixes (functionality gaps)
- Apply medium/low fixes (quality improvements)
- Re-run spec-auditor to verify resolution

**Estimated Effort:** ~45 modifications across 28 files

---

## 🔥 CRITICAL FIXES (3 findings - MUST RESOLVE)

### CRITICAL-001: Token Mint Distinctness Not Enforced

**Location:** `spec/domain/02-ENTITIES.md:141`, `spec/domain/05-INVARIANTS.md:268`

**Problem:** BR-MKT-004 allows creation of markets where `token_mint_a == token_mint_b` (e.g., USDC/USDC), causing undefined swap behavior.

**✅ RECOMMENDED SOLUTION 1: Add On-Chain Validation**

**Files to modify:**
1. `spec/domain/02-ENTITIES.md` - Update BR-MKT-004
2. `spec/domain/05-INVARIANTS.md` - Add INV-MKT-006
3. `spec/contracts/API-solana-program.md` - Add validation to initialize_market
4. `spec/tests/BDD-UC-001.md` - Add exception scenario

**Changes:**

**File 1: `spec/domain/02-ENTITIES.md:141`**

BEFORE:
```markdown
- **BR-MKT-004**: `token_mint_a` and `token_mint_b` must be distinct (same token swaps disallowed; not enforced in MVP)
```

AFTER:
```markdown
- **BR-MKT-004**: `token_mint_a` and `token_mint_b` must be distinct (same token swaps disallowed). **Enforced on-chain** in `initialize_market` instruction via `require!(token_mint_a != token_mint_b, ErrorCode::SameTokenSwapDisallowed)`.
```

**File 2: `spec/domain/05-INVARIANTS.md` (add after INV-MKT-005)**

ADD NEW INVARIANT:
```markdown
### INV-MKT-006: Token Mint Distinctness
**Category:** Market Invariant
**Formal Statement:**
```
∀ market ∈ Markets: market.token_mint_a ≠ market.token_mint_b
```

**English:** All markets must have distinct token mints. A market cannot swap a token with itself.

**Why enforced:** Prevents nonsensical markets (USDC/USDC) and undefined swap behavior (output = input * price / price = input).

**Enforcement:** Initialization-time validation

**Test assertion:**
```rust
#[test]
fn test_same_token_market_rejected() {
    let result = initialize_market_ix(usdc_mint, usdc_mint);
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), ErrorCode::SameTokenSwapDisallowed);
}
```
```

**File 3: `spec/contracts/API-solana-program.md:158` (in Behavior section)**

BEFORE:
```markdown
1. Derives Market PDA from seeds `[b"market", token_mint_a, token_mint_b, bump]`
```

AFTER:
```markdown
1. **Validates** that `token_mint_a.key() != token_mint_b.key()` (rejects same-token markets)
2. Derives Market PDA from seeds `[b"market", token_mint_a, token_mint_b, bump]`
```

**File 4: `spec/tests/BDD-UC-001.md` (add new exception scenario)**

ADD AFTER Exception 3:
```gherkin
### Exception 4: Attempt to Initialize Market with Same Token

```gherkin
Scenario: Administrator attempts to create USDC/USDC market
  Given the administrator wallet is connected with 10 SOL
  And a USDC token mint exists at address "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  When the administrator invokes initialize_market with:
    | token_mint_a | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v |
    | token_mint_b | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v |
  Then the transaction SHALL fail with error "SameTokenSwapDisallowed"
  And the error message SHALL state "Cannot create market: token_mint_a and token_mint_b must be distinct"
  And no MarketAccount SHALL be created
  And the administrator's SOL balance SHALL be unchanged (tx rejected before fee deduction)
  And no MarketInitialized event SHALL be emitted
```
```

**🔄 ALTERNATIVE SOLUTION 2: Document as Accepted Risk**

**Files to modify:**
1. `spec/domain/02-ENTITIES.md` - Expand BR-MKT-004 rationale
2. `spec/adr/ADR-007-same-token-markets-deferred.md` - Create new ADR

**Rationale for Alternative:** Educational project scope - validation adds complexity without meaningful learning value. Production implementation would require this.

**Changes:**

**File 1: `spec/domain/02-ENTITIES.md:141`**

AFTER:
```markdown
- **BR-MKT-004**: `token_mint_a` and `token_mint_b` **SHOULD** be distinct, but this is **not enforced on-chain in MVP**. Same-token markets (e.g., USDC/USDC) will initialize successfully but produce undefined swap behavior (output = input × price / price). **Rationale:** Educational project - real DEXs validate this. See ADR-007.
```

**File 2: `spec/adr/ADR-007-same-token-markets-deferred.md`** (NEW FILE)

```markdown
# ADR-007: Defer Same-Token Market Validation

**Status:** Accepted
**Date:** 2026-03-22
**Deciders:** Specifications Engineer

## Context

Markets are initialized with two token mints (`token_mint_a`, `token_mint_b`). Nothing prevents creating a market where both mints are identical (e.g., USDC/USDC), which produces nonsensical swap behavior.

## Decision

**Defer on-chain validation** of `token_mint_a != token_mint_b` to post-MVP. Document as known limitation.

## Rationale

**FOR deferral:**
- Educational project scope - focus on core swap mechanics
- Production DEXs validate this - readers learn from omission
- UI can prevent via soft validation (no on-chain cost)

**AGAINST deferral:**
- Risk of unintended initialization (fat-finger errors)
- Adds 1 line of validation code (minimal cost)

## Consequences

**Positive:**
- Simplified on-chain program (one less constraint)
- Opportunity to demonstrate UI-side validation patterns

**Negative:**
- Administrator can create invalid markets via direct program invocation
- Undefined behavior if same-token swap attempted

**Mitigation:**
- Document in 02-ENTITIES.md and README
- Add UI-side validation in web client
- Include in test suite as "should validate in production"
```

**Why Alternative NOT Recommended:** Security/correctness > simplicity. One-line validation prevents entire class of bugs.

---

### CRITICAL-002: Compute Unit Target Contradiction

**Location:** `spec/nfr/PERFORMANCE.md:203` vs `spec/nfr/LIMITS.md:37`

**Problem:** PERFORMANCE.md states "swap < 12,000 CU", LIMITS.md states "swap ~10,000 CU". 20% discrepancy without explanation.

**✅ RECOMMENDED SOLUTION 1: Unify to Single Authoritative Target with Explanation**

**Files to modify:**
1. `spec/nfr/PERFORMANCE.md` - Update to 10,000 CU baseline, 12,000 CU with events
2. `spec/nfr/LIMITS.md` - Add clarification about event cost

**Changes:**

**File 1: `spec/nfr/PERFORMANCE.md:203`**

BEFORE:
```markdown
| Operation | Target CU | Max Allowed | Measured |
|-----------|-----------|-------------|----------|
| swap | < 12,000 | 50,000 | TBD |
```

AFTER:
```markdown
| Operation | Target CU (baseline) | Target CU (with events) | Max Allowed | Measured |
|-----------|---------------------|------------------------|-------------|----------|
| swap | < 10,000 | < 12,000 | 50,000 | TBD |

**Note:** Baseline assumes minimal event emission. Event-heavy configurations add ~2,000 CU overhead. See `LIMITS.md` for detailed breakdown.
```

**File 2: `spec/nfr/LIMITS.md:37`**

BEFORE:
```markdown
| Operation | Est. CU | Notes |
|-----------|---------|-------|
| swap | ~10,000 | 2 CPI calls (user→vault, vault→user) |
```

AFTER:
```markdown
| Operation | Est. CU (baseline) | Est. CU (with events) | Notes |
|-----------|-------------------|---------------------|-------|
| swap | ~10,000 | ~12,000 | Baseline: 2 CPI calls (user→vault, vault→user). Event emission adds ~2,000 CU for SwapExecuted event serialization and log writing. |

**Authoritative Target:** 10,000 CU baseline (no events), 12,000 CU with events enabled (see PERFORMANCE.md for monitoring strategy).
```

**🔄 ALTERNATIVE SOLUTION 2: Use Conservative 12,000 CU Everywhere**

**Files to modify:**
1. `spec/nfr/LIMITS.md` - Update to 12,000 CU

**Changes:**

**File 1: `spec/nfr/LIMITS.md:37`**

AFTER:
```markdown
| Operation | Est. CU | Notes |
|-----------|---------|-------|
| swap | ~12,000 | 2 CPI calls + event emission overhead. Conservative estimate includes SwapExecuted event. |
```

**Rationale for Alternative:** Simpler (single number), conservative (safe upper bound).

**Why NOT Recommended:** Hides cost breakdown. Engineers should know baseline vs event overhead for optimization decisions.

---

### CRITICAL-003: Division by Zero Validation Comment Misleading

**Location:** `spec/contracts/API-solana-program.md:528, 532-564`

**Problem:** Code validates `price > 0` with comment "division by zero protection", but A→B formula **multiplies** by price (no division). Only B→A divides by price.

**✅ RECOMMENDED SOLUTION 1: Clarify Comment to Distinguish A→B vs B→A**

**Files to modify:**
1. `spec/contracts/API-solana-program.md` - Update validation comment

**Changes:**

**File 1: `spec/contracts/API-solana-program.md:528`**

BEFORE:
```rust
require!(market.price > 0, ErrorCode::InvalidPrice); // Division by zero protection
```

AFTER:
```rust
// Validate price > 0 for:
// - A→B: Prevents zero-output swaps (amount_b = input × 0 × ... = 0)
// - B→A: Prevents division by zero (amount_a = input / price)
require!(market.price > 0, ErrorCode::InvalidPrice);
```

**File 2: `spec/contracts/API-solana-program.md:540` (A→B formula comment)**

BEFORE:
```rust
let output_b = (input_a as u128)
    .checked_mul(market.price as u128)?
    .checked_mul(10u128.pow(market.decimals_b as u32))?
    .checked_div(1_000_000u128)?
    .checked_div(10u128.pow(market.decimals_a as u32))?;
```

AFTER:
```rust
// A→B: output_b = (input_a × price × 10^decimals_b) / (10^6 × 10^decimals_a)
// Note: Multiplies by price (no division by price), but price>0 prevents zero-output
let output_b = (input_a as u128)
    .checked_mul(market.price as u128)?  // If price=0, result=0 (undesirable)
    .checked_mul(10u128.pow(market.decimals_b as u32))?
    .checked_div(1_000_000u128)?
    .checked_div(10u128.pow(market.decimals_a as u32))?;
```

**File 3: `spec/contracts/API-solana-program.md:554` (B→A formula comment)**

BEFORE:
```rust
let output_a = (input_b as u128)
    .checked_mul(1_000_000u128)?
    .checked_mul(10u128.pow(market.decimals_a as u32))?
    .checked_div(market.price as u128)?
    .checked_div(10u128.pow(market.decimals_b as u32))?;
```

AFTER:
```rust
// B→A: output_a = (input_b × 10^6 × 10^decimals_a) / (price × 10^decimals_b)
// Note: Divides by price - REQUIRES price > 0 to prevent division by zero
let output_a = (input_b as u128)
    .checked_mul(1_000_000u128)?
    .checked_mul(10u128.pow(market.decimals_a as u32))?
    .checked_div(market.price as u128)?  // Division by zero if price=0
    .checked_div(10u128.pow(market.decimals_b as u32))?;
```

**🔄 ALTERNATIVE SOLUTION 2: Split Validation by Swap Direction**

**Files to modify:**
1. `spec/contracts/API-solana-program.md` - Add direction-specific validation

**Changes:**

**File 1: `spec/contracts/API-solana-program.md:528`**

REPLACE validation logic:
```rust
if swap_a_to_b {
    // A→B: price=0 produces zero output (technically valid but undesirable)
    require!(market.price > 0, ErrorCode::InvalidPrice);
    // ... A→B calculation
} else {
    // B→A: price=0 causes division by zero (mathematically invalid)
    require!(market.price > 0, ErrorCode::DivisionByZero);
    // ... B→A calculation
}
```

**Why Alternative NOT Recommended:** Over-engineering. Both directions should reject price=0. Comment clarification suffices.

---

## ⚠️ HIGH-PRIORITY FIXES (19 findings - RESOLVE IN CURRENT SPRINT)

### HIGH-001: Price = 0 Behavior Underspecified (A→B Direction)

**Location:** `spec/domain/05-INVARIANTS.md:718-727`

**Problem:** INV-SWP-005 validates price>0 for B→A, but A→B formula mathematically allows zero-output swaps. Spec inconsistent.

**✅ RECOMMENDED SOLUTION: Universally Reject price=0 for Swaps**

**Files to modify:**
1. `spec/domain/05-INVARIANTS.md` - Update INV-SWP-005 to cover both directions
2. `spec/tests/BDD-UC-004.md` - Update exception scenario

**Changes:**

**File 1: `spec/domain/05-INVARIANTS.md:722`**

BEFORE:
```markdown
### INV-SWP-005: Non-Zero Exchange Rate for Division Safety (B→A)
**Formal Statement:**
```
∀ swap ∈ Swaps WHERE swap.direction = B→A: swap.market.price > 0
```
```

AFTER:
```markdown
### INV-SWP-005: Non-Zero Exchange Rate for All Swaps
**Formal Statement:**
```
∀ swap ∈ Swaps: swap.market.price > 0
```

**English:** All swap transactions require a positive exchange rate, regardless of direction.

**Why enforced:**
- **B→A direction:** Prevents division by zero (output_a = input_b / price)
- **A→B direction:** Prevents zero-output swaps (output_b = input_a × 0 = 0), which are economically nonsensical (user donates tokens to vault)

**Enforcement:** Runtime validation in `swap` instruction (already implemented at API-solana-program.md:528)
```

**File 2: `spec/tests/BDD-UC-004.md` (update Exception 6)**

BEFORE:
```gherkin
Scenario: Swap B→A fails with price = 0
  Given market price is set to 0
  When user attempts swap B→A with 100 Token B
  Then transaction fails with "InvalidPrice"
```

AFTER:
```gherkin
Scenario: Any swap fails with price = 0
  Given market price is set to 0
  When user attempts swap A→B with 100 Token A
  Then transaction SHALL fail with error "InvalidPrice"
  And error message SHALL state "Exchange rate must be > 0"
  When user attempts swap B→A with 100 Token B
  Then transaction SHALL fail with error "InvalidPrice"
  And error message SHALL state "Exchange rate must be > 0"
  And no tokens SHALL be transferred
  And no SwapExecuted event SHALL be emitted
```

**🔄 ALTERNATIVE SOLUTION: Allow price=0 for A→B (Zero-Output Swaps)**

**Rationale:** Mathematically valid, might be useful for token burns/donations.

**Why NOT Recommended:** No legitimate use case. Creates confusion. Zero-output swaps should use explicit burn instructions.

---

### HIGH-002: PDA Market Seed Ordering Ambiguity

**Location:** `spec/domain/03-VALUE-OBJECTS.md:367`, `spec/domain/01-GLOSSARY.md:135`

**Problem:** Seeds `[b"market", token_mint_a, token_mint_b]` don't specify if mint ordering matters. Market(USDC, SOL) vs Market(SOL, USDC) create different PDAs.

**✅ RECOMMENDED SOLUTION: Directional Ordering (A=base, B=quote)**

**Files to modify:**
1. `spec/domain/01-GLOSSARY.md` - Add ordering semantics
2. `spec/domain/03-VALUE-OBJECTS.md` - Document ordering rule
3. `spec/adr/ADR-004-pda-architecture.md` - Add ordering rationale

**Changes:**

**File 1: `spec/domain/01-GLOSSARY.md` (add to Market definition)**

BEFORE:
```markdown
### Market
**Definition:** A trading pair configuration...
```

AFTER:
```markdown
### Market
**Definition:** A **directional** trading pair configuration that enables bidirectional swaps between Token A (base) and Token B (quote) at a fixed rate.

**Ordering Semantics:**
- Token A = **Base token** (first mint in PDA seeds)
- Token B = **Quote token** (second mint in PDA seeds)
- Market(USDC, SOL) ≠ Market(SOL, USDC) — these are **distinct markets** with **inverse prices**
- Example: Market(USDC, SOL) with price=0.05 (1 USDC = 0.05 SOL) vs Market(SOL, USDC) with price=20.0 (1 SOL = 20 USDC)

**Implication:** Swap pricing is asymmetric. UI should allow users to create markets in either direction.
```

**File 2: `spec/domain/03-VALUE-OBJECTS.md:367`**

BEFORE:
```markdown
**Derivation:** `Pubkey::find_program_address(&[b"market", mint_a.key().as_ref(), mint_b.key().as_ref()], program_id)`
```

AFTER:
```markdown
**Derivation:** `Pubkey::find_program_address(&[b"market", mint_a.key().as_ref(), mint_b.key().as_ref()], program_id)`

**Ordering:** Token mint order in seeds is **significant and directional**:
- `mint_a` = base token (denominator in price quotes)
- `mint_b` = quote token (numerator in price quotes)
- Market(USDC, SOL) and Market(SOL, USDC) are **distinct PDAs** with different prices
- **No canonical ordering** enforced (lexicographic or otherwise) — administrator chooses direction at initialization
```

**File 3: `spec/adr/ADR-004-pda-architecture.md` (add section)**

ADD AFTER "Decision" section:
```markdown
## Market Seed Ordering

**Ordering rule:** Directional (A=base, B=quote), NOT canonical.

**Rationale:**
- Matches traditional finance conventions (base/quote pairs)
- Allows symmetric markets (USDC/SOL and SOL/USDC with inverse prices)
- No need for lexicographic ordering (duplicates prevented by economic incentives — no reason to create Market(SOL,USDC) if Market(USDC,SOL) exists with inverse price)

**Alternatives considered:**
1. **Canonical lexicographic ordering** (e.g., always alphabetically lower mint first)
   - ❌ Breaks base/quote semantics
   - ❌ Forces unnatural price conventions
2. **Single-direction markets** with reverse swap formula
   - ❌ Complicates swap math (need conditional inversion)
   - ❌ Limits administrator flexibility

**Consequences:**
- UI must clearly label "Base" vs "Quote" during market creation
- Indexers must distinguish Market(A,B) from Market(B,A)
- Duplicate markets prevented by economic competition, not on-chain enforcement
```

**🔄 ALTERNATIVE SOLUTION: Canonical Lexicographic Ordering**

**Changes:**

**File 1: `spec/contracts/API-solana-program.md` (add to initialize_market)**

```rust
// Enforce canonical ordering (lexicographically lower mint = token_a)
require!(
    token_mint_a.key() < token_mint_b.key(),
    ErrorCode::MintOrderingViolation
);
```

**Why NOT Recommended:** Breaks base/quote semantics. Unnatural for users (forced to create SOL/USDC even if they think in USDC/SOL).

---

### HIGH-003: Liquidity Withdrawal Constraint Not Formalized

**Location:** `spec/domain/02-ENTITIES.md:215`, `spec/use-cases/UC-003.md:200-207`

**Problem:** BR-VLT-003 says "withdrawal not in scope" but no invariant enforces permanent liquidity lock. Unclear if on-chain constraint or just missing feature.

**✅ RECOMMENDED SOLUTION: Formalize as Invariant with Future Extension Note**

**Files to modify:**
1. `spec/domain/05-INVARIANTS.md` - Add INV-VLT-004
2. `spec/domain/02-ENTITIES.md` - Update BR-VLT-003
3. `spec/adr/ADR-008-no-withdrawal-mvp.md` - New ADR

**Changes:**

**File 1: `spec/domain/05-INVARIANTS.md` (add after INV-VLT-003)**

```markdown
### INV-VLT-004: Monotonic Vault Balance (No Withdrawal in MVP)
**Category:** Vault Invariant
**Formal Statement:**
```
∀ vault ∈ Vaults, ∀ t1, t2 ∈ Time WHERE t2 > t1:
  vault.balance(t2) ≥ vault.balance(t1) - total_swaps_out(t1, t2)
```

**English:** Vault balances are monotonically non-decreasing except for swap withdrawals. Direct liquidity withdrawal by authority is not permitted in MVP.

**Why enforced:** Prevents liquidity rug-pulls. In MVP, vaults are write-only (add_liquidity) and read-only for swaps. Future versions may add withdrawal with timelock/governance.

**Enforcement:** Omission (no withdraw_liquidity instruction exists)

**Out of scope:** Emergency withdrawal, partial withdrawal, liquidity migration (see ADR-008)

**Test assertion:**
```rust
#[test]
fn test_no_withdrawal_instruction_exists() {
    // Verify program IDL does not contain withdraw_liquidity instruction
    let idl = load_idl();
    assert!(!idl.instructions.iter().any(|i| i.name == "withdraw_liquidity"));
}
```
```

**File 2: `spec/domain/02-ENTITIES.md:215`**

BEFORE:
```markdown
- **BR-VLT-003**: Withdrawal not in scope for MVP (vaults are write-only for administrators)
```

AFTER:
```markdown
- **BR-VLT-003**: Liquidity withdrawal **not permitted in MVP** (vaults are append-only). Administrator can add liquidity via `add_liquidity`, but cannot withdraw. Enforced by INV-VLT-004 and omission of `withdraw_liquidity` instruction. **Rationale:** Prevents rug-pulls, simplifies security model. See ADR-008 for future withdrawal design.
```

**File 3: `spec/adr/ADR-008-no-withdrawal-mvp.md`** (NEW FILE)

```markdown
# ADR-008: No Liquidity Withdrawal in MVP

**Status:** Accepted
**Date:** 2026-03-22
**Deciders:** Specifications Engineer

## Context

Administrators can add liquidity to vaults via `add_liquidity`, but there is no `withdraw_liquidity` instruction. This creates permanent liquidity lock.

## Decision

**Omit liquidity withdrawal** from MVP scope. Vaults are append-only.

## Rationale

**FOR omission:**
- Simpler security model (no authorization for withdrawal)
- Prevents liquidity rug-pulls (trust minimization)
- Focus MVP on core swap functionality
- Educational value: students learn tradeoffs of immutability

**AGAINST omission:**
- No fund recovery if market becomes obsolete
- Administrator cannot rebalance liquidity across markets
- No exit strategy for liquidity providers

## Future Design (Post-MVP)

**Option 1: Timelock Withdrawal**
- Announce withdrawal intent 7 days in advance
- Users can exit positions before liquidity removed

**Option 2: Governance-Gated Withdrawal**
- Require multi-sig or DAO vote for withdrawal
- Prevents unilateral rug-pulls

**Option 3: Partial Withdrawal with Minimum Reserve**
- Allow withdrawal only if vault retains ≥50% of peak liquidity
- Ensures market remains functional

## Consequences

**Positive:**
- Maximum trust minimization
- No withdrawal authorization bugs
- Simpler audit surface

**Negative:**
- Permanent fund lock (recovery requires program upgrade or migration)
- Not production-ready (real DEXs need withdrawal)

**Mitigation:**
- Document prominently in README
- Add UI warning: "Liquidity is PERMANENT - no withdrawal in MVP"
- Include withdrawal design in research questions for plan-architect phase
```

**🔄 ALTERNATIVE SOLUTION: Implement Emergency Withdrawal with Multi-Sig**

**Why NOT Recommended:** Out of MVP scope, adds significant complexity (multi-sig coordination, authorization checks).

---

### HIGH-004: Missing Authority Field in LiquidityAdded Event

**Location:** `spec/contracts/EVENTS-swap-program.md:265-281`

**Problem:** `LiquidityAdded` event lacks `authority` field (who added liquidity). Inconsistent with `MarketInitialized` which includes authority.

**✅ RECOMMENDED SOLUTION: Add Authority to All Administrative Events**

**Files to modify:**
1. `spec/contracts/EVENTS-swap-program.md` - Update LiquidityAdded and PriceSet events
2. `spec/contracts/API-solana-program.md` - Update emit! calls

**Changes:**

**File 1: `spec/contracts/EVENTS-swap-program.md:270`**

BEFORE:
```rust
#[event]
pub struct LiquidityAdded {
    pub market: Pubkey,
    pub amount_a: u64,
    pub amount_b: u64,
    pub vault_a_balance: u64,
    pub vault_b_balance: u64,
    pub timestamp: i64,
}
```

AFTER:
```rust
#[event]
pub struct LiquidityAdded {
    pub market: Pubkey,
    pub authority: Pubkey,          // NEW: Who added the liquidity
    pub amount_a: u64,
    pub amount_b: u64,
    pub vault_a_balance: u64,
    pub vault_b_balance: u64,
    pub timestamp: i64,
}
```

**File 2: `spec/contracts/EVENTS-swap-program.md:190` (PriceSet event)**

BEFORE:
```rust
#[event]
pub struct PriceSet {
    pub market: Pubkey,
    pub old_price: u64,
    pub new_price: u64,
    pub timestamp: i64,
}
```

AFTER:
```rust
#[event]
pub struct PriceSet {
    pub market: Pubkey,
    pub authority: Pubkey,          // NEW: Who set the price
    pub old_price: u64,
    pub new_price: u64,
    pub timestamp: i64,
}
```

**File 3: `spec/contracts/API-solana-program.md:304` (set_price emit)**

BEFORE:
```rust
emit!(PriceSet {
    market: ctx.accounts.market.key(),
    old_price,
    new_price: new_price,
    timestamp: Clock::get()?.unix_timestamp,
});
```

AFTER:
```rust
emit!(PriceSet {
    market: ctx.accounts.market.key(),
    authority: ctx.accounts.authority.key(),  // NEW
    old_price,
    new_price: new_price,
    timestamp: Clock::get()?.unix_timestamp,
});
```

**File 4: `spec/contracts/API-solana-program.md:416` (add_liquidity emit)**

BEFORE:
```rust
emit!(LiquidityAdded {
    market: ctx.accounts.market.key(),
    amount_a,
    amount_b,
    vault_a_balance: ctx.accounts.vault_a.amount,
    vault_b_balance: ctx.accounts.vault_b.amount,
    timestamp: Clock::get()?.unix_timestamp,
});
```

AFTER:
```rust
emit!(LiquidityAdded {
    market: ctx.accounts.market.key(),
    authority: ctx.accounts.authority.key(),  // NEW
    amount_a,
    amount_b,
    vault_a_balance: ctx.accounts.vault_a.amount,
    vault_b_balance: ctx.accounts.vault_b.amount,
    timestamp: Clock::get()?.unix_timestamp,
});
```

**File 5: `spec/contracts/EVENTS-swap-program.md:292` (Update SQL schema)**

BEFORE:
```sql
CREATE TABLE liquidity_events (
    id SERIAL PRIMARY KEY,
    market VARCHAR(44) NOT NULL,
    amount_a BIGINT NOT NULL,
    ...
);
```

AFTER:
```sql
CREATE TABLE liquidity_events (
    id SERIAL PRIMARY KEY,
    market VARCHAR(44) NOT NULL,
    authority VARCHAR(44) NOT NULL,  -- NEW
    amount_a BIGINT NOT NULL,
    ...
);

CREATE TABLE price_events (
    id SERIAL PRIMARY KEY,
    market VARCHAR(44) NOT NULL,
    authority VARCHAR(44) NOT NULL,  -- NEW
    old_price BIGINT NOT NULL,
    ...
);
```

**🔄 ALTERNATIVE SOLUTION: Fetch Authority from Market Account in Indexer**

**Rationale:** Market already stores authority - indexer can join tables.

**Why NOT Recommended:** Inefficient (requires second query), authority could theoretically change in future upgrades.

---

### HIGH-005 through HIGH-019: Summary with Solutions

Due to length, I'll provide condensed solutions for remaining HIGH findings:

| ID | Problem | Recommended Fix | Files |
|----|---------|----------------|-------|
| HIGH-005 | Conditional event emission "(if implemented)" | Remove qualifier - events ARE implemented | API-solana-program.md (4 locations) |
| HIGH-006 | Missing validation code for zero amounts | Add explicit code examples for all validations | API-solana-program.md (add_liquidity, set_price) |
| HIGH-007 | Missing Anchor imports in UI code | Add `import * as anchor from "@coral-xyz/anchor"` | API-web-ui.md (3 components) |
| HIGH-008 | price=0 validation contradiction BDD vs API | Add validation to set_price OR update BDD scenario | BDD-UC-002.md, API-solana-program.md |
| HIGH-009 | Asymmetric price validation not formalized | Split INV-SWP-005 into INV-SWP-A2B and INV-SWP-B2A | 05-INVARIANTS.md |
| HIGH-010 | Decimal mismatch in examples | Standardize to decimals_a=9, decimals_b=9 | UC-004, UC-005 |
| HIGH-011 | RPC response time warning threshold missing | Add warning threshold (300ms) to NFR-001 | PERFORMANCE.md |
| HIGH-012 | Websocket latency not quantified | Add target: account changes < 200ms | PERFORMANCE.md |
| HIGH-013 | Token decimals enforcement ambiguity | Clarify: system supports 0-18, examples use 6-9 | LIMITS.md, GLOSSARY.md |
| HIGH-014 | REQ-NF-007 referenced but not defined | Remove references OR define REQ-NF-007 (slippage) | TRACEABILITY-MATRIX.md, UC-005.md |
| HIGH-015 | Implicit Solana block time assumption | Make explicit: p99 finality < 800ms (devnet) | PERFORMANCE.md |
| HIGH-016 | "Sufficient liquidity" semantic ambiguity | Define: vault_balance >= calculated_output | 01-GLOSSARY.md, INV-SWP-003 |
| HIGH-017 | ADR-001 overhead threshold undefined | Specify: >20% boilerplate = excessive | ADR-001-anchor-framework.md |
| HIGH-018 | ADR-003 authority mutability contradiction | Clarify: immutable per-market, mutable via new market | ADR-003-single-authority.md |
| HIGH-019 | False 100% traceability coverage claim | Update: 95.2% (40/42 requirements traced) | TRACEABILITY-MATRIX.md |

---

## 📋 MEDIUM FIXES (40 findings - Backlog)

Given space constraints, I'll provide a summary table. Full "before/after" diffs available on request.

| ID | Category | Problem Summary | Recommended Fix | Files |
|----|----------|----------------|----------------|-------|
| MED-001 | Entities | Future states (Paused, Closed) undefined | Move to "Out of Scope" section | 04-STATES.md |
| MED-002 | Value Objects | ExchangeRate precision loss not documented | Document truncation, add validation | 03-VALUE-OBJECTS.md |
| MED-003 | Events | Event ordering/deduplication not specified | Specify "one event per instruction" | 01-GLOSSARY.md, 05-INVARIANTS.md |
| MED-004 | Glossary | "Liquidity" term overloaded | Split into "Vault Liquidity" vs "Market Liquidity" | 01-GLOSSARY.md |
| MED-005 | Glossary | "Atomic" applies to swaps but not other ops | Clarify scope: only swap transfers are atomic | 01-GLOSSARY.md |
| MED-006 | Terminology | "Initializer" vs "Administrator" inconsistent | Use "Administrator" everywhere | UC-001, API-solana-program |
| MED-007 | Terminology | ATA acronym used before definition | Define ATA in Glossary before first use | Multiple files |
| MED-008 | Use Cases | WF-001 missing link to UC-003 (Add Liquidity) | Add step reference | WF-001.md |
| MED-009 | Use Cases | UC-003 alternative flow orphaned | Link to WF-001 or remove | UC-003.md |
| MED-010 | Use Cases | UC-004 precision loss not in exception flows | Add Exception 5: Large Amount Precision Loss | UC-004.md |
| MED-011 | BDD | Atomicity test missing for partial swap failure | Add scenario for failed vault→user transfer | BDD-UC-004.md |
| MED-012 | BDD | Event field validation missing in BDD scenarios | Add assertions for all event fields | BDD-UC-001 through UC-005 |
| MED-013 | BDD | Connection persistence time not tested | Add scenario for 23hr vs 25hr session | BDD-UC-006.md |
| MED-014 | Property Tests | PROP-001 tolerance (±1 token) arbitrary | Justify or reduce to ±0 with rounding rules | PROPERTY-TESTS.md |
| MED-015 | Property Tests | Missing generator for decimal mismatch cases | Add strategy for (decimals_a, decimals_b) combos | PROPERTY-TESTS.md |
| MED-016 | API | Error code enum not specified | Add ErrorCode enum with all variants | API-solana-program.md |
| MED-017 | API | Missing Context struct definitions for 2 instructions | Add SetPrice and AddLiquidity context structs | API-solana-program.md |
| MED-018 | Events | Missing authority field in PriceSet (duplicate HIGH-004) | Merge with HIGH-004 | EVENTS-swap-program.md |
| MED-019 | Events | Event indexing strategy incomplete (missing indexes) | Add indexes for (market, timestamp), (authority) | EVENTS-swap-program.md |
| MED-020 | Permissions | set_price missing from summary table | Add row to summary table | PERMISSIONS-MATRIX.md |
| MED-021 | UI API | Missing error handling in all components | Add try/catch with user-friendly messages | API-web-ui.md |
| MED-022 | UI API | Wallet adapter initialization not shown | Add WalletProvider setup code | API-web-ui.md |
| MED-023 | NFRs | RPC failover strategy not specified | Add multi-RPC strategy: retry 3 endpoints | PERFORMANCE.md |
| MED-024 | NFRs | Transaction confirmation strategy undefined | Specify: wait for "confirmed" commitment | PERFORMANCE.md |
| MED-025 | NFRs | No quantified target for UI "responsive" | Define: all interactions < 100ms to first feedback | PERFORMANCE.md |
| MED-026 | NFRs | "Modern" UI libraries not defined | List: React 18+, TypeScript 5+, Tailwind 3+ | SECURITY.md |
| MED-027 | NFRs | Test coverage target not in LIMITS | Add: >80% line coverage, 100% critical paths | LIMITS.md |
| MED-028 | Invariants | INV-GLOBAL-001 referenced but not defined | Remove reference OR define global invariants | 05-INVARIANTS.md |
| MED-029 | Invariants | Decimal overflow edge case (18 decimals) not covered | Add INV-CALC-003 for max decimal handling | 05-INVARIANTS.md |
| MED-030 | ADRs | ADR-002 no mention of slippage future design | Add to Consequences: "Post-MVP: add slippage params" | ADR-002-fixed-price.md |
| MED-031 | ADRs | ADR-005 missing performance impact of checked_mul | Add: ~5-10% overhead vs unchecked (acceptable) | ADR-005-checked-arithmetic.md |
| MED-032 | ADRs | ADR-006 event storage cost not quantified | Add: ~500 lamports per event (~$0.0001) | ADR-006-event-emission.md |
| MED-033 | Traceability | Matrix claims 100% but shows 95.2% in data | Fix claim to match data | TRACEABILITY-MATRIX.md |
| MED-034 | Traceability | REQ-C-003 through REQ-C-006 missing from matrix | Add rows or document as out-of-scope | TRACEABILITY-MATRIX.md |
| MED-035 | Traceability | Orphan UC references (UC-007, UC-008 non-existent) | Remove orphan refs from matrix | TRACEABILITY-MATRIX.md |
| MED-036 | README | Build command incorrect (should use anchor build) | Update to: `anchor build && anchor deploy` | README.md |
| MED-037 | README | Missing environment setup (Anchor, Rust versions) | Add prerequisites section with versions | README.md |
| MED-038 | RESEARCH | Question 1 already answered (React + wallet-adapter) | Move to ADR-009-ui-library-selection.md | RESEARCH-QUESTIONS.md |
| MED-039 | RESEARCH | Question 3 missing cost analysis | Add CU benchmarking methodology | RESEARCH-QUESTIONS.md |
| MED-040 | RESEARCH | Missing question: withdrawal mechanism design | Add RQ-007: Liquidity withdrawal for post-MVP | RESEARCH-QUESTIONS.md |

---

## 📌 LOW FIXES (16 findings - Continuous Improvement)

| ID | Category | Problem | Fix | Files |
|----|----------|---------|-----|-------|
| LOW-001 | Style | Inconsistent heading capitalization | Standardize to Title Case | Multiple |
| LOW-002 | Glossary | "Synonyms" formatting inconsistent | Use bullets everywhere | 01-GLOSSARY.md |
| LOW-003 | Glossary | Missing cross-refs to related terms | Add "See also: X, Y, Z" | 01-GLOSSARY.md |
| LOW-004 | Use Cases | Priority "Must" vs "Must have" inconsistent | Standardize to MoSCoW (Must have) | UC-001 through UC-006 |
| LOW-005 | Workflows | Actor list incomplete (missing Administrator) | Add Administrator to WF-002 actors | WF-002.md |
| LOW-006 | BDD | Step verb inconsistency (SHALL vs MUST) | Use SHALL everywhere (RFC 2119) | All BDD files |
| LOW-007 | BDD | Background duplicated across 6 files | Extract to shared BACKGROUND.md | BDD-UC-001 through UC-006 |
| LOW-008 | Property | Missing proptest import in PROP-001 | Add `use proptest::prelude::*;` | PROPERTY-TESTS.md |
| LOW-009 | API | Inconsistent parameter naming (new_price vs price) | Standardize: use full descriptive names | API-solana-program.md |
| LOW-010 | Events | Timestamp field type inconsistent (i64 vs u64) | Use i64 everywhere (Unix standard) | EVENTS-swap-program.md |
| LOW-011 | Permissions | Matrix missing "N/A" for non-applicable cells | Use "N/A" instead of blank | PERMISSIONS-MATRIX.md |
| LOW-012 | NFRs | SECURITY.md missing OWASP ASVS version | Specify: OWASP ASVS 4.0.3 | SECURITY.md |
| LOW-013 | NFRs | OBSERVABILITY.md missing alert thresholds | Add critical/warning levels for all metrics | OBSERVABILITY.md |
| LOW-014 | Invariants | Test assertion language mix (Rust + pseudo) | Use pure Rust for all assertions | 05-INVARIANTS.md |
| LOW-015 | Traceability | Matrix missing "Last Updated" field | Add timestamp to header | TRACEABILITY-MATRIX.md |
| LOW-016 | README | Missing contribution guidelines | Add CONTRIBUTING.md reference | README.md |

---

## 📊 Dependency Graph

Some findings depend on others being resolved first:

```
CRITICAL-001 (same token validation)
  └─> MED-001 (update BDD exception scenario)

CRITICAL-003 (price validation comment)
  └─> HIGH-001 (price=0 behavior A→B)
      └─> HIGH-009 (asymmetric price invariants)

HIGH-004 (event authority fields)
  └─> MED-018 (duplicate - merge)
  └─> MED-019 (SQL schema indexes)

HIGH-014 (REQ-NF-007 undefined)
  └─> MED-033 (traceability percentage)
  └─> MED-034 (missing REQ-C rows)
```

**Recommended Order:**
1. Resolve all CRITICAL findings first (3 fixes)
2. Resolve HIGH findings with no dependencies (HIGH-002, HIGH-003, HIGH-005, HIGH-006, HIGH-007)
3. Resolve HIGH findings with dependencies (HIGH-001, HIGH-004, HIGH-009, HIGH-014)
4. Batch-apply MEDIUM fixes (can be done in parallel)
5. Batch-apply LOW fixes (can be done in parallel)

---

## 🎯 Batch Execution Plan

**Total modifications: 45 file changes**

**Phase 1: CRITICAL (Estimated 15 minutes)**
- 9 file edits (02-ENTITIES.md, 05-INVARIANTS.md, API-solana-program.md, BDD-UC-001.md, PERFORMANCE.md, LIMITS.md, 01-GLOSSARY.md, 03-VALUE-OBJECTS.md, ADR-004.md)
- 3 new files (ADR-007, ADR-008, ADR-009)

**Phase 2: HIGH (Estimated 25 minutes)**
- 18 file edits (all use cases, BDD tests, API specs, events, NFRs)
- 1 new file (ADR-008 if not created in CRITICAL)

**Phase 3: MEDIUM (Estimated 20 minutes)**
- 16 file edits (glossary, value objects, property tests, traceability, README)

**Phase 4: LOW (Estimated 10 minutes)**
- 8 file edits (style consistency, documentation polish)

**Phase 5: Verification (Estimated 5 minutes)**
- Re-run spec-auditor
- Verify 0 findings in categories CAT-01 through CAT-05
- Accept remaining CAT-08 (evolution risks) as deferred

**Total estimated time: 75 minutes**

---

## ✅ User Decision Required

**QUESTION:** Proceed with BATCH mode (auto-apply all ✅ recommended solutions)?

**Option 1: BATCH MODE (Recommended)**
- Apply all 78 fixes automatically
- User reviews final diffs after completion
- Fastest path to clean audit

**Option 2: INTERACTIVE MODE**
- Pause at each finding
- Choose between recommended vs alternative solution
- Slowest but maximum control

**Option 3: CRITICAL-ONLY MODE**
- Apply only 3 critical fixes
- Defer HIGH/MEDIUM/LOW to manual review
- Minimal changes, passes quality gate

---

**Since user requested autonomous execution ("ejecuta todo sin pedir permisos"), proceeding with BATCH MODE...**

---

**End of Corrections Plan**
**Next:** Apply all recommended solutions in dependency order
