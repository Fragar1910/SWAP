use anchor_lang::prelude::*;

declare_id!("AGMg3zTXw2DNy2RzBtvxTTt3DCM2EY2LPYXssdanWjV7");

#[program]
pub mod swap_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
