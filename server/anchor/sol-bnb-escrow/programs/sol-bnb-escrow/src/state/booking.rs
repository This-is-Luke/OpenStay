use anchor_lang::prelude::*;

#[account]
pub struct Booking {
	pub listing: Pubkey,
	pub guest: Pubkey,
	pub booking_id: u64,
	pub check_in_date: u64,
	pub check_out_date: u64,
	pub total_price: u64,
	pub currency: u8,
	pub status: u8, // 0 = booked, 1 = confirmed, 2 = cancelled, 3 = completed
	pub deposit_paid: bool,
	pub checkout_confirmed: bool,
	pub bump: u8,
}