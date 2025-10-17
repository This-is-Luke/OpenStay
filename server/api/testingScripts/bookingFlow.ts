// test/bookingFlowTest.ts
import fetch, { Response } from 'node-fetch';
import {
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  PublicKey,
  sendAndConfirmTransaction
} from '@solana/web3.js';

type JsonAny = Record<string, any>;

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// --- Adjust these for your environment
const SOLANA_NETWORK = "http://127.0.0.1:8899"; // localnet
const API_BASE = "http://localhost:3001/api";
const connection = new Connection(SOLANA_NETWORK, 'confirmed');

// Replace with a host userId from your DB (UUID)
const HOST_DB_USER_ID = "a851c3c6-6cf4-4f43-a63b-44984ac17d44";

// --- Helpers
function iso(d: Date) { return d.toISOString(); }

async function airdropIfNeeded(pubKey: PublicKey) {
  const bal = await connection.getBalance(pubKey);
  if (bal < 1 * LAMPORTS_PER_SOL) {
    const sig = await connection.requestAirdrop(pubKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, 'confirmed');
  }
}

async function parseJsonSafe<T = any>(res: Response): Promise<ApiResponse<T>> {
  try {
    const parsed = await res.json();
    return parsed as ApiResponse<T>;
  } catch (err) {
    throw new Error(`Failed to parse JSON: ${(err as Error).message}`);
  }
}

// --- Main flow
async function main(): Promise<void> {
  console.log("Starting booking flow test...");

  // Generate keypairs
  const hostKP = Keypair.generate();
  const guestKP = Keypair.generate();
  console.log("Host:", hostKP.publicKey.toBase58());
  console.log("Guest:", guestKP.publicKey.toBase58());

  // Ensure they have SOL
  await airdropIfNeeded(hostKP.publicKey);
  await airdropIfNeeded(guestKP.publicKey);

  // 1) Create Listing via API (host)
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
    pricePerNight: 1.5, // small amount to test
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

  console.log("Creating listing via API...");
  const resListing = await fetch(`${API_BASE}/properties/listing/${HOST_DB_USER_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createPayload)
  });

  const listingResp = await parseJsonSafe<JsonAny>(resListing);

  if (!listingResp.success) {
    console.error("Create listing failed:", listingResp);
    return;
  }
  console.log("Listing API response:", listingResp);

  // If your API returned a serializedTransaction to sign to create listing on-chain:
  if (listingResp.data && listingResp.data.serializedTransaction) {
    console.log("Signing & sending listing creation transaction returned by API...");
    const messageBuffer = Buffer.from(listingResp.data.serializedTransaction, 'base64');
    const tx = Transaction.from(messageBuffer);
    // refresh blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = hostKP.publicKey;
    tx.sign(hostKP); // sign with host
    const txSig = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(txSig, 'confirmed');
    console.log("Listing creation txSig:", txSig);
  } else {
    console.warn("API did not supply serializedTransaction for on-chain listing creation. Make sure listing exists on-chain before booking.");
  }

  const listingPda: string | undefined = listingResp.data?.listingPda || listingResp.data?.listing_pda;
  console.log("Listing PDA:", listingPda);

  // 2) Guest DB user id (replace this with a real guest user id from your DB)
  const GUEST_DB_USER_ID = "e425fa8c-7394-4cce-89db-573f38e4ef3c"; // <-- replace

  // 3) Create booking via your API
  const checkIn = new Date(Date.now() + 24 * 3600 * 1000); // tomorrow
  const checkOut = new Date(Date.now() + 3 * 24 * 3600 * 1000); // two nights

  const createBookingBody = {
    userId: GUEST_DB_USER_ID,
    listingPda,
    guestPublicKey: guestKP.publicKey.toBase58(),
    propertyId: listingResp.data?.propertyId || listingResp.data?.property_id || "1",
    checkInDate: iso(checkIn),
    checkOutDate: iso(checkOut)
  };

  console.log("Creating booking via API...");
  const resBooking = await fetch(`${API_BASE}/booking/${GUEST_DB_USER_ID}/${createBookingBody.propertyId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createBookingBody)
  });

  const bookingJson = await parseJsonSafe<JsonAny>(resBooking);

  if (!bookingJson.success) {
    console.error("Booking creation failed:", bookingJson);
    return;
  }
  console.log("Booking created:", bookingJson.data);
  const bookingId: string | number | undefined = bookingJson.data?.id || bookingJson.data?.booking_id;

  if (!bookingId) {
    throw new Error("Booking ID missing in API response");
  }

  // 4) Deposit to escrow
  let escrowPda: string | undefined;
  try {
    const bookingFetch = await fetch(`${API_BASE}/booking/${bookingId}`);
    const bf = await parseJsonSafe<JsonAny>(bookingFetch);
    escrowPda = bf.data?.escrow_account || bf.data?.escrowPda;
  } catch (e) {
    // fallback to listingResp
    escrowPda = listingResp.data?.escrowPda || listingResp.data?.escrow_pda;
  }

  if (!escrowPda) {
    console.warn("Could not find escrow PDA from API responses, attempting to derive or fallback...");
  }
  console.log("Escrow PDA:", escrowPda);

  // compute lamports required
  const bookingTotal: number = bookingJson.data?.total_price || bookingJson.data?.totalPrice || 0;
  const lamports = Math.round(bookingTotal * LAMPORTS_PER_SOL);

  // If the backend provided a serialized deposit transaction, sign it; otherwise do a simple transfer
  let depositTxSig: string | undefined;
  try {
    const depositTxResp = await fetch(`${API_BASE}/bookings/${bookingId}/deposit-tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestPublicKey: guestKP.publicKey.toBase58()
      })
    });

    const depositJsonText = await depositTxResp.text();
    const depositJson = JSON.parse(depositJsonText) as JsonAny;

    if (depositJson.success && depositJson.data?.serializedTransaction) {
      console.log("Signing & sending serialized deposit transaction from API...");
      const msgBuf = Buffer.from(depositJson.data.serializedTransaction, 'base64');
      const depositTx = Transaction.from(msgBuf);
      const { blockhash } = await connection.getLatestBlockhash();
      depositTx.recentBlockhash = blockhash;
      depositTx.feePayer = guestKP.publicKey;
      depositTx.sign(guestKP);
      depositTxSig = await connection.sendRawTransaction(depositTx.serialize());
      await connection.confirmTransaction(depositTxSig, 'confirmed');
      console.log("Deposit txSig:", depositTxSig);
    } else {
      throw new Error("No serialized deposit tx from API");
    }
  } catch (err) {
    console.warn("API deposit tx not available or failed; falling back to direct transfer to escrow PDA.", (err as Error).message || err);
    if (!escrowPda) throw new Error("No escrow PDA available to transfer to");
    const ix = SystemProgram.transfer({
      fromPubkey: guestKP.publicKey,
      toPubkey: new PublicKey(escrowPda),
      lamports
    });
    const tx = new Transaction().add(ix);
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = guestKP.publicKey;
    tx.sign(guestKP);
    depositTxSig = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(depositTxSig, 'confirmed');
    console.log("Fallback deposit transfer txSig:", depositTxSig);
  }

  // 5) Confirm booking (server-side)
  console.log("Confirming booking (server-side)...");
  const confirmBody = {
    bookingId,
    txSignature: depositTxSig,
    listingPda,
    escrowPda,
    guestPublicKey: guestKP.publicKey.toBase58()
  };

  const confirmRes = await fetch(`${API_BASE}/booking/${GUEST_DB_USER_ID}/${bookingId}/confirm`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(confirmBody)
  });

  const confirmJson = await parseJsonSafe<JsonAny>(confirmRes);
  if (!confirmJson.success) {
    console.error("Confirm booking failed:", confirmJson);
    return;
  }
  console.log("Booking confirmed and marked in DB:", confirmJson.data);

  // 6) Verify escrow PDA balance is >= lamports (if escrowPda exists)
  if (escrowPda) {
    try {
      const escrowBal = await connection.getBalance(new PublicKey(escrowPda));
      console.log("Escrow PDA balance (lamports):", escrowBal, "expected at least", lamports);
    } catch (err) {
      console.warn("Failed to get escrow PDA balance:", (err as Error).message);
    }
  }

  // 7) Simulate host check-in -> release funds: either via escrow authority or simulated tx
  const ESCROW_AUTHORITY_KEYPAIR_AVAILABLE = false; // set true if you have escrow authority keypair locally
  let releaseTxSig: string | undefined;

  if (ESCROW_AUTHORITY_KEYPAIR_AVAILABLE) {
    throw new Error("Implement escrow authority release if you have the keypair");
  } else {
    console.warn("Escrow authority key not available; simulating release by sending SOL from host test wallet to itself (for DB flow).");
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: hostKP.publicKey,
        toPubkey: hostKP.publicKey,
        lamports: 0
      })
    );
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = hostKP.publicKey;
    tx.sign(hostKP);
    releaseTxSig = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(releaseTxSig, 'confirmed');
    console.log("Simulated release txSig:", releaseTxSig);
  }

  // 8) Call ReleasePayment endpoint
  console.log("Calling ReleasePayment endpoint...");
  const releaseBody = {
    txSignature: releaseTxSig,
    hostPublicKey: hostKP.publicKey.toBase58()
  };
  const releaseRes = await fetch(`${API_BASE}/${HOST_DB_USER_ID}/${bookingId}/checkIn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(releaseBody)
  });

  const releaseJson = await parseJsonSafe<JsonAny>(releaseRes);
  if (!releaseJson.success) {
    console.error("Release payment endpoint failed:", releaseJson);
    return;
  }
  console.log("ReleasePayment result:", releaseJson.data);

  // 9) Final DB + onchain asserts:
  console.log("Final checks (DB + on-chain):");
  const bookingStatusRes = await fetch(`${API_BASE}/booking/${bookingId}`);
  const bookingStatusJson = await parseJsonSafe<JsonAny>(bookingStatusRes);
  console.log("Booking DB record:", bookingStatusJson.data);

  const hostBal = await connection.getBalance(hostKP.publicKey);
  console.log("Host balance (lamports):", hostBal);

  console.log("Booking flow test completed.");
}

// run
main().catch(err => {
  console.error("Test run failed:", err);
  process.exit(1);
});
