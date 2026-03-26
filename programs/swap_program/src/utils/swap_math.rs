use anchor_lang::prelude::*;
use crate::{constants::*, error::SwapError, state::MarketAccount};

/// Calculate Token B output amount for a given Token A input
///
/// Formula: amount_b = (amount_a × price × 10^decimals_b) / (10^6 × 10^decimals_a)
///
/// Traceability: ADR-002, ADR-005, ENT-SWP-001, REQ-F-006, UC-004
pub fn calculate_a_to_b_output(amount_a: u64, market: &MarketAccount) -> Result<u64> {
    // CRITICAL-003: Validate price is set (INV-SWP-005)
    require!(market.price > 0, SwapError::PriceNotSet);

    // Calculate numerator: amount_a × price × 10^decimals_b
    let numerator = (amount_a as u128)
        .checked_mul(market.price as u128)
        .ok_or(SwapError::Overflow)?
        .checked_mul(10u128.pow(market.decimals_b as u32))
        .ok_or(SwapError::Overflow)?;

    // Calculate denominator: 10^6 × 10^decimals_a
    let denominator = (PRICE_PRECISION as u128)
        .checked_mul(10u128.pow(market.decimals_a as u32))
        .ok_or(SwapError::Overflow)?;

    // Perform division
    let amount_b = numerator
        .checked_div(denominator)
        .ok_or(SwapError::DivisionByZero)?;

    // Convert to u64
    let amount_b = u64::try_from(amount_b)
        .map_err(|_| SwapError::Overflow)?;

    // INV-SWP-001: Validate output > 0
    require!(amount_b > 0, SwapError::InvalidAmount);

    Ok(amount_b)
}

/// Calculate Token A output amount for a given Token B input
///
/// Formula: amount_a = (amount_b × 10^6 × 10^decimals_a) / (price × 10^decimals_b)
///
/// Traceability: ADR-002, ADR-005, ENT-SWP-001, REQ-F-007, UC-005
pub fn calculate_b_to_a_output(amount_b: u64, market: &MarketAccount) -> Result<u64> {
    // CRITICAL: Validate price is set to prevent division by zero (INV-SWP-005)
    require!(market.price > 0, SwapError::PriceNotSet);

    // Calculate numerator: amount_b × 10^6 × 10^decimals_a
    let numerator = (amount_b as u128)
        .checked_mul(PRICE_PRECISION as u128)
        .ok_or(SwapError::Overflow)?
        .checked_mul(10u128.pow(market.decimals_a as u32))
        .ok_or(SwapError::Overflow)?;

    // Calculate denominator: price × 10^decimals_b
    let denominator = (market.price as u128)
        .checked_mul(10u128.pow(market.decimals_b as u32))
        .ok_or(SwapError::Overflow)?;

    // Perform division
    let amount_a = numerator
        .checked_div(denominator)
        .ok_or(SwapError::DivisionByZero)?;

    // Convert to u64
    let amount_a = u64::try_from(amount_a)
        .map_err(|_| SwapError::Overflow)?;

    // INV-SWP-001: Validate output > 0
    require!(amount_a > 0, SwapError::InvalidAmount);

    Ok(amount_a)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_market(price: u64, decimals_a: u8, decimals_b: u8) -> MarketAccount {
        MarketAccount {
            authority: Pubkey::default(),
            token_mint_a: Pubkey::default(),
            token_mint_b: Pubkey::default(),
            price,
            decimals_a,
            decimals_b,
            bump: 0,
        }
    }

    #[test]
    fn test_a_to_b_calculation() {
        // Price = 2.5 (2_500_000 with 6 decimals precision)
        // 100 Token A (6 decimals) → 250 Token B (9 decimals)
        let market = create_test_market(2_500_000, 6, 9);
        let amount_a = 100_000_000; // 100 tokens with 6 decimals

        let result = calculate_a_to_b_output(amount_a, &market).unwrap();

        // Expected: 100 * 2.5 = 250 tokens with 9 decimals
        assert_eq!(result, 250_000_000_000);
    }

    #[test]
    fn test_b_to_a_calculation() {
        // Price = 2.5 (2_500_000 with 6 decimals precision)
        // 250 Token B (9 decimals) → 100 Token A (6 decimals)
        let market = create_test_market(2_500_000, 6, 9);
        let amount_b = 250_000_000_000; // 250 tokens with 9 decimals

        let result = calculate_b_to_a_output(amount_b, &market).unwrap();

        // Expected: 250 / 2.5 = 100 tokens with 6 decimals
        assert_eq!(result, 100_000_000);
    }

    #[test]
    fn test_price_not_set_error() {
        let market = create_test_market(0, 6, 9);
        let amount_a = 100_000_000;

        let result = calculate_a_to_b_output(amount_a, &market);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), SwapError::PriceNotSet.into());
    }

    #[test]
    fn test_zero_output_prevented() {
        // Very small amount with high decimals that would result in 0 after division
        // Price = 0.000001 (1 with 6 decimals precision)
        // 1 base unit Token A → should round down to 0 Token B
        let market = create_test_market(1, 6, 9);
        let amount_a = 1; // 1 base unit (0.000001 tokens with 6 decimals)

        let result = calculate_a_to_b_output(amount_a, &market);
        // Should fail with InvalidAmount because output would be 0
        assert!(result.is_err());
    }

    #[test]
    fn test_overflow_protection() {
        let market = create_test_market(1_000_000, 6, 9);
        let amount_a = u64::MAX;

        let result = calculate_a_to_b_output(amount_a, &market);
        assert!(result.is_err());
    }
}
