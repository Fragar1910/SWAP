# Tasks: FASE-3 - Swap Instructions & Core Exchange Logic

> **Input:** plan/fases/FASE-3.md
> **Generated:** 2026-03-24
> **Total tasks:** 22
> **Parallel capacity:** 3 concurrent streams
> **Critical path:** 12 tasks, ~5 hours

---

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 22 |
| Parallelizable | 10 (45%) |
| Foundation phase | 8 tasks |
| Integration phase | 3 tasks |
| Test phase | 9 tasks |
| Verification phase | 2 tasks |
| Estimated effort | 8 hours |

## Traceability

| Spec Reference | Task Coverage |
|---------------|---------------|
| UC-004 | TASK-F3-001 through F3-022 |
| UC-005 | TASK-F3-001 through F3-022 |
| REQ-F-006 | TASK-F3-003, TASK-F3-008, TASK-F3-013 |
| REQ-F-007 | TASK-F3-004, TASK-F3-008, TASK-F3-014 |
| REQ-F-009 | TASK-F3-008 (permissionless swap) |
| ADR-002 | TASK-F3-001, TASK-F3-002, TASK-F3-003, TASK-F3-004 |
| ADR-005 | TASK-F3-001 through F3-004 (checked arithmetic) |
| INV-SWP-001 | TASK-F3-003, TASK-F3-004 |
| INV-SWP-002 | TASK-F3-008 (atomic transfers) |
| INV-SWP-004 | TASK-F3-008 (liquidity validation) |
| INV-SWP-005 | TASK-F3-002, TASK-F3-003, TASK-F3-004 |

---

## Phase 1: Foundation (Swap Math & Instruction)

**Purpose:** Implement swap calculation logic and swap instruction handler.
**Checkpoint:** Swap math passes unit tests, swap instruction compiles.

- [ ] TASK-F3-001 Create swap_math.rs module scaffold | `programs/swap-program/src/utils/swap_math.rs`
  - **Commit:** `feat(swap): create swap_math module scaffold`
  - **Acceptance:**
    - File created: `programs/swap-program/src/utils/swap_math.rs`
    - Module uses: `use anchor_lang::prelude::*;`
    - Imports: `constants::PRICE_PRECISION`, `error::SwapError`, `state::MarketAccount`
    - Empty functions: `calculate_a_to_b_output`, `calculate_b_to_a_output`
    - Function signatures match spec: `pub fn calculate_a_to_b_output(amount_a: u64, market: &MarketAccount) -> Result<u64>`
    - Doc comments with traceability: `/// Traceability: ADR-002, ADR-005, ENT-SWP-001`
  - **Refs:** FASE-3, ADR-002, ADR-005
  - **Revert:** SAFE | Delete file
  - **Review:**
    - [ ] File compiles without errors
    - [ ] Function signatures match spec exactly
    - [ ] Traceability references included in doc comments

- [ ] TASK-F3-002 [P] Implement calculate_a_to_b_output with checked arithmetic | `programs/swap-program/src/utils/swap_math.rs`
  - **Commit:** `feat(swap): implement A→B swap calculation with overflow protection`
  - **Acceptance:**
    - Formula implemented: `amount_b = (amount_a × price × 10^decimals_b) / (10^6 × 10^decimals_a)`
    - Price validation: `require!(market.price > 0, SwapError::PriceNotSet)` (CRITICAL-003, INV-SWP-005)
    - Numerator calculation uses `checked_mul` (ADR-005, REQ-NF-001)
    - Denominator calculation uses `checked_mul` (ADR-005)
    - Division uses `checked_div` with `DivisionByZero` error
    - Output validation: `require!(amount_b > 0, SwapError::InvalidAmount)` (INV-SWP-001)
    - All overflow errors return `SwapError::Overflow`
  - **Refs:** FASE-3, UC-004, ADR-002, ADR-005, INV-SWP-001, INV-SWP-005, REQ-NF-001
  - **Blocked-by:** TASK-F3-001
  - **Revert:** SAFE | Delete function body, leave stub
  - **Review:**
    - [ ] Price > 0 validation present (prevents zero-output and division by zero)
    - [ ] All arithmetic operations use checked_* variants
    - [ ] Output > 0 validation prevents zero-output swaps
    - [ ] Error types match SwapError enum from FASE-1

- [ ] TASK-F3-003 [P] Implement calculate_b_to_a_output with checked arithmetic | `programs/swap-program/src/utils/swap_math.rs`
  - **Commit:** `feat(swap): implement B→A swap calculation with overflow protection`
  - **Acceptance:**
    - Formula implemented: `amount_a = (amount_b × 10^6 × 10^decimals_a) / (price × 10^decimals_b)`
    - CRITICAL price validation: `require!(market.price > 0, SwapError::PriceNotSet)` (prevents division by zero)
    - Numerator calculation uses `checked_mul` (ADR-005)
    - Denominator calculation uses `checked_mul` (ADR-005)
    - Division uses `checked_div` with `DivisionByZero` error
    - Output validation: `require!(amount_a > 0, SwapError::InvalidAmount)` (INV-SWP-001)
    - All overflow errors return `SwapError::Overflow`
  - **Refs:** FASE-3, UC-005, ADR-002, ADR-005, INV-SWP-001, INV-SWP-005, REQ-NF-001
  - **Blocked-by:** TASK-F3-001
  - **Revert:** SAFE | Delete function body, leave stub
  - **Review:**
    - [ ] Price > 0 validation present (CRITICAL for B→A to prevent division by zero)
    - [ ] All arithmetic operations use checked_* variants
    - [ ] Output > 0 validation prevents zero-output swaps
    - [ ] Doc comment mentions division-by-zero prevention

- [ ] TASK-F3-004 [P] Add unit tests for swap_math module | `programs/swap-program/src/utils/swap_math.rs`
  - **Commit:** `test(swap): add unit tests for swap calculation logic`
  - **Acceptance:**
    - Test module: `#[cfg(test)] mod tests { ... }`
    - Test `test_a_to_b_calculation`: 100 Token A → 200 Token B at price=2.0
    - Test `test_b_to_a_calculation`: 200 Token B → 100 Token A at price=2.0
    - Test `test_price_not_set_error`: price=0 returns `PriceNotSet` error
    - Test `test_zero_output_error`: edge case where calculation yields 0
    - Test `test_overflow_protection`: large amounts trigger `Overflow` error
    - All tests use `assert_eq!` or `assert!(result.is_err())`
    - MarketAccount test fixtures use realistic values
  - **Refs:** FASE-3, ADR-005, REQ-NF-001
  - **Blocked-by:** TASK-F3-002, TASK-F3-003
  - **Revert:** SAFE | Delete test module
  - **Review:**
    - [ ] Tests cover both swap directions
    - [ ] Error cases tested (price=0, overflow)
    - [ ] Test values match spec examples (price=2.0, decimals=6)
    - [ ] `cargo test` passes for swap_math module

- [ ] TASK-F3-005 Create swap.rs instruction file scaffold | `programs/swap-program/src/instructions/swap.rs`
  - **Commit:** `feat(swap): create swap instruction scaffold`
  - **Acceptance:**
    - File created: `programs/swap-program/src/instructions/swap.rs`
    - Imports: `anchor_lang::prelude::*`, `anchor_spl::token::{Token, TokenAccount, Transfer}`
    - Imports: `crate::{constants::*, error::SwapError, events::SwapExecuted, state::MarketAccount, utils::swap_math}`
    - Empty struct: `#[derive(Accounts)] pub struct Swap<'info> { ... }`
    - Empty handler: `pub fn handler(ctx: Context<Swap>, amount: u64, swap_a_to_b: bool) -> Result<()>`
    - Doc comment: `/// Instruction: swap` with traceability to UC-004, UC-005, REQ-F-006, REQ-F-007, REQ-F-009
  - **Refs:** FASE-3, UC-004, UC-005
  - **Revert:** SAFE | Delete file
  - **Review:**
    - [ ] File compiles
    - [ ] Handler signature matches spec: `amount: u64, swap_a_to_b: bool`
    - [ ] Traceability references complete

- [ ] TASK-F3-006 Implement Swap context struct with account validations | `programs/swap-program/src/instructions/swap.rs`
  - **Commit:** `feat(swap): add Swap context with vault and user account validations`
  - **Acceptance:**
    - `#[derive(Accounts)] pub struct Swap<'info>` with 7 account fields
    - Field: `market: Account<'info, MarketAccount>` with `has_one = vault_a, has_one = vault_b` constraints
    - Field: `vault_a: Account<'info, TokenAccount>` with `#[account(mut)]`
    - Field: `vault_b: Account<'info, TokenAccount>` with `#[account(mut)]`
    - Field: `user_token_a: Account<'info, TokenAccount>` with mint and owner constraints
    - Field: `user_token_b: Account<'info, TokenAccount>` with mint and owner constraints
    - Field: `user: Signer<'info>` (permissionless, any user can swap)
    - Field: `token_program: Program<'info, Token>`
    - Constraint: `user_token_a.mint == market.token_mint_a @ SwapError::Unauthorized`
    - Constraint: `user_token_a.owner == user.key() @ SwapError::Unauthorized`
    - Constraint: `user_token_b.mint == market.token_mint_b @ SwapError::Unauthorized`
    - Constraint: `user_token_b.owner == user.key() @ SwapError::Unauthorized`
    - Doc comments on each field explaining purpose
  - **Refs:** FASE-3, UC-004, UC-005, REQ-F-009 (permissionless)
  - **Blocked-by:** TASK-F3-005
  - **Revert:** SAFE | Delete struct body
  - **Review:**
    - [ ] 7 accounts total (market, vault_a, vault_b, user_token_a, user_token_b, user, token_program)
    - [ ] Vaults marked as `mut` (will be modified)
    - [ ] User token accounts have mint and owner constraints
    - [ ] No authority check (permissionless swap per REQ-F-009)

- [ ] TASK-F3-007 Implement input validation in swap handler | `programs/swap-program/src/instructions/swap.rs`
  - **Commit:** `feat(swap): add input validation (amount > 0, price > 0)`
  - **Acceptance:**
    - Handler retrieves: `let market = &ctx.accounts.market;`
    - Handler retrieves: `let clock = Clock::get()?;`
    - Validation: `require!(amount > 0, SwapError::InvalidAmount)` (REQ-NF-004, INV-SWP-001)
    - Comment explaining price validation happens in swap_math functions
  - **Refs:** FASE-3, REQ-NF-004, INV-SWP-001
  - **Blocked-by:** TASK-F3-006
  - **Revert:** SAFE | Delete validation code
  - **Review:**
    - [ ] Amount > 0 check before calculation
    - [ ] Clock retrieved for event timestamp
    - [ ] Error messages match SwapError enum

- [ ] TASK-F3-008 Implement bidirectional swap logic with CPI transfers | `programs/swap-program/src/instructions/swap.rs`
  - **Commit:** `feat(swap): implement bidirectional swap with atomic CPI transfers`
  - **Acceptance:**
    - Output calculation: `let output_amount = if swap_a_to_b { swap_math::calculate_a_to_b_output(...) } else { swap_math::calculate_b_to_a_output(...) }`
    - PDA signer seeds: `market_seeds = [MARKET_SEED, market.token_mint_a, market.token_mint_b, &[market.bump]]`
    - Signer seeds: `signer_seeds = &[&market_seeds[..]]`
    - **A→B branch:**
      - Liquidity check: `require!(vault_b.amount >= output_amount, SwapError::InsufficientLiquidity)` (INV-SWP-004)
      - CPI 1: Transfer Token A from user → vault_a (user signs)
      - CPI 2: Transfer Token B from vault_b → user (market PDA signs)
    - **B→A branch:**
      - Liquidity check: `require!(vault_a.amount >= output_amount, SwapError::InsufficientLiquidity)` (INV-SWP-004)
      - CPI 1: Transfer Token B from user → vault_b (user signs)
      - CPI 2: Transfer Token A from vault_a → user (market PDA signs)
    - CPI uses `CpiContext::new` for user-signed transfers
    - CPI uses `CpiContext::new_with_signer` for PDA-signed transfers
    - Event emission: `emit!(SwapExecuted { market, user, swap_a_to_b, input_amount: amount, output_amount, timestamp })`
    - `msg!` logs for direction, input, output, exchange rate
  - **Refs:** FASE-3, UC-004, UC-005, REQ-F-006, REQ-F-007, REQ-F-009, INV-SWP-002, INV-SWP-004, REQ-NF-012
  - **Blocked-by:** TASK-F3-007, TASK-F3-002, TASK-F3-003
  - **Revert:** SAFE | Delete swap logic, leave handler stub
  - **Review:**
    - [ ] Both swap directions implemented (A→B and B→A)
    - [ ] Liquidity checked BEFORE transfers (prevents drain attack)
    - [ ] CPI transfers use correct signer (user for input, market PDA for output)
    - [ ] Transfers are atomic (both succeed or both fail via Solana transaction)
    - [ ] SwapExecuted event emitted with all 6 fields
    - [ ] PDA signer seeds match market derivation from FASE-2

---

## Phase 2: Integration (Module Wiring)

**Purpose:** Wire swap instruction to program module.
**Checkpoint:** Program compiles with swap instruction exposed.

- [ ] TASK-F3-009 Create utils module exports | `programs/swap-program/src/utils/mod.rs`
  - **Commit:** `chore(swap): create utils module with swap_math export`
  - **Acceptance:**
    - File created: `programs/swap-program/src/utils/mod.rs`
    - Export: `pub mod swap_math;`
    - Re-export: `pub use swap_math::*;`
  - **Refs:** FASE-3
  - **Revert:** SAFE | Delete file
  - **Review:**
    - [ ] File compiles
    - [ ] swap_math functions accessible via `use crate::utils::*;`

- [ ] TASK-F3-010 Update instructions module with swap export | `programs/swap-program/src/instructions/mod.rs`
  - **Commit:** `chore(swap): add swap instruction to instructions module`
  - **Acceptance:**
    - Updated file: `programs/swap-program/src/instructions/mod.rs`
    - New export: `pub mod swap;`
    - New re-export: `pub use swap::*;`
    - Existing exports preserved: `initialize_market`, `set_price`, `add_liquidity`
  - **Refs:** FASE-3
  - **Blocked-by:** TASK-F3-008
  - **Revert:** SAFE | Remove swap exports
  - **Review:**
    - [ ] 4 instruction modules exported (initialize_market, set_price, add_liquidity, swap)
    - [ ] File compiles without errors

- [ ] TASK-F3-011 Wire swap instruction to program module in lib.rs | `programs/swap-program/src/lib.rs`
  - **Commit:** `feat(swap): wire swap instruction to program module`
  - **Acceptance:**
    - Updated file: `programs/swap-program/src/lib.rs`
    - New module: `pub mod utils;` in module declarations
    - New re-export: `pub use utils::*;` in re-exports
    - New function in `#[program] mod swap_program`:
      ```rust
      /// Execute token swap (permissionless, user-facing)
      pub fn swap(
          ctx: Context<Swap>,
          amount: u64,
          swap_a_to_b: bool,
      ) -> Result<()> {
          instructions::swap::handler(ctx, amount, swap_a_to_b)
      }
      ```
    - Doc comment with traceability: `/// Traceability: UC-004, UC-005`
    - Existing 3 instructions preserved (initialize_market, set_price, add_liquidity)
  - **Refs:** FASE-3, UC-004, UC-005
  - **Blocked-by:** TASK-F3-010
  - **Revert:** SAFE | Remove swap function and utils module
  - **Review:**
    - [ ] Program module has 4 instructions total
    - [ ] Swap function signature matches handler
    - [ ] `anchor build` compiles successfully
    - [ ] IDL shows 4 instructions (swap added)

---

## Phase 3: Tests (Integration & BDD Validation)

**Purpose:** Comprehensive test coverage for both swap directions and error cases.
**Checkpoint:** All swap scenarios pass, BDD scenarios validated.

- [ ] TASK-F3-012 Setup user and token accounts for swap tests | `tests/swap-program.ts`
  - **Commit:** `test(swap): setup test user and token accounts`
  - **Acceptance:**
    - New `describe("Swap Instructions", () => { ... })` block in test file
    - `before("Setup user and tokens", async () => { ... })` hook
    - User keypair: `userKeypair = Keypair.generate()`
    - Airdrop SOL to user: `requestAirdrop(userKeypair.publicKey, 2 * LAMPORTS_PER_SOL)`
    - Create user's Token A account: `userTokenA = await createAssociatedTokenAccount(...)`
    - Create user's Token B account: `userTokenB = await createAssociatedTokenAccount(...)`
    - Mint 1000 Token A to user: `await mintTo(..., 1_000_000_000)`
    - Assumes market already initialized with price=2.0 and liquidity from FASE-2 tests
  - **Refs:** FASE-3, UC-004, UC-005
  - **Revert:** SAFE | Delete test setup
  - **Review:**
    - [ ] User has SOL for transaction fees
    - [ ] User has Token A for A→B swap
    - [ ] Token accounts created correctly
    - [ ] Market from FASE-2 tests is reused

- [ ] TASK-F3-013 [P] Integration test: A→B swap success case | `tests/swap-program.ts`
  - **Commit:** `test(swap): add A→B swap success integration test`
  - **Acceptance:**
    - Test: `it("Swaps Token A to Token B successfully", async () => { ... })`
    - Input: 100 Token A (`new BN(100_000_000)`)
    - Expected output: 200 Token B (`new BN(200_000_000)`) at price=2.0
    - Captures user balances before swap
    - Calls: `program.methods.swap(inputAmount, true).accounts({...}).signers([userKeypair]).rpc()`
    - Captures user balances after swap
    - Assertion: User Token A decreased by 100
    - Assertion: User Token B increased by 200
  - **Refs:** FASE-3, UC-004, REQ-F-006, BDD-UC-001 (S1-S6)
  - **Blocked-by:** TASK-F3-011, TASK-F3-012
  - **Revert:** SAFE | Delete test
  - **Review:**
    - [ ] Test passes
    - [ ] Amounts match expected calculation
    - [ ] Covers UC-004 (Swap A to B)

- [ ] TASK-F3-014 [P] Integration test: B→A swap success case | `tests/swap-program.ts`
  - **Commit:** `test(swap): add B→A swap success integration test`
  - **Acceptance:**
    - Test: `it("Swaps Token B to Token A successfully", async () => { ... })`
    - Input: 200 Token B (`new BN(200_000_000)`)
    - Expected output: 100 Token A (`new BN(100_000_000)`) at price=2.0
    - Captures user balances before swap
    - Calls: `program.methods.swap(inputAmount, false).accounts({...}).signers([userKeypair]).rpc()`
    - Captures user balances after swap
    - Assertion: User Token B decreased by 200
    - Assertion: User Token A increased by 100
  - **Refs:** FASE-3, UC-005, REQ-F-007, BDD-UC-001 (S7-S12)
  - **Blocked-by:** TASK-F3-011, TASK-F3-012
  - **Revert:** SAFE | Delete test
  - **Review:**
    - [ ] Test passes
    - [ ] Amounts match expected calculation
    - [ ] Covers UC-005 (Swap B to A)

- [ ] TASK-F3-015 [P] Integration test: insufficient liquidity error | `tests/swap-program.ts`
  - **Commit:** `test(swap): verify insufficient liquidity error handling`
  - **Acceptance:**
    - Test: `it("Rejects swap with insufficient liquidity", async () => { ... })`
    - Input: Huge amount (`new BN(1_000_000_000_000_000)`) exceeding vault balance
    - Calls: `program.methods.swap(hugeAmount, true).accounts({...}).rpc()`
    - Assertion: `expect(...).to.be.rejectedWith(/InsufficientLiquidity/)`
  - **Refs:** FASE-3, REQ-NF-003, INV-SWP-004
  - **Blocked-by:** TASK-F3-011, TASK-F3-012
  - **Revert:** SAFE | Delete test
  - **Review:**
    - [ ] Test passes
    - [ ] Error message matches SwapError::InsufficientLiquidity
    - [ ] Covers liquidity drain protection

- [ ] TASK-F3-016 [P] Integration test: zero amount error | `tests/swap-program.ts`
  - **Commit:** `test(swap): verify zero amount rejection`
  - **Acceptance:**
    - Test: `it("Rejects swap with zero amount", async () => { ... })`
    - Input: `new BN(0)`
    - Calls: `program.methods.swap(new BN(0), true).accounts({...}).rpc()`
    - Assertion: `expect(...).to.be.rejectedWith(/InvalidAmount/)`
  - **Refs:** FASE-3, REQ-NF-004, INV-SWP-001
  - **Blocked-by:** TASK-F3-011, TASK-F3-012
  - **Revert:** SAFE | Delete test
  - **Review:**
    - [ ] Test passes
    - [ ] Error message matches SwapError::InvalidAmount
    - [ ] Covers zero-amount protection

- [ ] TASK-F3-017 [P] Integration test: price not set error | `tests/swap-program.ts`
  - **Commit:** `test(swap): verify swap fails when price=0`
  - **Acceptance:**
    - Test: `it("Rejects swap when price not set", async () => { ... })`
    - Creates new market (mintC, mintD) and initializes without setting price
    - Adds liquidity to new market
    - Attempts swap: `program.methods.swap(new BN(100_000_000), true).accounts({...}).rpc()`
    - Assertion: `expect(...).to.be.rejectedWith(/PriceNotSet/)`
  - **Refs:** FASE-3, REQ-NF-002, INV-SWP-005, HIGH-001 (audit finding fix)
  - **Blocked-by:** TASK-F3-011, TASK-F3-012
  - **Revert:** SAFE | Delete test
  - **Review:**
    - [ ] Test passes
    - [ ] Error triggered by price=0 validation in swap_math
    - [ ] Covers HIGH-001 audit finding (price validation both directions)

- [ ] TASK-F3-018 [P] Integration test: bidirectional swap workflow | `tests/swap-program.ts`
  - **Commit:** `test(swap): add bidirectional workflow test (A→B→A roundtrip)`
  - **Acceptance:**
    - Test: `it("Completes bidirectional swap workflow", async () => { ... })`
    - Step 1: User swaps 100 A → 200 B
    - Step 2: User swaps 200 B → 100 A (roundtrip)
    - Assertion: User ends with same Token A balance (minus fees)
    - Assertion: Vault balances return to initial state
    - Assertion: Events emitted for both swaps
  - **Refs:** FASE-3, UC-004, UC-005, BDD-UC-001 (complete workflow)
  - **Blocked-by:** TASK-F3-011, TASK-F3-012
  - **Revert:** SAFE | Delete test
  - **Review:**
    - [ ] Test passes
    - [ ] Roundtrip completes successfully
    - [ ] Vault balances consistent
    - [ ] Events emitted for both directions

- [ ] TASK-F3-019 [P] Validate all BDD scenarios from BDD-UC-001.md | `tests/swap-program.ts`
  - **Commit:** `test(swap): validate BDD scenarios S1-S12 coverage`
  - **Acceptance:**
    - Add comment block mapping tests to BDD scenarios:
      - S1 (A→B happy path) → test_a_to_b_calculation
      - S2 (B→A happy path) → test_b_to_a_calculation
      - S3 (insufficient liquidity) → test_insufficient_liquidity
      - S4 (zero amount) → test_zero_amount
      - S5 (price not set) → test_price_not_set
      - S6-S12 (edge cases) → covered by unit tests + integration tests
    - Add checklist comment in test file documenting coverage
    - Document any scenarios NOT covered (mark as TODO if needed)
  - **Refs:** FASE-3, BDD-UC-001
  - **Blocked-by:** TASK-F3-013 through TASK-F3-018
  - **Revert:** SAFE | Delete comment block
  - **Review:**
    - [ ] All 12 BDD scenarios mapped to tests
    - [ ] Coverage documented in test file
    - [ ] No critical scenarios missing

- [ ] TASK-F3-020 [P] Performance benchmark: measure compute units | `tests/swap-program.ts`
  - **Commit:** `test(swap): add compute unit consumption benchmark`
  - **Acceptance:**
    - Test: `it("Swap instruction uses < 12,000 CU", async () => { ... })`
    - Enables CU logging: `ComputeBudgetProgram.setComputeUnitLimit`
    - Executes swap transaction
    - Parses transaction logs for CU consumption
    - Assertion: CU consumption < 12,000 (target from spec/nfr/PERFORMANCE.md)
    - Logs breakdown: deserialization, calculation, transfers, events
  - **Refs:** FASE-3, spec/nfr/PERFORMANCE.md, REQ-NF-010
  - **Blocked-by:** TASK-F3-011
  - **Revert:** SAFE | Delete test
  - **Review:**
    - [ ] CU consumption logged
    - [ ] Target < 12,000 CU met
    - [ ] Breakdown documented in test output

---

## Phase 4: Verification (Final Validation)

**Purpose:** End-to-end validation against FASE-3 acceptance criteria.
**Checkpoint:** All FASE-3 requirements verified, program feature-complete.

- [ ] TASK-F3-021 Verify all FASE-3 acceptance criteria | Documentation
  - **Commit:** `docs(swap): verify FASE-3 completion checklist`
  - **Acceptance:**
    - Checklist from FASE-3.md marked as complete:
      - [x] `anchor build` compiles successfully
      - [x] IDL shows 4 instructions (swap instruction added)
      - [x] Unit tests for swap_math pass (cargo test)
      - [x] Integration tests for both swap directions pass
      - [x] Checked arithmetic prevents overflow
      - [x] Price=0 validation prevents swaps
      - [x] Insufficient liquidity errors trigger correctly
      - [x] Events emit with correct amounts
      - [x] Compute units < 12,000 CU (with events)
    - Evidence documented: test output logs, CU benchmarks
  - **Refs:** FASE-3
  - **Blocked-by:** TASK-F3-020
  - **Revert:** SAFE | N/A (documentation only)
  - **Review:**
    - [ ] All 9 criteria verified
    - [ ] Evidence captured (screenshots or logs)
    - [ ] No failing tests

- [ ] TASK-F3-022 Document FASE-3 completion and next steps | `plan/fases/FASE-3.md`
  - **Commit:** `docs(swap): mark FASE-3 as complete, document next steps`
  - **Acceptance:**
    - Updated file: `plan/fases/FASE-3.md`
    - Status changed: `**Status:** Not Started` → `**Status:** Complete`
    - Completion date added: `**Completed:** 2026-03-24`
    - Next steps documented:
      - ✅ Commit swap instruction
      - ✅ Verify all BDD scenarios
      - ✅ Run performance benchmark
      - ➡️ Proceed to FASE-4 (Frontend Application)
      - Deployment command: `anchor deploy --provider.cluster devnet`
    - Traceability updated: Link to TASK-FASE-3.md
  - **Refs:** FASE-3
  - **Blocked-by:** TASK-F3-021
  - **Revert:** SAFE | Revert status to "Not Started"
  - **Review:**
    - [ ] Status accurately reflects completion
    - [ ] Next steps clear for FASE-4 transition
    - [ ] Traceability maintained

---

## Dependencies

### Task Dependency Graph

```
Foundation Phase:
TASK-F3-001 (scaffold)
    ↓
TASK-F3-002 [P] (A→B calc) ───┐
TASK-F3-003 [P] (B→A calc) ───┼→ TASK-F3-004 [P] (unit tests)
                              │
TASK-F3-005 (swap scaffold) ──┘
    ↓
TASK-F3-006 (context)
    ↓
TASK-F3-007 (validation)
    ↓
TASK-F3-008 (swap logic) ← requires F3-002, F3-003
    ↓
Integration Phase:
TASK-F3-009 [P] (utils mod)
TASK-F3-010 (instructions mod)
    ↓
TASK-F3-011 (lib.rs wiring)
    ↓
Test Phase:
TASK-F3-012 (test setup)
    ↓
┌────────────────┬────────────────┬────────────────┐
│                │                │                │
F3-013 [P]   F3-014 [P]   F3-015 [P]   F3-016 [P]   F3-017 [P]   F3-018 [P]
(A→B test)   (B→A test)   (liq test)   (amt test)   (price test) (workflow)
│                │                │                │                │
└────────────────┴────────────────┴────────────────┴────────────────┘
    ↓
TASK-F3-019 [P] (BDD validation)
TASK-F3-020 [P] (performance)
    ↓
Verification Phase:
TASK-F3-021 (criteria check)
    ↓
TASK-F3-022 (completion docs)
```

### Critical Path

```
TASK-F3-001 → F3-002 → F3-005 → F3-006 → F3-007 → F3-008 → F3-010 → F3-011 → F3-012 → F3-013 → F3-021 → F3-022
Total: 12 tasks, ~5 hours
```

### Parallel Execution Plan

**Wave 1 (after F3-001):**
- TASK-F3-002 (A→B calculation)
- TASK-F3-003 (B→A calculation)
- TASK-F3-005 (swap scaffold)
**Duration:** 30 min (parallelized from 90 min)

**Wave 2 (after F3-008):**
- TASK-F3-009 (utils module)
**Duration:** 15 min

**Wave 3 (after F3-012):**
- TASK-F3-013 (A→B test)
- TASK-F3-014 (B→A test)
- TASK-F3-015 (liquidity test)
- TASK-F3-016 (amount test)
- TASK-F3-017 (price test)
- TASK-F3-018 (workflow test)
**Duration:** 30 min (parallelized from 150 min)

**Wave 4 (after F3-018):**
- TASK-F3-019 (BDD validation)
- TASK-F3-020 (performance)
**Duration:** 30 min (parallelized from 75 min)

**Total with parallelization:** ~5 hours (critical path) vs. 8 hours (sequential)

---

## Cross-FASE Dependencies

| From | To | Reason |
|------|----|--------|
| TASK-F1-010 | TASK-F3-001 | Requires events, errors, constants from FASE-1 |
| TASK-F2-018 | TASK-F3-012 | Requires initialized market with price and liquidity |

---

## Notes

- **CRITICAL:** FASE-3 completes core business logic. After this FASE, the Solana program is feature-complete for token swaps.
- **Deployment:** After FASE-3, program can be deployed to devnet for testing: `anchor deploy --provider.cluster devnet`
- **FASE-4 and FASE-5 are optional** for CLI-only MVP. Frontend (FASE-4) and comprehensive testing/docs (FASE-5) enhance UX but are not required for functional DEX.
- **Performance target:** < 12,000 CU including events (< 10,000 CU baseline without events)
- **Security validations:** All implemented (price > 0, amount > 0, liquidity checks, checked arithmetic)

---

**Generated by:** task-generator skill
**Source:** plan/fases/FASE-3.md
**Critical Path:** 5 hours (12 sequential tasks)
**Parallelization Opportunity:** 3 hours saved with 3 concurrent workers
