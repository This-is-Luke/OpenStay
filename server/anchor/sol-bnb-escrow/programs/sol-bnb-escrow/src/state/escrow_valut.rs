use anchor_lang::prelude::*;

#[account]
pub struct EscrowVault {
	pub booking: Pubkey,
	pub total_amount: u64,
	pub currency: u8,
	pub is_released: bool,
	pub bump: u8,
}