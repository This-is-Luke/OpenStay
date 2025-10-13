use anchor_lang::prelude::*;

#[account]
pub struct ListingRegistry {
    pub listings: Vec<Pubkey>,
    pub bump: u8,
}