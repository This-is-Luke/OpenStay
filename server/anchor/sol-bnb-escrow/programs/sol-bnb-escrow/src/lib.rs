use anchor_lang::prelude::*;
use anchor_lang::solana_program::{system_instruction, program::invoke, program::invoke_signed};

declare_id!("Fg6PaFpoGXkYsidMpWxqSW3nQp9rYk1hExampleProgID"); // replace with your real program id

#[program]
pub mod sol_bnb_escrow {
    use super::*;

    // Initialize the escrow PDA
    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        booking_id: u64,
        amount_lamports: u64,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_state;
        escrow.booking_id = booking_id;
        escrow.guest = *ctx.accounts.guest.key;
        escrow.host = *ctx.accounts.host.key;
        escrow.amount = amount_lamports;
        escrow.bump = *ctx.bumps.get("escrow_state").unwrap();
        escrow.released = false;
        escrow.refunded = false;
        Ok(())
    }

    // Deposit funds from guest to escrow PDA
    pub fn deposit(ctx: Context<Deposit>) -> Result<()> {
        let escrow = &ctx.accounts.escrow_state;
        require!(!escrow.released, EscrowError::AlreadyReleased);

        let ix = system_instruction::transfer(
            ctx.accounts.guest.key,
            ctx.accounts.escrow_state.to_account_info().key,
            escrow.amount,
        );

        invoke(
            &ix,
            &[
                ctx.accounts.guest.to_account_info(),
                ctx.accounts.escrow_state.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        Ok(())
    }

    // Release funds from escrow PDA to host
    pub fn release(ctx: Context<Release>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_state;
        require!(!escrow.released, EscrowError::AlreadyReleased);
        require!(!escrow.refunded, EscrowError::AlreadyRefunded);

        let amount = escrow.amount;
        let bump = escrow.bump;
        let seeds: &[&[u8]] = &[
            b"escrow",
            &escrow.booking_id.to_le_bytes(),
            &[bump],
        ];

        let ix = system_instruction::transfer(
            ctx.accounts.escrow_state.to_account_info().key,
            ctx.accounts.host.key,
            amount,
        );

        invoke_signed(
            &ix,
            &[
                ctx.accounts.escrow_state.to_account_info(),
                ctx.accounts.host.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[seeds],
        )?;

        escrow.released = true;
        Ok(())
    }

    // Close escrow and refund to guest
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_state;
        require!(!escrow.released, EscrowError::AlreadyReleased);
        require!(!escrow.refunded, EscrowError::AlreadyRefunded);

        let amount = escrow.amount;
        let bump = escrow.bump;
        let seeds: &[&[u8]] = &[
            b"escrow",
            &escrow.booking_id.to_le_bytes(),
            &[bump],
        ];

        let ix = system_instruction::transfer(
            ctx.accounts.escrow_state.to_account_info().key,
            ctx.accounts.guest.key,
            amount,
        );

        invoke_signed(
            &ix,
            &[
                ctx.accounts.escrow_state.to_account_info(),
                ctx.accounts.guest.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[seeds],
        )?;

        escrow.refunded = true;
        Ok(())
    }
}

// ---------------- CONTEXTS ----------------

#[derive(Accounts)]
#[instruction(booking_id: u64, amount_lamports: u64)]
pub struct InitializeEscrow<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Guest user
    pub guest: UncheckedAccount<'info>,
    /// CHECK: Host user
    pub host: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        seeds = [b"escrow", &booking_id.to_le_bytes()],
        bump,
        space = 8 + EscrowState::LEN,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut, signer)]
    pub guest: Signer<'info>,
    #[account(
        mut,
        seeds = [b"escrow", &escrow_state.booking_id.to_le_bytes()],
        bump = escrow_state.bump,
    )]
    pub escrow_state: Account<'info, EscrowState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"escrow", &escrow_state.booking_id.to_le_bytes()],
        bump = escrow_state.bump,
        has_one = host
    )]
    pub escrow_state: Account<'info, EscrowState>,
    /// CHECK: Host gets paid
    #[account(mut)]
    pub host: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        close = authority, // return rent lamports to authority
        seeds = [b"escrow", &escrow_state.booking_id.to_le_bytes()],
        bump = escrow_state.bump,
    )]
    pub escrow_state: Account<'info, EscrowState>,
    /// CHECK: Guest receives refund
    #[account(mut)]
    pub guest: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

// ---------------- STATE ----------------

#[account]
pub struct EscrowState {
    pub booking_id: u64,
    pub guest: Pubkey,
    pub host: Pubkey,
    pub amount: u64,
    pub bump: u8,
    pub released: bool,
    pub refunded: bool,
}

impl EscrowState {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1 + 1 + 1; // 83 bytes
}

#[error_code]
pub enum EscrowError {
    #[msg("Funds have already been released")]
    AlreadyReleased,
    #[msg("Funds have already been refunded")]
    AlreadyRefunded,
}
