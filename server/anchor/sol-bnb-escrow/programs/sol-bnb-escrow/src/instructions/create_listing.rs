use crate::*;
use anchor_lang::prelude::*;
use std::str::FromStr;

use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

#[derive(Accounts)]
#[instruction(
	listing_id: u64,
	title: String,
	description: String,
	price_per_night: u64,
	currency: u8,
	available_dates: Vec<u64>,
	max_guests: u8,
	location: String,
)]
pub struct CreateListing<'info> {
	#[account(
		mut,
	)]
	pub fee_payer: Signer<'info>,

	#[account(
		init,
		space=5554,
		payer=fee_payer,
		seeds = [
			b"listing",
			owner.key().as_ref(),
			listing_id.to_le_bytes().as_ref(),
		],
		bump,
	)]
	pub listing_account: Account<'info, Listing>,

	#[account(
		seeds = [
			b"listing_registry"
		],
		bump,
	)]
	pub listing_registry: Account<'info, ListingRegistry>,

	pub owner: Signer<'info>,

	pub system_program: Program<'info, System>,
}

/// Create a new property listing
///
/// Accounts:
/// 0. `[writable, signer]` fee_payer: [AccountInfo] 
/// 1. `[writable]` listing_account: [Listing] The listing account to be created
/// 2. `[signer]` owner: [AccountInfo] The owner of the listing
/// 3. `[]` system_program: [AccountInfo] Auto-generated, for account initialization
///
/// Data:
/// - listing_id: [u64] Unique identifier for the listing
/// - title: [String] Title of the listing
/// - description: [String] type
/// - price_per_night: [u64] Price per night in lamports or USDC decimals
/// - currency: [u8] Currency type (0 = SOL, 1 = USDC)
/// - available_dates: [Vec<u64>] Available dates (Unix timestamps)
/// - max_guests: [u8] Maximum number of guests allowed
/// - location: [String] Location of the property
pub fn handler(
	ctx: Context<CreateListing>,
	listing_id: u64,
	title: String,
	description: String,
	price_per_night: u64,
	currency: u8,
	available_dates: Vec<u64>,
	max_guests: u8,
	location: String,
) -> Result<()> {
    // Validate currency type
    if currency != 0 && currency != 1 {
        return err!(OpenstayEscrowError::InvalidCurrency);
    }

    // Validate dates
    if available_dates.is_empty() {
        return err!(OpenstayEscrowError::InvalidDates);
    }

    // Initialize the listing account
    ctx.accounts.listing_account.owner = ctx.accounts.owner.key();
    ctx.accounts.listing_account.listing_id = listing_id;
    ctx.accounts.listing_account.title = title;
    ctx.accounts.listing_account.description = description;
    ctx.accounts.listing_account.price_per_night = price_per_night;
    ctx.accounts.listing_account.currency = currency;
    ctx.accounts.listing_account.available_dates = available_dates;
    ctx.accounts.listing_account.max_guests = max_guests;
    ctx.accounts.listing_account.location = location;
    ctx.accounts.listing_account.is_active = true;
    ctx.accounts.listing_account.bump = ctx.bumps.listing_account;

    // Add listing to registry
    ctx.accounts.listing_registry.listings.push(ctx.accounts.listing_account.key());

    Ok(())
}