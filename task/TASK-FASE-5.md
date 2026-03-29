# Tasks: FASE-5 - Comprehensive Testing, Deployment & Documentation

> **Input:** plan/fases/FASE-5.md
> **Generated:** 2026-03-24
> **Total tasks:** 16
> **Parallel capacity:** 3 concurrent streams
> **Critical path:** 8 tasks, ~4.5 hours

---

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 16 |
| Parallelizable | 8 (50%) |
| Testing phase | 6 tasks |
| Deployment phase | 3 tasks |
| Documentation phase | 5 tasks |
| Verification phase | 2 tasks |
| Estimated effort | 8 hours |

## Traceability

| Spec Reference | Task Coverage |
|---------------|---------------|
| BDD-UC-001 (S1-S13) | TASK-F5-001 through F5-006 |
| REQ-NF-020 | TASK-F5-007 (>80% coverage) |
| REQ-NF-021 | TASK-F5-001 through F5-006 (integration tests) |
| spec/nfr/RELIABILITY.md | TASK-F5-007 |
| spec/nfr/PERFORMANCE.md | TASK-F5-006 |

---

## Phase 1: Testing (Comprehensive Test Suite)

**Purpose:** Achieve >80% test coverage with BDD scenario validation.
**Checkpoint:** All tests pass, coverage target met.

- [x] TASK-F5-001 Create full integration test file scaffold | `tests/full-integration.ts`
  - **Commit:** `test(integration): create comprehensive integration test suite`
  - **Acceptance:**
    - File created: `tests/full-integration.ts`
    - Imports: Anchor, SPL Token utilities, test framework (Chai)
    - Test suite: `describe("Full Integration Test Suite", () => { ... })`
    - Setup: `before("Setup test environment", async () => { ... })`
    - Test wallets: `authority`, `user1`, `user2` (Keypairs generated)
    - Test mints: `mintA` (6 decimals, USDC-like), `mintB` (9 decimals, SOL-like), `mintC` (6 decimals)
    - SOL airdrops: 5 SOL to authority, 2 SOL to users
    - Mints created with correct decimals
    - Console logs for test environment info
  - **Refs:** FASE-5, BDD-UC-001, REQ-NF-021
  - **Revert:** SAFE | Delete file
  - **Review:**
    - [ ] Test setup creates all required test fixtures
    - [ ] Airdrops succeed
    - [ ] Mints created with correct decimals

- [x] TASK-F5-002 [P] Implement BDD Scenario 1: Happy Path | `tests/full-integration.ts`
  - **Commit:** `test(bdd): add S1 complete market setup and swap workflow`
  - **Acceptance:**
    - Test: `describe("BDD Scenario 1: Happy Path - Complete Market Setup", ...)`
    - Steps:
      1. Initialize market (USDC/SOL pair)
      2. Set price (1 USDC = 0.05 SOL → 50_000)
      3. Add liquidity (500 USDC, 25 SOL)
      4. User swap (10 USDC → 0.5 SOL)
    - Assertions:
      - Market authority matches
      - Price updated correctly
      - Vault balances match liquidity
      - User received correct output amount (0.5 SOL)
      - User input deducted correctly (10 USDC)
    - Console log: "✅ BDD Scenario 1: PASSED (Happy Path)"
  - **Refs:** FASE-5, BDD-UC-001 (S1)
  - **Blocked-by:** TASK-F5-001
  - **Revert:** SAFE | Delete test
  - **Review:**
    - [ ] All 4 steps execute successfully
    - [ ] Assertions verify expected state changes
    - [ ] Test passes consistently

- [x] TASK-F5-003 [P] Implement BDD Scenario 4: Insufficient Liquidity | `tests/full-integration.ts`
  - **Commit:** `test(bdd): add S4 insufficient liquidity rejection`
  - **Acceptance:**
    - Test: `describe("BDD Scenario 4: Insufficient Liquidity", ...)`
    - Setup: Give user massive amount (10M USDC, vault only has 490 USDC remaining)
    - Action: Attempt swap with huge amount
    - Assertion: `expect(...).to.be.rejectedWith(/InsufficientLiquidity/)`
    - Console log: "✅ BDD Scenario 4: PASSED (Insufficient liquidity rejected)"
  - **Refs:** FASE-5, BDD-UC-001 (S4), REQ-NF-003
  - **Blocked-by:** TASK-F5-001
  - **Revert:** SAFE | Delete test
  - **Review:**
    - [ ] Error message matches SwapError::InsufficientLiquidity
    - [ ] Test verifies liquidity check works

- [x] TASK-F5-004 [P] Implement BDD Scenario 7: Unauthorized Access | `tests/full-integration.ts`
  - **Commit:** `test(bdd): add S7 unauthorized price setting rejection`
  - **Acceptance:**
    - Test: `describe("BDD Scenario 7: Unauthorized Price Setting", ...)`
    - Setup: Create attacker keypair, airdrop SOL for fees
    - Action: Attacker attempts to set price on market
    - Assertion: `expect(...).to.be.rejected` (Anchor `has_one` constraint fails)
    - Console log: "✅ BDD Scenario 7: PASSED (Unauthorized access denied)"
  - **Refs:** FASE-5, BDD-UC-001 (S7), INV-MKT-008
  - **Blocked-by:** TASK-F5-001
  - **Revert:** SAFE | Delete test
  - **Review:**
    - [ ] Anchor constraint enforcement verified
    - [ ] Non-authority cannot modify market

- [x] TASK-F5-005 [P] Implement BDD Scenario 10 & 13: Edge Cases | `tests/full-integration.ts`
  - **Commit:** `test(bdd): add S10 zero amount and S13 same-token rejection`
  - **Acceptance:**
    - Test 1: `describe("BDD Scenario 10: Zero Amount Rejection", ...)`
      - Action: Swap with `amount = 0`
      - Assertion: `expect(...).to.be.rejectedWith(/InvalidAmount/)`
      - Console log: "✅ BDD Scenario 10: PASSED (Zero amount rejected)"
    - Test 2: `describe("BDD Scenario 13: Same-Token Market Rejected (CRITICAL-001)", ...)`
      - Action: Initialize market with `token_mint_a == token_mint_b`
      - Assertion: `expect(...).to.be.rejectedWith(/SameTokenSwapDisallowed/)`
      - Console log: "✅ BDD Scenario 13: PASSED (Same-token market rejected - CRITICAL-001)"
  - **Refs:** FASE-5, BDD-UC-001 (S10, S13), CRITICAL-001, REQ-NF-004
  - **Blocked-by:** TASK-F5-001
  - **Revert:** SAFE | Delete tests
  - **Review:**
    - [ ] Both edge cases covered
    - [ ] CRITICAL-001 fix validated
    - [ ] Error messages correct

- [x] TASK-F5-006 [P] Implement performance benchmark test | `tests/full-integration.ts`
  - **Commit:** `test(perf): add compute unit consumption benchmark`
  - **Acceptance:**
    - Test: `describe("Performance: Compute Unit Consumption", ...)`
    - Action: Execute swap transaction
    - Fetch transaction: `provider.connection.getTransaction(signature, ...)`
    - Extract CU: `tx?.meta?.computeUnitsConsumed`
    - Assertion: CU < 12,000 (target from spec/nfr/PERFORMANCE.md)
    - Console logs: Transaction signature, CU consumed
  - **Refs:** FASE-5, spec/nfr/PERFORMANCE.md, REQ-NF-010
  - **Blocked-by:** TASK-F5-001
  - **Revert:** SAFE | Delete test
  - **Review:**
    - [ ] CU consumption logged
    - [ ] Target < 12,000 CU met
    - [ ] Performance metrics captured

- [x] TASK-F5-007 Expand unit tests in swap_math.rs | `programs/swap_program/src/utils/swap_math.rs`
  - **Commit:** `test(unit): expand swap_math unit tests for edge cases`
  - **Acceptance:**
    - Test module: `#[cfg(test)] mod tests { ... }`
    - Helper function: `create_test_market(price, decimals_a, decimals_b)`
    - Tests added:
      - `test_a_to_b_basic`: 100 A → 200 B at price=2.0
      - `test_b_to_a_basic`: 200 B → 100 A at price=2.0
      - `test_decimal_mismatch`: 10 USDC (6 dec) → 0.5 SOL (9 dec)
      - `test_price_not_set_a_to_b`: price=0 error
      - `test_price_not_set_b_to_a`: price=0 error
      - `test_overflow_protection`: u64::MAX triggers Overflow
      - `test_rounding_precision`: Validates rounding behavior
    - All tests use `assert_eq!` or `assert!(result.is_err())`
    - Command: `cargo test` passes all swap_math tests
  - **Refs:** FASE-5, ADR-005, REQ-NF-001
  - **Blocked-by:** TASK-F3-004 (existing unit tests)
  - **Revert:** SAFE | Remove new tests
  - **Review:**
    - [ ] 7 unit tests added
    - [ ] Overflow protection tested
    - [ ] Decimal mismatch case covered
    - [ ] All `cargo test` passes

- [x] TASK-F5-008 Measure test coverage with cargo tarpaulin | Documentation
  - **Commit:** `test(coverage): measure and document test coverage`
  - **Acceptance:**
    - Install tarpaulin: `cargo install cargo-tarpaulin` (if not installed)
    - Run coverage: `cargo tarpaulin --out Stdout --output-dir coverage`
    - Generate HTML report: `cargo tarpaulin --out Html --output-dir coverage`
    - Coverage target: >80% (REQ-NF-020)
    - Document results:
      - Overall coverage percentage
      - Per-module breakdown
      - Uncovered lines (if any)
    - Coverage report saved: `coverage/tarpaulin-report.html`
  - **Refs:** FASE-5, REQ-NF-020, spec/nfr/RELIABILITY.md
  - **Blocked-by:** TASK-F5-007
  - **Revert:** SAFE | Delete coverage/ directory
  - **Review:**
    - [ ] Coverage >80% achieved
    - [ ] Report generated successfully
    - [ ] Critical paths covered

---

## Phase 2: Deployment (Devnet Deployment)

**Purpose:** Deploy program to devnet for public testing.
**Checkpoint:** Program deployed, explorer link accessible.

- [x] TASK-F5-009 Create deployment script | `scripts/deploy.sh`
  - **Commit:** `chore(deploy): create automated devnet deployment script`
  - **Acceptance:**
    - Directory created: `scripts/`
    - File created: `scripts/deploy.sh`
    - Script steps:
      1. Build program: `anchor build`
      2. Generate keypair (if not exists): `solana-keygen new --outfile target/deploy/swap_program-keypair.json`
      3. Extract program ID: `solana address -k target/deploy/swap_program-keypair.json`
      4. Update `declare_id!` in lib.rs with sed
      5. Rebuild with correct ID: `anchor build`
      6. Configure devnet: `solana config set --url https://api.devnet.solana.com`
      7. Check balance, request airdrop if low
      8. Deploy: `anchor deploy --provider.cluster devnet`
      9. Print success message with program ID and explorer link
    - Make executable: `chmod +x scripts/deploy.sh`
    - Script includes error handling: `set -e` (exit on error)
  - **Refs:** FASE-5
  - **Revert:** SAFE | Delete script
  - **Review:**
    - [ ] Script syntax correct (bash)
    - [ ] All steps documented with echo messages
    - [ ] Explorer link format: `https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet`

- [ ] TASK-F5-010 Execute devnet deployment | Documentation
  - **Commit:** `deploy(devnet): deploy program to devnet and update configs`
  - **Acceptance:**
    - Run script: `./scripts/deploy.sh`
    - Deployment succeeds without errors
    - Program ID captured: `<PROGRAM_ID>`
    - Explorer link accessible: https://explorer.solana.com/address/<PROGRAM_ID>?cluster=devnet
    - Anchor.toml updated: `[programs.devnet]` section with deployed ID
    - AnchorContext.tsx updated: `PROGRAM_ID` constant with deployed ID
    - IDL copied to frontend: `cp target/idl/swap_program.json app/src/idl/`
    - Deployment evidence:
      - Screenshot of explorer page
      - Transaction signature logged
  - **Refs:** FASE-5
  - **Blocked-by:** TASK-F5-009
  - **Revert:** SAFE | Redeploy or revert Anchor.toml/AnchorContext changes
  - **Review:**
    - [ ] Program visible on Solana Explorer
    - [ ] Deployed program ID matches IDL
    - [ ] Frontend configured with correct ID

- [ ] TASK-F5-011 [P] Test deployed program with frontend | Documentation
  - **Commit:** `test(e2e): validate frontend integration with deployed program`
  - **Acceptance:**
    - Update frontend network: Change `NETWORK` to `https://api.devnet.solana.com` in AnchorContext.tsx
    - Start frontend: `npm start` in `app/`
    - Connect Phantom wallet (devnet mode)
    - Test admin workflow:
      1. Initialize market (use devnet test tokens or create new mints)
      2. Set price
      3. Add liquidity
    - Test user workflow:
      1. Execute A→B swap
      2. Execute B→A swap
    - All transactions succeed on devnet
    - Transactions visible on Solana Explorer
    - Document test results: Screenshots, transaction signatures
  - **Refs:** FASE-5, UI-001, UI-002
  - **Blocked-by:** TASK-F5-010
  - **Revert:** SAFE | Revert frontend network to localnet
  - **Review:**
    - [ ] All transactions confirmed on devnet
    - [ ] No errors in frontend console
    - [ ] Wallet integration works on devnet

---

## Phase 3: Documentation (User & Developer Docs)

**Purpose:** Create comprehensive documentation for users and contributors.
**Checkpoint:** README.md and CONTRIBUTING.md complete and accurate.

- [x] TASK-F5-012 [P] Write comprehensive README.md | `README.md`
  - **Commit:** `docs(readme): create comprehensive user documentation`
  - **Acceptance:**
    - Updated file: `README.md`
    - Sections:
      - **Title & Description**: "Solana SWAP - Fixed-Price DEX"
      - **Features**: 5 bullet points (initialize, set price, add liquidity, swap, events)
      - **Architecture**: Program (Rust + Anchor), Frontend (React + TS), Testing (Mocha + Chai)
      - **Quick Start**: Prerequisites, Installation, Deploy to Devnet, Run Frontend
      - **Usage**: Administrator instructions, User instructions
      - **Testing**: Commands for unit tests, integration tests, full suite
      - **Test Coverage**: BDD scenarios (13/13), unit tests, integration tests, overall ~85%
      - **Performance**: CU consumption metrics (swap: ~11,500 CU)
      - **Security**: 6 bullet points (checked arithmetic, PDAs, authority constraints, etc.)
      - **Documentation Links**: Specs, ADRs, API docs, use cases
      - **License**: MIT
      - **Contributors**: Names/GitHub handles
      - **Acknowledgments**: Anchor, SPL, SWEBOK v4
    - Code examples: Well-formatted bash commands
    - ⚠️ Warning: "Educational Project: Not audited for production use"
  - **Refs:** FASE-5
  - **Blocked-by:** None (can be done in parallel)
  - **Revert:** SAFE | Revert to minimal README
  - **Review:**
    - [ ] All sections complete
    - [ ] Commands tested and accurate
    - [ ] Links valid

- [x] TASK-F5-013 [P] Write CONTRIBUTING.md for developers | `CONTRIBUTING.md`
  - **Commit:** `docs(contrib): create developer contribution guide`
  - **Acceptance:**
    - File created: `CONTRIBUTING.md`
    - Sections:
      - **Development Setup**: Fork, clone, branch creation
      - **Project Structure**: Directory tree with explanations
      - **Coding Standards**:
        - Rust: snake_case, doc comments, `cargo fmt`, `cargo clippy`
        - TypeScript: strict mode, Airbnb style, ESLint, Prettier
      - **Testing**: Commands for unit tests, integration tests, frontend tests
      - **Pull Request Process**: 6-step workflow
      - **Commit Messages**: Conventional Commits examples
      - **Questions**: Contact info
    - Examples: Well-formatted code snippets
    - Links: Conventional Commits spec
  - **Refs:** FASE-5
  - **Blocked-by:** None (can be done in parallel)
  - **Revert:** SAFE | Delete file
  - **Review:**
    - [ ] Workflow clear for new contributors
    - [ ] Coding standards comprehensive
    - [ ] Examples helpful

- [x] TASK-F5-014 [P] Create CHANGELOG.md | `CHANGELOG.md`
  - **Commit:** `docs(changelog): create project changelog`
  - **Acceptance:**
    - File created: `CHANGELOG.md`
    - Format: Keep a Changelog (https://keepachangelog.com/)
    - Sections:
      - **[Unreleased]**: Empty (for future changes)
      - **[0.1.0] - 2026-03-24**: Initial release
        - Added: Initialize market instruction
        - Added: Set price instruction
        - Added: Add liquidity instruction
        - Added: Swap instruction (bidirectional)
        - Added: React frontend (admin + user interfaces)
        - Added: Comprehensive test suite (>80% coverage)
        - Added: Devnet deployment scripts
        - Security: Checked arithmetic, PDA-based vaults
        - Performance: <12,000 CU per swap
    - Link format: `[0.1.0]: https://github.com/your-org/solana-swap/releases/tag/v0.1.0`
  - **Refs:** FASE-5
  - **Blocked-by:** None (can be done in parallel)
  - **Revert:** SAFE | Delete file
  - **Review:**
    - [ ] Format follows Keep a Changelog
    - [ ] All major features listed
    - [ ] Version tagged correctly

- [x] TASK-F5-015 [P] Create API documentation | `docs/API.md`
  - **Commit:** `docs(api): create program API reference documentation`
  - **Acceptance:**
    - Directory created: `docs/`
    - File created: `docs/API.md`
    - Sections for each instruction:
      - **initialize_market**: Accounts, parameters, errors, example
      - **set_price**: Accounts, parameters (new_price: u64), errors, example
      - **add_liquidity**: Accounts, parameters (amount_a, amount_b), errors, example
      - **swap**: Accounts, parameters (amount, swap_a_to_b), errors, example
    - Account structures:
      - **MarketAccount**: Fields with types and descriptions
    - Error codes: All 8 SwapError variants with codes (6000-6007)
    - Events: All 4 events with field descriptions
    - Examples: TypeScript code snippets for each instruction
  - **Refs:** FASE-5, spec/contracts/API-solana-program.md
  - **Blocked-by:** None (can be done in parallel)
  - **Revert:** SAFE | Delete docs/ directory
  - **Review:**
    - [ ] All 4 instructions documented
    - [ ] Account structures complete
    - [ ] Examples correct

- [x] TASK-F5-016 Document deployment checklist | `docs/DEPLOYMENT.md`
  - **Commit:** `docs(deploy): create production deployment checklist`
  - **Acceptance:**
    - File created: `docs/DEPLOYMENT.md`
    - **Before Production Deployment** checklist (10 items):
      - [ ] Security audit completed
      - [ ] All tests passing (100%)
      - [ ] Performance benchmarks met
      - [ ] Documentation reviewed
      - [ ] Program ID updated in all configs
      - [ ] Frontend environment variables set
      - [ ] RPC endpoints configured (mainnet)
      - [ ] Monitoring/alerting configured
      - [ ] Backup wallet keys secured
      - [ ] Liquidity provisioning plan ready
    - **Deployment Steps**: Step-by-step mainnet deployment
    - **Rollback Plan**: Instructions for emergency rollback
    - **Post-Deployment**: Monitoring, verification steps
  - **Refs:** FASE-5
  - **Blocked-by:** None (can be done in parallel)
  - **Revert:** SAFE | Delete file
  - **Review:**
    - [ ] Checklist comprehensive
    - [ ] Rollback plan clear
    - [ ] Monitoring steps defined

---

## Phase 4: Verification (Final Validation)

**Purpose:** Verify all FASE-5 and project completion criteria met.
**Checkpoint:** Project production-ready, all documentation complete.

- [x] TASK-F5-017 Run full test suite and verify coverage | Documentation
  - **Commit:** `test(final): execute full test suite and verify all criteria`
  - **Acceptance:**
    - Commands executed:
      - `cargo test` (unit tests) - ALL PASS
      - `anchor test` (integration tests) - ALL PASS
      - `cargo tarpaulin` (coverage) - >80%
    - Test results:
      - BDD scenarios: 13/13 passed (100%)
      - Unit tests: All modules pass
      - Integration tests: All 6 scenarios pass
      - Performance: CU < 12,000 verified
    - Coverage report: `coverage/tarpaulin-report.html` generated
    - No failing tests, no warnings
    - Document evidence: Test output logs, coverage screenshots
  - **Refs:** FASE-5, REQ-NF-020, REQ-NF-021
  - **Blocked-by:** TASK-F5-002 through TASK-F5-008
  - **Revert:** SAFE | N/A (documentation only)
  - **Review:**
    - [ ] All test suites green
    - [ ] Coverage target met
    - [ ] No critical bugs found

- [ ] TASK-F5-018 Verify all FASE-5 acceptance criteria and update FASE file | `plan/fases/FASE-5.md`
  - **Commit:** `docs(fase-5): mark FASE-5 as complete with verification checklist`
  - **Acceptance:**
    - Updated file: `plan/fases/FASE-5.md`
    - Status changed: `**Status:** Not Started` → `**Status:** Complete`
    - Completion date added: `**Completed:** 2026-03-24`
    - Checklist from FASE-5.md marked complete:
      - [x] All integration tests pass (`anchor test`)
      - [x] Unit tests pass (`cargo test`)
      - [x] Test coverage >80% (`cargo tarpaulin`)
      - [x] Program deploys to devnet successfully
      - [x] README.md is complete and accurate
      - [x] CONTRIBUTING.md explains development workflow
      - [x] Deployment script works end-to-end
      - [x] Explorer link shows deployed program
    - Next steps documented:
      - ✅ All FASEs complete (FASE-0 through FASE-5)
      - ✅ Program deployed to devnet
      - ✅ Frontend deployed and accessible
      - 📊 Monitor usage and gather feedback
      - 🔄 Iterate based on user feedback
    - Traceability updated: Link to TASK-FASE-5.md
  - **Refs:** FASE-5
  - **Blocked-by:** TASK-F5-017
  - **Revert:** SAFE | Revert status to "Not Started"
  - **Review:**
    - [ ] All 8 criteria verified
    - [ ] Status accurately reflects completion
    - [ ] Traceability maintained

---

## Dependencies

### Task Dependency Graph

```
Testing Phase:
TASK-F5-001 (integration test scaffold)
    ↓
┌───────────────┬───────────────┬───────────────┬───────────────┐
│               │               │               │               │
F5-002 [P]  F5-003 [P]  F5-004 [P]  F5-005 [P]  F5-006 [P]
(S1)        (S4)        (S7)        (S10,S13)   (perf)
│               │               │               │               │
└───────────────┴───────────────┴───────────────┴───────────────┘
                    ↓
                F5-007 (unit tests)
                    ↓
                F5-008 (coverage)
                    ↓
Deployment Phase:
                F5-009 (deploy script)
                    ↓
                F5-010 (execute deploy)
                    ↓
                F5-011 [P] (test deployed)

Documentation Phase (can run in parallel with testing):
F5-012 [P] (README.md)
F5-013 [P] (CONTRIBUTING.md)
F5-014 [P] (CHANGELOG.md)
F5-015 [P] (API.md)
F5-016 [P] (DEPLOYMENT.md)
    │               │               │               │               │
    └───────────────┴───────────────┴───────────────┴───────────────┘
                    ↓
Verification Phase:
                F5-017 (run full suite)
                    ↓
                F5-018 (completion check)
```

### Critical Path

```
TASK-F5-001 → F5-002 → F5-007 → F5-008 → F5-009 → F5-010 → F5-017 → F5-018
Total: 8 tasks, ~4.5 hours
```

### Parallel Execution Plan

**Wave 1 (after F5-001):**
- TASK-F5-002 (BDD S1)
- TASK-F5-003 (BDD S4)
- TASK-F5-004 (BDD S7)
- TASK-F5-005 (BDD S10, S13)
- TASK-F5-006 (Performance)
**Duration:** 45 min (parallelized from 180 min)

**Wave 2 (during testing phases):**
- TASK-F5-012 (README.md)
- TASK-F5-013 (CONTRIBUTING.md)
- TASK-F5-014 (CHANGELOG.md)
- TASK-F5-015 (API.md)
- TASK-F5-016 (DEPLOYMENT.md)
**Duration:** 45 min (parallelized from 210 min)

**Total with parallelization:** ~4.5 hours (critical path) vs. 8 hours (sequential)

---

## Cross-FASE Dependencies

| From | To | Reason |
|------|----|--------|
| TASK-F3-011 | TASK-F5-001 | Requires program with all instructions for integration tests |
| TASK-F3-022 | TASK-F5-006 | Requires swap instruction for performance testing |
| TASK-F4-020 | TASK-F5-011 | Requires functional frontend for e2e testing |

---

## Notes

- **CRITICAL:** This FASE completes the entire project (FASE-0 through FASE-5). After completion, the DEX is production-ready for devnet.
- **Test Coverage Target:** >80% required (REQ-NF-020). Achieve via comprehensive integration tests + unit tests.
- **BDD Scenario Coverage:** 13 scenarios in BDD-UC-001.md. This FASE implements 5 critical scenarios (S1, S4, S7, S10, S13). Remaining scenarios covered by existing tests from FASE-2 and FASE-3.
- **Performance Benchmarking:** CU consumption target < 12,000 CU (with events). Measure actual consumption and document in test output.
- **Deployment:** Devnet deployment only. Mainnet deployment requires security audit (out of scope).
- **Documentation:** All user-facing and developer-facing docs created. API documentation mirrors spec/contracts/API-solana-program.md.
- **Traceability:** Complete chain from requirements → specs → tasks → code → tests → deployment.

---

**Generated by:** task-generator skill
**Source:** plan/fases/FASE-5.md
**Critical Path:** 4.5 hours (8 sequential tasks)
**Parallelization Opportunity:** 3.5 hours saved with 5 concurrent workers
