# Implementation Order - Solana SWAP DEX

> **Generated:** 2026-03-24
> **Total FASEs:** 6
> **Recommended approach:** Incremental delivery per FASE with validation checkpoints

---

## FASE Dependency Graph

```
FASE-0 (Bootstrap)
    ↓
FASE-1 (Core Types)
    ↓
FASE-2 (Admin Instructions)
    ↓
FASE-3 (Swap Logic)
    ↓
┌───────────────┴───────────────┐
│                               │
FASE-4 (Frontend)    FASE-5 (Testing & Docs)
│                               │
└───────────────┬───────────────┘
                ↓
         DEPLOYMENT READY
```

**Key Dependencies:**
- FASE-1 depends on FASE-0 (requires Anchor project structure)
- FASE-2 depends on FASE-1 (requires account types and error codes)
- FASE-3 depends on FASE-2 (requires market initialization and liquidity)
- FASE-4 and FASE-5 can partially overlap after FASE-3 completes

---

## Recommended Implementation Sequence

### Wave 1: Foundation (CRITICAL PATH)
**FASE-0: Bootstrap & Environment Setup**
- **Duration:** 2 hours
- **Dependencies:** None (entry point)
- **Tasks:** 12
- **Parallelizable:** 4 tasks (33%)
- **Critical Path Tasks:** 5 sequential tasks
- **Deliverables:** Working Anchor project, all tooling installed
- **Validation:** `anchor build` and `anchor test` succeed

### Wave 2: Core Data Model
**FASE-1: Core Program Structure & Types**
- **Duration:** 4 hours
- **Dependencies:** FASE-0 (requires project structure)
- **Tasks:** 15
- **Parallelizable:** 8 tasks (53%)
- **Critical Path Tasks:** 6 sequential tasks
- **Deliverables:** All account structs, error codes, events, constants
- **Validation:** IDL contains 1 account type, 8 errors, 4 events

### Wave 3: Administrator Capabilities
**FASE-2: Administrative Instructions**
- **Duration:** 6 hours
- **Dependencies:** FASE-1 (requires MarketAccount, events, errors)
- **Tasks:** ~18 (pending full generation)
- **Parallelizable:** ~8 tasks (44%)
- **Critical Path Tasks:** ~10 sequential tasks
- **Deliverables:** 3 instructions (initialize_market, set_price, add_liquidity)
- **Validation:** Admin can create market, set price, add liquidity

### Wave 4: Core Business Logic
**FASE-3: Swap Instructions & Core Exchange Logic**
- **Duration:** 8 hours
- **Dependencies:** FASE-2 (requires market initialization)
- **Tasks:** ~22 (pending full generation)
- **Parallelizable:** ~10 tasks (45%)
- **Critical Path Tasks:** ~12 sequential tasks
- **Deliverables:** Bidirectional swap instruction, swap_math module
- **Validation:** Users can swap tokens in both directions

**Checkpoint after FASE-3:** Program is feature-complete for swaps. Deploy to devnet for testing.

---

### Wave 5A: User Interface (Can Parallelize)
**FASE-4: Frontend Application (React UI)**
- **Duration:** 10 hours
- **Dependencies:** FASE-3 (requires deployed program)
- **Tasks:** ~20 (pending full generation)
- **Parallelizable:** ~12 tasks (60%)
- **Critical Path Tasks:** ~8 sequential tasks
- **Deliverables:** Admin dashboard, swap interface, wallet integration
- **Validation:** Non-technical users can interact via browser

### Wave 5B: Quality Assurance (Can Parallelize)
**FASE-5: Comprehensive Testing, Deployment & Documentation**
- **Duration:** 8 hours
- **Dependencies:** FASE-3 (program complete), partial FASE-4 (UI for integration tests)
- **Tasks:** ~16 (pending full generation)
- **Parallelizable:** ~8 tasks (50%)
- **Critical Path Tasks:** ~8 sequential tasks
- **Deliverables:** >80% test coverage, devnet deployment, README
- **Validation:** All BDD scenarios pass, documentation complete

---

## Cross-FASE Dependencies

| From FASE | To FASE | Dependency Reason |
|-----------|---------|-------------------|
| FASE-0 | FASE-1 | Anchor project structure required |
| FASE-1 | FASE-2 | MarketAccount, events, errors required |
| FASE-2 | FASE-3 | Market initialization and liquidity required |
| FASE-3 | FASE-4 | Deployed program with swap instruction required |
| FASE-3 | FASE-5 | Complete program required for integration tests |

### Task-Level Cross-FASE Dependencies

| From Task | To Task | Reason |
|-----------|---------|--------|
| TASK-F0-010 (Build artifacts) | TASK-F1-001 (MarketAccount) | Requires compilable project |
| TASK-F1-010 (Integrate lib.rs) | FASE-2 instructions | Instruction handlers import from lib.rs |
| FASE-2 all tasks | TASK-F3-XXX (Swap instruction) | Swap requires initialized market with liquidity |

---

## MVP Strategy

### Minimum Viable Product: FASE-0 + FASE-1 + FASE-2 + FASE-3
- **Total Effort:** 20 hours (critical path)
- **Core Capability:** Functional token swap program (CLI-only)
- **Can Deploy:** Yes (devnet)
- **Can Demo:** Yes (via Anchor tests and CLI)

**MVP Deliverables:**
- ✅ Solana program deployed to devnet
- ✅ Administrator can initialize markets
- ✅ Administrator can set prices and add liquidity
- ✅ Users can execute bidirectional swaps
- ✅ Events emitted for all operations
- ❌ No web UI (FASE-4)
- ❌ Limited test coverage (FASE-5 provides comprehensive tests)

### Enhanced Product: MVP + FASE-4
- **Total Effort:** 30 hours
- **Core Capability:** Full-featured DEX with web UI
- **Can Deploy:** Yes (frontend to Vercel/Netlify, program to devnet)
- **Can Demo:** Yes (browser-based)

**Enhanced Deliverables:**
- ✅ All MVP capabilities
- ✅ Administrator dashboard (browser)
- ✅ User swap interface (browser)
- ✅ Wallet integration (Phantom, Solflare)
- ❌ Comprehensive test suite (FASE-5)

### Production-Ready: All FASEs
- **Total Effort:** 38 hours
- **Core Capability:** Complete DEX with testing and documentation
- **Can Deploy:** Yes (production-grade)
- **Can Demo:** Yes (with documentation and test coverage)

---

## Incremental Delivery Checkpoints

### Checkpoint 1: Infrastructure Ready (After FASE-0)
**Time:** 2 hours
**Capability:** Development environment functional
**Validation:**
- [ ] `anchor build` succeeds
- [ ] `anchor test` passes skeleton test
- [ ] Program deploys to localnet

### Checkpoint 2: Types Defined (After FASE-1)
**Time:** 6 hours cumulative
**Capability:** All domain types available
**Validation:**
- [ ] IDL shows 1 account, 8 errors, 4 events
- [ ] TypeScript types generated
- [ ] No compilation warnings

### Checkpoint 3: Admin Capabilities (After FASE-2)
**Time:** 12 hours cumulative
**Capability:** Markets can be created and managed
**Validation:**
- [ ] Admin can initialize market
- [ ] Admin can set price
- [ ] Admin can add liquidity
- [ ] All events emitted correctly

### Checkpoint 4: Core DEX Functional (After FASE-3) ⭐ KEY MILESTONE
**Time:** 20 hours cumulative
**Capability:** Users can swap tokens
**Validation:**
- [ ] A→B swap works correctly
- [ ] B→A swap works correctly
- [ ] Insufficient liquidity errors handled
- [ ] Price validation enforced
- [ ] Compute units < 12,000 CU

### Checkpoint 5: User-Facing (After FASE-4)
**Time:** 30 hours cumulative
**Capability:** Browser-based interaction
**Validation:**
- [ ] Admin dashboard functional
- [ ] Swap interface functional
- [ ] Wallet connection works
- [ ] Transactions execute via UI

### Checkpoint 6: Production-Ready (After FASE-5) ⭐ FINAL MILESTONE
**Time:** 38 hours cumulative
**Capability:** Deployable to mainnet (with disclaimers)
**Validation:**
- [ ] Test coverage >80%
- [ ] All BDD scenarios pass
- [ ] Program deployed to devnet
- [ ] README and docs complete
- [ ] No critical bugs or gaps

---

## Parallel Execution Opportunities

### During FASE-0
**Parallel Wave at Task F0-006:**
- TASK-F0-004 (Config Solana) [P]
- TASK-F0-006 (Program Deps) [P]
- TASK-F0-007 (TS Deps) [P]
- TASK-F0-008 (TS Config) [P]
- TASK-F0-009 (Test Skeleton) [P]

**Benefit:** Reduces 75 minutes to ~20 minutes (4x speedup)

### During FASE-1
**Parallel Wave at Task F1-001:**
- TASK-F1-001 through TASK-F1-008 (8 tasks) [P]

**Benefit:** Reduces 4 hours to ~1.5 hours (2.7x speedup)

### During FASE-4
**Parallel Wave for UI Components:**
- Admin dashboard components [P]
- Swap interface components [P]
- Wallet integration [P]
- Styling (CSS) [P]

**Benefit:** Reduces 6 hours to ~2 hours (3x speedup)

### During FASE-5
**Parallel Wave for Testing:**
- Integration tests (Rust/TS) [P]
- Unit tests (Rust) [P]
- Documentation writing [P]

**Benefit:** Reduces 5 hours to ~2 hours (2.5x speedup)

---

## Critical Path Analysis

### Tasks on Critical Path (Sequential, No Parallelization)

1. **FASE-0 Critical:** TASK-F0-001 → TASK-F0-002 → TASK-F0-003 → TASK-F0-005 → TASK-F0-010 → TASK-F0-011
   - **Duration:** ~1.5 hours

2. **FASE-1 Critical:** TASK-F1-001 → TASK-F1-009 → TASK-F1-010 → TASK-F1-011 → TASK-F1-015
   - **Duration:** ~2 hours

3. **FASE-2 Critical:** Initialize market instruction → Set price instruction → Add liquidity instruction → Integration tests
   - **Duration:** ~4 hours (estimated)

4. **FASE-3 Critical:** Swap math module → Swap instruction → Integration tests → Performance validation
   - **Duration:** ~5 hours (estimated)

**Total Critical Path:** ~12.5 hours (minimum time to feature-complete program, assuming perfect execution)

**With Realistic Buffer:** ~20 hours (includes debugging, retries, documentation)

---

## Recommended Daily Schedule (5-Day Plan)

### Day 1: Foundation (6 hours)
- Morning: FASE-0 (2 hours)
- Afternoon: FASE-1 (4 hours)
- **Checkpoint:** Types and environment ready

### Day 2: Admin Capabilities (8 hours)
- Full Day: FASE-2 (6 hours) + Buffer (2 hours)
- **Checkpoint:** Markets can be initialized and managed

### Day 3: Core Logic (8 hours)
- Full Day: FASE-3 (8 hours)
- **Checkpoint:** Swap functionality complete, deploy to devnet

### Day 4: User Interface (8 hours)
- Full Day: FASE-4 (10 hours target, may need partial Day 5)
- **Checkpoint:** UI functional, wallet integration working

### Day 5: Testing & Documentation (8 hours)
- Morning: Complete FASE-4 (2 hours)
- Afternoon: FASE-5 (6 hours)
- **Checkpoint:** Production-ready with tests and docs

---

## Risk Mitigation Strategy

### High-Risk Areas (Add Buffer Time)

1. **FASE-3 Swap Math** - Arithmetic overflow edge cases may require extra debugging
   - Buffer: +2 hours
   - Mitigation: Comprehensive unit tests for all decimal combinations

2. **FASE-4 Wallet Integration** - Browser wallet quirks, transaction signing issues
   - Buffer: +1 hour
   - Mitigation: Test with multiple wallets (Phantom, Solflare)

3. **FASE-5 Test Coverage** - Achieving >80% may require additional test scenarios
   - Buffer: +1 hour
   - Mitigation: Use cargo tarpaulin to measure coverage early

**Total Recommended Buffer:** +4 hours (42 hours total with buffer)

---

## Next Immediate Actions

1. **Start TASK-F0-001:** Install Solana CLI
2. **Verify Prerequisites:** Rust toolchain installed (rustc --version)
3. **Prepare Environment:** Clear 2-hour time block for FASE-0 completion
4. **Set Expectations:** FASE-0 is fastest (2 hours), subsequent FASEs take longer

---

**Generated by:** task-generator skill
**Source:** plan/fases/*.md, plan/PLAN.md
**Critical Path:** 20 hours (with 18-hour parallelization opportunity)
