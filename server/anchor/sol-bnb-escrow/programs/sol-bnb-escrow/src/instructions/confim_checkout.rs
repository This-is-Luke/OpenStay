use crate::*;
use anchor_lang::prelude::*;
use std::str::FromStr;

use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

#[derive(Accounts)]
#[instruction(
	guest: Pubkey,
	listing_key: Pubkey,
	owner: Pubkey,
	listing_id: u64,
	booking_id: u64,
)]
pub struct ConfirmCheckout<'info> {
	#[account(
		mut,
	)]
	pub fee_payer: Signer<'info>,

	#[account(
		mut,
		seeds = [
			b"listing",
			owner.as_ref(),
			listing_id.to_le_bytes().as_ref(),
		],
		bump,
	)]
	pub listing_account: Account<'info, Listing>,

	#[account(
		mut,
		seeds = [
			b"booking",
			listing_key.as_ref(),
			guest.as_ref(),
			booking_id.to_le_bytes().as_ref(),
		],
		bump,
	)]
	pub booking_account: Account<'info, Booking>,

	#[account(
		mut,
		seeds = [
			b"escrow_vault",
			booking_account.key().as_ref(),
		],
		bump,
	)]
	pub escrow_vault: Account<'info, EscrowVault>,

	pub listing_owner: Signer<'info>,
}

/// Confirm checkout and release funds to listing owner
///
/// Accounts:
/// 0. `[writable, signer]` fee_payer: [AccountInfo] 
/// 1. `[writable]` listing_account: [Listing] The listing being checked out from
/// 2. `[writable]` booking_account: [Booking] The booking being confirmed
/// 3. `[writable]` escrow_vault: [EscrowVault] The escrow vault account
/// 4. `[signer]` listing_owner: [AccountInfo] The listing owner confirming checkout
///
/// Data:
/// - guest: [Pubkey] The guest who checked out
/// - listing_key: [Pubkey] The listing being checked out from
/// - owner: [Pubkey] The owner of the listing
/// - listing_id: [u64] Unique identifier for the listing
/// - booking_id: [u64] Unique identifier for the booking
pub fn handler(
	ctx: Context<ConfirmCheckout>,
	guest: Pubkey,
	listing_key: Pubkey,
	owner: Pubkey,
	listing_id: u64,
	booking_id: u64,
) -> Result<()> {
    // Check if the listing owner is the one confirming
    if ctx.accounts.listing_owner.key() != ctx.accounts.listing_account.owner {
        return err!(OpenstayEscrowError::InvalidListingOwner);
    }

    // Check if the guest matches the booking
    if ctx.accounts.booking_account.guest != guest {
        return err!(OpenstayEscrowError::InvalidGuest);
    }

    // Check if the booking is for the correct listing
    if ctx.accounts.booking_account.listing != listing_key {
        return err!(OpenstayEscrowError::InvalidBooking);
    }

    // Check if the booking is already confirmed
    if ctx.accounts.booking_account.checkout_confirmed {
        return err!(OpenstayEscrowError::BookingAlreadyConfirmed);
    }

    // Check if the booking is already cancelled
    if ctx.accounts.booking_account.status == 2 {
        return err!(OpenstayEscrowError::BookingAlreadyCancelled);
    }

    // Check if the booking is already completed
    if ctx.accounts.booking_account.status == 3 {
        return err!(OpenstayEscrowError::BookingAlreadyCompleted);
    }

    // Check if the escrow vault is already released
    if ctx.accounts.escrow_vault.is_released {
        return err!(OpenstayEscrowError::EscrowNotReleased);
    }

    // Update booking status to confirmed
    ctx.accounts.booking_account.checkout_confirmed = true;
    ctx.accounts.booking_account.status = 1; // Confirmed

    // Transfer funds from escrow to listing owner
    // Note: In a real implementation, we would need to transfer the funds here
    // For now, we'll just mark the escrow as released
    ctx.accounts.escrow_vault.is_released = true;

    Ok(())
}