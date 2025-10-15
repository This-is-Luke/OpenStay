// File: /Users/racqueldennison/Desktop/Colosseum cyberpunk/sol-bnb/server/api/src/solana_provider/solanaProvider.ts

import * as anchor from "@coral-xyz/anchor";
import { Program, Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as os from 'os';

// 1. Anchor-generated types (ensure this path is correct)
import { SolBnbEscrow } from "../sol_bnb_escrow/types/sol_bnb_escrow"; 
// 2. Anchor-generated IDL JSON (ensure this path is correct)
import IDL_JSON from '../sol_bnb_escrow/idl/sol_bnb_escrow.json' 


// =========================================================================
// 🔑 CONFIGURATION & CONSTANTS
// =========================================================================

// The Program ID must be a constant at the top
const PROGRAM_ID_STRING = 'TDoetY1LKXn5vxxgkpE3keKhpRvbwHV6a2ep2Lreqov'; 

// 1. Manually specify the URL for the local validator
const RPC_URL = 'http://127.0.0.1:8899';
// 2. Manually specify the path to the keypair used for signing transactions
const WALLET_PATH = `${os.homedir()}/.config/solana/id.json`;


// =========================================================================
// 🚀 CONNECTION & PROVIDER SETUP
// =========================================================================

// 1. Initialize the Connection
export const OpenStayConnection = new Connection(RPC_URL, 'confirmed');

// 2. Load the Payer Wallet Keypair from the file system
const loadPayerWallet = () => {
    try {
        const secretKey = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8'));
        const payerKeypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
        return new anchor.Wallet(payerKeypair);
    } catch (error) {
        console.error("Failed to load Anchor Wallet from file:", error);
        console.error(`Ensure your keypair is at: ${WALLET_PATH}`);
        throw new Error("Could not initialize Anchor Payer Wallet.");
    }
}
const OpenStayWallet = loadPayerWallet();

// 3. Manually create the Provider
export const OpenStayProvider = new anchor.AnchorProvider(
    OpenStayConnection,
    OpenStayWallet,
    { commitment: "confirmed" } 
);

anchor.setProvider(OpenStayProvider);

// 4. Manually create the Program instance using the IDL and Program ID
var PROGRAM_ID = new PublicKey(PROGRAM_ID_STRING);

export const OpenStayProgram = new Program<SolBnbEscrow>(
    IDL_JSON as SolBnbEscrow,  // Cast to the type instead of Idl
    OpenStayProvider
);

// =========================================================================
// 🛠️ HELPER FUNCTIONS & CONSTANTS
// =========================================================================

// --- Helper to derive listing PDA
export const getListingPda  = (hostPublicKey: anchor.web3.PublicKey)  =>{
     const [listingPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("listing"), hostPublicKey.toBuffer()],
    OpenStayProgram.programId
  );
  return { listingPda, bump };
}

// --- Helper to derive escrow PDA
export const getEscrowPda = (listingPda: anchor.web3.PublicKey) =>{
    const [escrowPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), listingPda.toBuffer()],
    OpenStayProgram.programId
  );
  return { escrowPda, bump };
}

// --- Constants ---
export const PRICE_LAMPORTS = new anchor.BN(1_000_000_000); // default 1 SOL