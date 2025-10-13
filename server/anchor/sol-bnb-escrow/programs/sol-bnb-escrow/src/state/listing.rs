use anchor_lang::prelude::*;

#[account]
pub struct Listing {
	pub owner: Pubkey,
	pub listing_id: u64,
	pub title: String,
	pub description: String,
	pub price_per_night: u64,
	pub currency: u8,
	pub available_dates: Vec<u64>,
	pub max_guests: u8,
	pub location: String,
	pub is_active: bool,
	pub bump: u8,
}