use crate::*;
use anchor_lang::prelude::*;
use std::str::FromStr;

use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct InitializeListingRegistry<'info> {
    #[account(
        init,
        space = 8 + 4 + (100 * 32) + 1, // 8 bytes for discriminator + 4 bytes for length + 100 pubkeys * 32 bytes + 1 byte for bump
        payer = fee_payer,
        seeds = [
            b"listing_registry"
        ],
        bump,
    )]
    pub listing_registry: Account<'info, ListingRegistry>,

    #[account(mut)]
    pub fee_payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeListingRegistry>) -> Result<()> {
    ctx.accounts.listing_registry.listings = Vec::new();
    ctx.accounts.listing_registry.bump = ctx.bumps.listing_registry;
    Ok(())
}