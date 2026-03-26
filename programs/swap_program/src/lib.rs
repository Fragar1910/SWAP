use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

pub mod constants;
pub mod error;
pub mod events;
pub mod state;
pub mod types;

pub use constants::*;
pub use error::*;
pub use events::*;
pub use state::*;
pub use types::*;

declare_id!("AGMg3zTXw2DNy2RzBtvxTTt3DCM2EY2LPYXssdanWjV7");

#[program]
pub mod swap_program {
    use super::*;

    /// Initialize a new market for trading between two SPL tokens
    /// Traceability: UC-001, REQ-F-001
    pub fn initialize_market(ctx: Context<InitializeMarket>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let token_mint_a = &ctx.accounts.token_mint_a;
        let token_mint_b = &ctx.accounts.token_mint_b;
        let clock = Clock::get()?;

        // CRITICAL-001 Validation: Enforce token mint distinctness (BR-MKT-004, INV-MKT-006)
        require!(
            token_mint_a.key() != token_mint_b.key(),
            SwapError::SameTokenSwapDisallowed
        );

        // Validate token decimals are within allowed range (INV-MKT-005)
        require!(
            token_mint_a.decimals <= MAX_DECIMALS,
            SwapError::InvalidDecimals
        );
        require!(
            token_mint_b.decimals <= MAX_DECIMALS,
            SwapError::InvalidDecimals
        );

        // Initialize market account fields
        market.authority = ctx.accounts.authority.key();
        market.token_mint_a = token_mint_a.key();
        market.token_mint_b = token_mint_b.key();
        market.price = 0;
        market.decimals_a = token_mint_a.decimals;
        market.decimals_b = token_mint_b.decimals;
        market.bump = ctx.bumps.market;

        emit!(MarketInitialized {
            market: market.key(),
            token_mint_a: token_mint_a.key(),
            token_mint_b: token_mint_b.key(),
            authority: ctx.accounts.authority.key(),
            timestamp: clock.unix_timestamp,
        });

        msg!("Market initialized: {} / {}", token_mint_a.key(), token_mint_b.key());
        Ok(())
    }

    /// Set or update the exchange rate for a market
    /// Traceability: UC-002, REQ-F-002
    pub fn set_price(ctx: Context<SetPrice>, new_price: u64) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;
        let old_price = market.price;

        market.price = new_price;

        emit!(PriceSet {
            market: market.key(),
            authority: ctx.accounts.authority.key(),
            old_price,
            new_price,
            timestamp: clock.unix_timestamp,
        });

        msg!("Price updated: {} → {}", old_price, new_price);
        Ok(())
    }

    /// Add liquidity to market vaults
    /// Traceability: UC-003, REQ-F-003, REQ-F-004
    pub fn add_liquidity(ctx: Context<AddLiquidity>, amount_a: u64, amount_b: u64) -> Result<()> {
        let clock = Clock::get()?;

        require!(
            amount_a > 0 || amount_b > 0,
            SwapError::InvalidAmount
        );

        if amount_a > 0 {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.authority_token_a.to_account_info(),
                        to: ctx.accounts.vault_a.to_account_info(),
                        authority: ctx.accounts.authority.to_account_info(),
                    },
                ),
                amount_a,
            )?;
        }

        if amount_b > 0 {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.authority_token_b.to_account_info(),
                        to: ctx.accounts.vault_b.to_account_info(),
                        authority: ctx.accounts.authority.to_account_info(),
                    },
                ),
                amount_b,
            )?;
        }

        ctx.accounts.vault_a.reload()?;
        ctx.accounts.vault_b.reload()?;

        emit!(LiquidityAdded {
            market: ctx.accounts.market.key(),
            authority: ctx.accounts.authority.key(),
            amount_a,
            amount_b,
            vault_a_balance: ctx.accounts.vault_a.amount,
            vault_b_balance: ctx.accounts.vault_b.amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
}

// Instruction contexts

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(
        init,
        seeds = [MARKET_SEED, token_mint_a.key().as_ref(), token_mint_b.key().as_ref()],
        bump,
        payer = authority,
        space = MarketAccount::LEN
    )]
    pub market: Account<'info, MarketAccount>,
    pub token_mint_a: Account<'info, Mint>,
    pub token_mint_b: Account<'info, Mint>,
    #[account(
        init,
        seeds = [VAULT_A_SEED, market.key().as_ref()],
        bump,
        payer = authority,
        token::mint = token_mint_a,
        token::authority = market,
    )]
    pub vault_a: Account<'info, TokenAccount>,
    #[account(
        init,
        seeds = [VAULT_B_SEED, market.key().as_ref()],
        bump,
        payer = authority,
        token::mint = token_mint_b,
        token::authority = market,
    )]
    pub vault_b: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SetPrice<'info> {
    #[account(
        mut,
        has_one = authority @ SwapError::Unauthorized
    )]
    pub market: Account<'info, MarketAccount>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(
        mut,
        has_one = authority @ SwapError::Unauthorized,
    )]
    pub market: Account<'info, MarketAccount>,
    #[account(mut)]
    pub vault_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_b: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority_token_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority_token_b: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
