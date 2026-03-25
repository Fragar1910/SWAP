use anchor_lang::prelude::*;

/// Event emitted when a market is initialized
///
/// Traceability: REQ-NF-009, spec/contracts/EVENTS-swap-program.md
#[event]
pub struct MarketInitialized {
    /// Market PDA address
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
