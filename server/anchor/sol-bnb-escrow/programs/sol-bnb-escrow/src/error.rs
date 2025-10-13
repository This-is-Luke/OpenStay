use anchor_lang::prelude::*;

#[error_code]
pub enum OpenstayEscrowError {
	#[msg("Invalid currency type")]
	InvalidCurrency,
	#[msg("Listing is not active")]
	ListingNotActive,
	#[msg("Invalid check-in or check-out dates")]
	InvalidDates,
	#[msg("Selected dates are not available")]
	DatesNotAvailable,
	#[msg("Insufficient funds for booking")]
	InsufficientFunds,
	#[msg("Booking is already confirmed")]
	BookingAlreadyConfirmed,
	#[msg("Booking is not confirmed")]
	BookingNotConfirmed,
	#[msg("Unauthorized to cancel this booking")]
	UnauthorizedCancellation,
	#[msg("Booking is already cancelled")]
	BookingAlreadyCancelled,
	#[msg("Booking is already completed")]
	BookingAlreadyCompleted,
	#[msg("Invalid booking status for this operation")]
	InvalidBookingStatus,
	#[msg("Escrow funds not yet released")]
	EscrowNotReleased,
	#[msg("Invalid listing owner")]
	InvalidListingOwner,
	#[msg("Invalid guest account")]
	InvalidGuest,
	#[msg("Invalid booking account")]
	InvalidBooking,
	#[msg("Invalid escrow vault account")]
	InvalidEscrowVault,
	#[msg("Listing registry not initialized")]
	ListingRegistryNotInitialized,
}