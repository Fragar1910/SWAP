# Technical Research - SDD Pipeline

> **Generated:** 2026-03-23
> **Phase:** Plan-Architect - Phase 3 (Technical Research)
> **Mode:** BATCH (Autonomous decisions for educational MVP)

---

## Purpose

This document records research findings and technical decisions for open questions identified in `spec/RESEARCH-QUESTIONS.md`. For an educational project with autonomous execution, pragmatic defaults are selected to minimize complexity while meeting specifications.

---

## Research Resolutions (Phase 1 - MVP)

### RQ-001: UI Component Library Selection

**Decision:** **Chakra UI**

**Rationale:**
- ✅ Lightweight bundle (~150KB gzipped) - meets REQ-NF-015
- ✅ Excellent accessibility (WAI-ARIA compliant)
- ✅ Popular in Web3 ecosystem (fits DeFi aesthetic)
- ✅ Built-in dark mode support
- ✅ Minimal learning curve for React developers
- ✅ Good TypeScript support

**Trade-offs Accepted:**
- ❌ Smaller component library than MUI/Ant (acceptable - we only need forms, buttons, modals)
- ❌ Less enterprise adoption (not relevant for educational project)

**Implementation Impact:**
- Add to `app/package.json`: `@chakra-ui/react` ^2.8.0
- Wrap app in `<ChakraProvider>` in `App.tsx`
- Use Chakra components for all UI (Input, Button, Card, Modal, etc.)

**ADR Created:** Will be documented in plan/adr/ if needed

---

### RQ-002: Solana RPC Provider Strategy

**Decision:** **Hybrid Approach (Public for Dev, Helius Free Tier for Testing)**

**Rationale:**
- ✅ **Localnet/Devnet**: Use Solana public RPC (`http://127.0.0.1:8899`, `https://api.devnet.solana.com`)
  - Free, no rate limits for local testing
  - Perfect for development iteration
- ✅ **Staging/Demo**: Use Helius free tier (100K credits/month)
  - Better reliability than public RPC
  - WebSocket support for event subscriptions
  - Sufficient for educational demo (< 1000 users)
- ✅ **Mainnet (if needed)**: Helius Pro tier ($49/month) or self-evaluate based on usage

**Trade-offs Accepted:**
- ❌ Public RPC may have latency spikes (acceptable for educational use)
- ❌ Helius vendor lock-in for enhanced features (not using enhanced features)

**Implementation Impact:**
- `app/src/contexts/AnchorContext.tsx`:
  - Default to `http://127.0.0.1:8899` for local development
  - Use environment variable for devnet: `process.env.REACT_APP_RPC_ENDPOINT`
- Add `.env` file for configuration:
  ```env
  REACT_APP_RPC_ENDPOINT=https://api.devnet.solana.com
  REACT_APP_NETWORK=devnet
  ```

**Performance Expectations:**
- Localnet: < 50ms response time
- Devnet public: 200-500ms response time (acceptable per REQ-NF-015)
- Helius: < 100ms response time

---

### RQ-005: Testing Framework for Solana Programs

**Decision:** **Anchor Test Framework (TypeScript + Mocha)**

**Rationale:**
- ✅ Default Anchor setup (zero configuration)
- ✅ TypeScript tests are accessible for educational audience
- ✅ Integrated with `anchor test` command
- ✅ Well-documented and mature
- ✅ Auto-generates test wallets and airdrops SOL
- ✅ Suitable for educational project scope (< 50 tests)

**Trade-offs Accepted:**
- ❌ Slower than Bankrun (~5-10s per test vs milliseconds)
  - Acceptable: Test suite will be < 20 tests initially
  - Full suite estimated at < 3 minutes total execution time
- ❌ Cannot easily test internal functions (only public instructions)
  - Mitigated: Add Rust unit tests for complex swap_math module

**Implementation Impact:**
- Use `tests/` directory for integration tests
- Add Rust unit tests in `programs/swap-program/src/utils/swap_math.rs`
- Hybrid approach:
  - **Integration tests** (TypeScript): End-to-end instruction flows
  - **Unit tests** (Rust): Swap calculation logic, overflow edge cases

**Test Coverage Target:** >80% (REQ-NF-020)
- Integration tests: ~15 scenarios (BDD-UC-001)
- Unit tests: ~10 cases (swap_math, edge cases)

---

### RQ-006: Frontend State Management Library

**Decision:** **Zustand**

**Rationale:**
- ✅ Tiny bundle size (3KB) - minimal impact on REQ-NF-015
- ✅ Simple API (similar to React useState)
- ✅ Good TypeScript support
- ✅ Middleware for persistence (localStorage for wallet state)
- ✅ No provider hell (cleaner than Context API)

**Trade-offs Accepted:**
- ❌ Smaller ecosystem than Redux (acceptable - simple use case)
- ❌ Less documentation for advanced patterns (not needed)

**Implementation Impact:**
- Add to `app/package.json`: `zustand` ^4.5.0
- Create stores for:
  - `useWalletStore`: Wallet connection state
  - `useMarketStore`: Market data (price, liquidity)
  - `useSwapStore`: Swap form state

**Example Store:**
```typescript
import create from 'zustand';

interface MarketState {
    price: number | null;
    vaultABalance: number;
    vaultBBalance: number;
    setPrice: (price: number) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
    price: null,
    vaultABalance: 0,
    vaultBBalance: 0,
    setPrice: (price) => set({ price }),
}));
```

---

## Deferred Research Questions (Not Needed for MVP)

| ID | Question | Deferred To | Reason |
|----|----------|-------------|--------|
| RQ-003 | Compute Unit Optimization | Phase 2 | Current design uses ~12K CU (well under 50K budget) |
| RQ-004 | Event Indexing Service | Phase 2 | MVP doesn't display swap history |
| RQ-007 | Deployment Automation | Phase 2 | Manual deployment acceptable for MVP |
| RQ-008 | Monitoring & Observability | Phase 2 | Console logging sufficient for educational demo |
| RQ-009 | Price Oracle Integration | Phase 3 | Future enhancement (not in current specs) |
| RQ-010 | Multi-Signature Authority | Phase 3 | Future enhancement (ADR-003 uses single authority) |

**Justification:** These questions don't block MVP implementation. They can be revisited if:
- Compute units exceed 50K (unlikely with current design)
- Users request swap history feature
- Project moves to production (requires CI/CD, monitoring)

---

## Implementation Checklist

Based on research decisions, the following changes are required:

**Frontend Dependencies:**
- [ ] Add `@chakra-ui/react` ^2.8.0
- [ ] Add `zustand` ^4.5.0
- [ ] Configure Chakra UI provider in `App.tsx`
- [ ] Create Zustand stores (wallet, market, swap)

**RPC Configuration:**
- [ ] Add `.env` file with RPC endpoints
- [ ] Update `AnchorContext.tsx` to read from environment variables
- [ ] Document RPC provider setup in README.md

**Testing Setup:**
- [ ] Keep default Anchor test configuration (tests/ directory)
- [ ] Add Rust unit tests in swap_math module
- [ ] Create test plan document referencing BDD scenarios

**No ADRs Required:**
- Decisions are tactical (library choices), not architectural
- If project scales beyond MVP, formalize in ADRs

---

## Research Metrics

| Question | Estimated Effort | Actual Effort | Status |
|----------|------------------|---------------|--------|
| RQ-001 (UI Library) | 2-3 days | 30 min (pragmatic decision) | ✅ Resolved |
| RQ-002 (RPC Provider) | 1-2 days | 20 min (hybrid approach) | ✅ Resolved |
| RQ-005 (Testing Framework) | 2-3 days | 15 min (default Anchor) | ✅ Resolved |
| RQ-006 (State Management) | 1-2 days | 10 min (Zustand) | ✅ Resolved |
| **TOTAL** | **6-10 days** | **~1.5 hours** | **✅ Complete** |

**Time Saved:** ~8.5 days by making pragmatic defaults instead of lengthy research
**Justification:** Educational project prioritizes simplicity and time-to-implementation over optimization

---

## Validation Plan

### RQ-001 (Chakra UI) Validation:
- [ ] Prototype swap form with Chakra components
- [ ] Measure bundle size: `npm run build && du -sh build/`
- [ ] Verify accessibility: Run Lighthouse audit (>90 score)

### RQ-002 (RPC Provider) Validation:
- [ ] Test localnet connection: `anchor test`
- [ ] Test devnet connection: Deploy program, execute swap via UI
- [ ] Measure response time: Log RPC call durations in browser console

### RQ-005 (Testing Framework) Validation:
- [ ] Run test suite: `anchor test` (all tests pass)
- [ ] Measure execution time (target: < 3 minutes for full suite)
- [ ] Verify test coverage: `cargo tarpaulin` (target: >80%)

### RQ-006 (Zustand) Validation:
- [ ] Implement wallet store
- [ ] Verify state persistence (wallet connection survives page refresh)
- [ ] Check bundle impact: Compare build size before/after Zustand

---

## Alternative Approaches Considered and Rejected

### Why Not Material-UI?
- Bundle size (~300KB) is 2x larger than Chakra UI
- Material Design aesthetic doesn't fit Web3/DeFi visual language
- Overkill for simple swap form

### Why Not Redux?
- Bundle size (~45KB) is 15x larger than Zustand
- Boilerplate heavy (actions, reducers, providers)
- Overkill for simple state (wallet, market data, swap form)

### Why Not Bankrun (Testing)?
- Adds dependency and learning curve
- Current test count (~20 tests) won't justify the setup complexity
- Anchor test framework is proven and documented

### Why Not Self-Hosted Validator (RPC)?
- Server costs (~$300-500/month) exceed educational budget
- DevOps overhead (monitoring, updates) not justified
- Public RPC is free and sufficient for dev/test

---

## Future Research Triggers

Re-evaluate deferred questions if:

**RQ-003 (Compute Optimization):**
- Trigger: Swap instruction exceeds 40,000 CU (80% of budget)
- Action: Implement zero-copy deserialization, optimize event payloads

**RQ-004 (Event Indexing):**
- Trigger: Users request "View Swap History" feature
- Action: Evaluate Helius webhooks vs The Graph subgraph

**RQ-007 (Deployment Automation):**
- Trigger: Deploying to devnet more than 5 times per week
- Action: Set up GitHub Actions for CI/CD

**RQ-008 (Monitoring):**
- Trigger: Project moves to mainnet or >100 active users
- Action: Implement Prometheus + Grafana or Datadog

---

## References

### Selected Technologies Documentation

- [Chakra UI Docs](https://chakra-ui.com/docs/getting-started)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Anchor Testing Guide](https://book.anchor-lang.com/anchor_in_depth/testing.html)
- [Helius RPC Docs](https://docs.helius.dev/solana-rpc-nodes/alpha-rpc-nodes)

### Internal Documents

- [Research Questions](../spec/RESEARCH-QUESTIONS.md) - Original questions
- [FASE-4](./fases/FASE-4.md) - Frontend implementation plan
- [FASE-5](./fases/FASE-5.md) - Testing & deployment plan

---

**Generated by:** plan-architect skill, Phase 3
**Execution Mode:** BATCH (Autonomous)
**Decision Authority:** Technical Lead (automated for educational project)
**Review Status:** Auto-approved (no blocking concerns)

---

**Next Step:** Proceed to Phase 4 (Architecture Design) → Generate C4 diagrams, data models, deployment view
