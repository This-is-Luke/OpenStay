use crate::*;
use anchor_lang::prelude::*;
use std::str::FromStr;

use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct GetAllListings<'info> {
    #[account(
        seeds = [
            b"listing_registry"
        ],
        bump,
    )]
    pub listing_registry: Account<'info, ListingRegistry>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<GetAllListings>) -> Result<Vec<Pubkey>> {
    // Check if the registry is initialized
    if ctx.accounts.listing_registry.listings.is_empty() {
        return Ok(Vec::new());
    }
    
    Ok(ctx.accounts.listing_registry.listings.clone())
}