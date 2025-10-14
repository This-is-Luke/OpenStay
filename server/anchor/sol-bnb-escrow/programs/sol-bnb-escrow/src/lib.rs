use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Token, TokenAccount, Transfer};

declare_id!("TDoetY1LKXn5vxxgkpE3keKhpRvbwHV6a2ep2Lreqov");

#[program]
pub mod sol_bnb_escrow {
    use super::*;

    pub fn create_listing(ctx: Context<CreateListing>, price_lamports: u64, metadata_uri: String) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        listing.host = ctx.accounts.host.key();
        listing.price_lamports = price_lamports;
        listing.metadata_uri = metadata_uri;
        listing.is_booked = false;
        listing.bump = ctx.bumps.listing;
        Ok(())
    }

    pub fn book_listing(ctx: Context<BookAndDeposit>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(!listing.is_booked, CustomError::AlreadyBooked);

        listing.is_booked = true;
        listing.guest = Some(ctx.accounts.guest.key());
    

        // Transfer SOL (Lamports) to escrow PDA
        let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.guest.key(),
            &ctx.accounts.escrow.key(),
            listing.price_lamports,
        );
        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.guest.to_account_info(),
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        Ok(())
    }

    // New instruction to allow the client to easily query the program.
    // The actual filtering and fetching logic happens on the client side.
    pub fn get_all_listings(_ctx: Context<GetAllListings>) -> Result<()> {
        Ok(())
    }

    pub fn release_payment(ctx: Context<ReleasePayment>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(listing.is_booked, CustomError::NotBooked);

        let guest = listing.guest.unwrap();
        require_keys_eq!(guest, ctx.accounts.guest.key(), CustomError::InvalidGuest);

        let amount = **ctx.accounts.escrow.to_account_info().lamports.borrow();
        
        // Transfer SOL from escrow to host using invoke_signed
        let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.escrow.key(),
            &ctx.accounts.host.key(),
            amount,
        );
        
        // Get the bump seed for the escrow PDA
        let escrow_bump = ctx.bumps.escrow;
        let listing_key = listing.key();
        let seeds = [
            b"escrow".as_ref(),
            listing_key.as_ref(),
            &[escrow_bump],
        ];
        
        anchor_lang::solana_program::program::invoke_signed(
            &transfer_instruction,
            &[
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.host.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&seeds],
        )?;

        listing.is_booked = false;
        listing.guest = None;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateListing<'info> {
    #[account(
        init,
        payer = host,
        space = 8 + Listing::MAX_SIZE,
        seeds = [b"listing", host.key().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(mut)]
    pub host: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BookAndDeposit<'info> {
    #[account(mut, has_one = host)]
    pub listing: Account<'info, Listing>,
    /// CHECK: This is our escrow account PDA
    #[account(
        mut,
        seeds = [b"escrow", listing.key().as_ref()],
        bump
    )]
    pub escrow: AccountInfo<'info>,
    #[account(mut)]
    pub guest: Signer<'info>,
    /// CHECK: Host account is validated through the listing's has_one constraint
    pub host: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetAllListings {}

#[derive(Accounts)]
pub struct ReleasePayment<'info> {
    #[account(mut)]
    pub listing: Account<'info, Listing>,
    /// CHECK: Escrow PDA
    #[account(
        mut,
        seeds = [b"escrow", listing.key().as_ref()],
        bump,
        owner = system_program.key()
    )]
    pub escrow: AccountInfo<'info>,
    #[account(mut)]
    pub host: Signer<'info>,
    pub guest: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Listing {
    pub host: Pubkey,
    pub price_lamports: u64,
    pub metadata_uri: String,
    pub is_booked: bool,
    pub guest: Option<Pubkey>,
    pub bump: u8,
}

impl Listing {
    // The total space needed for the account data.
    pub const MAX_SIZE: usize = 
        32 + // host: Pubkey
        8 +  // price_lamports: u64
        4 + 200 + // metadata_uri: String (4 bytes for length + max 200 bytes for data)
        1 +  // is_booked: bool
        (1 + 32) + // guest: Option<Pubkey> (1 byte for option + 32 bytes for Pubkey)
        1;   // bump: u8
}

#[error_code]
pub enum CustomError {
    #[msg("Listing is already booked.")]
    AlreadyBooked,
    #[msg("Listing is not booked.")]
    NotBooked,
    #[msg("Invalid guest trying to release payment.")]
    InvalidGuest,
}