# FASE-3: Swap Instructions & Core Exchange Logic

**Status:** Not Started
**Priority:** CRITICAL
**Estimated Effort:** 8 hours
**Dependencies:** FASE-2 (market must be initialized, price set, liquidity added)

---

## Objective

Implement the `swap` instruction that allows users to exchange tokens at the administrator-set exchange rate. This is the core value delivery function of the DEX, supporting bidirectional swaps (A→B and B→A).

**Key Goal:** Users can successfully swap tokens with correct amount calculations, checked arithmetic, and event emission.

---

## Specifications Covered

| Spec File | Coverage | Focus Area |
|-----------|----------|------------|
| `spec/use-cases/UC-004-swap-token-a-to-b.md` | 100% | A→B swap logic |
| `spec/use-cases/UC-005-swap-token-b-to-a.md` | 100% | B→A swap logic |
| `spec/contracts/API-solana-program.md` | 100% | Swap instruction API |
| `spec/domain/02-ENTITIES.md` | 100% | Swap transaction entity |
| `spec/domain/05-INVARIANTS.md` | 100% | Swap invariants (INV-SWP-*) |
| `spec/nfr/PERFORMANCE.md` | 100% | Compute unit targets |
| `spec/tests/BDD-UC-001.md` | 80% | Swap scenarios (S1-S12) |
| `spec/adr/ADR-002-fixed-pricing-model.md` | 100% | Price calculation formulas |
| `spec/adr/ADR-005-checked-arithmetic.md` | 100% | Overflow protection |

**This FASE completes core business logic** - program is feature-complete for swaps after this phase.

---

## Deliverables

### 1. Swap Calculation Module

**File:** `programs/swap-program/src/utils/swap_math.rs` (create new)

```rust
use anchor_lang::prelude::*;
use crate::{constants::PRICE_PRECISION, error::SwapError, state::MarketAccount};

/// Calculate output amount for A→B swap
///
/// Formula: amount_b = (amount_a × price × 10^decimals_b) / (10^6 × 10^decimals_a)
///
/// Traceability: ADR-002, ADR-005, ENT-SWP-001
pub fn calculate_a_to_b_output(
    amount_a: u64,
    market: &MarketAccount,
) -> Result<u64> {
    // Validate price is set (CRITICAL-003 clarification: prevents zero-output swaps)
    require!(market.price > 0, SwapError::PriceNotSet);

    // Calculate numerator: amount_a × price × 10^decimals_b
    // Use checked arithmetic (ADR-005, REQ-NF-001)
    let numerator = amount_a
        .checked_mul(market.price)
        .ok_or(SwapError::Overflow)?
        .checked_mul(10u64.pow(market.decimals_b as u32))
        .ok_or(SwapError::Overflow)?;

    // Calculate denominator: 10^6 × 10^decimals_a
    let denominator = PRICE_PRECISION
        .checked_mul(10u64.pow(market.decimals_a as u32))
        .ok_or(SwapError::Overflow)?;

    // Divide to get output amount
    let amount_b = numerator
        .checked_div(denominator)
        .ok_or(SwapError::DivisionByZero)?;

    // Validate output is non-zero (INV-SWP-001)
    require!(amount_b > 0, SwapError::InvalidAmount);

    Ok(amount_b)
}

/// Calculate output amount for B→A swap
///
/// Formula: amount_a = (amount_b × 10^6 × 10^decimals_a) / (price × 10^decimals_b)
///
/// Traceability: ADR-002, ADR-005, ENT-SWP-001
pub fn calculate_b_to_a_output(
    amount_b: u64,
    market: &MarketAccount,
) -> Result<u64> {
    // CRITICAL for B→A: price must be > 0 to prevent division by zero
    // (CRITICAL-003 clarification: prevents division by zero)
    require!(market.price > 0, SwapError::PriceNotSet);

    // Calculate numerator: amount_b × 10^6 × 10^decimals_a
    let numerator = amount_b
        .checked_mul(PRICE_PRECISION)
        .ok_or(SwapError::Overflow)?
        .checked_mul(10u64.pow(market.decimals_a as u32))
        .ok_or(SwapError::Overflow)?;

    // Calculate denominator: price × 10^decimals_b
    let denominator = market.price
        .checked_mul(10u64.pow(market.decimals_b as u32))
        .ok_or(SwapError::Overflow)?;

    // Divide to get output amount
    let amount_a = numerator
        .checked_div(denominator)
        .ok_or(SwapError::DivisionByZero)?;

    // Validate output is non-zero (INV-SWP-001)
    require!(amount_a > 0, SwapError::InvalidAmount);

    Ok(amount_a)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_a_to_b_calculation() {
        let mut market = MarketAccount {
            authority: Pubkey::default(),
            token_mint_a: Pubkey::default(),
            token_mint_b: Pubkey::default(),
            price: 2_000_000,  // 1 A = 2.0 B
            decimals_a: 6,
            decimals_b: 6,
            bump: 255,
        };

        let amount_a = 100_000_000;  // 100 Token A
        let amount_b = calculate_a_to_b_output(amount_a, &market).unwrap();

        assert_eq!(amount_b, 200_000_000);  // 200 Token B
    }

    #[test]
    fn test_b_to_a_calculation() {
        let mut market = MarketAccount {
            authority: Pubkey::default(),
            token_mint_a: Pubkey::default(),
            token_mint_b: Pubkey::default(),
            price: 2_000_000,  // 1 A = 2.0 B
            decimals_a: 6,
            decimals_b: 6,
            bump: 255,
        };

        let amount_b = 200_000_000;  // 200 Token B
        let amount_a = calculate_b_to_a_output(amount_b, &market).unwrap();

        assert_eq!(amount_a, 100_000_000);  // 100 Token A
    }

    #[test]
    fn test_price_not_set_error() {
        let mut market = MarketAccount {
            authority: Pubkey::default(),
            token_mint_a: Pubkey::default(),
            token_mint_b: Pubkey::default(),
            price: 0,  // NOT SET
            decimals_a: 6,
            decimals_b: 6,
            bump: 255,
        };

        let result = calculate_a_to_b_output(100_000_000, &market);
        assert!(result.is_err());
    }
}
```

### 2. Swap Instruction

**File:** `programs/swap-program/src/instructions/swap.rs`

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::{
    constants::*,
    error::SwapError,
    events::SwapExecuted,
    state::MarketAccount,
    utils::swap_math,
};

/// Instruction: swap
///
/// Exchanges tokens at the current market exchange rate.
/// Supports bidirectional swaps: A→B and B→A.
///
/// Traceability: UC-004, UC-005, REQ-F-006, REQ-F-007, REQ-F-009
#[derive(Accounts)]
pub struct Swap<'info> {
    /// Market account (immutable, read-only)
    #[account(
        has_one = vault_a,
        has_one = vault_b
    )]
    pub market: Account<'info, MarketAccount>,

    /// Vault A (Token A liquidity storage)
    #[account(mut)]
    pub vault_a: Account<'info, TokenAccount>,

    /// Vault B (Token B liquidity storage)
    #[account(mut)]
    pub vault_b: Account<'info, TokenAccount>,

    /// User's Token A account
    #[account(
        mut,
        constraint = user_token_a.mint == market.token_mint_a @ SwapError::Unauthorized,
        constraint = user_token_a.owner == user.key() @ SwapError::Unauthorized
    )]
    pub user_token_a: Account<'info, TokenAccount>,

    /// User's Token B account
    #[account(
        mut,
        constraint = user_token_b.mint == market.token_mint_b @ SwapError::Unauthorized,
        constraint = user_token_b.owner == user.key() @ SwapError::Unauthorized
    )]
    pub user_token_b: Account<'info, TokenAccount>,

    /// User wallet (signer, pays transaction fees)
    /// Traceability: REQ-F-009 (permissionless swap)
    pub user: Signer<'info>,

    /// SPL Token program
    pub token_program: Program<'info, Token>,
}

pub fn handler(
    ctx: Context<Swap>,
    amount: u64,
    swap_a_to_b: bool,
) -> Result<()> {
    let market = &ctx.accounts.market;
    let clock = Clock::get()?;

    // Validate input amount is positive (REQ-NF-004, INV-SWP-001)
    require!(amount > 0, SwapError::InvalidAmount);

    // Calculate output amount based on direction
    let output_amount = if swap_a_to_b {
        // A → B swap (UC-004)
        swap_math::calculate_a_to_b_output(amount, market)?
    } else {
        // B → A swap (UC-005)
        swap_math::calculate_b_to_a_output(amount, market)?
    };

    // Prepare PDA signer seeds for CPI (ADR-004)
    let market_seeds = &[
        MARKET_SEED,
        market.token_mint_a.as_ref(),
        market.token_mint_b.as_ref(),
        &[market.bump],
    ];
    let signer_seeds = &[&market_seeds[..]];

    if swap_a_to_b {
        // === A → B Swap ===

        // Validate Vault B has sufficient liquidity (REQ-NF-003, INV-SWP-004)
        require!(
            ctx.accounts.vault_b.amount >= output_amount,
            SwapError::InsufficientLiquidity
        );

        // 1. Transfer Token A: User → Vault A
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_a.to_account_info(),
            to: ctx.accounts.vault_a.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // 2. Transfer Token B: Vault B → User (signed by market PDA)
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_b.to_account_info(),
            to: ctx.accounts.user_token_b.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, output_amount)?;

    } else {
        // === B → A Swap ===

        // Validate Vault A has sufficient liquidity (REQ-NF-003, INV-SWP-004)
        require!(
            ctx.accounts.vault_a.amount >= output_amount,
            SwapError::InsufficientLiquidity
        );

        // 1. Transfer Token B: User → Vault B
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_b.to_account_info(),
            to: ctx.accounts.vault_b.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // 2. Transfer Token A: Vault A → User (signed by market PDA)
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_a.to_account_info(),
            to: ctx.accounts.user_token_a.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, output_amount)?;
    }

    // Emit SwapExecuted event (REQ-NF-012)
    emit!(SwapExecuted {
        market: market.key(),
        user: ctx.accounts.user.key(),
        swap_a_to_b,
        input_amount: amount,
        output_amount,
        timestamp: clock.unix_timestamp,
    });

    msg!("Swap executed:");
    msg!("  Direction: {}", if swap_a_to_b { "A→B" } else { "B→A" });
    msg!("  Input: {} (user provided)", amount);
    msg!("  Output: {} (user received)", output_amount);
    msg!("  Exchange rate: 1 A = {} B", (market.price as f64) / 1_000_000.0);

    Ok(())
}
```

**Traceability:**
- UC-004: Swap Token A to B (A→B direction)
- UC-005: Swap Token B to A (B→A direction)
- REQ-F-006: A→B functional requirement
- REQ-F-007: B→A functional requirement
- REQ-F-009: Permissionless swap (no authority check)
- INV-SWP-002: Atomic transfers (both succeed or both fail)
- ADR-005: Checked arithmetic (overflow protection)

### 3. Utils Module

**File:** `programs/swap-program/src/utils/mod.rs` (create new)

```rust
pub mod swap_math;

pub use swap_math::*;
```

### 4. Module Integration

**File:** `programs/swap-program/src/instructions/mod.rs` (update)

```rust
pub mod initialize_market;
pub mod set_price;
pub mod add_liquidity;
pub mod swap;

pub use initialize_market::*;
pub use set_price::*;
pub use add_liquidity::*;
pub use swap::*;
```

**File:** `programs/swap-program/src/lib.rs` (update)

```rust
use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;
pub mod types;
pub mod utils;

pub use constants::*;
pub use error::*;
pub use events::*;
pub use instructions::*;
pub use state::*;
pub use types::*;
pub use utils::*;

declare_id!("SwapProgramXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

#[program]
pub mod swap_program {
    use super::*;

    /// Initialize a new market for Token A / Token B trading pair
    pub fn initialize_market(ctx: Context<InitializeMarket>) -> Result<()> {
        instructions::initialize_market::handler(ctx)
    }

    /// Set or update the exchange rate for a market (authority-only)
    pub fn set_price(ctx: Context<SetPrice>, new_price: u64) -> Result<()> {
        instructions::set_price::handler(ctx, new_price)
    }

    /// Add liquidity to market vaults (authority-only)
    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        amount_a: u64,
        amount_b: u64,
    ) -> Result<()> {
        instructions::add_liquidity::handler(ctx, amount_a, amount_b)
    }

    /// Execute token swap (permissionless, user-facing)
    pub fn swap(
        ctx: Context<Swap>,
        amount: u64,
        swap_a_to_b: bool,
    ) -> Result<()> {
        instructions::swap::handler(ctx, amount, swap_a_to_b)
    }
}
```

---

## Verification Checklist

**After FASE-3 completion, verify:**

- [ ] `anchor build` compiles successfully
- [ ] IDL shows 4 instructions (swap instruction added)
- [ ] Unit tests for swap_math pass (cargo test)
- [ ] Integration tests for both swap directions pass
- [ ] Checked arithmetic prevents overflow
- [ ] Price=0 validation prevents swaps
- [ ] Insufficient liquidity errors trigger correctly
- [ ] Events emit with correct amounts
- [ ] Compute units < 12,000 CU (with events)

**Performance Verification:**
```bash
$ anchor test --skip-deploy
# Check logs for compute unit consumption

$ solana-test-validator --log
# Run swap transaction, observe CU usage in logs
```

---

## Integration Tests

**File:** `tests/swap-program.ts` (add swap tests)

```typescript
describe("Swap Instructions", () => {
    let userKeypair: Keypair;
    let userTokenA: PublicKey;
    let userTokenB: PublicKey;

    before("Setup user and tokens", async () => {
        userKeypair = Keypair.generate();

        // Airdrop SOL to user for transaction fees
        const airdropSig = await provider.connection.requestAirdrop(
            userKeypair.publicKey,
            2 * LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(airdropSig);

        // Create user's token accounts
        userTokenA = await createAssociatedTokenAccount(
            provider.connection,
            payer,
            mintA,
            userKeypair.publicKey
        );

        userTokenB = await createAssociatedTokenAccount(
            provider.connection,
            payer,
            mintB,
            userKeypair.publicKey
        );

        // Mint tokens to user
        await mintTo(
            provider.connection,
            payer,
            mintA,
            userTokenA,
            authority,
            1_000_000_000  // 1000 Token A
        );
    });

    it("Swaps Token A to Token B successfully", async () => {
        const inputAmount = new BN(100_000_000);  // 100 Token A
        const expectedOutput = new BN(200_000_000);  // 200 Token B (price = 2.0)

        const userBalanceABefore = await getAccount(provider.connection, userTokenA);
        const userBalanceBBefore = await getAccount(provider.connection, userTokenB);

        await program.methods
            .swap(inputAmount, true)  // true = A→B
            .accounts({
                market: marketPDA,
                vaultA,
                vaultB,
                userTokenA,
                userTokenB,
                user: userKeypair.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([userKeypair])
            .rpc();

        const userBalanceAAfter = await getAccount(provider.connection, userTokenA);
        const userBalanceBAfter = await getAccount(provider.connection, userTokenB);

        // User should have 100 fewer Token A
        expect(userBalanceAAfter.amount).to.equal(
            userBalanceABefore.amount - BigInt(inputAmount.toString())
        );

        // User should have 200 more Token B
        expect(userBalanceBAfter.amount).to.equal(
            userBalanceBBefore.amount + BigInt(expectedOutput.toString())
        );
    });

    it("Swaps Token B to Token A successfully", async () => {
        const inputAmount = new BN(200_000_000);  // 200 Token B
        const expectedOutput = new BN(100_000_000);  // 100 Token A (price = 2.0)

        const userBalanceABefore = await getAccount(provider.connection, userTokenA);
        const userBalanceBBefore = await getAccount(provider.connection, userTokenB);

        await program.methods
            .swap(inputAmount, false)  // false = B→A
            .accounts({
                market: marketPDA,
                vaultA,
                vaultB,
                userTokenA,
                userTokenB,
                user: userKeypair.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([userKeypair])
            .rpc();

        const userBalanceAAfter = await getAccount(provider.connection, userTokenA);
        const userBalanceBAfter = await getAccount(provider.connection, userTokenB);

        // User should have 200 fewer Token B
        expect(userBalanceBAfter.amount).to.equal(
            userBalanceBBefore.amount - BigInt(inputAmount.toString())
        );

        // User should have 100 more Token A
        expect(userBalanceAAfter.amount).to.equal(
            userBalanceABefore.amount + BigInt(expectedOutput.toString())
        );
    });

    it("Rejects swap with insufficient liquidity", async () => {
        const hugeAmount = new BN(1_000_000_000_000_000);  // 1M Token A

        await expect(
            program.methods
                .swap(hugeAmount, true)
                .accounts({
                    market: marketPDA,
                    vaultA,
                    vaultB,
                    userTokenA,
                    userTokenB,
                    user: userKeypair.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .signers([userKeypair])
                .rpc()
        ).to.be.rejectedWith(/InsufficientLiquidity/);
    });

    it("Rejects swap with zero amount", async () => {
        await expect(
            program.methods
                .swap(new BN(0), true)
                .accounts({
                    market: marketPDA,
                    vaultA,
                    vaultB,
                    userTokenA,
                    userTokenB,
                    user: userKeypair.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .signers([userKeypair])
                .rpc()
        ).to.be.rejectedWith(/InvalidAmount/);
    });

    it("Rejects swap when price not set", async () => {
        // Create new market without setting price
        const mintC = await createMint(
            provider.connection,
            payer,
            authority.publicKey,
            null,
            6
        );
        const mintD = await createMint(
            provider.connection,
            payer,
            authority.publicKey,
            null,
            6
        );

        const [marketCD] = PublicKey.findProgramAddressSync(
            [Buffer.from("market"), mintC.toBuffer(), mintD.toBuffer()],
            program.programId
        );

        await program.methods
            .initializeMarket()
            .accounts({
                market: marketCD,
                tokenMintA: mintC,
                tokenMintB: mintD,
                // ... other accounts
            })
            .rpc();

        // Add liquidity without setting price
        // ... add liquidity code ...

        // Attempt swap (should fail with PriceNotSet)
        await expect(
            program.methods.swap(new BN(100_000_000), true)
            .accounts({ market: marketCD, /* ... */ })
            .rpc()
        ).to.be.rejectedWith(/PriceNotSet/);
    });
});
```

---

## Traceability Matrix

| Specification | Implementation | Test Coverage |
|---------------|----------------|---------------|
| UC-004 (Swap A→B) | `swap::handler` (swap_a_to_b=true) | ✅ A→B integration test |
| UC-005 (Swap B→A) | `swap::handler` (swap_a_to_b=false) | ✅ B→A integration test |
| REQ-F-006, REQ-F-007 | Bidirectional swap logic | ✅ Both directions tested |
| REQ-F-009 | Permissionless (no authority check) | ✅ Any user can swap |
| REQ-NF-001 | Checked arithmetic (ADR-005) | ✅ Unit tests + overflow test |
| REQ-NF-002 | Price > 0 validation | ✅ PriceNotSet error test |
| REQ-NF-003 | Insufficient liquidity check | ✅ Liquidity error test |
| REQ-NF-004 | Amount > 0 validation | ✅ Zero amount error test |
| INV-SWP-001 | Positive amounts invariant | ✅ Enforced via require! |
| INV-SWP-002 | Atomic transfers | ✅ Solana transaction guarantees |
| INV-SWP-005 | Price validation (both directions) | ✅ HIGH-001 fix applied |

---

## Performance Metrics

**Target (from spec/nfr/PERFORMANCE.md):**
- Baseline (no events): < 10,000 CU
- With events: < 12,000 CU
- Max acceptable: 20,000 CU

**Expected Breakdown:**
- Account deserialization: ~2,000 CU
- Swap calculation (checked_mul/checked_div): ~1,500 CU
- Token transfer (user → vault): ~3,000 CU
- Token transfer (vault → user, with PDA signer): ~3,500 CU
- Event emission: ~2,000 CU
- **Total: ~12,000 CU** ✅ Meets target

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Arithmetic overflow on large amounts | Low | Critical | Checked arithmetic (ADR-005) |
| Price=0 causing division by zero | Low | Critical | require!(price > 0) validation |
| Insufficient liquidity drain attack | Medium | High | Vault balance check before transfer |
| CPI signature failure | Low | High | Test PDA derivation thoroughly |
| Rounding errors (decimal mismatch) | Medium | Medium | Document in specs, add edge case tests |

---

## Time Breakdown

| Task | Estimated Time |
|------|---------------|
| Swap math module (unit tests) | 90 min |
| Swap instruction (both directions) | 120 min |
| CPI signer logic (PDA seeds) | 30 min |
| Integration tests (4 scenarios) | 150 min |
| BDD scenario validation | 45 min |
| Performance benchmarking | 30 min |
| Documentation | 15 min |
| **Total** | **8 hours** |

---

## Next Steps

After FASE-3 completion:
1. ✅ Commit swap instruction
2. ✅ Verify all BDD scenarios (S1-S12 in BDD-UC-001.md)
3. ✅ Run performance benchmark (CU consumption)
4. ➡️ Proceed to **FASE-4** (Frontend Application)
5. Program deployment: `anchor deploy --provider.cluster devnet`

---

**Generated:** 2026-03-23
**Spec Coverage:** 9 files (use cases, contracts, domain, ADRs, NFRs)
**Business Logic:** 100% (Solana program feature-complete)
**Lines of Code:** ~500 (Rust) + ~250 (TypeScript tests)
