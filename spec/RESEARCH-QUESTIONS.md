# Research Questions for Plan-Architect

> **Open Technical Questions Requiring Investigation**
> **Target Phase:** Architecture & Implementation Planning
> **Status:** Awaiting Research
> **Generated:** 2026-03-22
> **Version:** 1.0

---

## Overview

This document captures **open research questions** that must be resolved during the architecture planning and implementation phases. These questions emerged from specification analysis and represent technical decisions that require:

- Technical research and prototyping
- Trade-off analysis
- Vendor/library evaluation
- Performance benchmarking
- Cost-benefit analysis

Each question includes:
- **Context**: Why this question matters
- **Blocked Specs**: Which specifications depend on the answer
- **Candidate Options**: Known alternatives to evaluate
- **Research Effort**: Estimated time to resolve
- **Decision Criteria**: What factors matter most

---

## Research Question Index

| ID | Question | Priority | Effort | Status |
|----|----------|----------|--------|--------|
| RQ-001 | UI Component Library Selection | Should have | 2-3 days | Open |
| RQ-002 | Solana RPC Provider Strategy | Must have | 1-2 days | Open |
| RQ-003 | Compute Unit Optimization Techniques | Should have | 3-5 days | Open |
| RQ-004 | Event Indexing Service Selection | Should have | 2-3 days | Open |
| RQ-005 | Testing Framework for Solana Programs | Must have | 2-3 days | Open |
| RQ-006 | Frontend State Management Library | Should have | 1-2 days | Open |
| RQ-007 | Deployment Automation Strategy | Should have | 2-3 days | Open |
| RQ-008 | Monitoring & Observability Stack | Should have | 3-4 days | Open |
| RQ-009 | Price Oracle Integration (Future) | Could have | 4-5 days | Open |
| RQ-010 | Multi-Signature Authority (Future) | Could have | 3-4 days | Open |

---

## RQ-001: UI Component Library Selection

### Context

The web UI requires a React component library for building swap interface, wallet connection, balance displays, and transaction forms. The choice impacts development speed, UI/UX quality, accessibility, and bundle size (which affects load time - REQ-NF-015).

### Blocked Specifications

- **API-web-ui.md**: Component contract definitions depend on library primitives
- **UC-006**: Connect Wallet UI flows
- **UC-004/005**: Swap form components
- **PERFORMANCE.md**: Bundle size affects initial load time

### Candidate Options

#### Option 1: Material-UI (MUI)

**Pros:**
- Comprehensive component library (forms, buttons, modals, tooltips)
- Strong TypeScript support
- Excellent documentation and community
- Built-in theming system (dark mode support)
- Accessibility (WCAG 2.1 compliant)

**Cons:**
- Large bundle size (~300KB gzipped)
- Opinionated styling (Material Design aesthetic)
- Tree-shaking requires configuration
- Learning curve for customization

**Research Tasks:**
- Create prototype swap form with MUI
- Measure bundle size with tree-shaking
- Evaluate theming flexibility for crypto aesthetic
- Check integration with Solana wallet adapters

---

#### Option 2: Ant Design

**Pros:**
- Rich component ecosystem (especially data displays)
- Good TypeScript support
- Enterprise-grade quality
- Built-in form validation (Formik-like)

**Cons:**
- Bundle size similar to MUI (~280KB)
- Designed for enterprise apps (may not fit Web3 aesthetic)
- Less flexible theming than MUI
- Community smaller than MUI

**Research Tasks:**
- Prototype swap interface with Ant Design
- Evaluate customization for Web3 branding
- Measure bundle impact

---

#### Option 3: Chakra UI

**Pros:**
- Lightweight (~150KB gzipped)
- Excellent accessibility (WAI-ARIA compliant)
- Highly composable and customizable
- Popular in Web3 ecosystem
- Built-in dark mode support
- Minimal learning curve

**Cons:**
- Smaller component library than MUI/Ant
- Less enterprise adoption (newer library)
- Fewer data display components

**Research Tasks:**
- Build prototype with Chakra UI
- Validate all required components exist
- Test integration with Phantom wallet adapter
- Measure bundle size in production build

---

#### Option 4: Headless UI + Tailwind CSS

**Pros:**
- Minimal bundle size (~50KB + Tailwind)
- Maximum customization flexibility
- No CSS-in-JS overhead
- Full control over styling

**Cons:**
- More boilerplate (lower-level primitives)
- Slower development (build components from scratch)
- Requires strong CSS skills
- No pre-built complex components (tables, date pickers)

**Research Tasks:**
- Estimate development time for building custom components
- Compare with pre-built library timelines
- Evaluate long-term maintainability

---

### Decision Criteria

| Criterion | Weight | Notes |
|-----------|--------|-------|
| Bundle Size (< 200KB) | High | Impacts REQ-NF-015 (UI responsiveness) |
| Development Speed | High | Educational project timeline |
| Web3 Aesthetic Fit | Medium | Should look like modern DeFi app |
| Accessibility | Medium | WCAG 2.1 compliance preferred |
| TypeScript Support | High | Strong typing for reliability |
| Community/Ecosystem | Low | All options well-supported |

### Research Effort

**Estimated Time**: 2-3 days
- Day 1: Prototype swap form with MUI and Chakra UI
- Day 2: Bundle size analysis, accessibility testing
- Day 3: Document trade-offs, make recommendation

### Recommended Research Approach

1. Create minimal swap form prototype with each library
2. Measure production bundle sizes with webpack-bundle-analyzer
3. Test integration with @solana/wallet-adapter-react-ui
4. Evaluate theming/customization for Web3 aesthetic
5. Compare development velocity (lines of code, time to implement)

---

## RQ-002: Solana RPC Provider Strategy

### Context

The web UI and tests require RPC access to query account data, submit transactions, and subscribe to events. Free public RPC nodes have rate limits and reliability issues. Paid providers offer better performance but add operational costs.

### Blocked Specifications

- **PERFORMANCE.md**: RPC response time affects REQ-NF-015 (UI responsiveness < 500ms)
- **UC-004/005**: Swap execution requires reliable transaction submission
- **UC-006**: Wallet connection queries account balances via RPC
- **OBSERVABILITY.md**: Event indexing requires WebSocket subscriptions

### Candidate Options

#### Option 1: Solana Public RPC (Free)

**Endpoint**: `https://api.mainnet-beta.solana.com`, `https://api.devnet.solana.com`

**Pros:**
- Free (no cost)
- Official Solana Foundation infrastructure
- Suitable for development and testing

**Cons:**
- Rate limits (10 req/sec for free tier)
- High latency during network congestion (>1s response times)
- No SLA or uptime guarantee
- WebSocket subscriptions unreliable
- Frequent 429 (Too Many Requests) errors

**Research Tasks:**
- Test sustained load (100 requests over 1 minute)
- Measure p95/p99 response times
- Evaluate WebSocket subscription stability

---

#### Option 2: Helius (Paid RPC Provider)

**Pricing**: Free tier (100K credits/month), Pro tier ($49/month - 1M credits), Enterprise (custom)

**Pros:**
- Enhanced RPCs (getAsset, searchAssets for NFTs)
- DAS API (Digital Asset Standard)
- Webhooks for event notifications
- 99.9% uptime SLA (Pro tier)
- Fast response times (<100ms p95)
- Priority transaction submission

**Cons:**
- Cost ($49+/month for production)
- Vendor lock-in (enhanced APIs not portable)
- Overkill for simple swap app (DAS APIs not needed)

**Research Tasks:**
- Sign up for free tier
- Test RPC response times vs public endpoint
- Evaluate webhook reliability for event indexing
- Analyze cost at 1000 users/day

---

#### Option 3: QuickNode (Paid RPC Provider)

**Pricing**: Build tier (Free - limited), Scale tier ($49/month - 10M credits), Pro tier ($299/month)

**Pros:**
- Global edge network (low latency)
- 99.95% uptime SLA
- Dedicated endpoints (no shared rate limits)
- Analytics dashboard (request monitoring)
- Add-ons: NFT API, Token API, Archive nodes

**Cons:**
- Cost ($49+/month)
- Free tier very limited (not suitable for production)

**Research Tasks:**
- Compare pricing vs Helius for equivalent throughput
- Test latency from different geographic regions
- Evaluate analytics dashboard value

---

#### Option 4: Self-Hosted Solana Validator (Advanced)

**Pros:**
- No RPC costs (just server costs)
- Full control over infrastructure
- No rate limits
- Can serve as validator (earn staking rewards)

**Cons:**
- High setup complexity (DevOps effort)
- Server costs (~$300-500/month for validator-grade hardware)
- Maintenance overhead (updates, monitoring)
- Not suitable for educational project

**Research Tasks:**
- Estimate total cost of ownership (server + DevOps time)
- Compare to paid RPC costs at scale

---

#### Option 5: Hybrid Strategy

**Free Public for Development, Paid for Production**

**Approach:**
- Use Solana public RPC for localnet/devnet testing
- Use Helius/QuickNode free tier for staging
- Use paid tier only for mainnet production

**Pros:**
- Cost-effective for educational project
- Easy to upgrade when needed
- No vendor lock-in (standard RPC interface)

**Cons:**
- Environment parity issues (dev vs prod behavior)
- Must handle rate limit errors gracefully

---

### Decision Criteria

| Criterion | Weight | Notes |
|-----------|--------|-------|
| Response Time (< 200ms p95) | High | REQ-NF-015 compliance |
| Cost (< $100/month) | High | Educational project budget |
| Reliability (99%+ uptime) | Medium | Not critical for educational demo |
| WebSocket Support | Medium | Event subscriptions for UI updates |
| Ease of Setup | High | Minimize DevOps complexity |

### Research Effort

**Estimated Time**: 1-2 days
- Day 1: Benchmark response times (public vs Helius vs QuickNode)
- Day 2: Cost analysis, reliability testing, make recommendation

### Recommended Research Approach

1. Load test public RPC endpoint (measure latency under load)
2. Sign up for Helius and QuickNode free tiers
3. Run same load test on paid providers
4. Measure WebSocket subscription stability (drop rate)
5. Calculate cost at 1000 active users/day
6. Document recommendation with cost/performance trade-offs

---

## RQ-003: Compute Unit Optimization Techniques

### Context

REQ-NF-014 requires swap instructions to execute within 50,000 compute units. Anchor adds ~2,000-3,000 CU overhead (ADR-001). The swap instruction performs:
- Account deserialization (~2,000 CU)
- Checked arithmetic (~500 CU)
- 2 CPI calls to Token Program (~5,000 CU each)
- Event emission (~1,000 CU)

Current estimate: ~15,500 CU (well within budget), but complex future features (AMM curves, multi-hop swaps) may require optimization.

### Blocked Specifications

- **PERFORMANCE.md**: Section 3 (Compute Unit Efficiency)
- **ADR-005**: Checked Arithmetic - may need optimization if overhead too high
- **Future features**: AMM curve calculations, LP token minting

### Candidate Optimization Techniques

#### Technique 1: Minimize Account Loading

**Strategy**: Only load accounts needed for specific instruction variant.

**Example**:
```rust
// Before: Always load both vaults (even if only one used)
pub struct Swap<'info> {
    pub vault_a: Account<'info, TokenAccount>,
    pub vault_b: Account<'info, TokenAccount>,
}

// After: Load only needed vault based on swap direction
pub struct SwapAToB<'info> {
    pub vault_a: Account<'info, TokenAccount>, // Only vault_a loaded
    pub vault_b: Account<'info, TokenAccount>,
}
```

**Research Tasks:**
- Measure CU savings from reducing loaded accounts
- Evaluate code complexity increase (separate instruction contexts)

---

#### Technique 2: Zero-Copy Deserialization

**Strategy**: Use Anchor's `zero_copy` feature for large accounts.

**Example**:
```rust
#[account(zero_copy)]
pub struct MarketAccount {
    // Fields accessed via references, not copied to stack
}
```

**Research Tasks:**
- Determine if MarketAccount (115 bytes) benefits from zero-copy
- Measure CU difference vs standard deserialization

---

#### Technique 3: Optimize Event Emission

**Strategy**: Reduce event payload size, emit only essential fields.

**Example**:
```rust
// Before: Full event with timestamp, names, etc.
#[event]
pub struct SwapExecuted {
    pub market: Pubkey,
    pub user: Pubkey,
    pub input_amount: u64,
    pub output_amount: u64,
    pub timestamp: i64,
    pub swap_a_to_b: bool,
}

// After: Minimal event (derive timestamp off-chain from block time)
#[event]
pub struct SwapExecuted {
    pub user: Pubkey,
    pub input_amount: u64,
    pub output_amount: u64,
}
```

**Research Tasks:**
- Measure CU savings from smaller events
- Validate off-chain indexers can derive missing fields

---

#### Technique 4: Batch Operations (Future)

**Strategy**: Allow multiple swaps in single transaction (not in current scope).

**Research Tasks:**
- Estimate CU amortization per swap in batch
- Determine if Solana transaction size limits allow batching

---

### Decision Criteria

| Criterion | Weight | Notes |
|-----------|--------|-------|
| CU Savings (> 2,000 CU) | High | Only worth complexity if significant |
| Code Complexity Increase | High | Educational project - keep simple |
| Maintainability | High | Avoid premature optimization |
| Future Extensibility | Medium | Will AMM curves fit in budget? |

### Research Effort

**Estimated Time**: 3-5 days
- Days 1-2: Implement each optimization technique in test branch
- Day 3: Measure CU usage with `sol_log_compute_units()`
- Day 4: Benchmark performance trade-offs
- Day 5: Document findings, recommendation

### Recommended Research Approach

1. Establish baseline CU usage for current swap instruction
2. Create separate branches for each optimization technique
3. Use `sol_log_compute_units()` to measure CU at each step
4. Create comparison table (CU saved vs complexity added)
5. Decide if optimization needed or defer to future

---

## RQ-004: Event Indexing Service Selection

### Context

The web UI should display swap history, price change history, and liquidity events. Solana's `getProgramAccounts` is expensive (slow, high RPC load). Event indexing services parse transaction logs and provide fast querying via GraphQL/REST APIs.

### Blocked Specifications

- **EVENTS-swap-program.md**: Event consumption and UI display
- **OBSERVABILITY.md**: Event-based audit trail and monitoring
- **UC-004/005**: Display recent swap history in UI
- **WF-002**: Exchange rate management - display price history chart

### Candidate Options

#### Option 1: The Graph (Decentralized Indexer)

**Pros:**
- Decentralized (censorship-resistant)
- GraphQL API (flexible queries)
- Community-run infrastructure
- Free tier available
- Solana support (beta)

**Cons:**
- Complex setup (write subgraph schema, deploy to network)
- Solana support still beta (potential bugs)
- Query costs on mainnet (paid in GRT tokens)
- Performance unpredictable (depends on indexer node)

**Research Tasks:**
- Write subgraph schema for MarketInitialized, PriceSet, SwapExecuted events
- Deploy to testnet and query
- Measure query response times
- Evaluate cost at 1000 queries/day

---

#### Option 2: Helius Webhooks (Centralized, Vendor-Specific)

**Pros:**
- Simple setup (register webhook URL)
- Real-time event delivery (push model)
- Low latency (<1s from transaction to webhook)
- No query costs (pay for RPC tier)
- Integrated with Helius RPC

**Cons:**
- Vendor lock-in (Helius-specific)
- Requires backend service to receive webhooks
- Not decentralized
- Must implement own database for historical queries

**Research Tasks:**
- Set up webhook endpoint (Express.js server)
- Test event delivery reliability
- Implement database schema for event storage (PostgreSQL)
- Estimate backend hosting costs

---

#### Option 3: Self-Hosted Event Listener (Custom)

**Approach**: Run background process that subscribes to program logs via WebSocket, parses events, stores in database.

**Pros:**
- Full control over data
- No vendor lock-in
- Works with any RPC provider
- Can customize indexing logic

**Cons:**
- Development effort (write parser, maintain database)
- Reliability depends on WebSocket stability
- Must handle backfill for missed events
- Backend infrastructure required

**Research Tasks:**
- Prototype event listener with `@solana/web3.js` logs subscription
- Parse Anchor events from transaction logs
- Estimate development time (2-3 days)
- Compare to SaaS indexing services

---

#### Option 4: No Indexing (Query On-Demand)

**Approach**: Query transactions directly via RPC when user requests history.

**Pros:**
- No indexing infrastructure
- No additional costs
- Simple architecture

**Cons:**
- Very slow (getSignaturesForAddress + getTransaction per result)
- High RPC load (expensive with paid providers)
- Poor UX (10+ seconds to load swap history)
- Not feasible for price charts (requires historical aggregation)

**Research Tasks:**
- Measure query time for fetching last 20 swaps
- Validate if performance acceptable for MVP

---

### Decision Criteria

| Criterion | Weight | Notes |
|-----------|--------|-------|
| Setup Complexity | High | Educational project - minimize DevOps |
| Query Performance (< 500ms) | Medium | Nice to have, not critical for MVP |
| Cost (< $50/month) | High | Budget constraint |
| Decentralization | Low | Not critical for educational demo |
| Real-time Updates | Medium | Improves UX but not required |

### Research Effort

**Estimated Time**: 2-3 days
- Day 1: Prototype The Graph subgraph
- Day 2: Prototype Helius webhooks + database
- Day 3: Compare options, document trade-offs

### Recommended Research Approach

1. Defer to Phase 2 (MVP doesn't need event history)
2. For Phase 2, start with Helius webhooks (simplest)
3. If decentralization required, migrate to The Graph later

---

## RQ-005: Testing Framework for Solana Programs

### Context

Solana smart contracts require integration testing with on-chain account state. Options include Anchor's test framework (TypeScript), Bankrun (faster local validator), and solana-test-validator (full validator simulation).

### Blocked Specifications

- **All Use Cases**: Each has Acceptance Criteria requiring tests
- **Invariants**: `domain/05-INVARIANTS.md` - each invariant needs test assertion
- **PERFORMANCE.md**: Load testing strategy

### Candidate Options

#### Option 1: Anchor Test Framework (Default)

**Approach**: Use `anchor test` with TypeScript tests, Mocha test runner.

**Pros:**
- Default Anchor setup (zero configuration)
- TypeScript test syntax (familiar for web developers)
- Integrated with program deployment
- Auto-generates test wallet and airdrops SOL
- Good documentation and community support

**Cons:**
- Slow test execution (~5-10s per test due to validator startup)
- Full validator overhead (not needed for unit tests)
- Hard to test error conditions (requires transaction simulation)

**Research Tasks:**
- Measure test suite execution time (baseline)
- Evaluate developer experience
- Check if parallel test execution possible

---

#### Option 2: Bankrun (Fast In-Memory Validator)

**Approach**: Use `solana-bankrun` library for in-memory validator simulation.

**Pros:**
- 10-100x faster than full validator (milliseconds per test)
- Lightweight (runs in Node.js process)
- Supports account manipulation (easy to test edge cases)
- Deterministic (no network calls, no race conditions)

**Cons:**
- Less mature than Anchor test framework
- May not simulate all validator behaviors accurately
- Requires separate integration tests with real validator
- Less documentation

**Research Tasks:**
- Prototype test suite with Bankrun
- Measure speedup vs Anchor tests
- Validate all program features work correctly

---

#### Option 3: Rust Unit Tests (solana-program-test)

**Approach**: Write tests in Rust using `solana-program-test` crate.

**Pros:**
- Fast execution (compiled Rust tests)
- Type-safe (catch errors at compile time)
- No TypeScript transpilation overhead
- Can test internal functions (not just instructions)

**Cons:**
- Rust learning curve (steeper than TypeScript)
- Less familiar for frontend developers
- More verbose test syntax
- Harder to integrate with frontend testing

**Research Tasks:**
- Write sample test in Rust
- Compare developer experience to TypeScript
- Estimate time to port test suite

---

#### Option 4: Hybrid Strategy

**Approach**:
- Use Bankrun for fast unit tests (business logic)
- Use Anchor tests for integration tests (end-to-end flows)
- Use Rust tests for internal helper functions

**Pros:**
- Best of all worlds (speed + coverage)
- Fast feedback loop during development
- Comprehensive validation

**Cons:**
- Maintenance overhead (three test suites)
- Learning curve for three frameworks

---

### Decision Criteria

| Criterion | Weight | Notes |
|-----------|--------|-------|
| Test Execution Speed | High | Developer productivity |
| Developer Experience | High | Educational project - ease of learning |
| Coverage Completeness | High | All invariants must be testable |
| Ecosystem Maturity | Medium | Avoid bleeding-edge tools |

### Research Effort

**Estimated Time**: 2-3 days
- Day 1: Implement 5 tests with Anchor framework (baseline)
- Day 2: Implement same 5 tests with Bankrun
- Day 3: Compare speed, DX, make recommendation

### Recommended Research Approach

1. Start with Anchor test framework (default, proven)
2. Measure test suite execution time as tests grow
3. If tests become slow (>2 minutes), evaluate Bankrun migration
4. Use Rust unit tests only for complex internal logic

---

## RQ-006: Frontend State Management Library

### Context

The web UI must manage:
- Wallet connection state (connected/disconnected, public key)
- Token balances (user, vaults)
- Market data (price, liquidity)
- Transaction status (pending, confirmed, failed)
- UI state (loading indicators, error messages)

React state management options range from built-in hooks (useState, useContext) to libraries (Redux, Zustand, Jotai, Recoil).

### Blocked Specifications

- **API-web-ui.md**: State management architecture
- **UC-006**: Wallet connection state persistence
- **UC-004/005**: Swap form state, optimistic updates

### Candidate Options

#### Option 1: React Context + Hooks (Built-in)

**Pros:**
- No additional dependencies (zero bundle size)
- Simple for small apps
- Official React approach
- Well-documented

**Cons:**
- Verbose for complex state (many providers)
- Re-render performance issues at scale
- No built-in dev tools
- No middleware (logging, persistence)

---

#### Option 2: Zustand (Lightweight)

**Pros:**
- Tiny bundle size (3KB)
- Simple API (similar to useState)
- Good TypeScript support
- Middleware for persistence, logging
- No provider hell

**Cons:**
- Smaller ecosystem than Redux
- Less documentation for advanced patterns

---

#### Option 3: Redux Toolkit (Enterprise)

**Pros:**
- Industry standard
- Excellent dev tools
- Comprehensive middleware ecosystem
- Strong TypeScript support
- Proven at scale

**Cons:**
- Large bundle size (~45KB)
- Boilerplate heavy
- Overkill for small apps
- Steeper learning curve

---

### Decision Criteria

| Criterion | Weight |
|-----------|--------|
| Bundle Size (< 10KB) | Medium |
| Developer Experience | High |
| Learning Curve | High |

### Research Effort

**Estimated Time**: 1-2 days

### Recommendation

**Zustand** - Best balance of simplicity and features for swap app.

---

## RQ-007: Deployment Automation Strategy

### Context

Solana program deployment requires:
- Building program (cargo build-bpf)
- Deploying to localnet/devnet/mainnet
- Upgrading deployed programs
- IDL generation and upload

### Blocked Specifications

- **PERFORMANCE.md**: Deployment process affects developer iteration speed
- **Runbooks**: Deployment procedures

### Candidate Options

1. **Manual Deployment** (anchor deploy)
2. **GitHub Actions CI/CD**
3. **Vercel/Netlify for Frontend**

### Research Effort

**Estimated Time**: 2-3 days

---

## RQ-008: Monitoring & Observability Stack

### Context

Production monitoring for:
- Transaction success rate
- Confirmation times (p50, p95, p99)
- Vault balances (alert on low liquidity)
- Error rate spikes
- RPC node health

### Blocked Specifications

- **OBSERVABILITY.md**: Complete monitoring strategy
- **PERFORMANCE.md**: Performance acceptance criteria tracking

### Candidate Options

1. **Datadog** (comprehensive, expensive)
2. **Prometheus + Grafana** (self-hosted, flexible)
3. **Solana Beach / SolScan** (free block explorers)

### Research Effort

**Estimated Time**: 3-4 days

---

## RQ-009: Price Oracle Integration (Future Enhancement)

### Context

Current spec uses administrator-controlled fixed pricing (REQ-F-002, ADR-002). Future enhancement could integrate price oracles (Pyth, Switchboard) for automated price updates.

### Blocked Specifications

- **Future Feature**: Automated price discovery
- **WF-002**: Could eliminate manual price management

### Candidate Options

1. **Pyth Network** (real-time prices, low latency)
2. **Switchboard** (decentralized oracle network)
3. **Chainlink** (limited Solana support)

### Research Effort

**Estimated Time**: 4-5 days

**Status**: Deferred to Phase 2

---

## RQ-010: Multi-Signature Authority (Future Enhancement)

### Context

Current spec uses single administrator authority (REQ-F-008, ADR-003). For production, multi-sig (e.g., 2-of-3) would improve security.

### Blocked Specifications

- **Future Feature**: Multi-sig governance
- **ADR-003**: Would need revision

### Candidate Options

1. **Squads Protocol** (Gnosis Safe for Solana)
2. **Custom Multi-Sig Program** (more control)
3. **SPL Governance** (DAO-based governance)

### Research Effort

**Estimated Time**: 3-4 days

**Status**: Deferred to Phase 3

---

## Priority Roadmap

### Phase 1 (MVP - Current Scope)

**Must Answer:**
- RQ-002: RPC Provider (affects reliability)
- RQ-005: Testing Framework (affects development velocity)

**Should Answer:**
- RQ-001: UI Component Library (affects frontend timeline)
- RQ-006: State Management (simple decision, low effort)

**Can Defer:**
- RQ-003: Compute optimization (current design well within budget)
- RQ-004: Event indexing (not needed for MVP)
- RQ-007: Deployment automation (manual acceptable for MVP)
- RQ-008: Monitoring (simple logging sufficient for MVP)

---

### Phase 2 (Production Hardening)

**Must Answer:**
- RQ-004: Event Indexing (for swap history UI)
- RQ-007: Deployment Automation (CI/CD pipeline)
- RQ-008: Monitoring Stack (production observability)

---

### Phase 3 (Advanced Features)

**Research:**
- RQ-009: Price Oracle Integration
- RQ-010: Multi-Signature Authority
- RQ-003: Compute Optimization (if AMM curves added)

---

## How to Use This Document

### For Architects

1. Review questions in priority order
2. Conduct research using "Recommended Research Approach"
3. Document findings in new ADR (e.g., ADR-007: UI Component Library)
4. Update blocked specifications with decisions
5. Close research question (move to "Resolved" section)

### For Developers

- Reference this document when implementation details are unclear
- Do NOT make technical decisions on blocked items without resolving research question first
- Propose additional research questions via PR

### For Product Managers

- Use this document to understand technical unknowns
- Prioritize research questions based on feature roadmap
- Budget time for research sprints before implementation

---

## Resolved Research Questions

(Will be moved here after decisions are made)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-22 | Initial research questions (10 questions) |
|  |  | - 4 must-have questions |
|  |  | - 4 should-have questions |
|  |  | - 2 could-have questions (future) |

---

**Next Steps**: Architecture team should allocate 5-7 days for Phase 1 research sprint to answer RQ-001, RQ-002, RQ-005, and RQ-006 before implementation begins.
