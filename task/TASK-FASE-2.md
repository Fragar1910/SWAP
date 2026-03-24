# Tasks: FASE-2 - Administrative Instructions

> **Input:** plan/fases/FASE-2.md + plan/PLAN.md
> **Generated:** 2026-03-24
> **Total tasks:** 18
> **Parallel capacity:** 6 concurrent streams
> **Critical path:** 8 tasks, ~4 hours

---

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 18 |
| Parallelizable | 6 (33%) |
| Foundation phase | 6 tasks |
| Integration phase | 5 tasks |
| Test phase | 5 tasks |
| Verification phase | 2 tasks |

## Traceability

| Spec Reference | Task Coverage |
|---------------|---------------|
| UC-001 (Initialize Market) | TASK-F2-001 through TASK-F2-003, TASK-F2-011 |
| UC-002 (Set Exchange Rate) | TASK-F2-004 through TASK-F2-005, TASK-F2-012 |
| UC-003 (Add Liquidity) | TASK-F2-006 through TASK-F2-007, TASK-F2-013 |
| WF-001 (Create Market Workflow) | TASK-F2-014 |
| ADR-003 (Single Authority) | All authority-constrained tasks |
| INV-MKT-006 (Token Distinctness) | TASK-F2-002 |

---

## Phase 1: Foundation (Instruction Implementation)

**Purpose:** Implement the three core administrative instructions.
**Checkpoint:** All instructions compile and IDL is generated correctly.

- [ ] **TASK-F2-001** Create InitializeMarket context struct | `programs/swap-program/src/instructions/initialize_market.rs`
  - **Commit:** `feat(admin): add InitializeMarket instruction context`
  - **Acceptance:**
    - `#[derive(Accounts)]` struct with 9 account fields
    - Market account: PDA with seeds [MARKET_SEED, token_mint_a, token_mint_b]
    - Vault A and Vault B: PDAs with proper seeds and authorities
    - All constraints applied: init, seeds, bump, payer, space, token::mint, token::authority
    - Authority field marked as mut and Signer
    - System program, token program, rent sysvar included
    - Compiles without errors
  - **Refs:** FASE-2, UC-001, REQ-F-001, ADR-004
  - **Revert:** SAFE | Delete file (no other code uses it yet)
  - **Review:**
    - [ ] PDA seeds match specification exactly
    - [ ] MarketAccount::LEN used for space allocation
    - [ ] Vault authorities set to market PDA
    - [ ] All account types correct (Account, Program, Sysvar)

- [ ] **TASK-F2-002** Implement initialize_market handler logic | `programs/swap-program/src/instructions/initialize_market.rs`
  - **Commit:** `feat(admin): implement initialize_market instruction handler`
  - **Acceptance:**
    - Handler function signature: `pub fn handler(ctx: Context<InitializeMarket>) -> Result<()>`
    - CRITICAL validation: token_mint_a.key() != token_mint_b.key() (INV-MKT-006)
    - Decimals validation: both <= MAX_DECIMALS (INV-MKT-005)
    - Market fields initialized: authority, token_mint_a, token_mint_b, price=0, decimals_a, decimals_b, bump
    - MarketInitialized event emitted with all 5 fields
    - Log messages output market details
    - Error handling uses SwapError types
  - **Refs:** FASE-2, UC-001, BR-MKT-004, INV-MKT-006, REQ-NF-009
  - **Blocked-by:** TASK-F2-001 (requires context struct)
  - **Revert:** SAFE | Delete handler (instruction not wired to program module yet)
  - **Review:**
    - [ ] Token distinctness check comes BEFORE any state changes
    - [ ] Error messages match SwapError enum variants
    - [ ] Event fields match spec/contracts/EVENTS-swap-program.md
    - [ ] Clock::get()? used for timestamp
    - [ ] price initialized to 0 (documented behavior)

- [ ] **TASK-F2-003** [P] Add doc comments and traceability to initialize_market | `programs/swap-program/src/instructions/initialize_market.rs`
  - **Commit:** `docs(admin): add traceability comments to initialize_market`
  - **Acceptance:**
    - Module-level doc comment explaining instruction purpose
    - Each account field has doc comment with traceability references
    - Critical validation steps have inline comments with BR/INV references
    - References: UC-001, REQ-F-001, REQ-F-008, BR-MKT-004, INV-MKT-006, INV-MKT-005
    - Rustdoc compiles without warnings
  - **Refs:** FASE-2, UC-001
  - **Revert:** SAFE | Remove comments (no behavior change)
  - **Review:**
    - [ ] All public items have doc comments
    - [ ] Traceability IDs match actual spec files
    - [ ] Comments explain "why" not just "what"

- [ ] **TASK-F2-004** Create SetPrice context and handler | `programs/swap-program/src/instructions/set_price.rs`
  - **Commit:** `feat(admin): implement set_price instruction`
  - **Acceptance:**
    - `#[derive(Accounts)]` struct SetPrice with 2 fields: market (mut), authority (Signer)
    - Market constraint: `has_one = authority @ SwapError::Unauthorized`
    - Handler signature: `pub fn handler(ctx: Context<SetPrice>, new_price: u64) -> Result<()>`
    - old_price captured before update
    - market.price updated to new_price
    - PriceSet event emitted with 5 fields: market, authority, old_price, new_price, timestamp
    - Log messages show old → new price and human-readable exchange rate
    - Compiles without errors
  - **Refs:** FASE-2, UC-002, REQ-F-002, REQ-F-008, ADR-002, ADR-003
  - **Revert:** SAFE | Delete file (not wired yet)
  - **Review:**
    - [ ] Authority constraint uses @ syntax for custom error
    - [ ] Price precision calculation: (new_price as f64) / 1_000_000.0
    - [ ] Event fields match spec exactly
    - [ ] No validation for price > 0 (documented as optional)

- [ ] **TASK-F2-005** [P] Add doc comments to set_price | `programs/swap-program/src/instructions/set_price.rs`
  - **Commit:** `docs(admin): add traceability comments to set_price`
  - **Acceptance:**
    - Module doc comment with instruction purpose
    - Account field doc comments with traceability
    - References: UC-002, REQ-F-002, REQ-F-008, ADR-002, ADR-003, REQ-NF-010
    - Note explaining price=0 behavior (swaps will fail, documented)
  - **Refs:** FASE-2, UC-002
  - **Revert:** SAFE | Remove comments
  - **Review:**
    - [ ] Explains single administrator authority model
    - [ ] Documents fixed pricing model (not AMM)
    - [ ] All public items documented

- [ ] **TASK-F2-006** Create AddLiquidity context struct | `programs/swap-program/src/instructions/add_liquidity.rs`
  - **Commit:** `feat(admin): add AddLiquidity instruction context`
  - **Acceptance:**
    - `#[derive(Accounts)]` struct with 6 fields: market, vault_a, vault_b, authority_token_a, authority_token_b, authority, token_program
    - Market constraints: mut, has_one = authority, has_one = vault_a, has_one = vault_b
    - Vault constraints: mut
    - Authority token account constraints: mut, mint matches market token, owner == authority
    - All constraints use @ SwapError::Unauthorized for custom errors
    - Compiles without errors
  - **Refs:** FASE-2, UC-003, REQ-F-003, REQ-F-004
  - **Revert:** SAFE | Delete file
  - **Review:**
    - [ ] Both vaults linked via has_one constraints
    - [ ] Authority token accounts validated for correct mint
    - [ ] Owner validation prevents authority spoofing

- [ ] **TASK-F2-007** Implement add_liquidity handler with dual transfers | `programs/swap-program/src/instructions/add_liquidity.rs`
  - **Commit:** `feat(admin): implement add_liquidity instruction handler`
  - **Acceptance:**
    - Handler signature: `pub fn handler(ctx: Context<AddLiquidity>, amount_a: u64, amount_b: u64) -> Result<()>`
    - Validation: at least one amount > 0 (prevents no-op)
    - Conditional transfer for amount_a if > 0 using token::transfer CPI
    - Conditional transfer for amount_b if > 0 using token::transfer CPI
    - Vault accounts reloaded after transfers: vault_a.reload()?, vault_b.reload()?
    - LiquidityAdded event emitted with 7 fields including post-transfer vault balances
    - Log messages show amounts added and final vault balances
    - Compiles without errors
  - **Refs:** FASE-2, UC-003, REQ-F-003, REQ-F-004, REQ-NF-011, INV-VLT-005
  - **Blocked-by:** TASK-F2-006 (requires context struct)
  - **Revert:** SAFE | Delete handler
  - **Review:**
    - [ ] CPI contexts constructed correctly (Transfer struct)
    - [ ] Authority signs transfers (not PDA - this is user→vault)
    - [ ] Both vaults reloaded to get updated balances
    - [ ] Event includes vault_a_balance and vault_b_balance post-transfer
    - [ ] No liquidity withdrawal capability (INV-VLT-005 enforcement)

- [ ] **TASK-F2-008** [P] Add doc comments to add_liquidity | `programs/swap-program/src/instructions/add_liquidity.rs`
  - **Commit:** `docs(admin): add traceability comments to add_liquidity`
  - **Acceptance:**
    - Module doc explaining dual liquidity provision
    - Account field docs with traceability
    - Comment explaining vault.reload() purpose (get updated balance)
    - References: UC-003, REQ-F-003, REQ-F-004, REQ-F-008, INV-VLT-005, REQ-NF-011
  - **Refs:** FASE-2, UC-003
  - **Revert:** SAFE | Remove comments
  - **Review:**
    - [ ] Explains why both amounts can be non-zero
    - [ ] Documents monotonic vault balance invariant
    - [ ] CPI explanation included

---

## Phase 2: Integration

**Purpose:** Wire instructions into program module and export correctly.
**Checkpoint:** Program compiles with all 3 instructions exported.

- [ ] **TASK-F2-009** Create instructions module exports | `programs/swap-program/src/instructions/mod.rs`
  - **Commit:** `refactor(admin): create instructions module with exports`
  - **Acceptance:**
    - File created with 3 module declarations: initialize_market, set_price, add_liquidity
    - 3 re-exports: `pub use initialize_market::*`, `pub use set_price::*`, `pub use add_liquidity::*`
    - Compiles without errors
    - All instruction contexts and handlers accessible via `crate::instructions::`
  - **Refs:** FASE-2
  - **Blocked-by:** TASK-F2-002, TASK-F2-004, TASK-F2-007 (requires all instruction files)
  - **Revert:** SAFE | Delete file (breaks compilation)
  - **Review:**
    - [ ] Module structure follows Rust conventions
    - [ ] Re-exports work correctly
    - [ ] No circular dependencies

- [ ] **TASK-F2-010** Integrate instructions into lib.rs and program module | `programs/swap-program/src/lib.rs`
  - **Commit:** `feat(admin): wire admin instructions into program module`
  - **Acceptance:**
    - `pub mod instructions;` declaration added to lib.rs
    - `pub use instructions::*;` re-export added
    - 3 public functions added to `#[program]` module:
      - `pub fn initialize_market(ctx: Context<InitializeMarket>) -> Result<()>`
      - `pub fn set_price(ctx: Context<SetPrice>, new_price: u64) -> Result<()>`
      - `pub fn add_liquidity(ctx: Context<AddLiquidity>, amount_a: u64, amount_b: u64) -> Result<()>`
    - Each function delegates to `instructions::{name}::handler(ctx, ...)`
    - Compiles without errors
    - Comment added: `// FASE-3: swap instruction`
  - **Refs:** FASE-2
  - **Blocked-by:** TASK-F2-009 (requires instructions module)
  - **Revert:** SAFE | Remove module declaration and functions (breaks compilation)
  - **Review:**
    - [ ] Function signatures match FASE-2 spec exactly
    - [ ] Delegation pattern: `instructions::initialize_market::handler(ctx)`
    - [ ] All 3 instructions exported
    - [ ] No instruction implementation in lib.rs (keep handlers in separate files)

- [ ] **TASK-F2-011** Build and verify IDL generation | `target/idl/swap_program.json`
  - **Commit:** `test(admin): verify IDL includes all admin instructions`
  - **Acceptance:**
    - `anchor build` completes without errors
    - IDL file exists at target/idl/swap_program.json
    - IDL contains 3 instructions: initialize_market, set_price, add_liquidity
    - Each instruction has correct parameter schema
    - Events array shows 4 events (3 from FASE-2 + SwapExecuted from FASE-1)
    - Errors array shows 8 error codes from FASE-1
    - No compilation warnings
  - **Refs:** FASE-2
  - **Blocked-by:** TASK-F2-010 (requires integrated program)
  - **Revert:** SAFE | Delete target/ directory
  - **Review:**
    - [ ] `cat target/idl/swap_program.json | jq '.instructions | length'` outputs 3
    - [ ] Each instruction has accounts array with correct field names
    - [ ] Parameter types match Rust signatures (u64, etc.)
    - [ ] TypeScript types auto-generated in target/types/

---

## Phase 3: Test Phase

**Purpose:** Implement comprehensive integration tests for all 3 instructions.
**Checkpoint:** All tests pass, including positive and negative test cases.

- [ ] **TASK-F2-012** Add test setup helper for token mints | `tests/swap-program.ts`
  - **Commit:** `test(admin): add test token mint setup`
  - **Acceptance:**
    - New `describe("Administrative Instructions")` test suite added
    - `before("Setup test tokens")` hook creates 2 SPL token mints
    - mintA: 6 decimals (USDC-like)
    - mintB: 9 decimals (SOL-like)
    - Both mints created using createMint helper
    - Test wallets: authority keypair generated
    - Variables declared: marketPDA, vaultA, vaultB
    - Test compiles and setup runs successfully
  - **Refs:** FASE-2
  - **Revert:** SAFE | Remove test suite
  - **Review:**
    - [ ] Test isolation maintained (each test can run independently)
    - [ ] Authority keypair funded with SOL for transactions
    - [ ] Token mints are distinct (different addresses)

- [ ] **TASK-F2-013** Add initialize_market integration test | `tests/swap-program.ts`
  - **Commit:** `test(admin): add initialize_market instruction test`
  - **Acceptance:**
    - Test: "Initializes market successfully"
    - PDAs derived using PublicKey.findProgramAddressSync
    - program.methods.initializeMarket() called with all required accounts
    - Transaction signed by authority and sent via .rpc()
    - Market account fetched after transaction
    - Assertions: market.authority matches authority.publicKey
    - Assertion: market.price.toString() === "0" (not set yet)
    - Test passes when run with `anchor test`
  - **Refs:** FASE-2, UC-001, BDD-UC-001
  - **Blocked-by:** TASK-F2-011 (requires compiled program), TASK-F2-012 (requires test setup)
  - **Revert:** SAFE | Remove test
  - **Review:**
    - [ ] PDA derivation matches program code exactly
    - [ ] All 9 accounts provided in .accounts() call
    - [ ] Assertions verify market initialization
    - [ ] Test runs on localnet validator

- [ ] **TASK-F2-014** Add set_price tests (positive and negative) | `tests/swap-program.ts`
  - **Commit:** `test(admin): add set_price instruction tests`
  - **Acceptance:**
    - Test 1: "Sets price successfully (authority-only)"
      - new_price = 2_500_000 (1 A = 2.5 B)
      - program.methods.setPrice(newPrice) called
      - market fetched, price.toString() === newPrice.toString()
    - Test 2: "Rejects price setting by non-authority"
      - Attacker keypair generated
      - program.methods.setPrice() called with attacker as signer
      - Expect transaction to be rejected (Unauthorized or ConstraintHasOne error)
    - Both tests pass
  - **Refs:** FASE-2, UC-002, REQ-F-008, ADR-003
  - **Blocked-by:** TASK-F2-013 (requires initialized market)
  - **Revert:** SAFE | Remove tests
  - **Review:**
    - [ ] Positive test verifies price update
    - [ ] Negative test verifies authority constraint enforcement
    - [ ] Error handling uses .to.be.rejected or similar Chai matcher

- [ ] **TASK-F2-015** Add add_liquidity integration test | `tests/swap-program.ts`
  - **Commit:** `test(admin): add add_liquidity instruction test`
  - **Acceptance:**
    - Test: "Adds liquidity successfully"
    - Authority token accounts created using getOrCreateAssociatedTokenAccount
    - Tokens minted to authority: 1000 Token A, 5000 Token B
    - program.methods.addLiquidity(amount_a, amount_b) called
    - Amounts: 100 Token A (100_000_000 base units), 250 Token B (250_000_000_000 base units)
    - Vault accounts fetched after transaction
    - Assertions: vaultA.amount === "100000000", vaultB.amount === "250000000000"
    - Test passes
  - **Refs:** FASE-2, UC-003, REQ-F-003, REQ-F-004
  - **Blocked-by:** TASK-F2-013, TASK-F2-014 (requires price to be set)
  - **Revert:** SAFE | Remove test
  - **Review:**
    - [ ] Authority has sufficient token balance before transfer
    - [ ] Vault balances verified after liquidity addition
    - [ ] Amounts account for token decimals correctly

- [ ] **TASK-F2-016** Add end-to-end workflow test (WF-001) | `tests/swap-program.ts`
  - **Commit:** `test(admin): add complete market setup workflow test`
  - **Acceptance:**
    - Test: "Complete WF-001 workflow: initialize → set price → add liquidity"
    - Single test executing all 3 instructions in sequence
    - Verifies state transitions between each step
    - Final state: market exists, price set, both vaults have liquidity
    - Covers WF-001 specification end-to-end
    - Test passes
  - **Refs:** FASE-2, WF-001
  - **Revert:** SAFE | Remove test
  - **Review:**
    - [ ] Workflow matches WF-001 sequence exactly
    - [ ] State verified at each checkpoint
    - [ ] Demonstrates complete admin use case

---

## Phase 4: Verification

**Purpose:** Final validation and documentation of FASE-2 completion.
**Checkpoint:** All acceptance criteria met, ready for FASE-3.

- [ ] **TASK-F2-017** Run full test suite and verify coverage | Test output
  - **Commit:** `test(admin): verify FASE-2 test coverage completeness`
  - **Acceptance:**
    - `anchor test` passes all tests
    - Test output shows:
      - ✓ Initializes market successfully
      - ✓ Sets price successfully (authority-only)
      - ✓ Rejects price setting by non-authority
      - ✓ Adds liquidity successfully
      - ✓ Complete WF-001 workflow
    - Minimum 5 tests passing
    - No test failures or errors
    - Test coverage: initialize_market, set_price, add_liquidity all tested
  - **Refs:** FASE-2, REQ-NF-020 (test coverage >80%)
  - **Blocked-by:** All test tasks (TASK-F2-013 through TASK-F2-016)
  - **Revert:** SAFE | No persistent changes
  - **Review:**
    - [ ] All tests green (no failures)
    - [ ] Validator starts and stops cleanly
    - [ ] Program deploys successfully
    - [ ] No transaction errors in logs

- [ ] **TASK-F2-018** Document FASE-2 completion and update status | Comments or README
  - **Commit:** `docs(admin): mark FASE-2 complete, document admin capabilities`
  - **Acceptance:**
    - All FASE-2 deliverables confirmed:
      - 3 instruction files created
      - All instructions integrated into program module
      - IDL shows 3 instructions
      - 5 integration tests passing
      - WF-001 workflow validated end-to-end
    - Documentation notes:
      - Admin instructions complete (initialize_market, set_price, add_liquidity)
      - Authority constraints enforced
      - Event emission working
      - Token transfers validated
    - Ready to proceed to FASE-3 (Swap Instructions)
  - **Refs:** FASE-2
  - **Revert:** SAFE | Remove documentation
  - **Review:**
    - [ ] All FASE-2 checkboxes verified
    - [ ] Spec coverage confirmed: 7 files
    - [ ] Business logic: 60% complete (admin operations done)

---

## Dependencies

### Task Dependency Graph

```
TASK-F2-001 (InitializeMarket context) [P]
TASK-F2-004 (SetPrice context) [P]
TASK-F2-006 (AddLiquidity context) [P]
    ↓
TASK-F2-002 (initialize_market handler)
TASK-F2-005 (set_price handler)
TASK-F2-007 (add_liquidity handler)
    ↓
TASK-F2-003 (Docs - init) [P]
TASK-F2-008 (Docs - liquidity) [P]
    ↓
TASK-F2-009 (Module exports)
    ↓
TASK-F2-010 (Integrate to lib.rs)
    ↓
TASK-F2-011 (Build & verify IDL)
    ↓
TASK-F2-012 (Test setup)
    ↓
TASK-F2-013 (Test initialize_market)
    ↓
TASK-F2-014 (Test set_price)
    ↓
TASK-F2-015 (Test add_liquidity)
    ↓
TASK-F2-016 (Test WF-001 workflow)
    ↓
TASK-F2-017 (Verify coverage)
    ↓
TASK-F2-018 (Documentation)
```

### Critical Path

TASK-F2-001 → TASK-F2-002 → TASK-F2-009 → TASK-F2-010 → TASK-F2-011 → TASK-F2-012 → TASK-F2-013 → TASK-F2-014 → TASK-F2-015 → TASK-F2-017 → TASK-F2-018

**Estimated time on critical path:** ~4 hours

### Parallel Execution Plan

**Wave 1:** TASK-F2-001, TASK-F2-004, TASK-F2-006 (3 tasks in parallel - create all contexts)
**Wave 2:** TASK-F2-002, TASK-F2-005, TASK-F2-007 (sequential, depends on Wave 1)
**Wave 3:** TASK-F2-003, TASK-F2-008 (2 tasks in parallel - documentation)
**Wave 4:** TASK-F2-009 → TASK-F2-010 → TASK-F2-011 (sequential)
**Wave 5:** TASK-F2-012 (sequential)
**Wave 6:** TASK-F2-013 → TASK-F2-014 → TASK-F2-015 → TASK-F2-016 (mostly sequential due to test dependencies)
**Wave 7:** TASK-F2-017 → TASK-F2-018 (sequential)

---

## Validation Checklist

After completing all FASE-2 tasks, verify:

- [ ] `anchor build` succeeds with 0 warnings
- [ ] IDL contains 3 instructions (initialize_market, set_price, add_liquidity)
- [ ] IDL contains 4 events (MarketInitialized, PriceSet, LiquidityAdded, SwapExecuted)
- [ ] `anchor test` passes all 5+ tests
- [ ] Market initialization creates PDAs correctly
- [ ] Authority constraints enforced (unauthorized access rejected)
- [ ] Token transfers work (liquidity added to vaults)
- [ ] Events emitted with correct data
- [ ] WF-001 workflow completes successfully
- [ ] All traceability references documented

**FASE-2 Complete:** ✅ Ready to proceed to FASE-3 (Swap Instructions)

---

**Generated by:** task-generator skill
**Source:** plan/fases/FASE-2.md, plan/PLAN.md
**Traceability:** UC-001, UC-002, UC-003, WF-001, ADR-002, ADR-003, ADR-004, spec/tests/BDD-UC-001.md
