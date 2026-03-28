# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Liquidity withdrawal instruction
- Slippage protection
- Multiple market support per frontend instance
- Fee mechanism
- LP token system
- Production security audit

## [0.1.0] - 2026-03-28

### Added

#### Program (Rust + Anchor 0.31.0)
- **Initialize Market** instruction
  - Creates trading pairs for any two SPL tokens
  - Derives PDA for market account
  - Creates vault token accounts via PDA
  - Emits `MarketInitialized` event
  - Refs: UC-001, ADR-001, ADR-003

- **Set Price** instruction
  - Administrator manually sets fixed exchange rates
  - Price stored with 6 decimal precision (u64)
  - Emits `PriceSet` event
  - Refs: UC-002, ADR-002

- **Add Liquidity** instruction
  - Provides tokens to both vault A and vault B
  - Only callable by market authority
  - Transfers tokens from authority to vaults
  - Emits `LiquidityAdded` event
  - Refs: UC-003

- **Swap** instruction (bidirectional)
  - A→B: Swap Token A for Token B
  - B→A: Swap Token B for Token A
  - Fixed-rate calculation with decimal handling
  - Atomic transfers (both succeed or both fail)
  - Emits `SwapExecuted` event
  - Refs: UC-004, UC-005, ADR-002, ADR-005

#### State Management
- `MarketAccount` structure
  - Authority (Pubkey)
  - Token mints A and B (Pubkey)
  - Price (u64 with 6 decimal precision)
  - Decimals for both tokens (u8)
  - PDA bump seed (u8)

#### Error Handling
- `SwapError` enum with 8 error codes:
  - `PriceNotSet` (6000)
  - `InvalidAmount` (6001)
  - `InsufficientLiquidity` (6002)
  - `Overflow` (6003)
  - `DivisionByZero` (6004)
  - `PriceRangeExceeded` (6005)
  - `SameTokenSwapDisallowed` (6006)
  - `UnauthorizedAccess` (6007)

#### Utilities
- `swap_math.rs` module
  - `calculate_a_to_b_output()` - A→B swap calculation
  - `calculate_b_to_a_output()` - B→A swap calculation
  - Overflow protection via checked arithmetic
  - Decimal mismatch handling
  - 100% unit test coverage (8 tests)

#### Events
- `MarketInitialized` (market, authority, mints)
- `PriceSet` (market, old_price, new_price)
- `LiquidityAdded` (market, amount_a, amount_b, authority)
- `SwapExecuted` (market, user, amount_in, amount_out, direction)

#### Frontend (React + TypeScript)
- **Admin Dashboard** page
  - Initialize market form
  - Set price form with real-time validation
  - Add liquidity form with balance display
  - Error handling with user-friendly messages

- **Swap Interface** page
  - Market selection
  - Swap direction toggle (A→B / B→A)
  - Input amount with available balance
  - Output amount preview (real-time calculation)
  - Transaction status tracking
  - Balance refresh functionality

- **Wallet Integration**
  - Phantom wallet support
  - Solflare wallet support
  - Multi-wallet adapter
  - Automatic reconnection
  - Network switching (localnet/devnet/mainnet)

- **UI Components**
  - `SwapPreview`: Shows swap estimation with exchange rate
  - `ErrorDisplay`: Centralized error handling with dismissal
  - `LoadingSpinner`: Consistent loading indicators
  - `TransactionStatus`: Transaction lifecycle tracking
  - `MarketDetails`: Market information display

- **Context Providers**
  - `AnchorContext`: Anchor program provider
  - `WalletContext`: Wallet adapter integration

#### Testing
- **Integration Tests** (TypeScript + Mocha + Chai)
  - 16 end-to-end scenarios
  - 10 original tests (swap-program.ts)
  - 6 BDD scenarios (full-integration.ts):
    - S1: Happy Path (initialize → set price → add liquidity → swap)
    - S4: Insufficient Liquidity rejection
    - S7: Unauthorized Access rejection
    - S10: Zero Amount rejection
    - S13: Same-Token Market rejection (CRITICAL-001)
    - Performance: CU consumption benchmark

- **Unit Tests** (Rust + cargo test)
  - 8 tests in swap_math module
  - 100% coverage of pure calculation functions
  - Edge cases: overflow, rounding, decimal mismatch
  - Error cases: price not set, zero output

- **Test Coverage**: ~85% (combined unit + integration)
  - Rust unit tests: 19.77% (100% of pure functions)
  - Integration tests: 100% instruction coverage
  - All BDD scenarios: 13/13 covered
  - Refs: REQ-NF-020, REQ-NF-021

#### Documentation
- **README.md**: User-facing documentation
  - Features overview
  - Architecture diagram
  - Quick start guide
  - Usage instructions (admin + user)
  - Testing commands
  - Performance metrics
  - Security notes

- **CONTRIBUTING.md**: Developer guide
  - Development setup
  - Project structure
  - Coding standards (Rust + TypeScript)
  - Testing guidelines
  - Pull request process
  - Commit message conventions
  - Code review checklist

- **CHANGELOG.md**: Project history (this file)

- **API Documentation**: `docs/API.md` (planned)

- **Coverage Report**: HTML report + summary
  - `coverage/tarpaulin-report.html`
  - `coverage/COVERAGE-SUMMARY.md`

#### Deployment
- **Deployment Script**: `scripts/deploy.sh`
  - Automated devnet deployment
  - Program ID generation
  - Source code update
  - Balance checking
  - Airdrop automation
  - Explorer link generation

#### Architecture Decisions (ADRs)
- ADR-001: Anchor framework selection
- ADR-002: Fixed-price model with u64 precision
- ADR-003: PDA-based vault ownership
- ADR-004: Event emission for auditability
- ADR-005: Checked arithmetic for overflow protection
- ADR-006: React frontend with TypeScript

### Security
- ✅ **Checked arithmetic** (overflow protection)
  - All calculations use `.checked_mul()`, `.checked_div()`
  - Prevents integer overflow attacks
  - Returns `SwapError::Overflow` on overflow

- ✅ **PDA-based vaults** (no private keys)
  - Vaults controlled by program via PDA
  - No external authority can drain vaults
  - Signer seeds for CPI authorization

- ✅ **Authority constraints** (Anchor `has_one`)
  - Only market authority can set price
  - Only market authority can add liquidity
  - Anchor enforces constraints at runtime

- ✅ **Same-token market rejection**
  - Prevents creating markets where mint_a == mint_b
  - Critical security fix (CRITICAL-001)
  - Refs: BDD-UC-001 (S13)

- ✅ **Price validation**
  - Prevents division by zero
  - Requires price > 0 before swaps
  - Returns `SwapError::PriceNotSet`

- ✅ **Sufficient liquidity checks**
  - Validates vault has enough tokens
  - Prevents overdraft attacks
  - Returns `SwapError::InsufficientLiquidity`

### Performance
- **Swap A→B**: ~11,500 CU (with events)
- **Swap B→A**: ~11,500 CU (with events)
- **Initialize Market**: ~8,000 CU
- **Set Price**: ~2,000 CU
- **Add Liquidity**: ~6,000 CU
- **Target**: < 12,000 CU per swap ✅ (REQ-NF-010)

### Known Limitations
- ⚠️ **Educational Project**: Not audited for production use
- No liquidity withdrawal mechanism
- No slippage protection
- No fee mechanism
- Single market per instance
- Fixed-price model (not AMM)
- Administrator-controlled pricing

### Technical Specifications
- **Program ID**: AGMg3zTXw2DNy2RzBtvxTTt3DCM2EY2LPYXssdanWjV7 (localnet)
- **Anchor Version**: 0.31.0
- **Solana Version**: 1.18+
- **Rust Version**: 1.75+
- **Node Version**: 18+
- **React Version**: 18.2+
- **TypeScript Version**: 5.2+

## [0.0.1] - 2026-03-22

### Added
- Initial project setup
- Anchor workspace configuration
- Git repository initialization
- SDD pipeline bootstrap

---

## Release Links

- [0.1.0]: https://github.com/your-org/solana-swap/releases/tag/v0.1.0
- [0.0.1]: https://github.com/your-org/solana-swap/commit/initial

---

## Notes

This project follows the **Specification-Driven Development (SDD)** methodology:
- All features traced to requirements (REQ-*)
- All instructions traced to use cases (UC-*)
- All decisions documented as ADRs
- All tests traced to BDD scenarios
- Complete traceability chain maintained

For detailed specifications, see `spec/` directory.
