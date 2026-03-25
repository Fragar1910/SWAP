use anchor_lang::prelude::*;

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
    #[allow(unused_imports)]
    use super::*;

    // FASE-2: initialize_market instruction
    // FASE-2: set_price instruction
    // FASE-2: add_liquidity instruction
    // FASE-3: swap instruction
}
