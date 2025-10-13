import { Request, Response } from 'express';
import { Database } from '../database/supabase';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import idl from '../idl/sol_bnb_escrow.json'; 

// ---------------- CONFIG ----------------
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const programID = new PublicKey(process.env.PROGRAM_ID!);
const adminWallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.ADMIN_WALLET!)));

const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(adminWallet), {
  commitment: 'confirmed',
});

const program = new anchor.Program(idl as anchor.Idl, programID, provider);

// ---------------- CONTROLLERS ----------------

/**
 * Initialize Escrow PDA on Solana
 */
export const initializeEscrow = async (req: Request, res: Response) => {
  try {
    const { booking_id, guest_wallet, host_wallet, total_price } = req.body;

    const amountLamports = Math.round(Number(total_price) * anchor.web3.LAMPORTS_PER_SOL);

    // Derive PDA for this booking
    const [escrowPDA, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), new anchor.BN(booking_id).toArrayLike(Buffer, 'le', 8)],
      program.programId
    );

    // Call Solana program
    const txSignature = await program.methods
      .initializeEscrow(new anchor.BN(booking_id), new anchor.BN(amountLamports))
      .accounts({
        payer: adminWallet.publicKey,
        guest: new PublicKey(guest_wallet),
        host: new PublicKey(host_wallet),
        escrowState: escrowPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Update DB
    await Database.update('bookings', {
      escrow_account: escrowPDA.toBase58(),
      status: 'escrow_initialized',
      init_tx_signature: txSignature,
    }, { id: booking_id });

    res.json({
      success: true,
      message: 'Escrow initialized on Solana',
      escrowAccount: escrowPDA.toBase58(),
      txSignature,
    });
  } catch (error) {
    console.error('Error initializing escrow:', error);
    res.status(500).json({ success: false, error: 'Error initializing escrow' });
  }
};

/**
 * Deposit funds (guest pays into escrow)
 * → Transaction is built server-side and signed client-side via Phantom
 */
export const depositToEscrow = async (req: Request, res: Response) => {
  try {
    const { booking_id, guest_wallet } = req.body;

    const { data: booking } = await Database.from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const [escrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), new anchor.BN(booking_id).toArrayLike(Buffer, 'le', 8)],
      program.programId
    );

    // Build transaction instruction (not signed)
    const ix = await program.methods
      .deposit()
      .accounts({
        guest: new PublicKey(guest_wallet),
        escrowState: escrowPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();

    res.json({
      success: true,
      message: 'Deposit instruction ready for signing',
      escrowAccount: escrowPDA.toBase58(),
      instruction: ix,
    });
  } catch (error) {
    console.error('Error preparing deposit:', error);
    res.status(500).json({ success: false, error: 'Error preparing deposit' });
  }
};

/**
 * Release funds from Escrow PDA to Host (Admin-signed)
 */
export const releaseEscrow = async (req: Request, res: Response) => {
  try {
    const { booking_id } = req.body;

    const { data: booking } = await Database.from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const [escrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), new anchor.BN(booking_id).toArrayLike(Buffer, 'le', 8)],
      program.programId
    );

    const txSignature = await program.methods
      .release()
      .accounts({
        authority: adminWallet.publicKey,
        escrowState: escrowPDA,
        host: new PublicKey(booking.host_wallet),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await Database.update('bookings', {
      status: 'completed',
      release_tx_signature: txSignature,
    }, { id: booking_id });

    res.json({
      success: true,
      message: 'Funds released to host',
      txSignature,
    });
  } catch (error) {
    console.error('Error releasing escrow:', error);
    res.status(500).json({ success: false, error: 'Error releasing escrow' });
  }
};

/**
 * Refund funds from Escrow PDA to Guest (Admin-signed)
 */
export const refundEscrow = async (req: Request, res: Response) => {
  try {
    const { booking_id } = req.body;

    const { data: booking } = await Database.from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const [escrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), new anchor.BN(booking_id).toArrayLike(Buffer, 'le', 8)],
      program.programId
    );

    const txSignature = await program.methods
      .refund()
      .accounts({
        authority: adminWallet.publicKey,
        escrowState: escrowPDA,
        guest: new PublicKey(booking.guest_wallet),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await Database.update('bookings', {
      status: 'refunded',
      refund_tx_signature: txSignature,
    }, { id: booking_id });

    res.json({
      success: true,
      message: 'Funds refunded to guest',
      txSignature,
    });
  } catch (error) {
    console.error('Error refunding escrow:', error);
    res.status(500).json({ success: false, error: 'Error refunding escrow' });
  }
};

/**
 * Check payment status
 */
export const getPaymentStatus = async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await Database.select<any>('bookings', '*', { id: bookingId });

    if (!booking.length) return res.status(404).json({ error: 'Booking not found' });

    const data = booking[0];
    res.json({
      success: true,
      status: data.status,
      escrow_account: data.escrow_account,
      init_tx_signature: data.init_tx_signature,
      release_tx_signature: data.release_tx_signature,
      refund_tx_signature: data.refund_tx_signature,
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ success: false, error: 'Error fetching payment status' });
  }
};
