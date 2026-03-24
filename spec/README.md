# Solana SWAP Specifications

> **Comprehensive Technical Specification Repository**
> **Project:** Decentralized Token Swap Protocol on Solana
> **Framework:** Anchor 0.31.0
> **Last Updated:** 2026-03-22
> **Version:** 1.0

---

## Overview

Welcome to the Solana SWAP technical specifications repository. This directory contains the complete, formal specification of a decentralized token exchange (DEX) protocol built on Solana using the Anchor framework. The specifications follow a structured Software Development Discipline (SDD) approach, providing traceability from business requirements through implementation.

### Project Purpose

The Solana SWAP protocol enables permissionless, fixed-rate token exchanges between two SPL tokens. It serves both educational and production use cases:

- **Educational**: Demonstrates professional specification-driven development for blockchain applications
- **Production**: Provides a secure, auditable implementation of core DeFi primitives
- **Extensible**: Foundation for advanced features (AMM curves, multi-token pools, LP tokens)

### Key Features

- **Fixed Exchange Rates**: Administrator-controlled pricing (not AMM-based)
- **Bidirectional Swaps**: Support for both Token A → B and Token B → A
- **Liquidity Management**: Authority-controlled liquidity provisioning
- **Event Emission**: Full audit trail via on-chain events
- **PDA Architecture**: Deterministic, secure account derivation
- **Checked Arithmetic**: Integer overflow/underflow protection
- **Phantom Wallet Integration**: Web UI with wallet connectivity

---

## Folder Structure

```
spec/
├── README.md                      # This file - navigation and overview
├── TRACEABILITY-MATRIX.md         # Bidirectional requirement-to-spec mapping
├── RESEARCH-QUESTIONS.md          # Open technical questions for architects
├── CLARIFICATIONS.md              # User decision log and business rules
│
├── domain/                        # Business domain modeling
│   ├── 01-GLOSSARY.md            # Ubiquitous language and terminology
│   ├── 02-ENTITIES.md            # Core business entities (Market, Vault, User)
│   ├── 03-VALUE-OBJECTS.md       # Immutable value types (Price, Amount)
│   ├── 04-STATES.md              # State machines and transitions
│   └── 05-INVARIANTS.md          # Formal business rules (mathematical logic)
│
├── use-cases/                     # Functional specifications
│   ├── UC-001-initialize-market.md     # Create new token market
│   ├── UC-002-set-exchange-rate.md     # Update price (admin only)
│   ├── UC-003-add-liquidity.md         # Provision tokens to vaults
│   ├── UC-004-swap-token-a-to-b.md     # Execute A→B swap
│   ├── UC-005-swap-token-b-to-a.md     # Execute B→A swap
│   └── UC-006-connect-wallet.md        # Phantom wallet integration
│
├── workflows/                     # Cross-cutting business processes
│   ├── WF-001-market-setup-and-operation.md    # End-to-end market lifecycle
│   └── WF-002-exchange-rate-management.md      # Price update workflows
│
├── contracts/                     # API specifications
│   ├── API-solana-program.md     # On-chain program contract (Anchor)
│   ├── API-web-ui.md             # Frontend component contracts
│   ├── EVENTS-swap-program.md    # Event schemas and emission rules
│   └── PERMISSIONS-MATRIX.md     # Authorization matrix (who can do what)
│
├── adr/                           # Architecture Decision Records
│   ├── ADR-001-anchor-framework.md         # Why Anchor vs native Solana
│   ├── ADR-002-fixed-pricing-model.md      # Why fixed rate vs AMM
│   ├── ADR-003-single-authority.md         # Why single admin vs multi-sig
│   ├── ADR-004-pda-architecture.md         # PDA design patterns
│   ├── ADR-005-checked-arithmetic.md       # Overflow protection strategy
│   └── ADR-006-event-emission.md           # Event design and indexing
│
├── nfr/                           # Non-Functional Requirements
│   ├── PERFORMANCE.md            # Transaction speed, compute units, UI responsiveness
│   ├── SECURITY.md               # Threat model, attack vectors, mitigations
│   ├── OBSERVABILITY.md          # Logging, monitoring, alerting
│   └── LIMITS.md                 # System constraints and boundaries
│
├── tests/                         # Test specifications (currently empty)
│   └── (BDD scenarios and test matrices go here)
│
└── runbooks/                      # Operational procedures (currently empty)
    └── (Deployment, incident response, maintenance procedures)
```

---

## Quick Start Guide

### For Developers

1. **Understand the Domain**
   - Start with `domain/01-GLOSSARY.md` to learn the ubiquitous language
   - Read `domain/02-ENTITIES.md` to understand core business objects
   - Review `domain/05-INVARIANTS.md` for critical business rules

2. **Explore Use Cases**
   - Follow the numbered use cases (UC-001 through UC-006) in order
   - Each use case documents: preconditions, normal flow, alternative flows, exception flows
   - Use cases map directly to program instructions and UI components

3. **Review API Contracts**
   - `contracts/API-solana-program.md` is the canonical on-chain API specification
   - Contains Rust function signatures, account structures, error codes, events
   - Includes TypeScript client integration examples

4. **Check Architecture Decisions**
   - `adr/` directory explains **why** technical choices were made
   - Each ADR follows the format: Context → Decision → Consequences
   - Essential for understanding trade-offs and constraints

5. **Validate with Invariants**
   - `domain/05-INVARIANTS.md` provides formal test oracles
   - Each invariant has a corresponding test assertion
   - Use invariants to verify implementation correctness

### For Product Owners / Stakeholders

1. **Business Context**
   - Read this README for project overview
   - Review `domain/01-GLOSSARY.md` for terminology
   - Explore `workflows/` for end-to-end business processes

2. **Feature Specifications**
   - `use-cases/` directory contains all functional requirements
   - Each use case describes user interactions in plain language
   - Review "Business Rules" sections for policy decisions

3. **Decision Log**
   - `CLARIFICATIONS.md` documents key business decisions made
   - `adr/` directory records architectural trade-offs

### For Testers / QA

1. **Test Strategy**
   - Review `nfr/PERFORMANCE.md` for performance acceptance criteria
   - Check `domain/05-INVARIANTS.md` for test oracles
   - Use `TRACEABILITY-MATRIX.md` to verify coverage

2. **Test Scenarios**
   - Each use case contains Exception Flows (negative tests)
   - Alternative Flows provide edge case scenarios
   - Acceptance Criteria sections define success conditions

---

## Document Index

### Core Domain Specifications

| Document | Purpose | Traceability |
|----------|---------|--------------|
| [01-GLOSSARY.md](domain/01-GLOSSARY.md) | Ubiquitous language, terminology definitions | Foundation for all specs |
| [02-ENTITIES.md](domain/02-ENTITIES.md) | Core business entities: Market, Vault, Admin, User | REQ-F-001, REQ-F-010, REQ-F-011 |
| [03-VALUE-OBJECTS.md](domain/03-VALUE-OBJECTS.md) | Immutable value types: Price, TokenAmount | REQ-F-002, REQ-NF-004 |
| [04-STATES.md](domain/04-STATES.md) | State machines for Market lifecycle | REQ-F-001 through REQ-F-007 |
| [05-INVARIANTS.md](domain/05-INVARIANTS.md) | Formal business rules (mathematical logic) | All requirements |

### Use Case Specifications

| Use Case | Title | Actor | Priority | Traceability |
|----------|-------|-------|----------|--------------|
| [UC-001](use-cases/UC-001-initialize-market.md) | Initialize Market | Administrator | Must | REQ-F-001, REQ-F-010, REQ-F-011 |
| [UC-002](use-cases/UC-002-set-exchange-rate.md) | Set Exchange Rate | Administrator | Must | REQ-F-002, REQ-F-008 |
| [UC-003](use-cases/UC-003-add-liquidity.md) | Add Liquidity | Administrator | Must | REQ-F-003, REQ-F-004, REQ-F-005 |
| [UC-004](use-cases/UC-004-swap-token-a-to-b.md) | Swap Token A to B | User | Must | REQ-F-006, REQ-F-009 |
| [UC-005](use-cases/UC-005-swap-token-b-to-a.md) | Swap Token B to A | User | Must | REQ-F-007, REQ-F-009 |
| [UC-006](use-cases/UC-006-connect-wallet.md) | Connect Wallet | User/Admin | Must | REQ-F-016, REQ-F-012–015 |

### Workflow Specifications

| Workflow | Description | Use Cases |
|----------|-------------|-----------|
| [WF-001](workflows/WF-001-market-setup-and-operation.md) | Market Setup and Operation | UC-001 → UC-003 → UC-004/005 |
| [WF-002](workflows/WF-002-exchange-rate-management.md) | Exchange Rate Management | UC-002 (with monitoring) |

### API Contracts

| Contract | Type | Description | Traceability |
|----------|------|-------------|--------------|
| [API-solana-program.md](contracts/API-solana-program.md) | On-Chain | Anchor program instructions, accounts, events, errors | UC-001 through UC-005 |
| [API-web-ui.md](contracts/API-web-ui.md) | Frontend | React component interfaces, state management | UC-006, UI requirements |
| [EVENTS-swap-program.md](contracts/EVENTS-swap-program.md) | Events | Event schemas, emission rules, indexing | REQ-NF-009 through REQ-NF-012 |
| [PERMISSIONS-MATRIX.md](contracts/PERMISSIONS-MATRIX.md) | Authorization | Role-based access control matrix | REQ-F-008, REQ-F-009, REQ-NF-006 |

### Architecture Decision Records (ADRs)

| ADR | Title | Status | Date | Traceability |
|-----|-------|--------|------|--------------|
| [ADR-001](adr/ADR-001-anchor-framework.md) | Anchor Framework for Solana Development | Accepted | 2026-03-22 | REQ-C-002, REQ-NF-005 |
| [ADR-002](adr/ADR-002-fixed-pricing-model.md) | Fixed Pricing Model (Not AMM) | Accepted | 2026-03-22 | REQ-F-002, REQ-C-008 |
| [ADR-003](adr/ADR-003-single-authority.md) | Single Authority Model | Accepted | 2026-03-22 | REQ-F-008 |
| [ADR-004](adr/ADR-004-pda-architecture.md) | PDA Architecture and Seeds | Accepted | 2026-03-22 | REQ-F-011, REQ-NF-005 |
| [ADR-005](adr/ADR-005-checked-arithmetic.md) | Checked Arithmetic for Overflow Protection | Accepted | 2026-03-22 | REQ-NF-001 |
| [ADR-006](adr/ADR-006-event-emission.md) | Event Emission Strategy | Accepted | 2026-03-22 | REQ-NF-009–012 |

### Non-Functional Requirements

| Document | Category | Key Metrics | Traceability |
|----------|----------|-------------|--------------|
| [PERFORMANCE.md](nfr/PERFORMANCE.md) | Performance | p99 confirmation < 800ms, < 50k CU, UI < 500ms | REQ-NF-013, REQ-NF-014, REQ-NF-015 |
| [SECURITY.md](nfr/SECURITY.md) | Security | Threat model, attack vectors, mitigations | REQ-NF-005, REQ-NF-006, REQ-NF-007 |
| [OBSERVABILITY.md](nfr/OBSERVABILITY.md) | Observability | Logging, metrics, tracing, alerting | REQ-NF-009–012, REQ-NF-018 |
| [LIMITS.md](nfr/LIMITS.md) | System Limits | Max price, max liquidity, timeout constraints | REQ-NF-003, REQ-NF-014 |

---

## Traceability Overview

This specification repository implements full **bidirectional traceability**:

### Requirement → Specification Flow

```
Business Need
  ↓
Functional Requirements (REQ-F-xxx)
  ↓
Use Cases (UC-xxx)
  ↓
API Contracts (API-xxx)
  ↓
Events & Permissions (BDD-xxx, PERM-xxx)
  ↓
Implementation (Code)
  ↓
Tests
```

### Key Traceability Chains

1. **Market Creation**: REQ-F-001 → UC-001 → API-solana-program.initialize_market → BDD-001
2. **Price Setting**: REQ-F-002 → UC-002 → API-solana-program.set_price → BDD-002
3. **Liquidity**: REQ-F-003/004/005 → UC-003 → API-solana-program.add_liquidity → BDD-003
4. **Swaps**: REQ-F-006/007 → UC-004/005 → API-solana-program.swap → BDD-004/005
5. **Security**: REQ-NF-005/006 → ADR-001/004 → Anchor constraints → Security tests

For complete traceability mapping, see [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md).

---

## How to Navigate the Specifications

### By Role

**Blockchain Developer:**
1. Start: `contracts/API-solana-program.md`
2. Deep dive: `domain/05-INVARIANTS.md`
3. Context: `adr/` directory for design decisions
4. Validation: `nfr/PERFORMANCE.md` for acceptance criteria

**Frontend Developer:**
1. Start: `contracts/API-web-ui.md`
2. Workflows: `workflows/` for user journeys
3. Integration: `use-cases/UC-006-connect-wallet.md`
4. Events: `contracts/EVENTS-swap-program.md` for real-time updates

**Product Manager:**
1. Start: This README
2. Features: `use-cases/` directory
3. Workflows: `workflows/` for end-to-end flows
4. Decisions: `CLARIFICATIONS.md` for business rules

**QA Engineer:**
1. Start: `domain/05-INVARIANTS.md` (test oracles)
2. Test cases: Exception Flows in each use case
3. Coverage: `TRACEABILITY-MATRIX.md`
4. Performance: `nfr/PERFORMANCE.md`

### By Feature

**"I want to understand swaps"**
- Use Cases: UC-004, UC-005
- API: `contracts/API-solana-program.md` → swap instruction
- Business Rules: `domain/05-INVARIANTS.md` → INV-SWP-*
- Events: `contracts/EVENTS-swap-program.md` → SwapExecuted

**"I want to understand pricing"**
- Use Case: UC-002
- Domain: `domain/03-VALUE-OBJECTS.md` → Price
- ADR: `adr/ADR-002-fixed-pricing-model.md`
- API: `contracts/API-solana-program.md` → set_price

**"I want to understand security"**
- NFR: `nfr/SECURITY.md`
- ADR: `adr/ADR-001-anchor-framework.md`, `adr/ADR-004-pda-architecture.md`
- Invariants: `domain/05-INVARIANTS.md` → INV-AUTH-*, INV-PDA-*
- Permissions: `contracts/PERMISSIONS-MATRIX.md`

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-22 | Development Team | Initial specification release |
|  |  |  | - Complete domain modeling |
|  |  |  | - 6 use cases documented |
|  |  |  | - 2 workflows defined |
|  |  |  | - On-chain API contract finalized |
|  |  |  | - 6 ADRs approved |
|  |  |  | - 4 NFR documents created |
|  |  |  | - Formal invariants specified |

---

## Contributing to Specifications

### Specification Update Process

1. **Identify Gap**: Found missing or incorrect specification?
2. **Create Issue**: Document the gap/error in project issue tracker
3. **Propose Change**: Draft update following document template
4. **Review**: Submit for technical review (architect + domain expert)
5. **Update Traceability**: Update `TRACEABILITY-MATRIX.md` if adding/removing requirements
6. **Version Bump**: Update version history in affected documents

### Document Templates

Each specification type follows a strict template:

- **Use Cases**: Actor, Preconditions, Normal Flow, Alternative Flows, Exception Flows, Business Rules, Acceptance Criteria
- **ADRs**: Status, Context, Decision, Rationale, Alternatives Considered, Consequences
- **API Contracts**: Function signature, parameters, return values, errors, examples
- **Invariants**: Category, Formal Statement, English description, Enforcement, Test assertion

### Traceability Requirements

- Every use case MUST reference requirements (REQ-F-xxx, REQ-NF-xxx)
- Every API method MUST reference use cases (UC-xxx)
- Every ADR MUST reference requirements (REQ-C-xxx)
- Every invariant MUST reference requirements (REQ-*-xxx)

---

## Tooling and Automation

### Document Generation

- **Traceability Matrix**: Auto-generated from spec headers (see `TRACEABILITY-MATRIX.md`)
- **API Documentation**: Generated from Anchor IDL + markdown
- **Test Coverage**: Mapped from invariant IDs to test file assertions

### Validation Scripts

```bash
# Validate traceability links
npm run validate-traceability

# Check for orphaned specs (no requirement reference)
npm run find-orphans

# Generate coverage report
npm run coverage-report
```

---

## External References

### Solana & Anchor Documentation
- [Solana Documentation](https://docs.solana.com/)
- [Anchor Book](https://book.anchor-lang.com/)
- [SPL Token Program](https://spl.solana.com/token)
- [Solana Cookbook](https://solanacookbook.com/)

### Standards & Best Practices
- [SWEBOK v4](https://www.computer.org/education/bodies-of-knowledge/software-engineering) - Software Engineering Body of Knowledge
- [IEEE 830](https://standards.ieee.org/standard/830-1998.html) - Software Requirements Specification
- [C4 Model](https://c4model.com/) - Software Architecture Diagrams

### Security Resources
- [Anchor Security Best Practices](https://book.anchor-lang.com/anchor_in_depth/security.html)
- [Neodyme Solana Security Workshop](https://workshop.neodyme.io/)
- [Solana Security Best Practices](https://github.com/coral-xyz/sealevel-attacks)

---

## Glossary Quick Reference

| Term | Definition | See |
|------|------------|-----|
| **Market** | A decentralized exchange for two SPL tokens with fixed pricing | `domain/02-ENTITIES.md` |
| **Vault** | PDA-controlled token account holding liquidity | `domain/02-ENTITIES.md` |
| **PDA** | Program Derived Address - deterministic account address | `adr/ADR-004-pda-architecture.md` |
| **Authority** | Administrator wallet with market management permissions | `domain/02-ENTITIES.md` |
| **Price** | Exchange rate: 1 Token A = (price/10^6) Token B | `domain/03-VALUE-OBJECTS.md` |
| **Swap** | Atomic token exchange at fixed rate | `use-cases/UC-004-swap-token-a-to-b.md` |
| **Liquidity** | Token balances available in vaults for swaps | `use-cases/UC-003-add-liquidity.md` |
| **CPI** | Cross-Program Invocation - Solana program-to-program call | `contracts/API-solana-program.md` |
| **ATA** | Associated Token Account - standard SPL token account | `domain/01-GLOSSARY.md` |
| **Anchor** | Rust framework for Solana program development | `adr/ADR-001-anchor-framework.md` |

---

## Contact & Support

- **Specification Issues**: File issues in project repository
- **Clarification Requests**: Add to `RESEARCH-QUESTIONS.md`
- **Business Decisions**: Document in `CLARIFICATIONS.md`

---

**Happy Reading!** This specification repository is your single source of truth for the Solana SWAP protocol. When in doubt, the specs are always right - if reality diverges, reality is wrong. 😊
