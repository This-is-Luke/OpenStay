import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolBnbEscrow } from "../sol_bnb_escrow/types/sol_bnb_escrow";
import { Connection, PublicKey } from '@solana/web3.js';

export const OpenStayConnection = new Connection('http://127.0.0.1:8899', 'confirmed');

// Solana setup
export const OpenStayProvider = anchor.AnchorProvider.env();
anchor.setProvider(OpenStayProvider);
export const OpenStayProgram = anchor.workspace.SolBnbEscrow as Program<SolBnbEscrow>;

// --- Helper to derive listing PDA

export const getListingPda  = (hostPublicKey: anchor.web3.PublicKey)  =>{
     const [listingPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("listing"), hostPublicKey.toBuffer()],
    OpenStayProgram.programId
  );
  return { listingPda, bump };
}
export const getEscrowPda = (listingPda: anchor.web3.PublicKey) =>{
    const [escrowPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), listingPda.toBuffer()],
    OpenStayProgram.programId
  );
  return { escrowPda, bump };
}

// --- Constants ---
export const PRICE_LAMPORTS = new anchor.BN(1_000_000_000); // default 1 SOL
