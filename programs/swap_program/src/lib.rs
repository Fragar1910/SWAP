#![allow(deprecated)]
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

pub mod constants;
pub mod error;
pub mod events;
pub mod state;
pub mod types;
pub mod utils;

pub use constants::*;
pub use error::*;
pub use events::*;
pub use state::*;
pub use types::*;
pub use utils::*;

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

    /// Execute bidirectional token swap (permissionless)
    /// Traceability: UC-004, UC-005, REQ-F-006, REQ-F-007, REQ-F-009
    pub fn swap(ctx: Context<Swap>, amount: u64, swap_a_to_b: bool) -> Result<()> {
        let market = &ctx.accounts.market;
        let clock = Clock::get()?;

        // Validate input amount
        require!(amount > 0, SwapError::InvalidAmount);

        // Calculate output amount using swap_math
        let output_amount = if swap_a_to_b {
            swap_math::calculate_a_to_b_output(amount, market)?
        } else {
            swap_math::calculate_b_to_a_output(amount, market)?
        };

        // Prepare PDA signer seeds for vault transfers
        let market_seeds = &[
            MARKET_SEED,
            market.token_mint_a.as_ref(),
            market.token_mint_b.as_ref(),
            &[market.bump],
        ];
        let signer_seeds = &[&market_seeds[..]];

        if swap_a_to_b {
            // A → B swap
            // Check vault B has sufficient liquidity
            require!(
                ctx.accounts.vault_b.amount >= output_amount,
                SwapError::InsufficientLiquidity
            );

            // Transfer Token A from user to vault_a
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.user_token_a.to_account_info(),
                        to: ctx.accounts.vault_a.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                amount,
            )?;

            // Transfer Token B from vault_b to user (PDA signs)
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.vault_b.to_account_info(),
                        to: ctx.accounts.user_token_b.to_account_info(),
                        authority: market.to_account_info(),
                    },
                    signer_seeds,
                ),
                output_amount,
            )?;
        } else {
            // B → A swap
            // Check vault A has sufficient liquidity
            require!(
                ctx.accounts.vault_a.amount >= output_amount,
                SwapError::InsufficientLiquidity
            );

            // Transfer Token B from user to vault_b
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.user_token_b.to_account_info(),
                        to: ctx.accounts.vault_b.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                amount,
            )?;

            // Transfer Token A from vault_a to user (PDA signs)
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.vault_a.to_account_info(),
                        to: ctx.accounts.user_token_a.to_account_info(),
                        authority: market.to_account_info(),
                    },
                    signer_seeds,
                ),
                output_amount,
            )?;
        }

        emit!(SwapExecuted {
            market: market.key(),
            user: ctx.accounts.user.key(),
            swap_a_to_b,
            input_amount: amount,
            output_amount,
            timestamp: clock.unix_timestamp,
        });

        msg!(
            "Swap executed: {} {} → {} {} (rate: {})",
            if swap_a_to_b { "A→B" } else { "B→A" },
            amount,
            if swap_a_to_b { "B" } else { "A" },
            output_amount,
            market.price
        );

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

#[derive(Accounts)]
pub struct Swap<'info> {
    pub market: Account<'info, MarketAccount>,
    #[account(
        mut,
        seeds = [VAULT_A_SEED, market.key().as_ref()],
        bump,
    )]
    pub vault_a: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [VAULT_B_SEED, market.key().as_ref()],
        bump,
    )]
    pub vault_b: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = user_token_a.mint == market.token_mint_a @ SwapError::Unauthorized,
        constraint = user_token_a.owner == user.key() @ SwapError::Unauthorized,
    )]
    pub user_token_a: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = user_token_b.mint == market.token_mint_b @ SwapError::Unauthorized,
        constraint = user_token_b.owner == user.key() @ SwapError::Unauthorized,
    )]
    pub user_token_b: Account<'info, TokenAccount>,
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
