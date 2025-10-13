import { Request, Response } from 'express';
import { Database } from '../database/supabase';
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');

export const depositToEscrow = async (req: Request, res: Response) => {
  try {
    const { booking_id, payer_wallet } = req.body;
    const booking = await Database.from('bookings').select('*').eq('id', booking_id).single();

    // Build escrow PDA (placeholder)
    const escrowPDA = `PDA_${booking_id}`;
    const totalLamports = Math.round(booking.data.total_price * LAMPORTS_PER_SOL);

    // Create Solana transaction (to be signed client-side)
    const tx = new Transaction().add(SystemProgram.transfer({
      fromPubkey: new PublicKey(payer_wallet),
      toPubkey: new PublicKey('EscrowReceiverPublicKeyHere'),
      lamports: totalLamports
    }));

    await Database.from('bookings').update({
      escrow_account: escrowPDA,
      status: 'in_escrow'
    }).eq('id', booking_id);

    res.json({
      message: 'Escrow deposit initiated',
      escrowAccount: escrowPDA,
      transaction: tx
    });
  } catch {
    res.status(500).json({ error: 'Error depositing to escrow' });
  }
};

export const releaseEscrow = async (req: Request, res: Response) => {
  try {
    const { booking_id } = req.body;
    const booking = await Database.from('bookings').select('*').eq('id', booking_id).single();

    // TODO: use Solana program to release escrow to host
    const releaseTxSig = 'fake_release_tx_sig';
    await Database.from('bookings').update({
      status: 'completed',
      release_tx_signature: releaseTxSig
    }).eq('id', booking_id);

    res.json({ message: 'Funds released to host', tx: releaseTxSig });
  } catch {
    res.status(500).json({ error: 'Error releasing escrow' });
  }
};

export const getPaymentStatus = async (req: Request, res: Response) => {
  const booking = await Database.from('bookings').select('*').eq('id', req.params.bookingId).single();
  res.json({
    status: booking.data.status,
    escrow_account: booking.data.escrow_account,
    payment_tx_signature: booking.data.payment_tx_signature
  });
};
