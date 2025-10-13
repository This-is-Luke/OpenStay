use crate::*;
use anchor_lang::prelude::*;
use std::str::FromStr;

use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

#[derive(Accounts)]
#[instruction(
	listing_key: Pubkey,
	owner: Pubkey,
	listing_id: u64,
	booking_id: u64,
	check_in_date: u64,
	check_out_date: u64,
	currency: u8,
	amount: u64,
)]
pub struct BookStay<'info> {
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
		init,
		space=109,
		payer=fee_payer,
		seeds = [
			b"booking",
			listing_key.as_ref(),
			guest.key().as_ref(),
			booking_id.to_le_bytes().as_ref(),
		],
		bump,
	)]
	pub booking_account: Account<'info, Booking>,

	#[account(
		init,
		space=51,
		payer=fee_payer,
		seeds = [
			b"escrow_vault",
			booking_account.key().as_ref(),
		],
		bump,
	)]
	pub escrow_vault: Account<'info, EscrowVault>,

	pub guest: Signer<'info>,

	#[account(
		mut,
	)]
	/// CHECK: implement manual checks if needed
	pub guest_token_account: UncheckedAccount<'info>,

	#[account(
		mut,
	)]
	/// CHECK: implement manual checks if needed
	pub listing_owner_token_account: UncheckedAccount<'info>,

	pub system_program: Program<'info, System>,

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

impl<'info> BookStay<'info> {
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


/// Book a stay for a listing
///
/// Accounts:
/// 0. `[writable, signer]` fee_payer: [AccountInfo] 
/// 1. `[writable]` listing_account: [Listing] The listing being booked
/// 2. `[writable]` booking_account: [Booking] The booking account to be created
/// 3. `[writable]` escrow_vault: [EscrowVault] The escrow vault account
/// 4. `[signer]` guest: [AccountInfo] The guest making the booking
/// 5. `[writable]` guest_token_account: [AccountInfo] Guest's token account for payment
/// 6. `[writable]` listing_owner_token_account: [AccountInfo] Listing owner's token account for receiving payment
/// 7. `[]` system_program: [AccountInfo] Auto-generated, for account initialization
/// 8. `[writable]` source: [AccountInfo] The source account.
/// 9. `[]` mint: [Mint] The token mint.
/// 10. `[writable]` destination: [AccountInfo] The destination account.
/// 11. `[signer]` authority: [AccountInfo] The source account's owner/delegate.
/// 12. `[]` token_program: [AccountInfo] Auto-generated, TokenProgram
///
/// Data:
/// - listing_key: [Pubkey] The listing being booked
/// - owner: [Pubkey] The owner of the listing
/// - listing_id: [u64] Unique identifier for the listing
/// - booking_id: [u64] Unique identifier for the booking
/// - check_in_date: [u64] Check-in date (Unix timestamp)
/// - check_out_date: [u64] Check-out date (Unix timestamp)
/// - currency: [u8] Currency type (0 = SOL, 1 = USDC)
/// - amount: [u64] Amount to be paid for the stay
pub fn handler(
	ctx: Context<BookStay>,
	listing_key: Pubkey,
	owner: Pubkey,
	listing_id: u64,
	booking_id: u64,
	check_in_date: u64,
	check_out_date: u64,
	currency: u8,
	amount: u64,
) -> Result<()> {
    // Validate currency type
    if currency != 0 && currency != 1 {
        return err!(OpenstayEscrowError::InvalidCurrency);
    }

    // Validate dates
    if check_in_date >= check_out_date {
        return err!(OpenstayEscrowError::InvalidDates);
    }

    // Check if listing is active
    if !ctx.accounts.listing_account.is_active {
        return err!(OpenstayEscrowError::ListingNotActive);
    }

    // Check if the listing owner matches
    if ctx.accounts.listing_account.owner != owner {
        return err!(OpenstayEscrowError::InvalidListingOwner);
    }

    // Check if the listing has the requested dates available
    let mut is_available = false;
    for &date in &ctx.accounts.listing_account.available_dates {
        if date == check_in_date || date == check_out_date {
            is_available = true;
            break;
        }
    }
    
    if !is_available {
        return err!(OpenstayEscrowError::DatesNotAvailable);
    }

    // Validate that the guest is not the owner
    if ctx.accounts.guest.key() == ctx.accounts.listing_account.owner {
        return err!(OpenstayEscrowError::InvalidGuest);
    }

    // Initialize the booking account
    ctx.accounts.booking_account.listing = listing_key;
    ctx.accounts.booking_account.guest = ctx.accounts.guest.key();
    ctx.accounts.booking_account.booking_id = booking_id;
    ctx.accounts.booking_account.check_in_date = check_in_date;
    ctx.accounts.booking_account.check_out_date = check_out_date;
    ctx.accounts.booking_account.total_price = amount;
    ctx.accounts.booking_account.currency = currency;
    ctx.accounts.booking_account.status = 0; // 0 = booked, 1 = confirmed, 2 = cancelled, 3 = completed
    ctx.accounts.booking_account.deposit_paid = true;
    ctx.accounts.booking_account.checkout_confirmed = false;
    ctx.accounts.booking_account.bump = ctx.bumps.booking_account;

    // Initialize the escrow vault account
    ctx.accounts.escrow_vault.booking = ctx.accounts.booking_account.key();
    ctx.accounts.escrow_vault.total_amount = amount;
    ctx.accounts.escrow_vault.currency = currency;
    ctx.accounts.escrow_vault.is_released = false;
    ctx.accounts.escrow_vault.bump = ctx.bumps.escrow_vault;

    // Transfer funds to escrow vault
    ctx.accounts.cpi_token_transfer_checked(
        amount,
        if currency == 0 { 9 } else { 6 }, // SOL has 9 decimals, USDC has 6 decimals
    )?;

    Ok(())
}