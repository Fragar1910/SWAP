use anchor_lang::prelude::*;

/// Custom error codes for the swap program
///
/// Traceability: spec/domain/04-ERRORS.md
#[error_code]
pub enum SwapError {
    /// Arithmetic overflow detected (REQ-NF-001, ADR-005)
    /// Thrown when: checked_mul/checked_add returns None
    #[msg("Arithmetic overflow detected")]
    Overflow,

    /// Division by zero attempted (REQ-NF-002, ADR-005)
    /// Thrown when: checked_div returns None or price = 0
    #[msg("Division by zero (price may not be set)")]
    DivisionByZero,

    /// Invalid amount provided (must be > 0)
    /// Thrown when: input amount = 0 (REQ-NF-004)
    #[msg("Invalid amount (must be greater than 0)")]
    InvalidAmount,

    /// Price not set (administrator must call set_price)
    /// Thrown when: price = 0 and swap is attempted (REQ-NF-002)
    #[msg("Price not set (administrator must call set_price first)")]
    PriceNotSet,

    /// Insufficient liquidity in vault
    /// Thrown when: vault balance < required output amount (REQ-NF-003)
    #[msg("Insufficient liquidity in vault to fulfill swap")]
    InsufficientLiquidity,

    /// Same token swap disallowed (Token A and Token B must be distinct)
    /// Thrown when: token_mint_a == token_mint_b (BR-MKT-004, INV-MKT-006)
    #[msg("Same token swaps are not allowed (Token A and Token B must be distinct mints)")]
    SameTokenSwapDisallowed,

    /// Unauthorized: Only market authority can perform this operation
    /// Thrown when: signer is not market.authority (REQ-F-008, REQ-NF-006)
    #[msg("Only the market authority can perform this operation")]
    Unauthorized,

    /// Invalid token decimals (must be 0-18)
    /// Thrown when: decimals > 18 (INV-MKT-005)
    #[msg("Token decimals must be between 0 and 18")]
    InvalidDecimals,
}
