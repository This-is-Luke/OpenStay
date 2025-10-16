import fetch from 'node-fetch';
import * as anchor from '@coral-xyz/anchor';
import { Keypair, Connection, LAMPORTS_PER_SOL, PublicKey, Transaction } from '@solana/web3.js';

const SOLANA_NETWORK = "http://127.0.0.1:8899"; // Local Solana
const API_BASE = "http://localhost:3001/api/properties"; // Your server endpoint

async function main() {
  // 1️⃣ Generate a host wallet
  const hostKeypair = Keypair.generate();
  console.log("🔑 Host Public Key:", hostKeypair.publicKey.toBase58());

  // 2️⃣ Connect to Solana and airdrop SOL
  const connection = new Connection(SOLANA_NETWORK, 'confirmed');
  const airdropSig = await connection.requestAirdrop(hostKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(airdropSig, 'confirmed');
  console.log("💰 Airdropped 2 SOL");

  // 3️⃣ Create property listing via API
  const createListingPayload = {
    walletAddress: hostKeypair.publicKey.toBase58(),
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

  try {
    const res = await fetch(`${API_BASE}/listing/${hostKeypair.publicKey.toBase58()}`, {
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

    // 4️⃣ Sign the serialized transaction returned by the API
    if (!createResult.serializedTransaction) {
      console.error('❌ No serialized transaction returned from API');
      return;
    }

    const tx = Transaction.from(Buffer.from(createResult.serializedTransaction, 'base64'));
    tx.sign(hostKeypair); // sign with host wallet

    // 5️⃣ Send signed transaction to Solana
    const txSig = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(txSig);
    console.log("✅ Property listed on-chain, txSig:", txSig);

  } catch (err) {
    console.error('❌ Test script failed:', err);
  }
}

main().catch(console.error);
