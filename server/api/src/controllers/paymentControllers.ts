// server/src/api/listings.ts
import express from "express";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolBnbEscrow } from "../sol_bnb_escrow/types/sol_bnb_escrow";
import { Database } from "../database/supabase";

const router = express.Router();

// --- Solana / Anchor setup ---
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.SolBnbEscrow as Program<SolBnbEscrow>;

// --- Constants ---
const PRICE_LAMPORTS = new anchor.BN(1_000_000_000); // default 1 SOL

// --- Helpers ---
function getListingPda(hostPublicKey: anchor.web3.PublicKey) {
  const [listingPda, listingBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("listing"), hostPublicKey.toBuffer()],
    program.programId
  );
  return { listingPda, listingBump };
}

function getEscrowPda(listingPda: anchor.web3.PublicKey) {
  const [escrowPda, escrowBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), listingPda.toBuffer()],
    program.programId
  );
  return { escrowPda, escrowBump };
}


/**
 * Release funds from Escrow PDA to Host (Admin-signed)
 */
export const releaseEscrow = async (req: Request, res: Response) => {
try {
    const listingPda = new anchor.web3.PublicKey(req.params.listingPda);
    const { guestPublicKey } = req.body;
    const guestKey = new anchor.web3.PublicKey(guestPublicKey);

    const listing = await program.account.listing.fetch(listingPda);
    if (!listing.isBooked || !listing.guest.equals(guestKey)) {
      return res.status(400).json({ error: "InvalidGuestOrUnbooked" });
    }

    const { escrowPda } = getEscrowPda(listingPda);

    res.json({
      listingPda: listingPda.toBase58(),
      escrowPda: escrowPda.toBase58(),
      host: listing.host.toBase58(),
      guest: guestKey.toBase58(),
      programId: program.programId.toBase58(),
      message: "Release payment by signing transaction on frontend.",
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};



