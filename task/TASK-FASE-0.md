# Tasks: FASE-0 - Bootstrap & Environment Setup

> **Input:** plan/fases/FASE-0.md + plan/PLAN.md
> **Generated:** 2026-03-24
> **Total tasks:** 12
> **Parallel capacity:** 4 concurrent streams
> **Critical path:** 5 tasks, ~1.5 hours

---

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 12 |
| Parallelizable | 4 (33%) |
| Setup phase | 5 tasks |
| Foundation phase | 4 tasks |
| Verification phase | 3 tasks |

## Traceability

| Spec Reference | Task Coverage |
|---------------|---------------|
| ADR-001 (Anchor Framework) | TASK-F0-001, TASK-F0-002, TASK-F0-003 |
| REQ-C-001 through REQ-C-008 | All tasks |
| spec/nfr/TOOLING.md | TASK-F0-007, TASK-F0-008 |

---

## Phase 1: Setup (Critical Path)

**Purpose:** Install toolchain and initialize project structure.
**Checkpoint:** `anchor build` completes successfully with empty program.

- [ ] **TASK-F0-001** Install Solana CLI | `~/.local/share/solana/install`
  - **Commit:** `chore(bootstrap): install Solana CLI 1.18.0`
  - **Acceptance:**
    - Solana CLI version >= 1.18.0 installed
    - `solana --version` command succeeds
    - PATH includes Solana binaries
  - **Refs:** FASE-0, ADR-001, REQ-C-002
  - **Revert:** SAFE | Remove Solana CLI installation (system-level change)
  - **Review:**
    - [ ] Solana CLI responds to `solana --version`
    - [ ] Version is 1.18.0 or higher
    - [ ] No installation errors logged

- [ ] **TASK-F0-002** Install Anchor CLI | `~/.cargo/bin/anchor`
  - **Commit:** `chore(bootstrap): install Anchor CLI 0.31.0`
  - **Acceptance:**
    - Anchor CLI version 0.31.0 installed
    - `anchor --version` command succeeds
    - Cargo registry updated
  - **Refs:** FASE-0, ADR-001, REQ-C-001
  - **Blocked-by:** TASK-F0-001 (requires Solana CLI)
  - **Revert:** SAFE | Remove with `cargo uninstall anchor-cli`
  - **Review:**
    - [ ] Anchor CLI responds to `anchor --version`
    - [ ] Version matches 0.31.0 exactly
    - [ ] No Rust compilation errors

- [ ] **TASK-F0-003** Initialize Anchor project | `Anchor.toml`, `programs/`, `tests/`
  - **Commit:** `chore(bootstrap): initialize Anchor project structure`
  - **Acceptance:**
    - `anchor init` command executes successfully
    - Directory structure created: `programs/swap-program/`, `tests/`, `migrations/`
    - `Anchor.toml` exists with correct configuration
    - `Cargo.toml` workspace created
  - **Refs:** FASE-0, ADR-001
  - **Blocked-by:** TASK-F0-002 (requires Anchor CLI)
  - **Revert:** SAFE | Delete project directory
  - **Review:**
    - [ ] `programs/swap-program/src/lib.rs` exists
    - [ ] `tests/swap-program.ts` exists
    - [ ] `Anchor.toml` has correct cluster config (localnet)
    - [ ] Program compiles with `anchor build` (empty program)

- [ ] **TASK-F0-004** Configure Solana local validator | `~/.config/solana/id.json`
  - **Commit:** `chore(bootstrap): configure Solana for local development`
  - **Acceptance:**
    - Solana config set to localhost cluster
    - Default wallet keypair created (if not exists)
    - `solana config get` shows url: http://localhost:8899
  - **Refs:** FASE-0, REQ-C-002
  - **Revert:** SAFE | Reset with `solana config set --url <previous-url>`
  - **Review:**
    - [ ] `solana config get` shows localhost URL
    - [ ] `solana address` returns valid public key
    - [ ] Keypair file exists at configured path

- [x] **TASK-F0-005** Generate program ID and update configuration | `Anchor.toml`, `lib.rs`
  - **Commit:** `chore(bootstrap): generate and configure program ID`
  - **Acceptance:**
    - `anchor keys list` executed to generate program ID
    - Program ID updated in `declare_id!()` macro in `lib.rs`
    - Program ID updated in `Anchor.toml` [programs.localnet] section
    - IDs match across all configuration files
  - **Refs:** FASE-0, ADR-004 (PDA architecture requires stable program ID)
  - **Blocked-by:** TASK-F0-003 (requires project structure)
  - **Revert:** SAFE | Revert to placeholder ID (requires re-deployment)
  - **Review:**
    - [ ] `declare_id!()` in lib.rs matches Anchor.toml
    - [ ] Program ID is valid base58 string
    - [ ] `anchor keys list` output matches configured IDs

---

## Phase 2: Foundation (Parallelizable)

**Purpose:** Install dependencies and configure tooling.
**Checkpoint:** All dependencies installed, builds complete without errors.

- [x] **TASK-F0-006** [P] Configure Rust program dependencies | `programs/swap-program/Cargo.toml`
  - **Commit:** `chore(bootstrap): add Anchor dependencies to program`
  - **Acceptance:**
    - `anchor-lang = "0.31.0"` added to [dependencies]
    - `anchor-spl = "0.31.0"` added to [dependencies]
    - `crate-type = ["cdylib", "lib"]` configured
    - `cargo build` succeeds
  - **Refs:** FASE-0, ADR-001, REQ-C-004 (SPL Token)
  - **Revert:** SAFE | Remove dependencies from Cargo.toml
  - **Review:**
    - [ ] Versions match ADR-001 specification (0.31.0)
    - [ ] Crate type includes "cdylib" for Solana BPF
    - [ ] No dependency conflicts reported by cargo
    - [ ] `cargo check` passes

- [x] **TASK-F0-007** [P] Install TypeScript test dependencies | `package.json`
  - **Commit:** `chore(bootstrap): install TypeScript test dependencies`
  - **Acceptance:**
    - `npm install` or `yarn install` executed
    - All packages in FASE-0 spec installed:
      - @coral-xyz/anchor ^0.31.0
      - @solana/web3.js ^1.95.0
      - @solana/spl-token ^0.4.8
      - mocha, chai, ts-mocha (devDependencies)
    - `node_modules/` directory populated
    - No installation errors
  - **Refs:** FASE-0, REQ-C-007 (TypeScript client)
  - **Revert:** SAFE | Delete `node_modules`, restore package.json
  - **Review:**
    - [ ] `package.json` matches FASE-0 specification
    - [ ] All dependencies resolved without conflicts
    - [ ] TypeScript version >= 5.3.0

- [x] **TASK-F0-008** [P] Configure TypeScript compiler | `tsconfig.json`
  - **Commit:** `chore(bootstrap): configure TypeScript for tests`
  - **Acceptance:**
    - `tsconfig.json` created with Mocha types
    - Compiler options: `module: "commonjs"`, `target: "es6"`, `esModuleInterop: true`
    - `types: ["mocha", "chai"]` configured
    - `tsc --noEmit` compiles without errors
  - **Refs:** FASE-0, REQ-C-007
  - **Revert:** SAFE | Delete tsconfig.json, use Anchor defaults
  - **Review:**
    - [ ] Configuration matches FASE-0 specification exactly
    - [ ] TypeScript compilation succeeds
    - [ ] Test imports resolve correctly

- [ ] **TASK-F0-009** [P] Create empty test skeleton | `tests/swap-program.ts`
  - **Commit:** `test(bootstrap): create test skeleton for integration tests`
  - **Acceptance:**
    - Test file imports Anchor, Program, and workspace
    - AnchorProvider configured with env()
    - Program instance typed as `Program<SwapProgram>`
    - One passing test: "Initializes test environment"
    - Test logs program ID and wallet public key
  - **Refs:** FASE-0
  - **Revert:** SAFE | Delete test file
  - **Review:**
    - [ ] Test file compiles without TypeScript errors
    - [ ] `anchor test` runs and passes skeleton test
    - [ ] Program ID logged correctly

---

## Phase 3: Verification

**Purpose:** Validate entire bootstrap phase is functional.
**Checkpoint:** All FASE-0 acceptance criteria verified.

- [ ] **TASK-F0-010** Build empty program and verify artifacts | `target/deploy/`, `target/idl/`
  - **Commit:** `chore(bootstrap): verify build artifacts generation`
  - **Acceptance:**
    - `anchor build` completes without errors
    - `target/deploy/swap_program.so` exists (BPF binary)
    - `target/idl/swap_program.json` exists (IDL)
    - `target/types/swap_program.ts` exists (TypeScript types)
    - Binary size < 100 KB (empty program baseline)
  - **Refs:** FASE-0
  - **Blocked-by:** TASK-F0-006 (requires dependencies)
  - **Revert:** SAFE | Delete target/ directory
  - **Review:**
    - [ ] All artifact files exist
    - [ ] IDL contains program ID and empty instructions array
    - [ ] No Rust compiler warnings

- [ ] **TASK-F0-011** Run skeleton test suite | Test pass
  - **Commit:** `test(bootstrap): verify test framework functionality`
  - **Acceptance:**
    - `anchor test` completes successfully
    - Test validator starts and stops cleanly
    - Program deploys to localnet validator
    - Skeleton test passes (logs program ID)
    - No transaction errors
  - **Refs:** FASE-0
  - **Blocked-by:** TASK-F0-009 (requires test skeleton), TASK-F0-010 (requires build)
  - **Revert:** SAFE | No persistent state changes
  - **Review:**
    - [ ] Test output shows "1 passing"
    - [ ] Program ID logged matches Anchor.toml
    - [ ] Validator logs show program deployment

- [ ] **TASK-F0-012** Document FASE-0 completion and verification | `docs/SETUP.md` or README update
  - **Commit:** `docs(bootstrap): document environment setup completion`
  - **Acceptance:**
    - Document lists:
      - Solana CLI version installed
      - Anchor CLI version installed
      - Program ID generated
      - All dependencies installed
      - Test framework validated
    - Include quickstart commands for developers
    - Mark FASE-0 as complete in status tracking
  - **Refs:** FASE-0
  - **Revert:** SAFE | Remove documentation
  - **Review:**
    - [ ] Documentation includes all verification steps
    - [ ] Commands are copy-pastable
    - [ ] Prerequisites clearly listed

---

## Dependencies

### Task Dependency Graph

```
TASK-F0-001 (Install Solana)
    ↓
TASK-F0-002 (Install Anchor)
    ↓
TASK-F0-003 (Init Project)
    ↓
TASK-F0-005 (Generate Program ID)
    ↓
TASK-F0-004 (Config Solana) [P]
TASK-F0-006 (Program Deps) [P]
TASK-F0-007 (TS Deps) [P]
TASK-F0-008 (TS Config) [P]
TASK-F0-009 (Test Skeleton) [P]
    ↓
TASK-F0-010 (Build & Verify)
    ↓
TASK-F0-011 (Run Tests)
    ↓
TASK-F0-012 (Documentation)
```

### Critical Path

1. TASK-F0-001 → TASK-F0-002 → TASK-F0-003 → TASK-F0-005 → TASK-F0-010 → TASK-F0-011 → TASK-F0-012

**Estimated time on critical path:** ~1.5 hours

### Parallel Execution Plan

**Wave 1:** TASK-F0-001 (sequential)
**Wave 2:** TASK-F0-002 (sequential)
**Wave 3:** TASK-F0-003 (sequential)
**Wave 4:** TASK-F0-004, TASK-F0-006, TASK-F0-007, TASK-F0-008, TASK-F0-009 (parallel - 4 concurrent tasks)
**Wave 5:** TASK-F0-010 (sequential)
**Wave 6:** TASK-F0-011 (sequential)
**Wave 7:** TASK-F0-012 (sequential)

---

## Implementation Notes

### Common Pitfalls

1. **Solana version mismatch:** Ensure Solana CLI >= 1.18.0 matches Anchor requirements
2. **Rust toolchain missing:** Install Rust via rustup before Anchor
3. **Program ID placeholder:** Replace "SwapProgramXXX..." with actual generated ID from `anchor keys list`
4. **Localnet validator port conflict:** Check port 8899 is not in use before `solana-test-validator`

### Platform-Specific Notes

**macOS:**
- Install prerequisites: `brew install pkg-config openssl`
- Solana CLI path: `~/.local/share/solana/install/active_release/bin`

**Linux:**
- Solana CLI path same as macOS
- May need `libssl-dev` package

**Windows:**
- Use WSL2 for best compatibility
- Native Windows Solana build may have path issues

### Time Estimates by Task

| Task | Estimated Time |
|------|---------------|
| TASK-F0-001 | 5 min |
| TASK-F0-002 | 10 min |
| TASK-F0-003 | 10 min |
| TASK-F0-004 | 5 min |
| TASK-F0-005 | 5 min |
| TASK-F0-006 | 10 min |
| TASK-F0-007 | 15 min |
| TASK-F0-008 | 10 min |
| TASK-F0-009 | 15 min |
| TASK-F0-010 | 15 min |
| TASK-F0-011 | 10 min |
| TASK-F0-012 | 10 min |
| **Total** | **2 hours** |

---

## Validation Checklist

After completing all FASE-0 tasks, verify:

- [ ] `solana --version` >= 1.18.0
- [ ] `anchor --version` = 0.31.0
- [ ] `anchor build` succeeds
- [ ] `anchor test` passes
- [ ] `target/deploy/swap_program.so` exists
- [ ] `target/idl/swap_program.json` exists
- [ ] Program ID in `lib.rs` matches `Anchor.toml`
- [ ] No Rust compiler warnings
- [ ] No TypeScript compilation errors

**FASE-0 Complete:** ✅ Ready to proceed to FASE-1 (Core Program Structure)

---

**Generated by:** task-generator skill
**Source:** plan/fases/FASE-0.md, plan/PLAN.md
**Traceability:** ADR-001, REQ-C-001 through REQ-C-008, spec/nfr/TOOLING.md
