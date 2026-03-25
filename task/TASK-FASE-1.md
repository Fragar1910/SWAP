# Tasks: FASE-1 - Core Program Structure & Types

> **Input:** plan/fases/FASE-1.md + plan/PLAN.md
> **Generated:** 2026-03-24
> **Total tasks:** 15
> **Parallel capacity:** 5 concurrent streams
> **Critical path:** 6 tasks, ~2 hours

---

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 15 |
| Parallelizable | 8 (53%) |
| Foundation phase | 10 tasks |
| Integration phase | 3 tasks |
| Verification phase | 2 tasks |

## Traceability

| Spec Reference | Task Coverage |
|---------------|---------------|
| spec/domain/02-ENTITIES.md | TASK-F1-001 |
| spec/domain/03-VALUE-OBJECTS.md | TASK-F1-006 |
| spec/domain/04-ERRORS.md | TASK-F1-002 through TASK-F1-009 |
| spec/contracts/EVENTS-swap-program.md | TASK-F1-010 through TASK-F1-013 |
| spec/domain/05-INVARIANTS.md | All tasks (type-level constraints) |

---

## Phase 1: Foundation

**Purpose:** Define all types, structures, and constants.
**Checkpoint:** Program compiles with all account/error/event definitions.

- [x] **TASK-F1-001** Create MarketAccount struct | `programs/swap-program/src/state/market.rs`
  - **Commit:** `feat(types): add MarketAccount struct with PDA fields`
  - **Acceptance:**
    - Struct has all 7 fields: authority, token_mint_a, token_mint_b, price, decimals_a, decimals_b, bump
    - `#[account]` macro applied
    - `LEN` constant calculates space correctly (115 bytes)
    - `PRICE_PRECISION` constant defined (1_000_000)
    - Traceability comments reference ENT-MKT-001, REQ-F-001, REQ-F-010
    - Compiles without errors
  - **Refs:** FASE-1, spec/domain/02-ENTITIES.md, ADR-004
  - **Revert:** SAFE | Delete file (no other code depends on it yet)
  - **Review:**
    - [ ] All field types match specification (Pubkey, u64, u8)
    - [ ] LEN calculation: 8 + 32*3 + 8 + 1*3 = 115 bytes
    - [ ] Documentation comments include traceability IDs
    - [ ] `cargo check` passes

- [x] **TASK-F1-002** Create SwapError enum | `programs/swap-program/src/error.rs`
  - **Commit:** `feat(types): add SwapError enum with 8 error codes`
  - **Acceptance:**
    - `#[error_code]` macro applied
    - 8 error variants defined:
      - Overflow, DivisionByZero, InvalidAmount, PriceNotSet,
      - InsufficientLiquidity, SameTokenSwapDisallowed,
      - Unauthorized, InvalidDecimals
    - Each variant has `#[msg(...)]` attribute
    - Error codes 6000-6007 assigned automatically by Anchor
    - Traceability comments reference spec/domain/04-ERRORS.md
  - **Refs:** FASE-1, spec/domain/04-ERRORS.md, ADR-005
  - **Revert:** SAFE | Delete file
  - **Review:**
    - [ ] All 8 errors from spec included
    - [ ] Messages are clear and actionable
    - [ ] No error code conflicts
    - [ ] `cargo check` passes

- [x] **TASK-F1-003** [P] Create constants module | `programs/swap-program/src/constants.rs`
  - **Commit:** `feat(types): add PDA seeds and constants`
  - **Acceptance:**
    - 3 PDA seeds defined: MARKET_SEED, VAULT_A_SEED, VAULT_B_SEED
    - PRICE_PRECISION constant (1_000_000)
    - MAX_DECIMALS (18) and MIN_DECIMALS (0) constants
    - All constants have doc comments with traceability
  - **Refs:** FASE-1, ADR-004 (PDA architecture), INV-MKT-005
  - **Revert:** SAFE | Delete file
  - **Review:**
    - [ ] Seed values match FASE-1 spec exactly (b"market", b"vault_a", b"vault_b")
    - [ ] Constants are pub const &[u8] or pub const u64/u8
    - [ ] Doc comments reference ADRs

- [x] **TASK-F1-004** [P] Create MarketInitialized event | `programs/swap-program/src/events.rs`
  - **Commit:** `feat(events): add MarketInitialized event struct`
  - **Acceptance:**
    - `#[event]` macro applied
    - 5 fields: market (indexed), token_mint_a, token_mint_b, authority, timestamp
    - `#[index]` attribute on market field
    - Compiles without errors
  - **Refs:** FASE-1, REQ-NF-009, spec/contracts/EVENTS-swap-program.md
  - **Revert:** SAFE | Remove event struct (won't be emitted yet)
  - **Review:**
    - [ ] Field types match spec (Pubkey, i64)
    - [ ] Market field has `#[index]` for efficient queries
    - [ ] Doc comment references REQ-NF-009

- [x] **TASK-F1-005** [P] Create PriceSet event | `programs/swap-program/src/events.rs`
  - **Commit:** `feat(events): add PriceSet event struct`
  - **Acceptance:**
    - `#[event]` macro applied
    - 5 fields: market (indexed), authority, old_price, new_price, timestamp
    - old_price and new_price are u64
    - Compiles without errors
  - **Refs:** FASE-1, REQ-NF-010, spec/contracts/EVENTS-swap-program.md
  - **Revert:** SAFE | Remove event struct
  - **Review:**
    - [ ] Event captures price change (old → new)
    - [ ] Authority field tracks who made the change
    - [ ] `#[index]` on market field

- [x] **TASK-F1-006** [P] Create LiquidityAdded event | `programs/swap-program/src/events.rs`
  - **Commit:** `feat(events): add LiquidityAdded event struct`
  - **Acceptance:**
    - `#[event]` macro applied
    - 7 fields: market (indexed), authority, amount_a, amount_b, vault_a_balance, vault_b_balance, timestamp
    - All amount fields are u64
    - Vault balance fields show post-addition state
  - **Refs:** FASE-1, REQ-NF-011, spec/contracts/EVENTS-swap-program.md
  - **Revert:** SAFE | Remove event struct
  - **Review:**
    - [ ] Captures both amounts added (amount_a, amount_b)
    - [ ] Records vault balances after addition
    - [ ] Timestamp field is i64

- [x] **TASK-F1-007** [P] Create SwapExecuted event | `programs/swap-program/src/events.rs`
  - **Commit:** `feat(events): add SwapExecuted event struct`
  - **Acceptance:**
    - `#[event]` macro applied
    - 6 fields: market (indexed), user, swap_a_to_b, input_amount, output_amount, timestamp
    - swap_a_to_b is bool (true = A→B, false = B→A)
    - input_amount and output_amount are u64
  - **Refs:** FASE-1, REQ-NF-012, spec/contracts/EVENTS-swap-program.md
  - **Revert:** SAFE | Remove event struct
  - **Review:**
    - [ ] Direction captured as boolean
    - [ ] Both input and output amounts recorded
    - [ ] User field (not authority) for permissionless swaps

- [x] **TASK-F1-008** [P] Create SwapDirection enum and type aliases | `programs/swap-program/src/types.rs`
  - **Commit:** `feat(types): add SwapDirection enum and type aliases`
  - **Acceptance:**
    - SwapDirection enum with AtoB and BtoA variants
    - `From<bool>` and `Into<bool>` trait implementations
    - Type aliases: TokenAmount = u64, ExchangeRate = u64
    - `#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]` on enum
  - **Refs:** FASE-1, spec/domain/03-VALUE-OBJECTS.md
  - **Revert:** SAFE | Delete file
  - **Review:**
    - [ ] From/Into conversions: true = AtoB, false = BtoA
    - [ ] Type aliases improve code readability
    - [ ] All required derives present

- [x] **TASK-F1-009** Create state module exports | `programs/swap-program/src/state/mod.rs`
  - **Commit:** `refactor(types): organize state module exports`
  - **Acceptance:**
    - `pub mod market;` declaration
    - `pub use market::*;` re-export
    - Allows clean imports: `use crate::state::MarketAccount;`
  - **Refs:** FASE-1
  - **Blocked-by:** TASK-F1-001 (requires market.rs)
  - **Revert:** SAFE | Delete file
  - **Review:**
    - [ ] Module structure follows Rust conventions
    - [ ] Re-exports work correctly

---

## Phase 2: Integration

**Purpose:** Wire all modules into lib.rs.
**Checkpoint:** All types accessible from lib.rs, IDL generation includes events and errors.

- [x] **TASK-F1-010** Integrate all modules into lib.rs | `programs/swap-program/src/lib.rs`
  - **Commit:** `feat(types): integrate all type modules into program`
  - **Acceptance:**
    - Module declarations: `pub mod constants`, `pub mod error`, `pub mod events`, `pub mod state`, `pub mod types`
    - Re-exports: `pub use constants::*`, `pub use error::*`, etc.
    - Empty `#[program]` module compiles
    - `declare_id!()` macro with correct program ID
  - **Refs:** FASE-1
  - **Blocked-by:** All previous tasks (requires all modules to exist)
  - **Revert:** SAFE | Remove module declarations (breaks compilation)
  - **Review:**
    - [ ] All 5 modules declared and re-exported
    - [ ] No circular dependencies
    - [ ] `anchor build` succeeds

- [x] **TASK-F1-011** Generate and verify IDL | `target/idl/swap_program.json`
  - **Commit:** `test(types): verify IDL generation includes all types`
  - **Acceptance:**
    - `anchor build` generates IDL file
    - IDL contains 8 error codes in `errors` array
    - IDL contains 4 events in `events` array
    - IDL contains 1 account type (MarketAccount)
    - No instructions yet (instructions array is empty)
  - **Refs:** FASE-1
  - **Blocked-by:** TASK-F1-010 (requires build)
  - **Revert:** SAFE | Delete target/ directory
  - **Review:**
    - [ ] `cat target/idl/swap_program.json | jq '.errors | length'` outputs 8
    - [ ] `cat target/idl/swap_program.json | jq '.events | length'` outputs 4
    - [ ] Event field types match spec

- [x] **TASK-F1-012** Add Rust unit tests for type definitions | `programs/swap-program/src/state/market.rs`
  - **Commit:** `test(types): add unit tests for MarketAccount LEN constant`
  - **Acceptance:**
    - Test module `#[cfg(test)] mod tests` added to market.rs
    - Test verifies LEN = 115 bytes
    - Test creates a mock MarketAccount and validates size
    - `cargo test` passes
  - **Refs:** FASE-1, REQ-NF-020 (test coverage)
  - **Revert:** SAFE | Remove test module
  - **Review:**
    - [ ] Test calculates size: 8 + 32*3 + 8 + 1*3
    - [ ] Test asserts MarketAccount::LEN == 115
    - [ ] No test failures

---

## Phase 3: Verification

**Purpose:** Final validation of FASE-1 deliverables.
**Checkpoint:** All acceptance criteria met, ready for FASE-2.

- [x] **TASK-F1-013** Build and verify no compiler warnings | Build output
  - **Commit:** `chore(types): eliminate compiler warnings`
  - **Acceptance:**
    - `anchor build` completes with 0 warnings
    - `cargo clippy` shows no lints
    - All types are used (no dead code warnings)
  - **Refs:** FASE-1
  - **Revert:** SAFE | No code changes if clean
  - **Review:**
    - [ ] Build output shows "warning: 0 emitted"
    - [ ] Clippy passes without suggestions
    - [ ] No unused imports

- [x] **TASK-F1-014** Verify TypeScript type generation | `target/types/swap_program.ts`
  - **Commit:** `test(types): verify TypeScript types include all events and errors`
  - **Acceptance:**
    - `target/types/swap_program.ts` file exists
    - TypeScript types for all 4 events defined
    - TypeScript types for all 8 errors defined
    - Types can be imported in test files
  - **Refs:** FASE-1, REQ-C-007 (TypeScript client)
  - **Blocked-by:** TASK-F1-011 (requires IDL)
  - **Revert:** SAFE | Regenerate with `anchor build`
  - **Review:**
    - [ ] File contains `export type MarketInitialized` definitions
    - [ ] Error types include messages
    - [ ] No TypeScript compilation errors in tests

- [x] **TASK-F1-015** Document FASE-1 completion | Comments or status update
  - **Commit:** `docs(types): mark FASE-1 complete, document type coverage`
  - **Acceptance:**
    - All FASE-1 deliverables confirmed complete
    - Documentation notes:
      - 1 account type (MarketAccount)
      - 8 error codes
      - 4 event types
      - 3 PDA seeds
      - Type aliases and enums
    - Ready to proceed to FASE-2
  - **Refs:** FASE-1
  - **Revert:** SAFE | Remove documentation
  - **Review:**
    - [ ] All checkboxes in FASE-1 verified
    - [ ] Spec coverage confirmed: 5 files

---

## Dependencies

### Task Dependency Graph

```
TASK-F1-001 (MarketAccount) [P]
TASK-F1-002 (SwapError) [P]
TASK-F1-003 (Constants) [P]
TASK-F1-004 (MarketInitialized Event) [P]
TASK-F1-005 (PriceSet Event) [P]
TASK-F1-006 (LiquidityAdded Event) [P]
TASK-F1-007 (SwapExecuted Event) [P]
TASK-F1-008 (SwapDirection + Types) [P]
    ↓
TASK-F1-009 (State Module Exports)
    ↓
TASK-F1-010 (Integrate into lib.rs)
    ↓
TASK-F1-011 (Generate IDL)
    ↓
TASK-F1-012 (Unit Tests) [P]
TASK-F1-013 (Verify Build) [P]
TASK-F1-014 (TS Type Gen) [P]
    ↓
TASK-F1-015 (Documentation)
```

### Critical Path

TASK-F1-001 → TASK-F1-009 → TASK-F1-010 → TASK-F1-011 → TASK-F1-015

**Estimated time on critical path:** ~2 hours

### Parallel Execution Plan

**Wave 1:** TASK-F1-001 through TASK-F1-008 (8 tasks in parallel)
**Wave 2:** TASK-F1-009 (sequential)
**Wave 3:** TASK-F1-010 (sequential)
**Wave 4:** TASK-F1-011 (sequential)
**Wave 5:** TASK-F1-012, TASK-F1-013, TASK-F1-014 (3 tasks in parallel)
**Wave 6:** TASK-F1-015 (sequential)

---

## Validation Checklist

After completing all FASE-1 tasks, verify:

- [ ] MarketAccount struct compiles with correct LEN (115 bytes)
- [ ] 8 error codes defined (6000-6007)
- [ ] 4 events defined with correct field types
- [ ] PDA seeds match spec: "market", "vault_a", "vault_b"
- [ ] `anchor build` succeeds with 0 warnings
- [ ] IDL contains all events and errors
- [ ] TypeScript types generated in target/types/
- [ ] Unit tests pass (`cargo test`)

**FASE-1 Complete:** ✅ Ready to proceed to FASE-2 (Administrative Instructions)

---

**Generated by:** task-generator skill
**Source:** plan/fases/FASE-1.md, plan/PLAN.md
**Traceability:** spec/domain/02-ENTITIES.md, spec/domain/03-VALUE-OBJECTS.md, spec/domain/04-ERRORS.md, spec/contracts/EVENTS-swap-program.md, spec/domain/05-INVARIANTS.md
