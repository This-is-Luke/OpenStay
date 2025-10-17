// File: test/bookingFlow.ts
import fetch, { Response } from 'node-fetch';
import {
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { OpenStayProgram, OpenStayConnection, getEscrowPda } from "../src/solana_provider/solanaProvider";

// ---------------- TYPES ----------------
interface ApiUser {
  id: string;
  email: string;
  walletAddress: string;
  [key: string]: any;
}

interface ApiProperty {
  id: string;
  hostId: string;
  hostPublicKey: string;
  listingPda: string;
  [key: string]: any;
}

interface ApiBooking {
  id: string;
  propertyId: string;
  total_price: number;
  escrow_account: string;
  [key: string]: any;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// ---------------- CONSTANTS ----------------
const API_BASE = "http://localhost:3001/api";

// ---------------- UTIL FUNCTIONS ----------------
function iso(d: Date): string { return d.toISOString(); }

async function airdropIfNeeded(pubKey: PublicKey, amountSOL = 50): Promise<void> {
  const bal = await OpenStayConnection.getBalance(pubKey);
  const needed = amountSOL * LAMPORTS_PER_SOL;
  if (bal < needed) {
    console.log(`Airdropping ${amountSOL} SOL to ${pubKey.toBase58()}`);
    const sig = await OpenStayConnection.requestAirdrop(pubKey, needed);
    await OpenStayConnection.confirmTransaction(sig, 'confirmed');
  }
}

async function parseJsonSafe<T>(res: Response): Promise<ApiResponse<T>> {
  try { return (await res.json()) as ApiResponse<T>; }
  catch (err) { throw new Error(`Failed to parse JSON: ${(err as Error).message}`); }
}

// ---------------- MAIN FLOW ----------------
async function main(): Promise<void> {
  console.log("🚀 Starting booking flow test...");

  // --- Generate wallets ---
  const hostKP = Keypair.generate();
  const guestKP = Keypair.generate();
  console.log("Host wallet:", hostKP.publicKey.toBase58());
  console.log("Guest wallet:", guestKP.publicKey.toBase58());
  await airdropIfNeeded(hostKP.publicKey);
  await airdropIfNeeded(guestKP.publicKey);

  // --- Sign up users ---
  const timestamp = Date.now();
  const hostEmail = `host_${timestamp}@test.com`;
  const guestEmail = `guest_${timestamp}@test.com`;

  const hostJson = await parseJsonSafe<{ user: ApiUser }>(
    await fetch(`${API_BASE}/users/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: hostEmail,
        password: "password123",
        firstName: "Host",
        lastName: "Test",
        walletAddress: hostKP.publicKey.toBase58()
      })
    })
  );
  if (!hostJson.success || !hostJson.data) throw new Error("Host sign-up failed");
  const hostDbId = hostJson.data.user.id;

  const guestJson = await parseJsonSafe<{ user: ApiUser }>(
    await fetch(`${API_BASE}/users/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: guestEmail,
        password: "password123",
        firstName: "Guest",
        lastName: "Test",
        walletAddress: guestKP.publicKey.toBase58()
      })
    })
  );
  if (!guestJson.success || !guestJson.data) throw new Error("Guest sign-up failed");
  const guestDbId = guestJson.data.user.id;

  // --- Create listing via API ---
  const createPayload = {
    hostPublicKey: hostKP.publicKey.toBase58(),
    title: "Test Cabin",
    description: "Integration test listing",
    propertyType: "Cabin",
    address: "123 Test Lane",
    city: "Testville",
    state: "TS",
    country: "Testland",
    latitude: 0,
    longitude: 0,
    pricePerNight: 1.5,
    cleaningFee: 0,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    images: [],
    instantBook: true,
    checkInTime: "15:00",
    checkOutTime: "10:00",
    cancellationPolicy: "Flexible"
  };

  const listingResp = await parseJsonSafe<{ property: ApiProperty; listingPda: string; serializedTransaction?: string }>(
    await fetch(`${API_BASE}/properties/listing/${hostDbId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload)
    })
  );
  if (!listingResp.success || !listingResp.data) throw new Error("Listing creation failed");

  const listingData = listingResp.data;
  const listingPda = listingData.listingPda || listingData.property.listingPda;

  // --- On-chain listing creation if needed ---
  if (listingData.serializedTransaction) {
    const tx = anchor.web3.Transaction.from(Buffer.from(listingData.serializedTransaction, 'base64'));
    const { blockhash } = await OpenStayConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = hostKP.publicKey;
    tx.sign(hostKP);
    const txSig = await OpenStayConnection.sendRawTransaction(tx.serialize());
    await OpenStayConnection.confirmTransaction(txSig, 'confirmed');
  }

  // --- Create booking via API ---
  const checkIn = new Date(Date.now() + 24 * 3600 * 1000);
  const checkOut = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  const createBookingBody = {
    userId: guestDbId,
    listingPda,
    guestPublicKey: guestKP.publicKey.toBase58(),
    propertyId: listingData.property.id,
    checkInDate: iso(checkIn),
    checkOutDate: iso(checkOut)
  };

  const bookingJson = await parseJsonSafe<ApiBooking>(
    await fetch(`${API_BASE}/booking/${guestDbId}/${createBookingBody.propertyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBookingBody)
    })
  );
  if (!bookingJson.success || !bookingJson.data) throw new Error("Booking creation failed");

  const bookingData = bookingJson.data;
  const bookingId = bookingData.id;
  const bookingTotal = bookingData.total_price;
  const { escrowPda } = getEscrowPda(new PublicKey(listingPda));
  const lamports = Math.round(bookingTotal * LAMPORTS_PER_SOL);

  // --- Book listing ON-CHAIN using book_listing ---
  try {
    await OpenStayProgram.methods.bookListing()
    .accounts({
        listing: new PublicKey(listingPda),
        guest: guestKP.publicKey
    })
    .signers([guestKP])
    .rpc();
    console.log("✅ Booking/payment deposited on-chain via book_listing");
  } catch (err) {
    console.error("❌ book_listing transaction failed:", err);
    throw err;
  }

  // --- Confirm booking server-side ---
  const confirmJson = await parseJsonSafe<any>(
    await fetch(`${API_BASE}/booking/${guestDbId}/${bookingId}/confirm`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, listingPda, escrowPda: escrowPda.toBase58(), guestPublicKey: guestKP.publicKey.toBase58() })
    })
  );
  if (!confirmJson.success) throw new Error("Confirm booking failed");

  // --- Check escrow balance ---
  const escrowBal = await OpenStayConnection.getBalance(escrowPda);
  console.log("Escrow PDA balance (lamports):", escrowBal, "expected at least", lamports);

  console.log("🎉 Booking flow test completed successfully!");
}

main().catch(err => {
  console.error("Test run failed:", err);
  process.exit(1);
});
