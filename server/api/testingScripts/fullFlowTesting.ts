import fetch, { Response } from "node-fetch";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  OpenStayProgram,
  OpenStayConnection,
  getEscrowPda,
} from "../src/solana_provider/solanaProvider";

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

const API_BASE = "http://localhost:3001/api";

function iso(d: Date): string {
  return d.toISOString();
}

async function airdropIfNeeded(pubKey: PublicKey, amountSOL = 50): Promise<void> {
  const bal = await OpenStayConnection.getBalance(pubKey);
  const needed = amountSOL * LAMPORTS_PER_SOL;
  if (bal < needed) {
    console.log(`Airdropping ${amountSOL} SOL to ${pubKey.toBase58()}`);
    const sig = await OpenStayConnection.requestAirdrop(pubKey, needed);
    await OpenStayConnection.confirmTransaction(sig, "confirmed");
  }
}

async function parseJsonSafe<T>(res: Response): Promise<ApiResponse<T>> {
  try {
    return (await res.json()) as ApiResponse<T>;
  } catch (err) {
    throw new Error(`Failed to parse JSON: ${(err as Error).message}`);
  }
}

async function printBalances(stage: string, host: PublicKey, guest: PublicKey, escrow?: PublicKey) {
  const hostBal = await OpenStayConnection.getBalance(host);
  const guestBal = await OpenStayConnection.getBalance(guest);
  const escrowBal = escrow ? await OpenStayConnection.getBalance(escrow) : 0;

  console.log(`\n💰 --- BALANCES @ ${stage} ---`);
  console.log(`   Host:   ${(hostBal / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`   Guest:  ${(guestBal / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  if (escrow) console.log(`   Escrow: ${(escrowBal / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`-----------------------------\n`);
}

async function main(): Promise<void> {
  console.log("🚀 Starting booking + check-in flow test...");

  // Wallets
  const hostKP = Keypair.generate();
  const guestKP = Keypair.generate();
  console.log("Host wallet:", hostKP.publicKey.toBase58());
  console.log("Guest wallet:", guestKP.publicKey.toBase58());
  await airdropIfNeeded(hostKP.publicKey);
  await airdropIfNeeded(guestKP.publicKey);

  await printBalances("Initial Airdrop", hostKP.publicKey, guestKP.publicKey);

  
  const timestamp = Date.now();
  const hostEmail = `host_${timestamp}@test.com`;
  const guestEmail = `guest_${timestamp}@test.com`;

  const hostJson = await parseJsonSafe<{ user: ApiUser }>(
    await fetch(`${API_BASE}/users/sign-up`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: hostEmail,
        password: "password123",
        firstName: "Host",
        lastName: "Test",
        walletAddress: hostKP.publicKey.toBase58(),
      }),
    })
  );
  if (!hostJson.success || !hostJson.data) throw new Error("Host sign-up failed");
  const hostDbId = hostJson.data.user.id;

  const guestJson = await parseJsonSafe<{ user: ApiUser }>(
    await fetch(`${API_BASE}/users/sign-up`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: guestEmail,
        password: "password123",
        firstName: "Guest",
        lastName: "Test",
        walletAddress: guestKP.publicKey.toBase58(),
      }),
    })
  );
  if (!guestJson.success || !guestJson.data) throw new Error("Guest sign-up failed");
  const guestDbId = guestJson.data.user.id;


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
    cancellationPolicy: "Flexible",
  };

  const listingResp = await parseJsonSafe<{
    property: ApiProperty;
    listingPda: string;
    serializedTransaction?: string;
  }>(
    await fetch(`${API_BASE}/properties/listing/${hostDbId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createPayload),
    })
  );
  if (!listingResp.success || !listingResp.data) throw new Error("Listing creation failed");

  const listingData = listingResp.data;
  const listingPdaStr = listingData.listingPda || listingData.property.listingPda;
  const listingPda = new PublicKey(listingPdaStr);

  // If server returned a create-listing tx, send it (optional)
  if (listingData.serializedTransaction) {
    const tx = anchor.web3.Transaction.from(
      Buffer.from(listingData.serializedTransaction, "base64")
    );
    const { blockhash } = await OpenStayConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = hostKP.publicKey;
    tx.sign(hostKP);
    const txSig = await OpenStayConnection.sendRawTransaction(tx.serialize());
    await OpenStayConnection.confirmTransaction(txSig, "confirmed");
  }

  const checkIn = new Date(Date.now() + 24 * 3600 * 1000);
  const checkOut = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  const createBookingBody = {
    userId: guestDbId,
    listingPda: listingPdaStr,
    guestPublicKey: guestKP.publicKey.toBase58(),
    propertyId: listingData.property.id, // DB UUID
    checkInDate: iso(checkIn),
    checkOutDate: iso(checkOut),
  };

  const bookingJson = await parseJsonSafe<ApiBooking>(
    await fetch(`${API_BASE}/booking/${guestDbId}/${createBookingBody.propertyId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createBookingBody),
    })
  );
  if (!bookingJson.success || !bookingJson.data) throw new Error("Booking creation failed");

  const bookingData = bookingJson.data;
  const bookingId = bookingData.id;
  const bookingTotal = bookingData.total_price;
  const { escrowPda } = getEscrowPda(listingPda);
  await printBalances("Before On-chain Deposit", hostKP.publicKey, guestKP.publicKey, escrowPda);

  let depositSig: string;
  try {
    depositSig = await OpenStayProgram.methods
      .bookListing()
      .accounts({
        listing: listingPda,        
        guest: guestKP.publicKey,    
      })
      .signers([guestKP])
      .rpc();

    console.log("✅ On-chain booking/payment deposited via bookListing");
    console.log("🧾 Tx signature:", depositSig);
  } catch (err) {
    console.error("❌ bookListing transaction failed:", err);
    throw err;
  }

  await printBalances("After On-chain Deposit", hostKP.publicKey, guestKP.publicKey, escrowPda);

  const confirmJson = await parseJsonSafe<any>(
    await fetch(`${API_BASE}/booking/${guestDbId}/${bookingId}/confirm`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId,
        txSignature: depositSig,
        listingPda: listingPdaStr,
        escrowPda: escrowPda.toBase58(),
        guestPublicKey: guestKP.publicKey.toBase58(),
      }),
    })
  );
  if (!confirmJson.success) throw new Error("Confirm booking failed");
  console.log("✅ Booking confirmed server-side");

  await printBalances("After Server Confirmation", hostKP.publicKey, guestKP.publicKey, escrowPda);

  console.log("⏳ Host releasing payment (check-in)...");
  const releaseSig = await OpenStayProgram.methods
    .releasePayment()
    .accounts({
      listing: listingPda,
      host: hostKP.publicKey,
    })
    .signers([hostKP])
    .rpc();

  console.log("✅ On-chain escrow released:", releaseSig);

  const releaseJson = await parseJsonSafe<any>(
    await fetch(`${API_BASE}/booking/${hostDbId}/${bookingId}/checkIn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        txSignature: releaseSig,                    // the *release* tx
        hostPublicKey: hostKP.publicKey.toBase58(), // pass host
      }),
    })
  );
  if (!releaseJson.success) throw new Error("Release payment failed");
  console.log("✅ Escrow released to host (server recorded)");

  await printBalances("After Escrow Release", hostKP.publicKey, guestKP.publicKey, escrowPda);

  console.log("🎉 Booking + Check-In flow completed successfully!");
}

main().catch((err) => {
  console.error("❌ Test run failed:", err);
  process.exit(1);
});
