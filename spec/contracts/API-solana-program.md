# API Contract: Solana Swap Program (On-Chain)

**Contract ID:** API-SOLANA-PROGRAM
**Version:** 1.0
**Last Updated:** 2026-03-22
**Status:** Active

## Overview

**Description:** This document specifies the complete API contract for the Solana Swap Program implemented using the Anchor framework. It defines all on-chain instructions, account structures, error codes, and event schemas that comprise the program's public interface.

**Program Details:**
- **Framework:** Anchor 0.31.0+
- **Language:** Rust 1.70.0+
- **Deployment Target:** Solana (localnet, devnet, mainnet-beta)
- **Program Type:** On-chain smart contract (BPF program)

**Traceability:**
- **Requirements:** REQ-F-001 through REQ-F-011, REQ-NF-001 through REQ-NF-012
- **Use Cases:** UC-001 through UC-005
- **Entities:** ENT-MKT-001, ENT-VLT-001, ENT-SWP-001

---

## Table of Contents

1. [Program Module Declaration](#program-module-declaration)
2. [Instructions](#instructions)
   - [initialize_market](#instruction-initialize_market)
   - [set_price](#instruction-set_price)
   - [add_liquidity](#instruction-add_liquidity)
   - [swap](#instruction-swap)
3. [Account Structures](#account-structures)
4. [Error Codes](#error-codes)
5. [Events](#events)
6. [Type Definitions](#type-definitions)
7. [Client Integration Examples](#client-integration-examples)

---

## Program Module Declaration

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

declare_id!("Swap11111111111111111111111111111111111111111");

#[program]
pub mod solana_swap {
    use super::*;

    // Instructions defined below
}
```

---

## Instructions

### Instruction: initialize_market

**ID:** `initialize_market`
**Description:** Creates a new decentralized exchange market for a pair of SPL tokens. Initializes the MarketAccount PDA and two vault TokenAccount PDAs (vault_a and vault_b).

**Traceability:** REQ-F-001, REQ-F-010, REQ-F-011, UC-001

#### Rust Function Signature

```rust
pub fn initialize_market(
    ctx: Context<InitializeMarket>,
) -> Result<()>
```

#### Context Struct

```rust
#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + MarketAccount::INIT_SPACE,
        seeds = [b"market", token_mint_a.key().as_ref(), token_mint_b.key().as_ref()],
        bump
    )]
    pub market: Account<'info, MarketAccount>,

    #[account(
        init,
        payer = authority,
        seeds = [b"vault_a", market.key().as_ref()],
        bump,
        token::mint = token_mint_a,
        token::authority = market,
    )]
    pub vault_a: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        seeds = [b"vault_b", market.key().as_ref()],
        bump,
        token::mint = token_mint_b,
        token::authority = market,
    )]
    pub vault_b: Account<'info, TokenAccount>,

    pub token_mint_a: Account<'info, Mint>,
    pub token_mint_b: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}
```

#### Parameters

None (all data derived from accounts)

#### Return Value

- **Success:** `Ok(())` - Market successfully initialized
- **Failure:** Anchor error or custom error

#### Account Constraints

| Account | Type | Constraint | Description |
|---------|------|------------|-------------|
| `market` | `Account<MarketAccount>` | `init`, `payer = authority`, `seeds`, `bump` | Market PDA, initialized by this instruction |
| `vault_a` | `Account<TokenAccount>` | `init`, `payer = authority`, `seeds`, `bump`, `token::mint`, `token::authority` | Token A vault, initialized as TokenAccount |
| `vault_b` | `Account<TokenAccount>` | `init`, `payer = authority`, `seeds`, `bump`, `token::mint`, `token::authority` | Token B vault, initialized as TokenAccount |
| `token_mint_a` | `Account<Mint>` | Read-only | Token A mint metadata |
| `token_mint_b` | `Account<Mint>` | Read-only | Token B mint metadata |
| `authority` | `Signer` | `mut` (pays rent) | Administrator wallet creating the market |
| `system_program` | `Program<System>` | - | Solana System Program |
| `token_program` | `Program<Token>` | - | SPL Token Program |
| `rent` | `Sysvar<Rent>` | - | Rent sysvar for rent exemption calculation |

#### Behavior

1. Derives market PDA from seeds `[b"market", token_mint_a, token_mint_b]`
2. Creates MarketAccount with:
   - `authority = authority.key()`
   - `token_mint_a = token_mint_a.key()`
   - `token_mint_b = token_mint_b.key()`
   - `price = 0` (not yet set)
   - `decimals_a = token_mint_a.decimals`
   - `decimals_b = token_mint_b.decimals`
   - `bump = market PDA bump seed`
3. **Validates** that `token_mint_a.key() != token_mint_b.key()` (rejects same-token markets)
4. Initializes vault_a as TokenAccount (mint = token_mint_a, authority = market PDA)
5. Initializes vault_b as TokenAccount (mint = token_mint_b, authority = market PDA)
6. Emits `MarketInitialized` event

#### Errors

- `AccountAlreadyInitialized`: Market already exists for this token pair (Anchor error)
- `InsufficientFunds`: Authority has insufficient SOL for rent (System Program error)
- `InvalidMint`: Token mint account does not exist or is invalid
- `SameTokenSwapDisallowed`: Cannot create market where token_mint_a == token_mint_b

#### Example Invocation (TypeScript)

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaSwap } from "../target/types/solana_swap";
import { PublicKey } from "@solana/web3.js";

const program = anchor.workspace.SolanaSwap as Program<SolanaSwap>;
const provider = anchor.AnchorProvider.env();

// Derive PDAs
const [marketPda, marketBump] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("market"),
    tokenMintA.toBuffer(),
    tokenMintB.toBuffer()
  ],
  program.programId
);

const [vaultAPda, vaultABump] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault_a"), marketPda.toBuffer()],
  program.programId
);

const [vaultBPda, vaultBBump] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault_b"), marketPda.toBuffer()],
  program.programId
);

// Execute instruction
const tx = await program.methods
  .initializeMarket()
  .accounts({
    market: marketPda,
    vaultA: vaultAPda,
    vaultB: vaultBPda,
    tokenMintA: tokenMintA,
    tokenMintB: tokenMintB,
    authority: provider.wallet.publicKey,
    systemProgram: anchor.web3.SystemProgram.programId,
    tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  })
  .rpc();

console.log("Market initialized:", marketPda.toString());
console.log("Transaction signature:", tx);
```

---

### Instruction: set_price

**ID:** `set_price`
**Description:** Updates the exchange rate for the market. Only the market authority can invoke this instruction.

**Traceability:** REQ-F-002, REQ-F-008, UC-002

#### Rust Function Signature

```rust
pub fn set_price(
    ctx: Context<SetPrice>,
    new_price: u64,
) -> Result<()>
```

#### Context Struct

```rust
#[derive(Accounts)]
pub struct SetPrice<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::Unauthorized,
    )]
    pub market: Account<'info, MarketAccount>,

    pub authority: Signer<'info>,
}
```

#### Parameters

| Parameter | Type | Constraint | Description |
|-----------|------|------------|-------------|
| `new_price` | `u64` | `>= 0` (u64 is non-negative by type) | New exchange rate: `1 Token A = (new_price / 10^6) Token B` |

#### Return Value

- **Success:** `Ok(())` - Price successfully updated
- **Failure:** Anchor error or custom error

#### Account Constraints

| Account | Type | Constraint | Description |
|---------|------|------------|-------------|
| `market` | `Account<MarketAccount>` | `mut`, `has_one = authority` | Market account to update |
| `authority` | `Signer` | Must match `market.authority` | Market authority (administrator) |

#### Behavior

1. Validates `authority` is signer and matches `market.authority`
2. Reads old price: `old_price = market.price`
3. Updates market price: `market.price = new_price`
4. Emits `PriceSet` event with old_price, new_price, timestamp

#### Errors

- `Unauthorized`: Signer is not market.authority (custom error)
- `ConstraintHasOne`: Anchor constraint violation if authority mismatch

#### Example Invocation (TypeScript)

```typescript
// Set exchange rate to 2.5 (1 Token A = 2.5 Token B)
const newPrice = new anchor.BN(2_500_000); // 2.5 * 10^6

const tx = await program.methods
  .setPrice(newPrice)
  .accounts({
    market: marketPda,
    authority: provider.wallet.publicKey,
  })
  .rpc();

console.log("Price updated to 2.5");
console.log("Transaction signature:", tx);
```

---

### Instruction: add_liquidity

**ID:** `add_liquidity`
**Description:** Adds liquidity to one or both vaults. Only the market authority can invoke this instruction.

**Traceability:** REQ-F-003, REQ-F-004, REQ-F-005, REQ-F-008, UC-003

#### Rust Function Signature

```rust
pub fn add_liquidity(
    ctx: Context<AddLiquidity>,
    amount_a: u64,
    amount_b: u64,
) -> Result<()>
```

#### Context Struct

```rust
#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::Unauthorized,
        has_one = token_mint_a,
        has_one = token_mint_b,
    )]
    pub market: Account<'info, MarketAccount>,

    #[account(
        mut,
        seeds = [b"vault_a", market.key().as_ref()],
        bump,
    )]
    pub vault_a: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault_b", market.key().as_ref()],
        bump,
    )]
    pub vault_b: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = authority_token_a.mint == market.token_mint_a,
        constraint = authority_token_a.owner == authority.key(),
    )]
    pub authority_token_a: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = authority_token_b.mint == market.token_mint_b,
        constraint = authority_token_b.owner == authority.key(),
    )]
    pub authority_token_b: Account<'info, TokenAccount>,

    pub token_mint_a: Account<'info, Mint>,
    pub token_mint_b: Account<'info, Mint>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
```

#### Parameters

| Parameter | Type | Constraint | Description |
|-----------|------|------------|-------------|
| `amount_a` | `u64` | `amount_a >= 0 AND (amount_a > 0 OR amount_b > 0)` | Token A amount to add (base units) |
| `amount_b` | `u64` | `amount_b >= 0 AND (amount_a > 0 OR amount_b > 0)` | Token B amount to add (base units) |

#### Return Value

- **Success:** `Ok(())` - Liquidity successfully added
- **Failure:** Anchor error or custom error

#### Account Constraints

| Account | Type | Constraint | Description |
|---------|------|------------|-------------|
| `market` | `Account<MarketAccount>` | `mut`, `has_one = authority`, `has_one = token_mint_a`, `has_one = token_mint_b` | Market account |
| `vault_a` | `Account<TokenAccount>` | `mut`, `seeds`, `bump` | Token A vault |
| `vault_b` | `Account<TokenAccount>` | `mut`, `seeds`, `bump` | Token B vault |
| `authority_token_a` | `Account<TokenAccount>` | `mut`, mint/owner constraints | Authority's Token A account |
| `authority_token_b` | `Account<TokenAccount>` | `mut`, mint/owner constraints | Authority's Token B account |
| `token_mint_a` | `Account<Mint>` | Read-only | Token A mint |
| `token_mint_b` | `Account<Mint>` | Read-only | Token B mint |
| `authority` | `Signer` | Must match `market.authority` | Market authority |
| `token_program` | `Program<Token>` | - | SPL Token Program |

#### Behavior

1. Validates `authority` is signer and matches `market.authority`
2. Validates at least one amount > 0: `require!(amount_a > 0 || amount_b > 0, ErrorCode::InvalidAmount)`
3. If `amount_a > 0`:
   - CPI to Token Program: Transfer `amount_a` from `authority_token_a` to `vault_a`
   - Authority signs as owner
4. If `amount_b > 0`:
   - CPI to Token Program: Transfer `amount_b` from `authority_token_b` to `vault_b`
   - Authority signs as owner
5. Emits `LiquidityAdded` event with amount_a, amount_b, timestamp

#### Errors

- `Unauthorized`: Signer is not market.authority
- `InvalidAmount`: Both amount_a and amount_b are 0
- `InsufficientFunds`: Authority has insufficient token balance (Token Program error)

#### Example Invocation (TypeScript)

```typescript
// Add 10,000 Token A and 25,000 Token B
const amountA = new anchor.BN(10_000_000_000); // 10,000 with 9 decimals
const amountB = new anchor.BN(25_000_000_000); // 25,000 with 6 decimals

const tx = await program.methods
  .addLiquidity(amountA, amountB)
  .accounts({
    market: marketPda,
    vaultA: vaultAPda,
    vaultB: vaultBPda,
    authorityTokenA: authorityTokenAAccount,
    authorityTokenB: authorityTokenBAccount,
    tokenMintA: tokenMintA,
    tokenMintB: tokenMintB,
    authority: provider.wallet.publicKey,
    tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
  })
  .rpc();

console.log("Liquidity added: 10,000 A, 25,000 B");
console.log("Transaction signature:", tx);
```

---

### Instruction: swap

**ID:** `swap`
**Description:** Executes a token swap at the market's fixed exchange rate. Supports bidirectional swaps (A→B or B→A). Any user can invoke this instruction.

**Traceability:** REQ-F-006, REQ-F-007, REQ-F-009, UC-004, UC-005

#### Rust Function Signature

```rust
pub fn swap(
    ctx: Context<Swap>,
    amount: u64,
    swap_a_to_b: bool,
) -> Result<()>
```

#### Context Struct

```rust
#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(
        mut,
        seeds = [b"market", market.token_mint_a.as_ref(), market.token_mint_b.as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, MarketAccount>,

    #[account(
        mut,
        seeds = [b"vault_a", market.key().as_ref()],
        bump,
    )]
    pub vault_a: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault_b", market.key().as_ref()],
        bump,
    )]
    pub vault_b: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_token_a.mint == market.token_mint_a,
        constraint = user_token_a.owner == user.key(),
    )]
    pub user_token_a: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_token_b.mint == market.token_mint_b,
        constraint = user_token_b.owner == user.key(),
    )]
    pub user_token_b: Account<'info, TokenAccount>,

    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
```

#### Parameters

| Parameter | Type | Constraint | Description |
|-----------|------|------------|-------------|
| `amount` | `u64` | `> 0` | Input token amount to swap (base units) |
| `swap_a_to_b` | `bool` | - | Swap direction: `true` = A→B, `false` = B→A |

#### Return Value

- **Success:** `Ok(())` - Swap successfully executed
- **Failure:** Anchor error or custom error

#### Account Constraints

| Account | Type | Constraint | Description |
|---------|------|------------|-------------|
| `market` | `Account<MarketAccount>` | `mut`, `seeds`, `bump` | Market account |
| `vault_a` | `Account<TokenAccount>` | `mut`, `seeds`, `bump` | Token A vault |
| `vault_b` | `Account<TokenAccount>` | `mut`, `seeds`, `bump` | Token B vault |
| `user_token_a` | `Account<TokenAccount>` | `mut`, mint/owner constraints | User's Token A account |
| `user_token_b` | `Account<TokenAccount>` | `mut`, mint/owner constraints | User's Token B account |
| `user` | `Signer` | - | User executing the swap (permissionless) |
| `token_program` | `Program<Token>` | - | SPL Token Program |

#### Behavior

1. **Validate Input:**
   ```rust
   require!(amount > 0, ErrorCode::InvalidAmount);

   // Validate price > 0 for:
   // - A→B: Prevents zero-output swaps (amount_b = input × 0 × ... = 0)
   // - B→A: Prevents division by zero (amount_a = input / price)
   require!(market.price > 0, ErrorCode::PriceNotSet);
   ```

2. **Calculate Output Amount:**
   ```rust
   let output_amount = if swap_a_to_b {
       // A→B: output_b = (amount × price × 10^decimals_b) / (10^6 × 10^decimals_a)
       // Note: Multiplies by price (no division by price), but price>0 prevents zero-output
       amount
           .checked_mul(market.price)  // If price=0, result=0 (undesirable)
           .ok_or(ErrorCode::ArithmeticOverflow)?
           .checked_mul(10u64.pow(market.decimals_b as u32))
           .ok_or(ErrorCode::ArithmeticOverflow)?
           .checked_div(1_000_000)
           .ok_or(ErrorCode::ArithmeticOverflow)?
           .checked_div(10u64.pow(market.decimals_a as u32))
           .ok_or(ErrorCode::ArithmeticOverflow)?
   } else {
       // B→A: output_a = (amount × 10^6 × 10^decimals_a) / (price × 10^decimals_b)
       // Note: Divides by price - REQUIRES price > 0 to prevent division by zero
       amount
           .checked_mul(1_000_000)
           .ok_or(ErrorCode::ArithmeticOverflow)?
           .checked_mul(10u64.pow(market.decimals_a as u32))
           .ok_or(ErrorCode::ArithmeticOverflow)?
           .checked_div(market.price)  // Division by zero if price=0
           .ok_or(ErrorCode::ArithmeticOverflow)?
           .checked_div(10u64.pow(market.decimals_b as u32))
           .ok_or(ErrorCode::ArithmeticOverflow)?
   };
   ```

3. **Validate Liquidity:**
   ```rust
   let source_vault = if swap_a_to_b { &ctx.accounts.vault_b } else { &ctx.accounts.vault_a };
   require!(
       source_vault.amount >= output_amount,
       ErrorCode::InsufficientLiquidity
   );
   ```

4. **Execute Transfers (Atomic):**
   - **Transfer 1 (User → Vault):**
     ```rust
     // User transfers input tokens to vault (user signs)
     token::transfer(
         CpiContext::new(
             ctx.accounts.token_program.to_account_info(),
             Transfer {
                 from: if swap_a_to_b {
                     ctx.accounts.user_token_a.to_account_info()
                 } else {
                     ctx.accounts.user_token_b.to_account_info()
                 },
                 to: if swap_a_to_b {
                     ctx.accounts.vault_a.to_account_info()
                 } else {
                     ctx.accounts.vault_b.to_account_info()
                 },
                 authority: ctx.accounts.user.to_account_info(),
             }
         ),
         amount,
     )?;
     ```

   - **Transfer 2 (Vault → User):**
     ```rust
     // Market PDA transfers output tokens from vault to user (PDA signs)
     token::transfer(
         CpiContext::new_with_signer(
             ctx.accounts.token_program.to_account_info(),
             Transfer {
                 from: if swap_a_to_b {
                     ctx.accounts.vault_b.to_account_info()
                 } else {
                     ctx.accounts.vault_a.to_account_info()
                 },
                 to: if swap_a_to_b {
                     ctx.accounts.user_token_b.to_account_info()
                 } else {
                     ctx.accounts.user_token_a.to_account_info()
                 },
                 authority: ctx.accounts.market.to_account_info(),
             },
             &[&[
                 b"market",
                 ctx.accounts.market.token_mint_a.as_ref(),
                 ctx.accounts.market.token_mint_b.as_ref(),
                 &[ctx.accounts.market.bump],
             ]],
         ),
         output_amount,
     )?;
     ```

5. **Emit Event:**
   ```rust
   emit!(SwapExecuted {
       market: ctx.accounts.market.key(),
       user: ctx.accounts.user.key(),
       swap_a_to_b,
       input_amount: amount,
       output_amount,
       timestamp: Clock::get()?.unix_timestamp,
   });
   ```

#### Errors

- `InvalidAmount`: amount = 0
- `PriceNotSet`: market.price = 0 (division by zero protection)
- `InsufficientLiquidity`: Vault balance < output_amount
- `ArithmeticOverflow`: Calculation overflow/underflow
- `InsufficientFunds`: User balance < amount (Token Program error)

#### Example Invocation (TypeScript)

```typescript
// Swap 100 Token A for Token B
const amount = new anchor.BN(100_000_000_000); // 100 with 9 decimals
const swapAToB = true;

const tx = await program.methods
  .swap(amount, swapAToB)
  .accounts({
    market: marketPda,
    vaultA: vaultAPda,
    vaultB: vaultBPda,
    userTokenA: userTokenAAccount,
    userTokenB: userTokenBAccount,
    user: provider.wallet.publicKey,
    tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
  })
  .rpc();

console.log("Swap executed: 100 A → B");
console.log("Transaction signature:", tx);
```

---

## Account Structures

### MarketAccount

**PDA Seeds:** `[b"market", token_mint_a, token_mint_b]`

```rust
#[account]
pub struct MarketAccount {
    /// Administrator's public key (market authority)
    pub authority: Pubkey,          // 32 bytes

    /// Token A mint address
    pub token_mint_a: Pubkey,       // 32 bytes

    /// Token B mint address
    pub token_mint_b: Pubkey,       // 32 bytes

    /// Exchange rate: 1 Token A = (price / 10^6) Token B
    pub price: u64,                 // 8 bytes

    /// Token A decimal places
    pub decimals_a: u8,             // 1 byte

    /// Token B decimal places
    pub decimals_b: u8,             // 1 byte

    /// PDA bump seed for signing CPIs
    pub bump: u8,                   // 1 byte
}

// Total size: 107 bytes + 8 (discriminator) = 115 bytes
```

**Traceability:** REQ-F-010, ENT-MKT-001

---

## Error Codes

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount: must be greater than 0")]
    InvalidAmount,              // 6000

    #[msg("Exchange rate not set: price must be greater than 0")]
    PriceNotSet,                // 6001

    #[msg("Insufficient liquidity in vault to fulfill swap")]
    InsufficientLiquidity,      // 6002

    #[msg("Arithmetic overflow or underflow in calculation")]
    ArithmeticOverflow,         // 6003

    #[msg("Unauthorized: signer is not market authority")]
    Unauthorized,               // 6004

    #[msg("Invalid PDA derivation or bump seed")]
    InvalidPDA,                 // 6005

    #[msg("Token mint mismatch")]
    InvalidMint,                // 6006
}
```

**Error Code Mapping:**

| Error Code | Hex Value | Name | Description | Triggers On |
|------------|-----------|------|-------------|-------------|
| 6000 | 0x1770 | InvalidAmount | Amount = 0 or both amounts = 0 | swap, add_liquidity |
| 6001 | 0x1771 | PriceNotSet | price = 0 in market | swap (B→A direction) |
| 6002 | 0x1772 | InsufficientLiquidity | Vault balance < output_amount | swap |
| 6003 | 0x1773 | ArithmeticOverflow | Checked arithmetic failed | swap (calculation) |
| 6004 | 0x1774 | Unauthorized | Signer != market.authority | set_price, add_liquidity |
| 6005 | 0x1775 | InvalidPDA | PDA derivation mismatch | Any instruction (rare) |
| 6006 | 0x1776 | InvalidMint | Token mint validation failed | initialize_market |

**Traceability:** REQ-NF-001, REQ-NF-002, REQ-NF-003, REQ-NF-004

---

## Events

### MarketInitialized

**Emitted by:** `initialize_market` instruction

```rust
#[event]
pub struct MarketInitialized {
    /// Market PDA address
    pub market: Pubkey,

    /// Token A mint address
    pub token_mint_a: Pubkey,

    /// Token B mint address
    pub token_mint_b: Pubkey,

    /// Administrator's public key
    pub authority: Pubkey,

    /// Unix timestamp
    pub timestamp: i64,
}
```

**Traceability:** REQ-NF-009

---

### PriceSet

**Emitted by:** `set_price` instruction

```rust
#[event]
pub struct PriceSet {
    /// Market PDA address
    pub market: Pubkey,

    /// Previous exchange rate
    pub old_price: u64,

    /// New exchange rate
    pub new_price: u64,

    /// Unix timestamp
    pub timestamp: i64,
}
```

**Traceability:** REQ-NF-010

---

### LiquidityAdded

**Emitted by:** `add_liquidity` instruction

```rust
#[event]
pub struct LiquidityAdded {
    /// Market PDA address
    pub market: Pubkey,

    /// Token A amount added (0 if none)
    pub amount_a: u64,

    /// Token B amount added (0 if none)
    pub amount_b: u64,

    /// Unix timestamp
    pub timestamp: i64,
}
```

**Traceability:** REQ-NF-011

---

### SwapExecuted

**Emitted by:** `swap` instruction

```rust
#[event]
pub struct SwapExecuted {
    /// Market PDA address
    pub market: Pubkey,

    /// User's public key
    pub user: Pubkey,

    /// Swap direction (true = A→B, false = B→A)
    pub swap_a_to_b: bool,

    /// Input token amount
    pub input_amount: u64,

    /// Output token amount (calculated)
    pub output_amount: u64,

    /// Unix timestamp
    pub timestamp: i64,
}
```

**Traceability:** REQ-NF-012

---

## Type Definitions

### SwapDirection (Logical Type)

```rust
// Not explicitly defined in code, represented by bool
// true = A→B
// false = B→A

// Could be defined as enum for clarity (future enhancement):
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum SwapDirection {
    AToB,
    BToA,
}
```

---

## Client Integration Examples

### Full Workflow Example (TypeScript)

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import { SolanaSwap } from "../target/types/solana_swap";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
  mintTo
} from "@solana/spl-token";

// Setup
const provider = AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.SolanaSwap as Program<SolanaSwap>;

// Step 1: Initialize Market
const tokenMintA = new web3.PublicKey("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
const tokenMintB = new web3.PublicKey("9yJEn5RT3YyFZqvJayV5e8xVF3W3vRwzfBZaXkjSZhKq");

const [marketPda] = web3.PublicKey.findProgramAddressSync(
  [Buffer.from("market"), tokenMintA.toBuffer(), tokenMintB.toBuffer()],
  program.programId
);

const [vaultAPda] = web3.PublicKey.findProgramAddressSync(
  [Buffer.from("vault_a"), marketPda.toBuffer()],
  program.programId
);

const [vaultBPda] = web3.PublicKey.findProgramAddressSync(
  [Buffer.from("vault_b"), marketPda.toBuffer()],
  program.programId
);

await program.methods.initializeMarket()
  .accounts({
    market: marketPda,
    vaultA: vaultAPda,
    vaultB: vaultBPda,
    tokenMintA: tokenMintA,
    tokenMintB: tokenMintB,
    authority: provider.wallet.publicKey,
    systemProgram: web3.SystemProgram.programId,
    tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
    rent: web3.SYSVAR_RENT_PUBKEY,
  })
  .rpc();

console.log("Market initialized:", marketPda.toString());

// Step 2: Set Price
const price = new anchor.BN(2_500_000); // 2.5
await program.methods.setPrice(price)
  .accounts({ market: marketPda, authority: provider.wallet.publicKey })
  .rpc();

console.log("Price set to 2.5");

// Step 3: Add Liquidity
const amountA = new anchor.BN(10_000_000_000_000); // 10,000 with decimals
const amountB = new anchor.BN(25_000_000_000);     // 25,000 with decimals

const authorityTokenA = await getAssociatedTokenAddress(tokenMintA, provider.wallet.publicKey);
const authorityTokenB = await getAssociatedTokenAddress(tokenMintB, provider.wallet.publicKey);

await program.methods.addLiquidity(amountA, amountB)
  .accounts({
    market: marketPda,
    vaultA: vaultAPda,
    vaultB: vaultBPda,
    authorityTokenA: authorityTokenA,
    authorityTokenB: authorityTokenB,
    tokenMintA: tokenMintA,
    tokenMintB: tokenMintB,
    authority: provider.wallet.publicKey,
    tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
  })
  .rpc();

console.log("Liquidity added");

// Step 4: Execute Swap (User)
const userTokenA = await getAssociatedTokenAddress(tokenMintA, provider.wallet.publicKey);
const userTokenB = await getAssociatedTokenAddress(tokenMintB, provider.wallet.publicKey);

const swapAmount = new anchor.BN(100_000_000_000); // 100 with decimals

await program.methods.swap(swapAmount, true)
  .accounts({
    market: marketPda,
    vaultA: vaultAPda,
    vaultB: vaultBPda,
    userTokenA: userTokenA,
    userTokenB: userTokenB,
    user: provider.wallet.publicKey,
    tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
  })
  .rpc();

console.log("Swap executed: 100 A → B");
```

---

## Security Considerations

### Access Control
- **initialize_market**: Permissionless (anyone can create markets)
- **set_price**: Restricted to market.authority (enforced by `has_one` constraint)
- **add_liquidity**: Restricted to market.authority
- **swap**: Permissionless (any user can swap)

### Arithmetic Safety
- All token amount calculations use checked arithmetic (REQ-NF-001)
- Division by zero prevented by validating price > 0 (REQ-NF-002)
- Overflow/underflow errors fail transactions safely

### Account Validation
- All PDAs validated via seeds and bump constraints
- Token account mints validated to match market mints
- Token account owners validated (authority or user)
- Program ownership enforced by Anchor Account types

### Atomicity
- All instructions execute atomically (Solana transaction guarantee)
- If any CPI fails, entire transaction reverts (REQ-NF-016)

---

## Testing Checklist

- [ ] Initialize market successfully with valid inputs
- [ ] Initialize market fails if market already exists
- [ ] Set price successfully by authority
- [ ] Set price fails if non-authority attempts
- [ ] Add liquidity to vault A only
- [ ] Add liquidity to vault B only
- [ ] Add liquidity to both vaults atomically
- [ ] Add liquidity fails if amount_a = amount_b = 0
- [ ] Swap A→B calculates correct output amount
- [ ] Swap B→A calculates correct output amount
- [ ] Swap fails if amount = 0
- [ ] Swap fails if price = 0 (B→A direction)
- [ ] Swap fails if vault has insufficient liquidity
- [ ] Swap fails if user has insufficient balance
- [ ] Arithmetic overflow handled gracefully
- [ ] All events emitted with correct data

---

## References

**Requirements:**
- REQ-F-001 through REQ-F-011
- REQ-NF-001 through REQ-NF-012, REQ-NF-016

**Use Cases:**
- UC-001 through UC-005

**Entities:**
- ENT-MKT-001, ENT-VLT-001, ENT-SWP-001, ENT-ADMIN-001, ENT-USER-001

**Workflows:**
- WF-001: Market Setup and Operation
- WF-002: Exchange Rate Management

---

**Changelog:**

| Version | Date       | Changes                                     |
|---------|------------|---------------------------------------------|
| 1.0     | 2026-03-22 | Initial API contract specification          |
