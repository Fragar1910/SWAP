# Value Objects and Domain Primitives

> **Domain:** Solana Token SWAP - Decentralized Exchange
> **Version:** 1.0
> **Last updated:** 2026-03-22

## Purpose

This document defines value objects, enums, and typed values used throughout the swap domain. Value objects are immutable, self-validating data structures that encapsulate business logic related to specific concepts without identity.

**Characteristics of Value Objects:**
- Immutable (cannot change after creation)
- Defined by their attributes (no identity)
- Self-validating (constraints enforced at construction)
- Replaceable (can be substituted with another instance with same values)

---

## Value Object Catalog

| ID | Name | Type | Range/Constraint | Description | Traceability |
|----|------|------|------------------|-------------|--------------|
| VO-PRICE-001 | ExchangeRate | u64 | `>= 0`, precision 10^6 | Fixed exchange rate between Token A and Token B | REQ-F-002 |
| VO-AMT-001 | TokenAmount | u64 | `>= 0` | Quantity of tokens in base units | REQ-F-003, REQ-F-006 |
| VO-DIR-001 | SwapDirection | bool/enum | `AtoB` or `BtoA` | Direction of token swap | REQ-F-006, REQ-F-007 |
| VO-SEED-001 | PDASeeds | &[&[u8]] | Valid UTF-8 + refs | Byte arrays for PDA derivation | REQ-F-011 |
| VO-DEC-001 | Decimals | u8 | `0-18` | Decimal places for token display | REQ-F-010 |
| VO-BUMP-001 | BumpSeed | u8 | `0-255` | PDA bump value (off-curve) | REQ-F-011 |
| VO-TS-001 | Timestamp | i64 | Unix epoch seconds | Event timestamp | REQ-NF-009 |
| VO-SIG-001 | Signature | [u8; 64] | Ed25519 signature | Transaction signature | Solana standard |

---

## VO-PRICE-001: ExchangeRate

**Definition:** The fixed exchange rate representing how many units of Token B can be obtained for one unit of Token A.

### Properties

| Property | Type | Constraint | Description |
|----------|------|------------|-------------|
| `value` | `u64` | `>= 0` | Raw rate value (default: 0 before set) |
| `precision` | Constant | `10^6` | Fixed precision denominator |

### Interpretation

```
1 Token A = (value / 10^6) Token B
```

**Examples:**
- `value = 1_500_000` → 1 Token A = 1.5 Token B
- `value = 500_000` → 1 Token A = 0.5 Token B
- `value = 2_000_000_000` → 1 Token A = 2,000 Token B
- `value = 0` → Price not set (swaps fail with REQ-NF-002)

### Rust Representation

```rust
/// Exchange rate with fixed precision (10^6)
pub struct ExchangeRate(u64);

impl ExchangeRate {
    pub const PRECISION: u64 = 1_000_000; // 10^6

    /// Creates a new exchange rate from raw u64 value
    pub fn new(value: u64) -> Self {
        Self(value)
    }

    /// Creates exchange rate from decimal representation
    /// Example: from_decimal(1.5) -> ExchangeRate(1_500_000)
    pub fn from_decimal(rate: f64) -> Result<Self, DomainError> {
        if rate < 0.0 {
            return Err(DomainError::NegativeRate);
        }
        let value = (rate * Self::PRECISION as f64) as u64;
        Ok(Self(value))
    }

    /// Returns raw value (for storage)
    pub fn raw_value(&self) -> u64 {
        self.0
    }

    /// Returns decimal representation (for display)
    pub fn to_decimal(&self) -> f64 {
        self.0 as f64 / Self::PRECISION as f64
    }

    /// Checks if price is set (> 0)
    pub fn is_set(&self) -> bool {
        self.0 > 0
    }
}
```

### Validation Rules

- **VR-PRICE-001**: Value must be non-negative (REQ-NF-002)
- **VR-PRICE-002**: Value > 0 required for B→A swaps (REQ-NF-002)
- **VR-PRICE-003**: Value = 0 allowed only before `set_price` is invoked (initial state)

### Business Logic

**Conversion A→B:**
```rust
pub fn convert_a_to_b(
    amount_a: TokenAmount,
    rate: ExchangeRate,
    decimals_a: Decimals,
    decimals_b: Decimals,
) -> Result<TokenAmount, DomainError> {
    amount_a
        .value()
        .checked_mul(rate.raw_value())?
        .checked_mul(10u64.pow(decimals_b.value() as u32))?
        .checked_div(ExchangeRate::PRECISION)?
        .checked_div(10u64.pow(decimals_a.value() as u32))?
        .ok_or(DomainError::CalculationOverflow)
        .map(TokenAmount::new)
}
```

**Conversion B→A:**
```rust
pub fn convert_b_to_a(
    amount_b: TokenAmount,
    rate: ExchangeRate,
    decimals_a: Decimals,
    decimals_b: Decimals,
) -> Result<TokenAmount, DomainError> {
    if !rate.is_set() {
        return Err(DomainError::PriceNotSet);
    }
    amount_b
        .value()
        .checked_mul(ExchangeRate::PRECISION)?
        .checked_mul(10u64.pow(decimals_a.value() as u32))?
        .checked_div(rate.raw_value())?
        .checked_div(10u64.pow(decimals_b.value() as u32))?
        .ok_or(DomainError::CalculationOverflow)
        .map(TokenAmount::new)
}
```

### Traceability

- **Defined in:** `MarketAccount.price` field (REQ-F-010)
- **Set by:** `set_price` instruction (REQ-F-002)
- **Used by:** `swap` calculation (REQ-F-006, REQ-F-007)
- **Validated by:** REQ-NF-002 (division by zero protection)

---

## VO-AMT-001: TokenAmount

**Definition:** A quantity of tokens expressed in the token's base units (smallest indivisible unit).

### Properties

| Property | Type | Constraint | Description |
|----------|------|------------|-------------|
| `value` | `u64` | `>= 0` | Number of base units |

### Interpretation

```
human_readable_amount = value / 10^decimals
```

**Examples (for a token with 6 decimals):**
- `value = 1_000_000` → 1.0 tokens
- `value = 500_000` → 0.5 tokens
- `value = 1_234_567` → 1.234567 tokens
- `value = 0` → 0 tokens (invalid for swaps per REQ-NF-004)

### Rust Representation

```rust
/// Token amount in base units
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct TokenAmount(u64);

impl TokenAmount {
    /// Creates a new token amount
    pub fn new(value: u64) -> Self {
        Self(value)
    }

    /// Creates from human-readable amount and decimals
    /// Example: from_decimal(1.5, 6) -> TokenAmount(1_500_000)
    pub fn from_decimal(amount: f64, decimals: u8) -> Result<Self, DomainError> {
        if amount < 0.0 {
            return Err(DomainError::NegativeAmount);
        }
        let multiplier = 10u64.pow(decimals as u32);
        let value = (amount * multiplier as f64) as u64;
        Ok(Self(value))
    }

    /// Returns raw value
    pub fn value(&self) -> u64 {
        self.0
    }

    /// Converts to human-readable amount
    pub fn to_decimal(&self, decimals: u8) -> f64 {
        let divisor = 10u64.pow(decimals as u32);
        self.0 as f64 / divisor as f64
    }

    /// Checks if amount is zero
    pub fn is_zero(&self) -> bool {
        self.0 == 0
    }

    /// Checks if amount is positive
    pub fn is_positive(&self) -> bool {
        self.0 > 0
    }

    /// Checked addition
    pub fn checked_add(&self, other: Self) -> Option<Self> {
        self.0.checked_add(other.0).map(Self)
    }

    /// Checked subtraction
    pub fn checked_sub(&self, other: Self) -> Option<Self> {
        self.0.checked_sub(other.0).map(Self)
    }
}
```

### Validation Rules

- **VR-AMT-001**: Value must be non-negative (always true for u64)
- **VR-AMT-002**: Value must be > 0 for swap and liquidity operations (REQ-NF-004)
- **VR-AMT-003**: Value must be <= vault balance for output amounts (REQ-NF-003)
- **VR-AMT-004**: Value must be <= user balance for input amounts (enforced by SPL Token Program)

### Business Logic

**Sufficient Liquidity Check:**
```rust
pub fn has_sufficient_liquidity(
    vault_balance: TokenAmount,
    required_output: TokenAmount,
) -> bool {
    vault_balance.value() >= required_output.value()
}
```

**Zero Amount Validation:**
```rust
pub fn validate_swap_amount(amount: TokenAmount) -> Result<(), DomainError> {
    if amount.is_zero() {
        return Err(DomainError::ZeroAmount);
    }
    Ok(())
}
```

### Traceability

- **Used in:** All token transfer operations (REQ-F-003, REQ-F-004, REQ-F-006, REQ-F-007)
- **Validated by:** REQ-NF-004 (zero amount check), REQ-NF-003 (liquidity check)
- **Checked arithmetic:** REQ-NF-001 (overflow protection)

---

## VO-DIR-001: SwapDirection

**Definition:** An enum representing the direction of a token swap (A→B or B→A).

### Variants

| Variant | Rust Representation | Description | Formula |
|---------|---------------------|-------------|---------|
| `AtoB` | `true` (bool) or `SwapDirection::AtoB` (enum) | User provides Token A, receives Token B | output_b = input_a × rate |
| `BtoA` | `false` (bool) or `SwapDirection::BtoA` (enum) | User provides Token B, receives Token A | output_a = input_b / rate |

### Rust Representation (Two Approaches)

**Approach 1: Boolean (MVP Implementation)**
```rust
// Used in instruction parameter
pub fn swap(
    ctx: Context<Swap>,
    amount: u64,
    swap_a_to_b: bool,  // true = A→B, false = B→A
) -> Result<()>
```

**Approach 2: Enum (Domain Model, Future Enhancement)**
```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SwapDirection {
    /// Token A → Token B
    AtoB,
    /// Token B → Token A
    BtoA,
}

impl SwapDirection {
    pub fn is_a_to_b(&self) -> bool {
        matches!(self, Self::AtoB)
    }

    pub fn is_b_to_a(&self) -> bool {
        matches!(self, Self::BtoA)
    }

    pub fn from_bool(swap_a_to_b: bool) -> Self {
        if swap_a_to_b {
            Self::AtoB
        } else {
            Self::BtoA
        }
    }

    pub fn to_bool(&self) -> bool {
        matches!(self, Self::AtoB)
    }
}
```

### Validation Rules

- **VR-DIR-001**: Direction must be explicitly specified (no default)
- **VR-DIR-002**: B→A direction requires price > 0 (REQ-NF-002)

### Business Logic

**Direction-Based Calculation:**
```rust
pub fn calculate_output(
    direction: SwapDirection,
    input_amount: TokenAmount,
    rate: ExchangeRate,
    decimals_a: Decimals,
    decimals_b: Decimals,
) -> Result<TokenAmount, DomainError> {
    match direction {
        SwapDirection::AtoB => convert_a_to_b(input_amount, rate, decimals_a, decimals_b),
        SwapDirection::BtoA => convert_b_to_a(input_amount, rate, decimals_a, decimals_b),
    }
}
```

### Traceability

- **Used in:** `swap` instruction (REQ-F-006, REQ-F-007)
- **Validated by:** REQ-NF-002 (price check for B→A)
- **Emitted in:** `SwapExecuted` event (REQ-NF-012)

---

## VO-SEED-001: PDASeeds

**Definition:** Byte arrays used as seeds for Program Derived Address (PDA) generation.

### Seed Specifications

| Entity | Seeds | Example | Derivation |
|--------|-------|---------|------------|
| Market PDA | `[b"market", token_mint_a, token_mint_b]` | `["market", <32 bytes>, <32 bytes>]` | `Pubkey::find_program_address` |
| Vault A PDA | `[b"vault_a", market]` | `["vault_a", <32 bytes>]` | `Pubkey::find_program_address` |
| Vault B PDA | `[b"vault_b", market]` | `["vault_b", <32 bytes>]` | `Pubkey::find_program_address` |

**Ordering Rule (Market PDA):**

Token mint order in seeds is **significant and directional**:
- `mint_a` = base token (denominator in price quotes)
- `mint_b` = quote token (numerator in price quotes)
- Market(USDC, SOL) and Market(SOL, USDC) are **distinct PDAs** with different prices
- **No canonical ordering** enforced (lexicographic or otherwise) — administrator chooses direction at initialization

**Rationale:** Matches traditional finance conventions (base/quote pairs). Allows symmetric markets with inverse prices. Duplicates prevented by economic incentives, not on-chain enforcement. See ADR-004 for detailed justification.

### Rust Representation

```rust
/// PDA seeds for market account
pub struct MarketSeeds<'a> {
    pub prefix: &'a [u8],          // b"market"
    pub token_mint_a: &'a [u8],    // token_mint_a.as_ref() (32 bytes)
    pub token_mint_b: &'a [u8],    // token_mint_b.as_ref() (32 bytes)
}

impl<'a> MarketSeeds<'a> {
    pub const PREFIX: &'static [u8] = b"market";

    pub fn new(token_mint_a: &'a Pubkey, token_mint_b: &'a Pubkey) -> Self {
        Self {
            prefix: Self::PREFIX,
            token_mint_a: token_mint_a.as_ref(),
            token_mint_b: token_mint_b.as_ref(),
        }
    }

    pub fn to_seed_slice(&self) -> [&[u8]; 3] {
        [self.prefix, self.token_mint_a, self.token_mint_b]
    }
}

/// PDA seeds for vault accounts
pub struct VaultSeeds<'a> {
    pub prefix: &'a [u8],   // b"vault_a" or b"vault_b"
    pub market: &'a [u8],   // market.key().as_ref() (32 bytes)
}

impl<'a> VaultSeeds<'a> {
    pub const VAULT_A_PREFIX: &'static [u8] = b"vault_a";
    pub const VAULT_B_PREFIX: &'static [u8] = b"vault_b";

    pub fn vault_a(market: &'a Pubkey) -> Self {
        Self {
            prefix: Self::VAULT_A_PREFIX,
            market: market.as_ref(),
        }
    }

    pub fn vault_b(market: &'a Pubkey) -> Self {
        Self {
            prefix: Self::VAULT_B_PREFIX,
            market: market.as_ref(),
        }
    }

    pub fn to_seed_slice(&self) -> [&[u8]; 2] {
        [self.prefix, self.market]
    }
}
```

### Validation Rules

- **VR-SEED-001**: Seeds must be deterministic (same inputs → same PDA)
- **VR-SEED-002**: Prefix strings must be valid UTF-8 (enforced by Rust string literals)
- **VR-SEED-003**: Pubkey references must be 32 bytes (enforced by type system)

### Business Logic

**PDA Derivation:**
```rust
// Market PDA derivation
let (market_pda, bump) = Pubkey::find_program_address(
    &[
        b"market",
        token_mint_a.as_ref(),
        token_mint_b.as_ref(),
    ],
    program_id,
);

// Vault A PDA derivation
let (vault_a_pda, _bump) = Pubkey::find_program_address(
    &[
        b"vault_a",
        market_pda.as_ref(),
    ],
    program_id,
);
```

**CPI Signer Seeds:**
```rust
// Market PDA signing for vault transfers
let signer_seeds: &[&[&[u8]]] = &[&[
    b"market",
    market.token_mint_a.as_ref(),
    market.token_mint_b.as_ref(),
    &[market.bump],
]];
```

### Traceability

- **Defined in:** REQ-F-011 (PDA derivation)
- **Used in:** `initialize_market` (account creation), `swap` (CPI signing)
- **Validated by:** Anchor constraints (`seeds` and `bump`)

---

## VO-DEC-001: Decimals

**Definition:** The number of decimal places used to convert between base units and human-readable token amounts.

### Properties

| Property | Type | Constraint | Description |
|----------|------|------------|-------------|
| `value` | `u8` | `0-18` | Number of decimal places |

### Interpretation

```
base_units = human_amount × 10^decimals
human_amount = base_units / 10^decimals
```

**Common Examples:**
- USDC: 6 decimals (1 USDC = 1_000_000 base units)
- SOL: 9 decimals (1 SOL = 1_000_000_000 lamports)
- USDT: 6 decimals
- Ethereum tokens (via bridges): 18 decimals

### Rust Representation

```rust
/// Token decimal places (0-18)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Decimals(u8);

impl Decimals {
    pub const MIN: u8 = 0;
    pub const MAX: u8 = 18;

    /// Creates a new Decimals instance with validation
    pub fn new(value: u8) -> Result<Self, DomainError> {
        if value > Self::MAX {
            return Err(DomainError::InvalidDecimals);
        }
        Ok(Self(value))
    }

    /// Returns raw value
    pub fn value(&self) -> u8 {
        self.0
    }

    /// Returns multiplier (10^decimals)
    pub fn multiplier(&self) -> u64 {
        10u64.pow(self.0 as u32)
    }

    /// Converts base units to human-readable amount
    pub fn to_human_amount(&self, base_units: u64) -> f64 {
        base_units as f64 / self.multiplier() as f64
    }

    /// Converts human-readable amount to base units
    pub fn to_base_units(&self, human_amount: f64) -> u64 {
        (human_amount * self.multiplier() as f64) as u64
    }
}
```

### Validation Rules

- **VR-DEC-001**: Value must be in range `0-18` (REQ-F-010)
- **VR-DEC-002**: Decimals are immutable after market creation
- **VR-DEC-003**: Decimals must match the mint metadata (validated during initialization)

### Business Logic

**Decimal-Aware Arithmetic:**
```rust
/// Normalize amounts to comparable scale
pub fn normalize_amounts(
    amount_a: u64,
    decimals_a: Decimals,
    amount_b: u64,
    decimals_b: Decimals,
) -> (u128, u128) {
    // Scale to 18 decimals for comparison
    let scale_a = 10u128.pow(18 - decimals_a.value() as u32);
    let scale_b = 10u128.pow(18 - decimals_b.value() as u32);
    (amount_a as u128 * scale_a, amount_b as u128 * scale_b)
}
```

### Traceability

- **Stored in:** `MarketAccount.decimals_a`, `MarketAccount.decimals_b` (REQ-F-010)
- **Used in:** Swap calculations (REQ-F-006, REQ-F-007)
- **Validated during:** Market initialization (REQ-F-001)

---

## VO-BUMP-001: BumpSeed

**Definition:** A single byte (0-255) used in PDA derivation to ensure the derived address falls off the Ed25519 elliptic curve.

### Properties

| Property | Type | Constraint | Description |
|----------|------|------------|-------------|
| `value` | `u8` | `0-255` | Bump seed value (typically 255 or 254) |

### Rust Representation

```rust
/// PDA bump seed
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BumpSeed(u8);

impl BumpSeed {
    pub fn new(value: u8) -> Self {
        Self(value)
    }

    pub fn value(&self) -> u8 {
        self.0
    }

    /// Finds the canonical bump for given seeds
    pub fn find_canonical(seeds: &[&[u8]], program_id: &Pubkey) -> (Pubkey, Self) {
        let (pda, bump) = Pubkey::find_program_address(seeds, program_id);
        (pda, Self(bump))
    }
}
```

### Validation Rules

- **VR-BUMP-001**: Bump must be the canonical bump found by `find_program_address`
- **VR-BUMP-002**: Bump is immutable after account creation
- **VR-BUMP-003**: Bump must be stored for efficient CPI signer derivation

### Business Logic

**Bump Usage in CPI:**
```rust
let signer_seeds: &[&[&[u8]]] = &[&[
    b"market",
    market.token_mint_a.as_ref(),
    market.token_mint_b.as_ref(),
    &[market.bump],  // Bump seed appended here
]];

// CPI call with PDA signer
token::transfer(
    CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        token::Transfer { /* accounts */ },
        signer_seeds,
    ),
    amount,
)?;
```

### Traceability

- **Stored in:** `MarketAccount.bump` (REQ-F-010)
- **Used in:** CPI signer seeds for vault transfers (REQ-F-006, REQ-F-007)
- **Defined in:** REQ-F-011 (PDA derivation)

---

## VO-TS-001: Timestamp

**Definition:** Unix timestamp representing the number of seconds since January 1, 1970 (Unix epoch).

### Properties

| Property | Type | Constraint | Description |
|----------|------|------------|-------------|
| `value` | `i64` | Signed 64-bit integer | Seconds since epoch |

### Rust Representation

```rust
/// Unix timestamp in seconds
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Timestamp(i64);

impl Timestamp {
    /// Creates a new timestamp
    pub fn new(value: i64) -> Self {
        Self(value)
    }

    /// Gets current timestamp from Clock sysvar
    pub fn now(clock: &Clock) -> Self {
        Self(clock.unix_timestamp)
    }

    /// Returns raw value
    pub fn value(&self) -> i64 {
        self.0
    }

    /// Formats as ISO 8601 string (for display)
    pub fn to_iso8601(&self) -> String {
        // Implementation depends on chrono or time crate
        // Example: "2026-03-22T12:34:56Z"
        format!("{}", self.0) // Simplified
    }
}
```

### Validation Rules

- **VR-TS-001**: Timestamp must be monotonically increasing (enforced by blockchain)
- **VR-TS-002**: Timestamp must be > 0 for events after epoch
- **VR-TS-003**: Timestamp should be obtained from Clock sysvar (not client-provided)

### Business Logic

**Event Timestamp:**
```rust
let clock = Clock::get()?;
let timestamp = Timestamp::now(&clock);

emit!(SwapExecuted {
    market: ctx.accounts.market.key(),
    user: ctx.accounts.user.key(),
    swap_a_to_b,
    input_amount,
    output_amount,
    timestamp: timestamp.value(),
});
```

### Traceability

- **Used in:** All events (REQ-NF-009 through REQ-NF-012)
- **Source:** Solana Clock sysvar
- **Format:** i64 (seconds since epoch)

---

## VO-SIG-001: Signature

**Definition:** An Ed25519 cryptographic signature (64 bytes) proving transaction authorization.

### Properties

| Property | Type | Constraint | Description |
|----------|------|------------|-------------|
| `bytes` | `[u8; 64]` | Fixed-size array | Ed25519 signature |

### Rust Representation

```rust
// Standard Solana Signature type
use solana_program::signature::Signature;

// Signature is generated by wallet, not by program
// Used for transaction traceability in events and logs
```

### Validation Rules

- **VR-SIG-001**: Signature must be valid Ed25519 signature
- **VR-SIG-002**: Signature must be verified by Solana runtime (automatic)
- **VR-SIG-003**: Signature is unique per transaction (enforced by blockchain)

### Business Logic

**Transaction Traceability:**
```rust
// Signature is accessible in logs for event indexing
// Example: SwapExecuted event links to transaction signature
```

### Traceability

- **Generated by:** Wallet (Phantom) when user signs transaction
- **Verified by:** Solana runtime before instruction execution
- **Used for:** Transaction indexing, audit trails, UI updates (REQ-NF-012)

---

## Domain Primitive Summary

### Primitive Type Mapping

| Domain Concept | Rust Primitive | Wrapped Type | Validation |
|----------------|----------------|--------------|------------|
| ExchangeRate | `u64` | `ExchangeRate(u64)` | `>= 0`, precision 10^6 |
| TokenAmount | `u64` | `TokenAmount(u64)` | `>= 0`, checked arithmetic |
| SwapDirection | `bool` | `SwapDirection` enum | `AtoB` or `BtoA` |
| PDASeeds | `&[&[u8]]` | Various seed structs | UTF-8, 32-byte refs |
| Decimals | `u8` | `Decimals(u8)` | `0-18` |
| BumpSeed | `u8` | `BumpSeed(u8)` | `0-255`, canonical |
| Timestamp | `i64` | `Timestamp(i64)` | Monotonic, from Clock |
| Signature | `[u8; 64]` | `Signature` | Ed25519 valid |

---

## Type Safety Benefits

### Preventing Errors Through Type Design

**Problem:** Accidentally using raw `u64` for incompatible concepts
```rust
// BAD: Raw primitives can be confused
fn swap(amount: u64, price: u64, decimals_a: u64, decimals_b: u64) -> u64 {
    // Easy to mix up parameters!
    amount * price * decimals_a / decimals_b
}
```

**Solution:** Wrapped types prevent confusion
```rust
// GOOD: Types prevent misuse
fn swap(
    amount: TokenAmount,
    rate: ExchangeRate,
    decimals_a: Decimals,
    decimals_b: Decimals,
) -> Result<TokenAmount, DomainError> {
    // Cannot accidentally pass price as amount!
    calculate_output(amount, rate, decimals_a, decimals_b)
}
```

---

## Changelog

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 1.0     | 2026-03-22 | Initial value object definitions |

---

**Traceability:** This document derives value object specifications from:
- REQ-F-002, REQ-F-006, REQ-F-007 (functional requirements)
- REQ-NF-001, REQ-NF-002, REQ-NF-004 (validation requirements)
- REQ-F-010, REQ-F-011 (data structure requirements)
- Glossary (01-GLOSSARY.md) and Entities (02-ENTITIES.md)
