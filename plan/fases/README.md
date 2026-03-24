# FASE Files - Implementation Phase Navigation

> **Generated:** 2026-03-23
> **Project:** Solana SWAP - Fixed-Price DEX
> **Methodology:** SDD Pipeline (Specification-Driven Development)

---

## Purpose

This directory contains FASE (implementation phase) files that decompose the project into incremental, testable build phases. Each FASE file is a navigation index mapping specifications to implementation steps.

**FASE ≠ Sprint:** FASEs are logical build phases, not time-boxed iterations. They ensure clean architectural layering and dependency management.

---

## FASE Overview

| FASE | Name | Priority | Effort | Specs Covered | Status |
|------|------|----------|--------|---------------|--------|
| [FASE-0](FASE-0.md) | Bootstrap & Environment Setup | CRITICAL | 2h | 3 files | Not Started |
| [FASE-1](FASE-1.md) | Core Program Structure & Types | CRITICAL | 4h | 5 files | Not Started |
| [FASE-2](FASE-2.md) | Administrative Instructions | CRITICAL | 6h | 7 files | Not Started |
| [FASE-3](FASE-3.md) | Swap Instructions & Core Exchange Logic | CRITICAL | 8h | 9 files | Not Started |
| [FASE-4](FASE-4.md) | Frontend Application (React UI) | HIGH | 10h | 3 files | Not Started |
| [FASE-5](FASE-5.md) | Comprehensive Testing, Deployment & Documentation | HIGH | 8h | 3 files | Not Started |
| **TOTAL** | **6 Phases** | - | **38h** | **37 specs** | **0% Complete** |

---

## Dependency Graph

```
FASE-0 (Bootstrap)
   ↓
FASE-1 (Core Structure)
   ↓
FASE-2 (Admin Instructions)
   ↓
FASE-3 (Swap Instructions)
   ↓
FASE-4 (Frontend UI)
   ↓
FASE-5 (Testing & Deployment)
```

**Critical Path:** FASE-0 → FASE-1 → FASE-2 → FASE-3 (28 hours minimum before UI/testing)

**Parallelization Opportunities:**
- FASE-4 can start after FASE-3 deployment (UI mocks while program builds)
- FASE-5 integration tests written during FASE-2/FASE-3 (TDD approach)

---

## Specification Coverage Matrix

### By Domain

| Domain | Total Specs | Covered by FASEs | Coverage % |
|--------|-------------|------------------|------------|
| **ADR (Architecture Decisions)** | 6 | 6 | 100% |
| **Use Cases** | 6 | 6 | 100% |
| **Domain Model** | 5 | 5 | 100% |
| **Contracts (API)** | 2 | 2 | 100% |
| **NFR (Non-Functional Requirements)** | 5 | 5 | 100% |
| **UI Specifications** | 2 | 2 | 100% |
| **BDD Tests** | 1 | 1 | 100% |
| **Workflows** | 1 | 1 | 100% |
| **Requirements** | 9 | 9 | 100% |
| **TOTAL** | **37** | **37** | **100%** |

### By FASE

| Spec File | FASE-0 | FASE-1 | FASE-2 | FASE-3 | FASE-4 | FASE-5 | Total Coverage |
|-----------|--------|--------|--------|--------|--------|--------|----------------|
| `spec/adr/ADR-001-anchor-framework.md` | ✅ 100% | - | - | - | - | - | ✅ |
| `spec/adr/ADR-002-fixed-pricing-model.md` | - | - | - | ✅ 100% | - | - | ✅ |
| `spec/adr/ADR-003-single-authority.md` | - | - | ✅ 100% | - | - | - | ✅ |
| `spec/adr/ADR-004-pda-architecture.md` | - | ✅ 30% | ✅ 50% | ✅ 20% | - | - | ✅ |
| `spec/adr/ADR-005-checked-arithmetic.md` | - | - | - | ✅ 100% | - | - | ✅ |
| `spec/adr/ADR-006-event-emission.md` | - | ✅ 100% | ✅ 40% | ✅ 30% | ✅ 30% | - | ✅ |
| `spec/use-cases/UC-001-initialize-market.md` | - | - | ✅ 100% | - | ✅ 30% | - | ✅ |
| `spec/use-cases/UC-002-set-exchange-rate.md` | - | - | ✅ 100% | - | ✅ 30% | - | ✅ |
| `spec/use-cases/UC-003-add-liquidity.md` | - | - | ✅ 100% | - | ✅ 30% | - | ✅ |
| `spec/use-cases/UC-004-swap-token-a-to-b.md` | - | - | - | ✅ 100% | ✅ 50% | - | ✅ |
| `spec/use-cases/UC-005-swap-token-b-to-a.md` | - | - | - | ✅ 100% | ✅ 50% | - | ✅ |
| `spec/use-cases/UC-006-connect-wallet.md` | - | - | - | - | ✅ 100% | - | ✅ |
| `spec/domain/01-GLOSSARY.md` | - | ✅ 20% | ✅ 30% | ✅ 50% | - | - | ✅ |
| `spec/domain/02-ENTITIES.md` | - | ✅ 100% | ✅ 40% | ✅ 60% | - | - | ✅ |
| `spec/domain/03-VALUE-OBJECTS.md` | - | ✅ 100% | - | ✅ 50% | - | - | ✅ |
| `spec/domain/04-ERRORS.md` | - | ✅ 100% | ✅ 30% | ✅ 70% | - | - | ✅ |
| `spec/domain/05-INVARIANTS.md` | - | ✅ 30% | ✅ 50% | ✅ 100% | - | - | ✅ |
| `spec/contracts/API-solana-program.md` | - | ✅ 10% | ✅ 60% | ✅ 100% | - | - | ✅ |
| `spec/contracts/EVENTS-swap-program.md` | - | ✅ 100% | ✅ 50% | ✅ 50% | - | - | ✅ |
| `spec/nfr/PERFORMANCE.md` | - | - | - | ✅ 100% | - | ✅ 50% | ✅ |
| `spec/nfr/LIMITS.md` | - | - | - | ✅ 100% | - | - | ✅ |
| `spec/nfr/RELIABILITY.md` | - | - | - | - | - | ✅ 100% | ✅ |
| `spec/nfr/TOOLING.md` | ✅ 100% | - | - | - | ✅ 50% | - | ✅ |
| `spec/ui/UI-001-administrator-dashboard.md` | - | - | - | - | ✅ 100% | - | ✅ |
| `spec/ui/UI-002-user-swap-interface.md` | - | - | - | - | ✅ 100% | - | ✅ |
| `spec/tests/BDD-UC-001.md` | - | - | ✅ 100% | ✅ 80% | - | ✅ 100% | ✅ |
| `spec/workflows/WF-001-create-market-workflow.md` | - | - | ✅ 100% | - | - | - | ✅ |
| `requirements/REQUIREMENTS.md` (constraints) | ✅ 100% | - | - | - | - | - | ✅ |
| `requirements/REQUIREMENTS.md` (functional) | - | - | ✅ 60% | ✅ 80% | ✅ 60% | - | ✅ |
| `requirements/REQUIREMENTS.md` (NFR) | - | ✅ 30% | - | ✅ 70% | - | ✅ 100% | ✅ |

**Legend:**
- ✅ **Green checkmark**: 100% coverage achieved across all FASEs
- **Percentage**: Partial coverage in that specific FASE
- **-**: Not covered in that FASE

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (FASE-0 to FASE-1) - 6 hours

**Goal:** Establish foundation for Solana program development.

**Deliverables:**
- Anchor project structure initialized
- Rust dependencies installed
- Account structures defined
- Error codes and events defined
- Module organization complete

**Validation:**
- `anchor build` succeeds
- IDL generates correctly
- Type definitions compile

**Blockers Removed:**
- ✅ Can define instruction handlers (FASE-2)
- ✅ Can write integration tests (FASE-5)

---

### Phase 2: Administrative Layer (FASE-2) - 6 hours

**Goal:** Enable market creation and management.

**Deliverables:**
- `initialize_market` instruction
- `set_price` instruction
- `add_liquidity` instruction
- Event emissions (3 events)
- Integration tests for admin operations

**Validation:**
- Markets can be created end-to-end
- Authority constraints enforced
- WF-001 (Create Market Workflow) passes

**Blockers Removed:**
- ✅ Markets exist for swap testing (FASE-3)
- ✅ Liquidity available for swaps (FASE-3)

---

### Phase 3: Core Business Logic (FASE-3) - 8 hours

**Goal:** Implement token swap functionality.

**Deliverables:**
- `swap` instruction (bidirectional)
- Swap math module (A→B, B→A calculations)
- Checked arithmetic implementation
- SwapExecuted event
- Integration tests for swaps

**Validation:**
- Users can swap tokens successfully
- Calculations match specifications
- Compute units < 12,000 CU
- All BDD scenarios (S1-S13) pass

**Blockers Removed:**
- ✅ Program feature-complete for UI integration (FASE-4)
- ✅ Deployable to devnet (FASE-5)

---

### Phase 4: User Interface (FASE-4) - 10 hours

**Goal:** Provide web interface for non-technical users.

**Deliverables:**
- React application setup
- Wallet integration (Phantom, Solflare)
- Administrator dashboard (3 forms)
- User swap interface
- Output amount preview

**Validation:**
- Wallet connects successfully
- Admin can initialize markets via UI
- Users can swap via UI
- Transactions broadcast to Solana

**Blockers Removed:**
- ✅ End-to-end user flows functional
- ✅ UI deployable to hosting platform

---

### Phase 5: Production Readiness (FASE-5) - 8 hours

**Goal:** Ensure quality, deploy, and document.

**Deliverables:**
- Comprehensive integration tests
- Unit test expansion
- Deployment script (devnet)
- README.md and CONTRIBUTING.md
- Performance benchmarks

**Validation:**
- Test coverage >80%
- All tests passing
- Program deployed to devnet
- Documentation complete

**Blockers Removed:**
- ✅ Project ready for public release
- ✅ Contributors can onboard via docs

---

## Execution Guidelines

### 1. Sequential Execution (Recommended)

Execute FASEs in strict order (FASE-0 → FASE-5) to ensure dependencies are satisfied:

```bash
# FASE-0: Bootstrap
anchor init swap-program
# ... follow FASE-0.md ...

# FASE-1: Core Structure
# Implement account structures, errors, events
# ... follow FASE-1.md ...

# FASE-2: Admin Instructions
# Implement initialize_market, set_price, add_liquidity
# ... follow FASE-2.md ...

# FASE-3: Swap Instructions
# Implement swap instruction
# ... follow FASE-3.md ...

# FASE-4: Frontend
# Build React UI
# ... follow FASE-4.md ...

# FASE-5: Testing & Deployment
# Deploy and document
# ... follow FASE-5.md ...
```

**Advantages:**
- No dependency conflicts
- Clear progress tracking
- Easier debugging (incremental changes)

**Time to First Deploy:** ~22 hours (FASE-0 through FASE-3)

---

### 2. Parallel Execution (Advanced)

Experienced teams can parallelize:

**Stream 1: Backend (Developer A)**
- FASE-0 → FASE-1 → FASE-2 → FASE-3

**Stream 2: Frontend (Developer B, starts after FASE-1)**
- FASE-4 (using mocked program or devnet deployment)

**Stream 3: Testing (Developer C, starts after FASE-2)**
- FASE-5 (write tests during implementation)

**Advantages:**
- Faster time to completion (~25 hours wall-clock time vs 38 hours)
- Continuous testing (TDD approach)

**Risks:**
- Coordination overhead
- Frontend may need rework if program API changes

---

## Quality Gates

### After Each FASE

- [ ] `anchor build` succeeds with zero warnings
- [ ] All new tests pass
- [ ] No regressions in existing tests
- [ ] Code reviewed (if team >1 person)
- [ ] Commit with conventional commit message

### Before Proceeding to Next FASE

- [ ] Verification checklist in FASE file completed
- [ ] Blockers removed (dependencies satisfied)
- [ ] Integration test for deliverables passing

### Before FASE-5 (Pre-Deployment)

- [ ] All CRITICAL findings resolved (from CORRECTIONS-APPLIED.md)
- [ ] BDD scenarios passing (spec/tests/BDD-UC-001.md)
- [ ] Performance targets met (< 12,000 CU)
- [ ] Security checklist reviewed

---

## Metrics & Progress Tracking

### Completion Tracking

Update this table as FASEs complete:

| FASE | Status | Start Date | End Date | Actual Effort | Notes |
|------|--------|------------|----------|---------------|-------|
| FASE-0 | Not Started | - | - | - | - |
| FASE-1 | Not Started | - | - | - | - |
| FASE-2 | Not Started | - | - | - | - |
| FASE-3 | Not Started | - | - | - | - |
| FASE-4 | Not Started | - | - | - | - |
| FASE-5 | Not Started | - | - | - | - |

### Velocity Metrics

After each FASE, record:
- **Estimated Effort:** From FASE file header
- **Actual Effort:** Hours spent
- **Variance:** (Actual - Estimated) / Estimated × 100%

**Example:**
```
FASE-0: Estimated 2h, Actual 2.5h → Variance: +25%
FASE-1: Estimated 4h, Actual 3.5h → Variance: -12.5%
```

**Use velocity data to:**
- Adjust remaining FASE estimates
- Identify learning curve (early FASEs may take longer)
- Improve future project planning

---

## Traceability Chain

Each FASE maintains full traceability to specifications:

```
REQUIREMENT → USE CASE → SPECIFICATION → FASE → CODE → TEST
```

**Example Trace:**
- **REQ-F-006:** "System shall support swap of Token A to Token B"
  - → **UC-004:** Swap Token A to Token B use case
  - → **API-solana-program.md:** `swap` instruction definition
  - → **FASE-3:** Swap instruction implementation
  - → **Code:** `programs/swap-program/src/instructions/swap.rs`
  - → **Test:** `tests/full-integration.ts::S1` (BDD Scenario 1)

**Traceability Benefits:**
- **Forward:** Requirement → Implementation (completeness)
- **Backward:** Code → Requirement (justification)
- **Impact Analysis:** Requirement change → affected code
- **Test Coverage:** Requirement → test (validation)

---

## Troubleshooting

### FASE-0 Build Failures

**Symptom:** `anchor build` fails with "anchor-lang not found"

**Solution:**
```bash
cargo clean
anchor build
```

**If persists:** Check Rust version (`rustc --version`), should be 1.75+

---

### FASE-1 IDL Generation Issues

**Symptom:** `target/idl/swap_program.json` missing or incomplete

**Solution:**
```bash
anchor build --idl
```

**Verify:**
```bash
cat target/idl/swap_program.json | jq '.events | length'
# Should output 4 (events defined in FASE-1)
```

---

### FASE-2/FASE-3 Test Failures

**Symptom:** Integration tests fail with "AccountNotFound"

**Solution:** Check PDA derivation matches program code:
```typescript
const [marketPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), mintA.toBuffer(), mintB.toBuffer()],
    program.programId  // Ensure this matches deployed program
);
```

---

### FASE-4 Wallet Connection Failures

**Symptom:** "Wallet adapter not found"

**Solution:**
```bash
cd app
npm install @solana/wallet-adapter-wallets
```

**Verify Phantom installed:** Browser extension must be active.

---

## References

### Internal Documentation
- [Specifications](../../spec/README.md)
- [Requirements](../../requirements/REQUIREMENTS.md)
- [Corrections Applied](../../CORRECTIONS-APPLIED.md)
- [Architecture Decisions](../../spec/adr/)

### External Resources
- [Anchor Book](https://book.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [SPL Token Docs](https://spl.solana.com/token)
- [SWEBOK v4](https://www.computer.org/education/bodies-of-knowledge/software-engineering)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-23 | Initial FASE generation (6 phases, 37 specs covered) |

---

**Recommended Next Action:** Start with [FASE-0: Bootstrap & Environment Setup](FASE-0.md)

**Questions?** Refer to [plan-architect skill documentation](../../.claude/skills/sdd-plan-architect/SKILL.md)

---

**Generated by:** `plan-architect` skill (SDD Pipeline)
**Execution Mode:** BATCH (Autonomous)
**Quality Gate:** ✅ PASS (All CRITICAL corrections applied, 100% spec coverage)
