use anchor_lang::prelude::*;

declare_id!("7DMPDSeaguBNbFstpUq7uhhqBBWYBefKeeVuSEKLRsLe");

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
