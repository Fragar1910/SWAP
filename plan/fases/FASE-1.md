# FASE-1: Core Program Structure & Types

**Status:** Not Started
**Priority:** CRITICAL
**Estimated Effort:** 4 hours
**Dependencies:** FASE-0 (project skeleton must exist)

---

## Objective

Define all core account structures, error codes, constants, and type definitions that form the foundation of the swap program. This FASE implements the domain model without business logic.

**Key Goal:** All `#[account]` structs, `#[error_code]` enums, and type aliases compile successfully.

---

## Specifications Covered

| Spec File | Coverage | Focus Area |
|-----------|----------|------------|
| `spec/domain/02-ENTITIES.md` | 100% | Account structures (MarketAccount) |
| `spec/domain/03-VALUE-OBJECTS.md` | 100% | Type aliases, SwapDirection |
| `spec/domain/04-ERRORS.md` | 100% | Error code definitions |
| `spec/domain/05-INVARIANTS.md` | 30% | Type-level invariants (ranges, constraints) |
| `spec/contracts/API-solana-program.md` | 10% | Account structure references |

**No instruction handlers** - types and structure only.

---

## Deliverables

### 1. Market Account Structure

**File:** `programs/swap-program/src/state/market.rs`

```rust
use anchor_lang::prelude::*;

/// Central aggregate root representing a trading pair between two SPL tokens.
///
/// Traceability: ENT-MKT-001, REQ-F-001, REQ-F-010
#[account]
#[derive(Debug)]
pub struct MarketAccount {
    /// Administrator's wallet public key (immutable, set during initialization)
    /// Traceability: REQ-F-002, REQ-F-008
    pub authority: Pubkey,

    /// SPL Token Mint address for Token A (immutable)
    /// Traceability: REQ-F-001, BR-MKT-004 (must differ from token_mint_b)
    pub token_mint_a: Pubkey,

    /// SPL Token Mint address for Token B (immutable)
    /// Traceability: REQ-F-001, BR-MKT-004 (must differ from token_mint_a)
    pub token_mint_b: Pubkey,

    /// Exchange rate: 1 Token A = (price / 10^6) Token B
    /// Range: 0 to u64::MAX (0 means not set, swaps will fail)
    /// Traceability: REQ-F-002, INV-MKT-004
    pub price: u64,

    /// Decimal places for Token A (0-18, from mint metadata)
    /// Traceability: REQ-F-010, INV-MKT-005
    pub decimals_a: u8,

    /// Decimal places for Token B (0-18, from mint metadata)
    /// Traceability: REQ-F-010, INV-MKT-005
    pub decimals_b: u8,

    /// PDA bump seed for CPI signer derivation (stored to avoid recomputation)
    /// Traceability: REQ-F-011, ADR-004
    pub bump: u8,
}

impl MarketAccount {
    /// Space calculation for rent-exempt allocation
    /// 8 (discriminator) + 107 (fields) = 115 bytes
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 1 + 1 + 1;

    /// Price precision factor (6 decimals)
    /// Example: price = 2_000_000 means 1 Token A = 2.0 Token B
    pub const PRICE_PRECISION: u64 = 1_000_000;
}
```

**Traceability:**
- Account size: 115 bytes (meets Solana account size limits)
- Immutable fields: `authority`, `token_mint_a`, `token_mint_b`, `decimals_a`, `decimals_b`, `bump`
- Mutable field: `price` (only via `set_price` instruction)

### 2. Error Code Definitions

**File:** `programs/swap-program/src/error.rs`

```rust
use anchor_lang::prelude::*;

/// Custom error codes for the swap program
///
/// Traceability: spec/domain/04-ERRORS.md
#[error_code]
pub enum SwapError {
    /// Arithmetic overflow detected (REQ-NF-001, ADR-005)
    /// Thrown when: checked_mul/checked_add returns None
    #[msg("Arithmetic overflow detected")]
    Overflow,

    /// Division by zero attempted (REQ-NF-002, ADR-005)
    /// Thrown when: checked_div returns None or price = 0
    #[msg("Division by zero (price may not be set)")]
    DivisionByZero,

    /// Invalid amount provided (must be > 0)
    /// Thrown when: input amount = 0 (REQ-NF-004)
    #[msg("Invalid amount (must be greater than 0)")]
    InvalidAmount,

    /// Price not set (administrator must call set_price)
    /// Thrown when: price = 0 and swap is attempted (REQ-NF-002)
    #[msg("Price not set (administrator must call set_price first)")]
    PriceNotSet,

    /// Insufficient liquidity in vault
    /// Thrown when: vault balance < required output amount (REQ-NF-003)
    #[msg("Insufficient liquidity in vault to fulfill swap")]
    InsufficientLiquidity,

    /// Same token swap disallowed (Token A and Token B must be distinct)
    /// Thrown when: token_mint_a == token_mint_b (BR-MKT-004, INV-MKT-006)
    #[msg("Same token swaps are not allowed (Token A and Token B must be distinct mints)")]
    SameTokenSwapDisallowed,

    /// Unauthorized: Only market authority can perform this operation
    /// Thrown when: signer is not market.authority (REQ-F-008, REQ-NF-006)
    #[msg("Only the market authority can perform this operation")]
    Unauthorized,

    /// Invalid token decimals (must be 0-18)
    /// Thrown when: decimals > 18 (INV-MKT-005)
    #[msg("Token decimals must be between 0 and 18")]
    InvalidDecimals,
}
```

**Error Code Mapping:**
- 6000: Overflow
- 6001: DivisionByZero
- 6002: InvalidAmount
- 6003: PriceNotSet
- 6004: InsufficientLiquidity
- 6005: SameTokenSwapDisallowed
- 6006: Unauthorized
- 6007: InvalidDecimals

### 3. Constants Module

**File:** `programs/swap-program/src/constants.rs`

```rust
use anchor_lang::prelude::*;

/// PDA seed prefix for market accounts
/// Derivation: [b"market", token_mint_a.key(), token_mint_b.key()]
/// Traceability: ADR-004, REQ-F-011
pub const MARKET_SEED: &[u8] = b"market";

/// PDA seed prefix for Vault A (Token A liquidity)
/// Derivation: [b"vault_a", market.key()]
/// Traceability: ADR-004, REQ-F-011
pub const VAULT_A_SEED: &[u8] = b"vault_a";

/// PDA seed prefix for Vault B (Token B liquidity)
/// Derivation: [b"vault_b", market.key()]
/// Traceability: ADR-004, REQ-F-011
pub const VAULT_B_SEED: &[u8] = b"vault_b";

/// Price precision factor (10^6)
/// Example: price = 2_500_000 means 1 Token A = 2.5 Token B
/// Traceability: ADR-002, spec/domain/03-VALUE-OBJECTS.md
pub const PRICE_PRECISION: u64 = 1_000_000;

/// Maximum token decimals allowed (SPL Token standard limit)
/// Traceability: INV-MKT-005, REQ-F-010
pub const MAX_DECIMALS: u8 = 18;

/// Minimum decimals (SPL Token allows 0 decimals for non-divisible tokens)
/// Traceability: INV-MKT-005
pub const MIN_DECIMALS: u8 = 0;
```

### 4. Event Definitions

**File:** `programs/swap-program/src/events.rs`

```rust
use anchor_lang::prelude::*;

/// Event emitted when a market is initialized
///
/// Traceability: REQ-NF-009, spec/contracts/EVENTS-swap-program.md
#[event]
pub struct MarketInitialized {
    /// Market PDA address
    #[index]
    pub market: Pubkey,

    /// Token A mint address
    pub token_mint_a: Pubkey,

    /// Token B mint address
    pub token_mint_b: Pubkey,

    /// Market administrator (who initialized the market)
    pub authority: Pubkey,

    /// Unix timestamp of initialization
    pub timestamp: i64,
}

/// Event emitted when exchange rate is updated
///
/// Traceability: REQ-NF-010, spec/contracts/EVENTS-swap-program.md
#[event]
pub struct PriceSet {
    /// Market PDA address
    #[index]
    pub market: Pubkey,

    /// Administrator who set the price
    pub authority: Pubkey,

    /// Previous price value
    pub old_price: u64,

    /// New price value
    pub new_price: u64,

    /// Unix timestamp of price change
    pub timestamp: i64,
}

/// Event emitted when liquidity is added to vaults
///
/// Traceability: REQ-NF-011, spec/contracts/EVENTS-swap-program.md
#[event]
pub struct LiquidityAdded {
    /// Market PDA address
    #[index]
    pub market: Pubkey,

    /// Administrator who added liquidity
    pub authority: Pubkey,

    /// Amount of Token A added
    pub amount_a: u64,

    /// Amount of Token B added
    pub amount_b: u64,

    /// Vault A balance after addition
    pub vault_a_balance: u64,

    /// Vault B balance after addition
    pub vault_b_balance: u64,

    /// Unix timestamp
    pub timestamp: i64,
}

/// Event emitted when a swap is executed
///
/// Traceability: REQ-NF-012, spec/contracts/EVENTS-swap-program.md
#[event]
pub struct SwapExecuted {
    /// Market PDA address
    #[index]
    pub market: Pubkey,

    /// User who executed the swap
    pub user: Pubkey,

    /// Swap direction: true = A→B, false = B→A
    pub swap_a_to_b: bool,

    /// Input amount provided by user
    pub input_amount: u64,

    /// Output amount received by user
    pub output_amount: u64,

    /// Unix timestamp
    pub timestamp: i64,
}
```

### 5. Module Organization

**File:** `programs/swap-program/src/lib.rs` (updated)

```rust
use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod events;
pub mod state;

pub use constants::*;
pub use error::*;
pub use events::*;
pub use state::*;

declare_id!("SwapProgramXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

#[program]
pub mod swap_program {
    use super::*;

    // FASE-2: initialize_market instruction
    // FASE-2: set_price instruction
    // FASE-2: add_liquidity instruction
    // FASE-3: swap instruction
}
```

**File:** `programs/swap-program/src/state/mod.rs`

```rust
pub mod market;

pub use market::*;
```

### 6. Type Aliases & Value Objects

**File:** `programs/swap-program/src/types.rs` (create new)

```rust
use anchor_lang::prelude::*;

/// Swap direction enum
/// Traceability: spec/domain/03-VALUE-OBJECTS.md
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum SwapDirection {
    /// A → B: Exchange Token A for Token B
    AtoB,
    /// B → A: Exchange Token B for Token A
    BtoA,
}

impl From<bool> for SwapDirection {
    /// Convert bool to SwapDirection (true = AtoB, false = BtoA)
    fn from(value: bool) -> Self {
        if value {
            SwapDirection::AtoB
        } else {
            SwapDirection::BtoA
        }
    }
}

impl From<SwapDirection> for bool {
    /// Convert SwapDirection to bool (AtoB = true, BtoA = false)
    fn from(value: SwapDirection) -> Self {
        matches!(value, SwapDirection::AtoB)
    }
}

/// Type alias for token amounts (base units)
/// Traceability: spec/domain/03-VALUE-OBJECTS.md
pub type TokenAmount = u64;

/// Type alias for exchange rates (price with 10^6 precision)
/// Traceability: spec/domain/03-VALUE-OBJECTS.md
pub type ExchangeRate = u64;
```

---

## Verification Checklist

**After FASE-1 completion, verify:**

- [ ] `anchor build` completes successfully
- [ ] No Rust compiler warnings
- [ ] All `#[account]` structs have `LEN` constants
- [ ] All `#[error_code]` variants have `#[msg(...)]` attributes
- [ ] All `#[event]` structs have indexed fields where appropriate
- [ ] Type definitions compile without errors
- [ ] Module re-exports work (`pub use state::*;`)
- [ ] IDL generation includes all events and errors

**IDL Verification:**
```bash
$ anchor build
$ cat target/idl/swap_program.json | jq '.errors'
# Should show 8 error codes

$ cat target/idl/swap_program.json | jq '.events'
# Should show 4 events
```

---

## Downstream Dependencies

**FASE-2** (Administrative Instructions) depends on:
- ✅ `MarketAccount` struct definition
- ✅ Error codes (`SwapError::*`)
- ✅ Event definitions (`MarketInitialized`, `PriceSet`, `LiquidityAdded`)
- ✅ Constants (`MARKET_SEED`, `VAULT_A_SEED`, `VAULT_B_SEED`)

**FASE-3** (Swap Instructions) depends on:
- ✅ `MarketAccount` struct
- ✅ `SwapExecuted` event
- ✅ `SwapDirection` enum
- ✅ Error codes for validation

**Blockers if FASE-1 fails:**
- Cannot define instruction contexts (`#[derive(Accounts)]` needs account types)
- Cannot emit events (event structs not defined)
- Cannot return custom errors (error codes not defined)

---

## Traceability

| Specification | Coverage | Artifacts |
|---------------|----------|-----------|
| `spec/domain/02-ENTITIES.md` | 100% | `MarketAccount` struct |
| `spec/domain/03-VALUE-OBJECTS.md` | 100% | Type aliases, `SwapDirection` enum |
| `spec/domain/04-ERRORS.md` | 100% | `SwapError` enum (8 variants) |
| `spec/contracts/EVENTS-swap-program.md` | 100% | 4 event structs |
| `spec/domain/05-INVARIANTS.md` | 30% | Constraints documented in comments |

**Invariants Enforced via Types:**
- INV-MKT-004: `price: u64` (non-negative by definition)
- INV-MKT-005: Decimals checked against `MAX_DECIMALS` constant
- INV-VLT-001: Vault balances are `u64` (non-negative)

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Account size miscalculation | Low | High | Add tests verifying `MarketAccount::LEN` |
| Error code conflicts | Low | Medium | Document error code ranges (6000-6007) |
| Event field omissions | Medium | Medium | Cross-check with EVENTS-swap-program.md spec |
| Type alias misuse | Low | Low | Enforce via code review, strong typing |

---

## Time Breakdown

| Task | Estimated Time |
|------|---------------|
| MarketAccount struct + docs | 45 min |
| Error code definitions | 30 min |
| Event struct definitions | 45 min |
| Constants module | 15 min |
| Type aliases & enums | 30 min |
| Module organization | 20 min |
| Build verification | 20 min |
| Documentation review | 35 min |
| **Total** | **4 hours** |

---

## Next Steps

After FASE-1 completion:
1. ✅ Commit core types and structures
2. ➡️ Proceed to **FASE-2** (Administrative Instructions)
3. Verify IDL generation: `anchor idl parse --file programs/swap-program/src/lib.rs`
4. Generate TypeScript types: `anchor build` (auto-generates `target/types/`)

---

**Generated:** 2026-03-23
**Spec Coverage:** 5 files (domain model + contracts)
**Business Logic:** 0% (type definitions only)
**Lines of Code:** ~300 (Rust)
