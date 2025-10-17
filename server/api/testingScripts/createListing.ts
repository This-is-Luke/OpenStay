import fetch from 'node-fetch';
import * as anchor from '@coral-xyz/anchor';
import { Keypair, Connection, LAMPORTS_PER_SOL, Transaction, VersionedTransaction } from '@solana/web3.js';

const SOLANA_NETWORK = "http://127.0.0.1:8899";
const API_BASE = "http://localhost:3001/api";
const EXPECTED_PROGRAM_ID = "TDoetY1LKXn5vxxgkpE3keKhpRvbwHV6a2ep2Lreqov";



async function verifyProgramDeployed(connection: Connection, programId: string): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(new anchor.web3.PublicKey(programId));
    if (accountInfo && accountInfo.executable) {
      console.log("✅ Program is deployed and executable");
      return true;
    } else {
      console.error("❌ Program account exists but is not executable");
      return false;
    }
  } catch (error) {
    console.error("❌ Program not found on chain:", error);
    return false;
  }
}


async function main() {
try{
  // 1️⃣ Generate a host wallet
  const hostKeypair = Keypair.generate();
  console.log("🔑 Host Public Key:", hostKeypair.publicKey.toBase58());

  const connection = new Connection(SOLANA_NETWORK, 'confirmed');
   // 2.5️⃣ Verify program is deployed
  console.log("🔍 Checking if program is deployed...");
  const isProgramDeployed = await verifyProgramDeployed(connection, EXPECTED_PROGRAM_ID);
  if (!isProgramDeployed) {
    console.error("\n❌ PROGRAM NOT DEPLOYED!");
    console.error("Please deploy your program first:");
    console.error("  cd /path/to/your/solana/program");
    console.error("  anchor build");
    console.error("  anchor deploy");
    return;
  }
  
  // 2️⃣ Connect to Solana and airdrop SOL
  const airdropSig = await connection.requestAirdrop(hostKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(airdropSig, 'confirmed');
  console.log("💰 Airdropped 2 SOL");

  // 3️⃣ First, create or get a user (you'll need a user endpoint)
  // For now, assuming you have a hostId (UUID from your database)
    const hostId = "a851c3c6-6cf4-4f43-a63b-44984ac17d44"; // You need to get this from your user creation endpoint


    const actualHostId = "a851c3c6-6cf4-4f43-a63b-44984ac17d44"; // Use the returned user ID

    // 4️⃣ Create property listing via API
    const createListingPayload = {
      hostPublicKey: hostKeypair.publicKey.toBase58(),
      title: "Charming Lakeside Cabin",
      description: "A cozy cabin for romantic getaways.",
      propertyType: "Cabin",
      address: "123 Serenity Lane",
      city: "Lakeview",
      state: "California",
      country: "USA",
      latitude: 34.0522,
      longitude: -118.2437,
      pricePerNight: 150.0,
      cleaningFee: 25.0,
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 1,
      amenities: ["WiFi", "Kitchen", "Heating", "Private entrance", "Parking", "Lake access"],
      houseRules: ["No smoking indoors", "Quiet hours after 10 PM", "Pets allowed upon request"],
      images: [
        "https://example.com/images/cabin_main.jpg",
        "https://example.com/images/cabin_kitchen.jpg",
        "https://example.com/images/cabin_view.jpg"
      ],
      instantBook: true,
      checkInTime: "15:00",
      checkOutTime: "10:00",
      cancellationPolicy: "Flexible"
    };

    const res = await fetch(`${API_BASE}/properties/listing/${actualHostId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createListingPayload)
    });

    const text = await res.text();
    let createResult: any;
    
    try {
      createResult = JSON.parse(text);
    } catch {
      console.error('❌ API returned non-JSON:', text);
      return;
    }

    console.log("📦 API Response:", createResult);

    if (!createResult.success) {
      console.error('❌ API Error:', createResult.message);
      return;
    }

    // 5️⃣ Sign the serialized transaction returned by the API
    if (!createResult.data.serializedTransaction) {
      console.error('❌ No serialized transaction returned from API');
      return;
    }
 
    // Deserialize the transaction properly
    const messageBuffer = Buffer.from(createResult.data.serializedTransaction, 'base64');
    const tx = Transaction.from(messageBuffer);
    
    // Get fresh blockhash just to be safe
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = hostKeypair.publicKey;
    
    // Sign with host wallet
    tx.sign(hostKeypair);

    // 6️⃣ Send signed transaction to Solana
    const txSig = await connection.sendRawTransaction(tx.serialize());
    console.log("📤 Transaction sent:", txSig);
    
    await connection.confirmTransaction(txSig, 'confirmed');
    console.log("✅ Property listed on-chain, txSig:", txSig);
    console.log("🏠 Listing PDA:", createResult.data.listingPda);

  } catch (err) {
    console.error('❌ Test script failed:', err);
    if (err instanceof Error) {
      console.error('Error details:', err.message);
      console.error('Stack:', err.stack);
    }
  }
}

main().catch(console.error);