use anchor_lang::prelude::*;

/// Swap direction enum
/// Traceability: spec/domain/03-VALUE-OBJECTS.md
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum SwapDirection {
    /// A → B: Exchange Token A for Token B
    AtoB,
    /// B → A: Exchange Token B for Token A
    BtoA,
}

impl From<bool> for SwapDirection {
    /// Convert bool to SwapDirection (true = AtoB, false = BtoA)
    fn from(value: bool) -> Self {
        if value {
            SwapDirection::AtoB
        } else {
            SwapDirection::BtoA
        }
    }
}

impl From<SwapDirection> for bool {
    /// Convert SwapDirection to bool (AtoB = true, BtoA = false)
    fn from(value: SwapDirection) -> Self {
        matches!(value, SwapDirection::AtoB)
    }
}

/// Type alias for token amounts (base units)
/// Traceability: spec/domain/03-VALUE-OBJECTS.md
pub type TokenAmount = u64;

/// Type alias for exchange rates (price with 10^6 precision)
/// Traceability: spec/domain/03-VALUE-OBJECTS.md
pub type ExchangeRate = u64;
