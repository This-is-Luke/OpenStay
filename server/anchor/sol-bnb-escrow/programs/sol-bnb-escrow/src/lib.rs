use anchor_lang::prelude::*;

#[program]
pub mod openstay_escrow {
    use super::*;

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
    pub fn create_listing(ctx: Context<CreateListing>, listing_id: u64, title: String, description: String, price_per_night: u64, currency: u8, available_dates: Vec<u64>, max_guests: u8, location: String) -> Result<()> {
        create_listing::handler(ctx, listing_id, title, description, price_per_night, currency, available_dates, max_guests, location)
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
    pub fn book_stay(ctx: Context<BookStay>, listing_key: Pubkey, owner: Pubkey, listing_id: u64, booking_id: u64, check_in_date: u64, check_out_date: u64, currency: u8, amount: u64) -> Result<()> {
        book_stay::handler(ctx, listing_key, owner, listing_id, booking_id, check_in_date, check_out_date, currency, amount)
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
    pub fn confirm_checkout(ctx: Context<ConfirmCheckout>, guest: Pubkey, listing_key: Pubkey, owner: Pubkey, listing_id: u64, booking_id: u64) -> Result<()> {
        confirm_checkout::handler(ctx, guest, listing_key, owner, listing_id, booking_id)
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
    pub fn cancel_booking(ctx: Context<CancelBooking>, guest: Pubkey, listing_key: Pubkey, owner: Pubkey, listing_id: u64, booking_id: u64) -> Result<()> {
        cancel_booking::handler(ctx, guest, listing_key, owner, listing_id, booking_id)
    }

    /// Get all active listings
    ///
    /// Accounts:
    /// 0. `[]` listing_registry: [ListingRegistry] The registry of all listings
    /// 1. `[]` system_program: [AccountInfo] Auto-generated, for account initialization
    ///
    /// Returns:
    /// - [Vec<Pubkey>] List of all active listing pubkeys
    pub fn get_all_listings(ctx: Context<GetAllListings>) -> Result<Vec<Pubkey>> {
        get_all_listings::handler(ctx)
    }

    /// Initialize the listing registry
    ///
    /// Accounts:
    /// 0. `[writable]` listing_registry: [ListingRegistry] The registry of all listings
    /// 1. `[writable, signer]` fee_payer: [AccountInfo] The account paying for initialization
    /// 2. `[]` system_program: [AccountInfo] Auto-generated, for account initialization
    pub fn initialize_listing_registry(ctx: Context<InitializeListingRegistry>) -> Result<()> {
        initialize_listing_registry::handler(ctx)
    }
}