# Solana SWAP - Program API Reference

## Overview

This document describes the on-chain program API for the Solana SWAP DEX.

**Program ID**: `AGMg3zTXw2DNy2RzBtvxTTt3DCM2EY2LPYXssdanWjV7` (localnet)

**Framework**: Anchor 0.31.0

**Language**: Rust

---

## Instructions

### 1. `initialize_market`

Creates a new trading pair between two SPL tokens.

**Authority**: Anyone (becomes market administrator)

**Traceability**: UC-001, REQ-F-001

**Accounts**:
- `market` (mut, init): Market PDA account (seeds: `["market", token_mint_a, token_mint_b]`)
- `token_mint_a`: SPL Token Mint for Token A (immutable)
- `token_mint_b`: SPL Token Mint for Token B (immutable)
- `vault_a` (mut, init): Token account for Token A vault (PDA seeds: `["vault_a", market]`)
- `vault_b` (mut, init): Token account for Token B vault (PDA seeds: `["vault_b", market]`)
- `authority` (mut, signer): Transaction signer, becomes market administrator
- `token_program`: SPL Token program
- `system_program`: System program
- `rent`: Rent sysvar

**Parameters**: None

**Validations**:
- `token_mint_a` ≠ `token_mint_b` (prevents same-token markets, error: `SameTokenSwapDisallowed`)
- `token_mint_a.decimals` ≤ 18 (error: `InvalidDecimals`)
- `token_mint_b.decimals` ≤ 18 (error: `InvalidDecimals`)

**Effects**:
- Creates market account with PDA derivation
- Creates vault token accounts owned by market PDA
- Sets authority to transaction signer
- Initializes price to 0 (must call `set_price` before swaps)
- Emits `MarketInitialized` event

**TypeScript Example**:
```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SwapProgram } from "../target/types/swap_program";
import { PublicKey, Keypair } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const program = anchor.workspace.SwapProgram as Program<SwapProgram>;
const provider = anchor.AnchorProvider.env();

// Derive market PDA
const [marketPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("market"),
    tokenMintA.toBuffer(),
    tokenMintB.toBuffer(),
  ],
  program.programId
);

// Derive vault PDAs
const [vaultAPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault_a"), marketPda.toBuffer()],
  program.programId
);

const [vaultBPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault_b"), marketPda.toBuffer()],
  program.programId
);

// Execute instruction
const tx = await program.methods
  .initializeMarket()
  .accounts({
    market: marketPda,
    tokenMintA: tokenMintA,
    tokenMintB: tokenMintB,
    vaultA: vaultAPda,
    vaultB: vaultBPda,
    authority: provider.wallet.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: anchor.web3.SystemProgram.programId,
    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  })
  .rpc();

console.log("Market initialized:", tx);
```

---

### 2. `set_price`

Sets or updates the fixed exchange rate for a market.

**Authority**: Market administrator only

**Traceability**: UC-002, REQ-F-002

**Accounts**:
- `market` (mut): Market account (must match `authority`)
- `authority` (signer): Market administrator (must be `market.authority`)

**Parameters**:
- `new_price` (u64): Exchange rate with 6 decimal precision
  - Formula: `1 Token A = (new_price / 1_000_000) Token B`
  - Example: `new_price = 2_000_000` means 1 Token A = 2.0 Token B
  - Example: `new_price = 50_000` means 1 Token A = 0.05 Token B

**Validations**:
- `authority` must be `market.authority` (Anchor `has_one` constraint)

**Effects**:
- Updates `market.price` to `new_price`
- Emits `PriceSet` event with old and new prices

**TypeScript Example**:
```typescript
// Set price: 1 USDC = 0.05 SOL
const priceWithPrecision = 50_000; // 0.05 * 1_000_000

const tx = await program.methods
  .setPrice(new anchor.BN(priceWithPrecision))
  .accounts({
    market: marketPda,
    authority: authorityKeypair.publicKey,
  })
  .signers([authorityKeypair])
  .rpc();

console.log("Price set:", tx);
```

---

### 3. `add_liquidity`

Provides tokens to both market vaults to enable swaps.

**Authority**: Market administrator only

**Traceability**: UC-003, REQ-F-003, REQ-F-004

**Accounts**:
- `market`: Market account (must match `authority`)
- `vault_a` (mut): Token A vault (PDA)
- `vault_b` (mut): Token B vault (PDA)
- `authority_token_a` (mut): Authority's Token A account
- `authority_token_b` (mut): Authority's Token B account
- `authority` (signer): Market administrator (must be `market.authority`)
- `token_program`: SPL Token program

**Parameters**:
- `amount_a` (u64): Amount of Token A to add (base units)
- `amount_b` (u64): Amount of Token B to add (base units)

**Validations**:
- `authority` must be `market.authority` (Anchor `has_one` constraint)
- At least one amount must be > 0 (error: `InvalidAmount`)
- Authority must have sufficient token balances

**Effects**:
- Transfers `amount_a` from `authority_token_a` to `vault_a`
- Transfers `amount_b` from `authority_token_b` to `vault_b`
- Emits `LiquidityAdded` event with final vault balances

**TypeScript Example**:
```typescript
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

// Add 500 USDC and 25 SOL
const amountA = new anchor.BN(500_000_000); // 500 USDC (6 decimals)
const amountB = new anchor.BN(25_000_000_000); // 25 SOL (9 decimals)

const authorityTokenA = getAssociatedTokenAddressSync(
  tokenMintA,
  authorityKeypair.publicKey
);

const authorityTokenB = getAssociatedTokenAddressSync(
  tokenMintB,
  authorityKeypair.publicKey
);

const tx = await program.methods
  .addLiquidity(amountA, amountB)
  .accounts({
    market: marketPda,
    vaultA: vaultAPda,
    vaultB: vaultBPda,
    authorityTokenA: authorityTokenA,
    authorityTokenB: authorityTokenB,
    authority: authorityKeypair.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([authorityKeypair])
  .rpc();

console.log("Liquidity added:", tx);
```

---

### 4. `swap`

Executes bidirectional token swap (A→B or B→A).

**Authority**: Permissionless (any user with tokens)

**Traceability**: UC-004, UC-005, REQ-F-006, REQ-F-007, REQ-F-009

**Accounts**:
- `market`: Market account
- `vault_a` (mut): Token A vault (PDA)
- `vault_b` (mut): Token B vault (PDA)
- `user_token_a` (mut): User's Token A account
- `user_token_b` (mut): User's Token B account
- `user` (signer): Transaction signer (user)
- `token_program`: SPL Token program

**Parameters**:
- `amount` (u64): Input amount in base units
- `swap_a_to_b` (bool): Swap direction
  - `true`: A→B (user provides Token A, receives Token B)
  - `false`: B→A (user provides Token B, receives Token A)

**Validations**:
- `amount` > 0 (error: `InvalidAmount`)
- `market.price` > 0 (error: `PriceNotSet`)
- Output vault has sufficient liquidity (error: `InsufficientLiquidity`)

**Calculation**:
- **A→B**: `output_b = (amount_a * price * 10^decimals_b) / (10^6 * 10^decimals_a)`
- **B→A**: `output_a = (amount_b * 10^6 * 10^decimals_a) / (price * 10^decimals_b)`

**Effects**:
- Transfers input tokens from user to vault
- Transfers output tokens from vault to user (PDA signs)
- Both transfers are atomic (all succeed or all fail)
- Emits `SwapExecuted` event with amounts and direction

**TypeScript Example (A→B)**:
```typescript
// Swap 10 USDC for SOL (A→B)
const inputAmount = new anchor.BN(10_000_000); // 10 USDC (6 decimals)
const swapAtoB = true;

const userTokenA = getAssociatedTokenAddressSync(
  tokenMintA,
  userKeypair.publicKey
);

const userTokenB = getAssociatedTokenAddressSync(
  tokenMintB,
  userKeypair.publicKey
);

const tx = await program.methods
  .swap(inputAmount, swapAtoB)
  .accounts({
    market: marketPda,
    vaultA: vaultAPda,
    vaultB: vaultBPda,
    userTokenA: userTokenA,
    userTokenB: userTokenB,
    user: userKeypair.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([userKeypair])
  .rpc();

console.log("Swap executed:", tx);
```

**TypeScript Example (B→A)**:
```typescript
// Swap 1 SOL for USDC (B→A)
const inputAmount = new anchor.BN(1_000_000_000); // 1 SOL (9 decimals)
const swapAtoB = false;

const tx = await program.methods
  .swap(inputAmount, swapAtoB)
  .accounts({
    market: marketPda,
    vaultA: vaultAPda,
    vaultB: vaultBPda,
    userTokenA: userTokenA,
    userTokenB: userTokenB,
    user: userKeypair.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([userKeypair])
  .rpc();

console.log("Swap executed:", tx);
```

---

## Account Structures

### `MarketAccount`

Central aggregate root representing a trading pair between two SPL tokens.

**Size**: 115 bytes (8 discriminator + 107 data)

**PDA Seeds**: `["market", token_mint_a, token_mint_b]`

**Fields**:
| Field | Type | Size | Description | Traceability |
|-------|------|------|-------------|--------------|
| `authority` | `Pubkey` | 32 bytes | Administrator's wallet (immutable) | REQ-F-002, REQ-F-008 |
| `token_mint_a` | `Pubkey` | 32 bytes | SPL Token Mint for Token A (immutable) | REQ-F-001, BR-MKT-004 |
| `token_mint_b` | `Pubkey` | 32 bytes | SPL Token Mint for Token B (immutable) | REQ-F-001, BR-MKT-004 |
| `price` | `u64` | 8 bytes | Exchange rate with 6 decimal precision | REQ-F-002, INV-MKT-004 |
| `decimals_a` | `u8` | 1 byte | Decimal places for Token A (0-18) | REQ-F-010, INV-MKT-005 |
| `decimals_b` | `u8` | 1 byte | Decimal places for Token B (0-18) | REQ-F-010, INV-MKT-005 |
| `bump` | `u8` | 1 byte | PDA bump seed for CPI signer derivation | REQ-F-011, ADR-004 |

**Constants**:
- `PRICE_PRECISION`: 1,000,000 (6 decimal places)

**Price Encoding**:
- `price = 0`: Not set (swaps will fail with `PriceNotSet`)
- `price = 1_000_000`: 1 Token A = 1.0 Token B
- `price = 2_000_000`: 1 Token A = 2.0 Token B
- `price = 50_000`: 1 Token A = 0.05 Token B
- `price = 333`: 1 Token A = 0.000333 Token B

**TypeScript Access**:
```typescript
// Fetch market account
const marketAccount = await program.account.marketAccount.fetch(marketPda);

console.log("Authority:", marketAccount.authority.toBase58());
console.log("Token A:", marketAccount.tokenMintA.toBase58());
console.log("Token B:", marketAccount.tokenMintB.toBase58());
console.log("Price (raw):", marketAccount.price.toString());
console.log("Price (decimal):", marketAccount.price.toNumber() / 1_000_000);
console.log("Decimals A:", marketAccount.decimalsA);
console.log("Decimals B:", marketAccount.decimalsB);
```

---

## Error Codes

All errors are in the `SwapError` enum with custom codes starting at 6000.

| Code | Name | Message | Traceability |
|------|------|---------|--------------|
| 6000 | `Overflow` | "Arithmetic overflow detected" | REQ-NF-001, ADR-005 |
| 6001 | `DivisionByZero` | "Division by zero (price may not be set)" | REQ-NF-002, ADR-005 |
| 6002 | `InvalidAmount` | "Invalid amount (must be greater than 0)" | REQ-NF-004 |
| 6003 | `PriceNotSet` | "Price not set (administrator must call set_price first)" | REQ-NF-002 |
| 6004 | `InsufficientLiquidity` | "Insufficient liquidity in vault to fulfill swap" | REQ-NF-003 |
| 6005 | `SameTokenSwapDisallowed` | "Same token swaps are not allowed (Token A and Token B must be distinct mints)" | BR-MKT-004, INV-MKT-006 |
| 6006 | `Unauthorized` | "Only the market authority can perform this operation" | REQ-F-008, REQ-NF-006 |
| 6007 | `InvalidDecimals` | "Token decimals must be between 0 and 18" | INV-MKT-005 |

**TypeScript Error Handling**:
```typescript
try {
  const tx = await program.methods.swap(amount, true).accounts({...}).rpc();
} catch (err) {
  if (err.error.errorCode.code === "InsufficientLiquidity") {
    console.error("Not enough liquidity in pool");
  } else if (err.error.errorCode.code === "PriceNotSet") {
    console.error("Exchange rate not configured");
  } else if (err.error.errorCode.code === "InvalidAmount") {
    console.error("Amount must be greater than 0");
  }
}
```

---

## Events

All events are emitted on-chain and indexed by explorers.

### `MarketInitialized`

Emitted when a new market is created.

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `market` | `Pubkey` | Market PDA address |
| `token_mint_a` | `Pubkey` | Token A mint address |
| `token_mint_b` | `Pubkey` | Token B mint address |
| `authority` | `Pubkey` | Market administrator |
| `timestamp` | `i64` | Unix timestamp |

**Traceability**: REQ-NF-009

---

### `PriceSet`

Emitted when exchange rate is updated.

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `market` | `Pubkey` | Market PDA address |
| `authority` | `Pubkey` | Administrator who set price |
| `old_price` | `u64` | Previous price value |
| `new_price` | `u64` | New price value |
| `timestamp` | `i64` | Unix timestamp |

**Traceability**: REQ-NF-010

---

### `LiquidityAdded`

Emitted when liquidity is added to vaults.

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `market` | `Pubkey` | Market PDA address |
| `authority` | `Pubkey` | Administrator who added liquidity |
| `amount_a` | `u64` | Amount of Token A added |
| `amount_b` | `u64` | Amount of Token B added |
| `vault_a_balance` | `u64` | Vault A balance after addition |
| `vault_b_balance` | `u64` | Vault B balance after addition |
| `timestamp` | `i64` | Unix timestamp |

**Traceability**: REQ-NF-011

---

### `SwapExecuted`

Emitted when a swap is executed.

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `market` | `Pubkey` | Market PDA address |
| `user` | `Pubkey` | User who executed swap |
| `swap_a_to_b` | `bool` | Swap direction (true = A→B, false = B→A) |
| `input_amount` | `u64` | Input amount provided by user |
| `output_amount` | `u64` | Output amount received by user |
| `timestamp` | `i64` | Unix timestamp |

**Traceability**: REQ-NF-012

**TypeScript Event Listening**:
```typescript
// Listen for SwapExecuted events
const listener = program.addEventListener("SwapExecuted", (event, slot) => {
  console.log("Swap event:", {
    market: event.market.toBase58(),
    user: event.user.toBase58(),
    direction: event.swapAToB ? "A→B" : "B→A",
    inputAmount: event.inputAmount.toString(),
    outputAmount: event.outputAmount.toString(),
    timestamp: new Date(event.timestamp.toNumber() * 1000).toISOString(),
    slot: slot,
  });
});

// Remove listener when done
await program.removeEventListener(listener);
```

---

## Compute Unit (CU) Consumption

Approximate CU usage per instruction (measured on localnet):

| Instruction | CU Usage | Notes |
|-------------|----------|-------|
| `initialize_market` | ~8,000 | Includes PDA creation + token accounts |
| `set_price` | ~2,000 | Lightweight update |
| `add_liquidity` | ~6,000 | Two token transfers |
| `swap` (A→B) | ~11,500 | Calculation + two atomic transfers + event |
| `swap` (B→A) | ~11,500 | Calculation + two atomic transfers + event |

**Performance Target**: < 12,000 CU per swap ✅ (REQ-NF-010)

---

## Security Considerations

1. **PDA-Based Vaults**: Vaults are controlled by program PDAs, not external signers. No private keys can drain vaults.

2. **Authority Constraints**: `set_price` and `add_liquidity` enforce `market.authority` check via Anchor's `has_one` constraint.

3. **Checked Arithmetic**: All calculations use `.checked_mul()`, `.checked_div()` to prevent overflow attacks.

4. **Same-Token Rejection**: Markets where `token_mint_a == token_mint_b` are rejected at initialization (CRITICAL-001).

5. **Liquidity Validation**: Swaps validate sufficient vault balances before transfers.

6. **Price Validation**: Swaps require `price > 0` (prevents division by zero).

7. **Atomic Transfers**: Input and output transfers succeed together or fail together.

---

## Additional Resources

- **Anchor Docs**: https://www.anchor-lang.com/
- **Solana Cookbook**: https://solanacookbook.com/
- **SPL Token**: https://spl.solana.com/token
- **Technical Specifications**: `../spec/`
- **ADRs**: `../spec/adr/`

---

## Notes

This is an **educational project** demonstrating fixed-price DEX mechanics. It is **NOT audited** for production use.

For production deployments:
- Conduct professional security audit
- Implement fee mechanism
- Add liquidity withdrawal
- Add slippage protection
- Implement AMM pricing model
- Add admin key rotation
- Add emergency pause mechanism
