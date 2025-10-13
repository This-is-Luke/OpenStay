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
pub struct CancelBooking<'info> {
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

	pub canceller: Signer<'info>,

	#[account(
		mut,
	)]
	/// CHECK: implement manual checks if needed
	pub source: UncheckedAccount<'info>,

	pub mint: Account<'info, Mint>,

	#[account(
		mut,
	)]
	/// CHECK: implement manual checks if needed
	pub destination: UncheckedAccount<'info>,

	pub authority: Signer<'info>,

	pub token_program: Program<'info, Token>,
}

impl<'info> CancelBooking<'info> {
	pub fn cpi_token_transfer_checked(&self, amount: u64, decimals: u8) -> Result<()> {
		anchor_spl::token::transfer_checked(
			CpiContext::new(self.token_program.to_account_info(), 
				anchor_spl::token::TransferChecked {
					from: self.source.to_account_info(),
					mint: self.mint.to_account_info(),
					to: self.destination.to_account_info(),
					authority: self.authority.to_account_info()
				}
			),
			amount, 
			decimals, 
		)
	}
}


/// Cancel a booking and refund guest
///
/// Accounts:
/// 0. `[writable, signer]` fee_payer: [AccountInfo] 
/// 1. `[writable]` listing_account: [Listing] The listing being cancelled
/// 2. `[writable]` booking_account: [Booking] The booking being cancelled
/// 3. `[writable]` escrow_vault: [EscrowVault] The escrow vault account
/// 4. `[signer]` canceller: [AccountInfo] The account cancelling the booking (guest or owner)
/// 5. `[writable]` source: [AccountInfo] The source account.
/// 6. `[]` mint: [Mint] The token mint.
/// 7. `[writable]` destination: [AccountInfo] The destination account.
/// 8. `[signer]` authority: [AccountInfo] The source account's owner/delegate.
/// 9. `[]` token_program: [AccountInfo] Auto-generated, TokenProgram
///
/// Data:
/// - guest: [Pubkey] The guest who made the booking
/// - listing_key: [Pubkey] The listing being cancelled
/// - owner: [Pubkey] The owner of the listing
/// - listing_id: [u64] Unique identifier for the listing
/// - booking_id: [u64] Unique identifier for the booking
pub fn handler(
	ctx: Context<CancelBooking>,
	guest: Pubkey,
	listing_key: Pubkey,
	owner: Pubkey,
	listing_id: u64,
	booking_id: u64,
) -> Result<()> {
    // Check if the canceller is either the guest or the listing owner
    if ctx.accounts.canceller.key() != guest && ctx.accounts.canceller.key() != ctx.accounts.listing_account.owner {
        return err!(OpenstayEscrowError::UnauthorizedCancellation);
    }

    // Check if the guest matches the booking
    if ctx.accounts.booking_account.guest != guest {
        return err!(OpenstayEscrowError::InvalidGuest);
    }

    // Check if the booking is for the correct listing
    if ctx.accounts.booking_account.listing != listing_key {
        return err!(OpenstayEscrowError::InvalidBooking);
    }

    // Check if the booking is already cancelled
    if ctx.accounts.booking_account.status == 2 {
        return err!(OpenstayEscrowError::BookingAlreadyCancelled);
    }

    // Check if the booking is already completed
    if ctx.accounts.booking_account.status == 3 {
        return err!(OpenstayEscrowError::BookingAlreadyCompleted);
    }

    // Check if the booking is already confirmed
    if ctx.accounts.booking_account.checkout_confirmed {
        return err!(OpenstayEscrowError::BookingAlreadyConfirmed);
    }

    // Update booking status to cancelled
    ctx.accounts.booking_account.status = 2; // Cancelled

    // If escrow funds have not been released, refund the guest
    if !ctx.accounts.escrow_vault.is_released {
        // Transfer funds back to guest
        ctx.accounts.cpi_token_transfer_checked(
            ctx.accounts.escrow_vault.total_amount,
            if ctx.accounts.escrow_vault.currency == 0 { 9 } else { 6 }, // SOL has 9 decimals, USDC has 6 decimals
        )?;
    }

    Ok(())
}