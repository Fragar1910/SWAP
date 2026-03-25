/// PDA seed prefix for market accounts
/// Derivation: [b"market", token_mint_a.key(), token_mint_b.key()]
/// Traceability: ADR-004, REQ-F-011
pub const MARKET_SEED: &[u8] = b"market";

/// PDA seed prefix for Vault A (Token A liquidity)
/// Derivation: [b"vault_a", market.key()]
/// Traceability: ADR-004, REQ-F-011
pub const VAULT_A_SEED: &[u8] = b"vault_a";

/// PDA seed prefix for Vault B (Token B liquidity)
/// Derivation: [b"vault_b", market.key()]
/// Traceability: ADR-004, REQ-F-011
pub const VAULT_B_SEED: &[u8] = b"vault_b";

/// Price precision factor (10^6)
/// Example: price = 2_500_000 means 1 Token A = 2.5 Token B
/// Traceability: ADR-002, spec/domain/03-VALUE-OBJECTS.md
pub const PRICE_PRECISION: u64 = 1_000_000;

/// Maximum token decimals allowed (SPL Token standard limit)
/// Traceability: INV-MKT-005, REQ-F-010
pub const MAX_DECIMALS: u8 = 18;

/// Minimum decimals (SPL Token allows 0 decimals for non-divisible tokens)
/// Traceability: INV-MKT-005
pub const MIN_DECIMALS: u8 = 0;
