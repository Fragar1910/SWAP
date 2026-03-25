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
    /// 8 (discriminator) + 32 (authority) + 32 (token_mint_a) + 32 (token_mint_b)
    /// + 8 (price) + 1 (decimals_a) + 1 (decimals_b) + 1 (bump) = 115 bytes
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 1 + 1 + 1;

    /// Price precision factor (6 decimals)
    /// Example: price = 2_000_000 means 1 Token A = 2.0 Token B
    pub const PRICE_PRECISION: u64 = 1_000_000;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_market_account_len() {
        // Verify LEN constant matches expected size
        let expected_len = 8 + 32 + 32 + 32 + 8 + 1 + 1 + 1;
        assert_eq!(MarketAccount::LEN, expected_len);
        assert_eq!(MarketAccount::LEN, 115);
    }

    #[test]
    fn test_price_precision() {
        assert_eq!(MarketAccount::PRICE_PRECISION, 1_000_000);
    }
}
