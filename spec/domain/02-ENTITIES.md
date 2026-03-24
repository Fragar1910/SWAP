# Domain Entities

> **Domain:** Solana Token SWAP - Decentralized Exchange
> **Version:** 1.0
> **Last updated:** 2026-03-22

## Purpose

This document defines all domain entities, their attributes, relationships, and cardinalities. Each entity maps to on-chain or transient data structures that implement the swap system's core business logic.

---

## Entity Relationship Diagram (ERD) Overview

```
┌─────────────────────┐
│   Administrator     │
│    (Wallet)         │
└──────────┬──────────┘
           │ creates & manages
           │ (1:n)
           ▼
┌─────────────────────┐         has-one          ┌─────────────────────┐
│      Market         │◄────────────────────────►│   Token Mint A      │
│                     │                           │   (External)        │
│                     │         has-one          └─────────────────────┘
│                     │◄────────────────────────►┌─────────────────────┐
│                     │                           │   Token Mint B      │
└──────────┬──────────┘                           │   (External)        │
           │                                      └─────────────────────┘
           │ has-exactly-two
           │ (1:2)
           ▼
┌─────────────────────┐
│       Vault         │
│  (Vault A, Vault B) │
└──────────┬──────────┘
           │
           │ stores tokens of
           │ (n:1)
           ▼
┌─────────────────────┐
│    Token Mint       │
│    (External)       │
└─────────────────────┘

┌─────────────────────┐
│       User          │
│     (Wallet)        │
└──────────┬──────────┘
           │ initiates
           │ (1:n)
           ▼
┌─────────────────────┐         links-to         ┌─────────────────────┐
│  Swap Transaction   │◄────────────────────────►│      Market         │
│    (Transient)      │                           │                     │
└─────────────────────┘                           └─────────────────────┘
```

---

## Entity Catalog

### Entity Summary Table

| Entity ID | Entity Name | Type | Persistence | Owner | Traceability |
|-----------|-------------|------|-------------|-------|--------------|
| ENT-MKT-001 | Market | Aggregate Root | On-chain Account (PDA) | Swap Program | REQ-F-001, REQ-F-010 |
| ENT-VLT-001 | Vault | Entity | On-chain Token Account (PDA) | SPL Token Program | REQ-F-003, REQ-F-004 |
| ENT-MINT-001 | Token Mint | External Entity | On-chain Account | SPL Token Program | REQ-C-004 |
| ENT-SWP-001 | Swap Transaction | Transient Entity | Transaction Logs + Events | N/A | REQ-F-006, REQ-F-007 |
| ENT-ADMIN-001 | Administrator | External Actor | Wallet Keypair (Off-chain) | User | REQ-F-002, REQ-F-008 |
| ENT-USER-001 | User | External Actor | Wallet Keypair (Off-chain) | User | REQ-F-009 |

---

## ENT-MKT-001: Market

**Definition:** A market is the central aggregate root representing a trading pair between two SPL tokens. It coordinates exchange rate information, vault references, and administrator authority.

### Attributes

| Attribute | Type | Constraint | Description | Traceability |
|-----------|------|------------|-------------|--------------|
| `pda` | `Pubkey` | Immutable, Unique | PDA address derived from `[b"market", token_mint_a, token_mint_b]` | REQ-F-011 |
| `authority` | `Pubkey` | Immutable | Administrator's wallet public key, authorized for price/liquidity changes | REQ-F-002, REQ-F-008 |
| `token_mint_a` | `Pubkey` | Immutable, NOT NULL | SPL Token Mint address for Token A | REQ-F-001 |
| `token_mint_b` | `Pubkey` | Immutable, NOT NULL | SPL Token Mint address for Token B | REQ-F-001 |
| `price` | `u64` | Mutable, `>= 0` (initially 0) | Exchange rate: `1 Token A = (price / 10^6) Token B` | REQ-F-002 |
| `decimals_a` | `u8` | Immutable, `0-18` | Decimal places for Token A (from mint metadata) | REQ-F-010 |
| `decimals_b` | `u8` | Immutable, `0-18` | Decimal places for Token B (from mint metadata) | REQ-F-010 |
| `bump` | `u8` | Immutable, `0-255` | PDA bump seed for CPI signer derivation | REQ-F-011 |

### Rust Struct Representation

```rust
#[account]
pub struct MarketAccount {
    pub authority: Pubkey,        // 32 bytes
    pub token_mint_a: Pubkey,     // 32 bytes
    pub token_mint_b: Pubkey,     // 32 bytes
    pub price: u64,               // 8 bytes
    pub decimals_a: u8,           // 1 byte
    pub decimals_b: u8,           // 1 byte
    pub bump: u8,                 // 1 byte
}
// Total: 107 bytes + 8 (discriminator) = 115 bytes
```

### Relationships

| Relationship | Target Entity | Cardinality | Type | Description |
|--------------|---------------|-------------|------|-------------|
| `managed_by` | Administrator | n:1 | Association | Each market has exactly one authority; one admin can manage multiple markets |
| `has_vault_a` | Vault | 1:1 | Composition | Market owns Vault A (Token A liquidity) |
| `has_vault_b` | Vault | 1:1 | Composition | Market owns Vault B (Token B liquidity) |
| `references_mint_a` | Token Mint | n:1 | Reference | Market references Token A's mint address |
| `references_mint_b` | Token Mint | n:1 | Reference | Market references Token B's mint address |
| `processes_swaps` | Swap Transaction | 1:n | Processing | Market handles multiple swap transactions |

### Lifecycle States

**Note:** Markets in this system do not have explicit state transitions. Once initialized, a market remains "active" indefinitely. Future versions may add states like `Paused`, `Closed`, or `Deprecated`.

**Current State:** Always `Active` (implicit)

### Invariants

See `05-INVARIANTS.md` for formal invariants:
- **INV-MKT-001**: Market PDA uniqueness
- **INV-MKT-002**: Authority immutability
- **INV-MKT-003**: Token mint immutability
- **INV-MKT-004**: Price non-negativity
- **INV-MKT-005**: Decimals range constraint

### Business Rules

- **BR-MKT-001**: A market can only be initialized once per (token_mint_a, token_mint_b) pair (enforced by PDA determinism)
- **BR-MKT-002**: Only `authority` can invoke `set_price` and `add_liquidity` instructions (REQ-F-008)
- **BR-MKT-003**: `price` must be > 0 before swaps can execute (REQ-NF-002)
- **BR-MKT-004**: `token_mint_a` and `token_mint_b` must be distinct (same token swaps disallowed). **Enforced on-chain** in `initialize_market` instruction via `require!(token_mint_a != token_mint_b, ErrorCode::SameTokenSwapDisallowed)`.

### Traceability

- **Created by:** `initialize_market` instruction (REQ-F-001)
- **Modified by:** `set_price` instruction (REQ-F-002)
- **Referenced by:** `add_liquidity` (REQ-F-003, REQ-F-004), `swap` (REQ-F-006, REQ-F-007)
- **Events:** `MarketInitialized` (REQ-NF-009), `PriceSet` (REQ-NF-010)

---

## ENT-VLT-001: Vault

**Definition:** A vault is a PDA-controlled SPL Token Account that holds liquidity for one side of a market (either Token A or Token B).

### Attributes

| Attribute | Type | Constraint | Description | Traceability |
|-----------|------|------------|-------------|--------------|
| `pda` | `Pubkey` | Immutable, Unique | PDA address derived from `[b"vault_a", market]` or `[b"vault_b", market]` | REQ-F-011 |
| `authority` | `Pubkey` | Immutable | Market PDA address (the vault's signing authority) | REQ-F-001 |
| `mint` | `Pubkey` | Immutable | Token mint address (either token_mint_a or token_mint_b) | REQ-F-001 |
| `balance` | `u64` | Mutable, `>= 0` | Current token balance in base units | REQ-F-003, REQ-F-004 |
| `owner` | `Pubkey` | Immutable | SPL Token Program address (program that owns this account) | REQ-NF-005 |
| `discriminator_type` | Enum | Immutable | `VaultA` or `VaultB` (logical distinction, not stored on-chain) | REQ-F-003, REQ-F-004 |

### Rust Representation

**Note:** Vaults are SPL Token Accounts, not custom Anchor accounts. They use the standard `TokenAccount` struct from `anchor_spl::token`.

```rust
// Standard SPL Token Account (not custom struct)
// Access via: Account<'info, TokenAccount>

// Logical wrapper for domain modeling:
pub enum VaultType {
    VaultA,  // Holds Token A
    VaultB,  // Holds Token B
}

// Derivation seeds:
// Vault A: [b"vault_a", market.key().as_ref()]
// Vault B: [b"vault_b", market.key().as_ref()]
```

### Relationships

| Relationship | Target Entity | Cardinality | Type | Description |
|--------------|---------------|-------------|------|-------------|
| `belongs_to` | Market | 2:1 | Composition | Each vault belongs to exactly one market; each market has exactly two vaults |
| `stores_tokens_of` | Token Mint | n:1 | Reference | Vault holds tokens of a specific mint |
| `receives_from` | Administrator | n:1 | Operation | Admin adds liquidity via `add_liquidity` |
| `sends_to` / `receives_from` | User | n:n | Operation | Vault participates in swap transfers |

### Lifecycle States

**Note:** Vaults do not have explicit states. They are always "active" once created. Balance can increase (liquidity added, tokens swapped in) or decrease (tokens swapped out).

**Operational States (informal):**
- **Empty**: `balance = 0` (swaps out of this vault will fail)
- **Liquid**: `balance > 0` (can fulfill swap requests)

### Invariants

See `05-INVARIANTS.md` for formal invariants:
- **INV-VLT-001**: Non-negative balance
- **INV-VLT-002**: PDA authority ownership
- **INV-VLT-003**: Single mint constraint
- **INV-VLT-004**: Sufficient liquidity for swaps

### Business Rules

- **BR-VLT-001**: Vault balance can never go negative (enforced by SPL Token Program)
- **BR-VLT-002**: Only the market PDA (via CPI signer) can transfer tokens out of a vault (REQ-F-006, REQ-F-007)
- **BR-VLT-003**: Liquidity can be added but not withdrawn (withdrawal not in scope for MVP)
- **BR-VLT-004**: Swaps must check sufficient vault balance before executing transfer (REQ-NF-003)

### Traceability

- **Created by:** `initialize_market` instruction (REQ-F-001)
- **Modified by:** `add_liquidity` (REQ-F-003, REQ-F-004), `swap` (REQ-F-006, REQ-F-007)
- **Events:** `LiquidityAdded` (REQ-NF-011), `SwapExecuted` (REQ-NF-012)

---

## ENT-MINT-001: Token Mint

**Definition:** A token mint is an external entity representing an SPL token's metadata and supply information. It is created and owned by the SPL Token Program, not by the swap program.

### Attributes

| Attribute | Type | Constraint | Description | Traceability |
|-----------|------|------------|-------------|--------------|
| `address` | `Pubkey` | Immutable, Unique | Mint's public key address | REQ-C-004 |
| `supply` | `u64` | Mutable | Total tokens minted (managed by SPL Token Program) | External |
| `decimals` | `u8` | Immutable, `0-18` | Decimal places for display (e.g., 9 for SOL) | REQ-F-010 |
| `mint_authority` | `Option<Pubkey>` | Mutable | Authority allowed to mint new tokens (null if frozen) | External |
| `freeze_authority` | `Option<Pubkey>` | Mutable | Authority allowed to freeze token accounts | External |

### Rust Representation

```rust
// Standard SPL Token Mint (not custom struct)
// Access via: Account<'info, Mint>

// Used in contexts:
pub token_mint_a: Account<'info, Mint>,
pub token_mint_b: Account<'info, Mint>,
```

### Relationships

| Relationship | Target Entity | Cardinality | Type | Description |
|--------------|---------------|-------------|------|-------------|
| `referenced_by` | Market | 1:n | Reference | One mint can be used in multiple markets (e.g., USDC paired with many tokens) |
| `defines_tokens_in` | Vault | 1:n | Specification | Mint specifies the token type stored in a vault |

### Lifecycle States

**External to swap program.** Mints have states managed by SPL Token Program:
- **Active**: Can mint new tokens (if mint_authority exists)
- **Frozen**: Supply is fixed (mint_authority = null)

### Invariants

- **INV-MINT-001**: Mint address is immutable once referenced in a market
- **INV-MINT-002**: Decimals are immutable (enforced by SPL Token Program)
- **INV-MINT-003**: Token A and Token B in a market must have distinct mint addresses (not enforced in MVP)

### Business Rules

- **BR-MINT-001**: Swap program never modifies mint data (read-only reference)
- **BR-MINT-002**: Mint must exist before market initialization (checked via account validation)

### Traceability

- **Referenced by:** `initialize_market` (REQ-F-001)
- **Validated in:** All instructions that use Token A or Token B (REQ-F-003 through REQ-F-007)
- **Constraint:** REQ-C-004 (SPL Token Standard)

---

## ENT-SWP-001: Swap Transaction

**Definition:** A swap transaction is a transient entity representing a single token exchange operation. It does not persist as an on-chain account; instead, it is captured via transaction logs and emitted events.

### Attributes

| Attribute | Type | Constraint | Description | Traceability |
|-----------|------|------------|-------------|--------------|
| `market` | `Pubkey` | NOT NULL | Market PDA where the swap occurs | REQ-F-006, REQ-F-007 |
| `user` | `Pubkey` | NOT NULL, Signer | User wallet executing the swap | REQ-F-009 |
| `direction` | `SwapDirection` | NOT NULL | `AtoB` or `BtoA` | REQ-F-006, REQ-F-007 |
| `input_amount` | `u64` | `> 0` | Amount of input tokens provided by user | REQ-NF-004 |
| `output_amount` | `u64` | `> 0` | Amount of output tokens received by user (calculated) | REQ-F-006, REQ-F-007 |
| `timestamp` | `i64` | Immutable | Unix timestamp when swap executed | REQ-NF-012 |
| `signature` | `Signature` | Unique | Transaction signature (for traceability) | REQ-NF-012 |

### Rust Representation

**Note:** Swap is not an account structure. It is modeled as:
1. Function parameters in the `swap` instruction
2. Event emission for auditability

```rust
// Instruction parameters:
pub fn swap(
    ctx: Context<Swap>,
    amount: u64,              // input_amount
    swap_a_to_b: bool,        // direction (true = AtoB, false = BtoA)
) -> Result<()>

// Event (for auditability):
#[event]
pub struct SwapExecuted {
    pub market: Pubkey,
    pub user: Pubkey,
    pub swap_a_to_b: bool,
    pub input_amount: u64,
    pub output_amount: u64,
    pub timestamp: i64,
}
```

### Relationships

| Relationship | Target Entity | Cardinality | Type | Description |
|--------------|---------------|-------------|------|-------------|
| `executed_on` | Market | n:1 | Association | Each swap occurs on exactly one market |
| `initiated_by` | User | n:1 | Association | Each swap is initiated by one user |
| `transfers_from` | Vault | 1:1 | Operation | Swap withdraws from one vault |
| `transfers_to` | Vault | 1:1 | Operation | Swap deposits to another vault |

### Lifecycle States

```
┌─────────┐
│ Pending │  (Transaction submitted, awaiting confirmation)
└────┬────┘
     │
     ├──►┌────────────┐
     │   │ Confirming │  (Transaction in a block, awaiting finality)
     │   └──────┬─────┘
     │          │
     │          ├──►┌───────────┐
     │          │   │ Confirmed │  (Success: tokens transferred, event emitted)
     │          │   └───────────┘
     │          │
     │          └──►┌────────┐
     │              │ Failed │  (Error: reverted, no state change)
     │              └────────┘
     └────────────────────────►┌────────┐
                                │ Failed │  (Rejected before block inclusion)
                                └────────┘
```

**State Descriptions:**
- **Pending**: Transaction sent to RPC, awaiting validator processing
- **Confirming**: Transaction included in a block but not finalized (confirmations < threshold)
- **Confirmed**: Transaction finalized, tokens transferred, event emitted (REQ-NF-012)
- **Failed**: Transaction reverted due to constraint violation (REQ-NF-001 through REQ-NF-006)

### Invariants

See `05-INVARIANTS.md` for formal invariants:
- **INV-SWP-001**: Positive input and output amounts
- **INV-SWP-002**: Atomicity of transfers
- **INV-SWP-003**: Correct output calculation
- **INV-SWP-004**: Sufficient vault liquidity
- **INV-SWP-005**: Price must be set (> 0) for execution

### Business Rules

- **BR-SWP-001**: Input amount must be > 0 (REQ-NF-004)
- **BR-SWP-002**: User must have sufficient balance of input token (enforced by SPL Token Program)
- **BR-SWP-003**: Vault must have sufficient balance of output token (REQ-NF-003)
- **BR-SWP-004**: Market price must be > 0 for B→A swaps (REQ-NF-002)
- **BR-SWP-005**: All arithmetic must use checked operations (REQ-NF-001)

### Calculation Formulas

**Direction: A → B**
```
output_b = (input_a × price × 10^decimals_b) / (10^6 × 10^decimals_a)
```

**Direction: B → A**
```
output_a = (input_b × 10^6 × 10^decimals_a) / (price × 10^decimals_b)
```

**Implementation:**
```rust
let output_amount = if swap_a_to_b {
    // A → B
    amount
        .checked_mul(market.price)?
        .checked_mul(10u64.pow(market.decimals_b as u32))?
        .checked_div(1_000_000)?
        .checked_div(10u64.pow(market.decimals_a as u32))?
} else {
    // B → A
    amount
        .checked_mul(1_000_000)?
        .checked_mul(10u64.pow(market.decimals_a as u32))?
        .checked_div(market.price)?
        .checked_div(10u64.pow(market.decimals_b as u32))?
};
```

### Traceability

- **Executed by:** `swap` instruction (REQ-F-006, REQ-F-007)
- **Validated by:** REQ-NF-001 through REQ-NF-006, REQ-NF-016
- **Audited via:** `SwapExecuted` event (REQ-NF-012)
- **Tested by:** REQ-NF-020, REQ-NF-021

---

## ENT-ADMIN-001: Administrator

**Definition:** An administrator (also called authority or initializer) is an external actor represented by a Solana wallet keypair. The administrator creates markets, sets exchange rates, and provides liquidity.

### Attributes

| Attribute | Type | Constraint | Description | Traceability |
|-----------|------|------------|-------------|--------------|
| `public_key` | `Pubkey` | Unique | Wallet's public key address | REQ-F-008 |
| `private_key` | `SecretKey` | Secret, Off-chain | Wallet's private key (never stored on-chain) | N/A |
| `role` | Enum | `Administrator` | Actor role in the system | REQ-F-008 |

### Relationships

| Relationship | Target Entity | Cardinality | Type | Description |
|--------------|---------------|-------------|------|-------------|
| `creates` | Market | 1:n | Creation | One admin can create multiple markets |
| `manages` | Market | 1:n | Authority | One admin can manage multiple markets; each market has one admin |
| `adds_liquidity_to` | Vault | 1:n | Operation | Admin provides tokens to vaults |
| `sets_price_for` | Market | 1:n | Operation | Admin updates exchange rates |

### Lifecycle States

**External to swap program.** Administrator state is managed by wallet software:
- **Connected**: Wallet connected to dApp UI
- **Disconnected**: Wallet not connected

### Invariants

- **INV-ADMIN-001**: Administrator identity is immutable per market (authority field cannot change)
- **INV-ADMIN-002**: Administrator must be a signer for privileged instructions (REQ-NF-006)

### Business Rules

- **BR-ADMIN-001**: Only the administrator can invoke `set_price` (REQ-F-002, REQ-F-008)
- **BR-ADMIN-002**: Only the administrator can invoke `add_liquidity` (REQ-F-003, REQ-F-004, REQ-F-008)
- **BR-ADMIN-003**: Administrator cannot transfer authority to another wallet (not supported in MVP)

### Traceability

- **Referenced in:** All instructions that require `authority` signer (REQ-F-002, REQ-F-003, REQ-F-004)
- **Validated by:** REQ-F-008, REQ-NF-006
- **UI support:** REQ-F-012, REQ-F-013, REQ-F-014

---

## ENT-USER-001: User

**Definition:** A user (also called trader or swapper) is an external actor represented by a Solana wallet keypair. Users execute token swaps at published exchange rates.

### Attributes

| Attribute | Type | Constraint | Description | Traceability |
|-----------|------|------------|-------------|--------------|
| `public_key` | `Pubkey` | Unique | Wallet's public key address | REQ-F-009 |
| `private_key` | `SecretKey` | Secret, Off-chain | Wallet's private key (never stored on-chain) | N/A |
| `role` | Enum | `User` | Actor role in the system | REQ-F-009 |

### Relationships

| Relationship | Target Entity | Cardinality | Type | Description |
|--------------|---------------|-------------|------|-------------|
| `executes` | Swap Transaction | 1:n | Initiation | One user can execute multiple swaps |
| `interacts_with` | Market | n:n | Operation | Users can swap on any market |
| `holds_tokens` | Token Mint | n:n | Possession | Users have balances of various tokens in ATAs |

### Lifecycle States

**External to swap program.** User state is managed by wallet software:
- **Connected**: Wallet connected to dApp UI
- **Disconnected**: Wallet not connected

### Invariants

- **INV-USER-001**: User must be a signer for swap instructions (REQ-F-009)
- **INV-USER-002**: User must have Associated Token Accounts (ATAs) for both Token A and Token B
- **INV-USER-003**: User must have sufficient balance of input token (enforced by SPL Token Program)

### Business Rules

- **BR-USER-001**: Any wallet can invoke `swap` (permissionless) (REQ-F-009)
- **BR-USER-002**: User must provide input tokens for swap (cannot swap zero amount) (REQ-NF-004)
- **BR-USER-003**: User receives output tokens based on calculated exchange rate (REQ-F-006, REQ-F-007)

### Traceability

- **Referenced in:** `swap` instruction (REQ-F-006, REQ-F-007)
- **Validated by:** REQ-F-009, REQ-NF-004, REQ-NF-006
- **UI support:** REQ-F-015, REQ-F-016

---

## Value Object Summary

**Note:** Value objects are detailed in `03-VALUE-OBJECTS.md`. Brief references:

| Value Object | Type | Description |
|--------------|------|-------------|
| `ExchangeRate` | `u64` | Fixed exchange rate with 10^6 precision |
| `TokenAmount` | `u64` | Token quantity in base units |
| `SwapDirection` | `bool` | `true` = A→B, `false` = B→A |
| `PDASeeds` | `&[&[u8]]` | Byte arrays for PDA derivation |
| `Decimals` | `u8` | Token decimal places (0-18) |

---

## Aggregation and Composition Rules

### Market as Aggregate Root

**Market** is the aggregate root that controls:
- Two **Vaults** (composition: vaults cannot exist independently)
- References to **Token Mints** (external entities)
- **Exchange Rate** (value object)

**Consistency Boundary:**
All operations that modify vaults or exchange rate must go through the market entity. Direct vault manipulation is prohibited.

**Invariant Enforcement:**
Market ensures that:
- Vaults are properly initialized with correct mint references
- Exchange rate is non-negative
- Authority constraints are enforced

### External Entity Boundaries

**Token Mints** and **Wallets (Admin, User)** are external entities:
- Not owned by the swap program
- Read-only references in most operations
- Lifecycle managed by SPL Token Program (mints) or wallet software (keypairs)

---

## Cross-Entity Constraints

### Constraint: Unique Market Per Token Pair
**Formal Statement:**
```
∀ m1, m2 ∈ Markets:
  (m1.token_mint_a = m2.token_mint_a ∧ m1.token_mint_b = m2.token_mint_b) ⇒ m1 = m2
```

**Enforcement:** PDA determinism (same seeds → same address → account already exists error)

**Traceability:** REQ-NF-017

### Constraint: Vault-Market Binding
**Formal Statement:**
```
∀ v ∈ Vaults:
  ∃! m ∈ Markets: v.authority = m.pda
```

**Enforcement:** PDA derivation using market address as seed

**Traceability:** REQ-F-001, REQ-F-011

### Constraint: Atomic Swap Transfers
**Formal Statement:**
```
∀ swap ∈ SwapTransactions:
  (user_to_vault_transfer succeeds ∧ vault_to_user_transfer succeeds) ∨
  (user_to_vault_transfer fails ∧ vault_to_user_transfer fails)
```

**Enforcement:** Solana transaction atomicity

**Traceability:** REQ-NF-016

---

## Changelog

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 1.0     | 2026-03-22 | Initial entity definitions       |

---

**Traceability:** This document derives entity structures from:
- REQ-F-001 through REQ-F-011 (functional requirements)
- REQ-NF-001 through REQ-NF-026 (nonfunctional requirements)
- Glossary terms (01-GLOSSARY.md)
