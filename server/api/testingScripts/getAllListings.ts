import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';

const SOLANA_NETWORK = "http://127.0.0.1:8899";
const PROGRAM_ID = new PublicKey("TDoetY1LKXn5vxxgkpE3keKhpRvbwHV6a2ep2Lreqov");

async function main() {
  const connection = new Connection(SOLANA_NETWORK, 'confirmed');

  try {
    console.log("🔍 Fetching all listings for program:", PROGRAM_ID.toBase58());
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          dataSize: 8 + 91 
        }
      ]
    });

    console.log(`\n✅ Found ${accounts.length} listing(s):\n`);

    accounts.forEach((account, index) => {
      console.log(`--- Listing #${index + 1} ---`);
      console.log("Address:", account.pubkey.toBase58());
      
      const data = account.account.data;
      let offset = 8; // Skip discriminator
      const host = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      console.log("Host:", host.toBase58());
      const priceLamports = data.readBigUInt64LE(offset);
      offset += 8;
      console.log("Price:", Number(priceLamports) / 1e9, "SOL");
      const propertyId = data.slice(offset, offset + 16);
      offset += 16;
      console.log("Property ID:", propertyId.toString('hex'));
      const isBooked = data[offset] === 1;
      offset += 1;
      console.log("Is Booked:", isBooked);
      const hasGuest = data[offset] === 1;
      offset += 1;
      if (hasGuest) {
        const guest = new PublicKey(data.slice(offset, offset + 32));
        console.log("Guest:", guest.toBase58());
      } else {
        console.log("Guest: None");
      }
      
      console.log("");
    });

  } catch (error) {
    console.error("❌ Error fetching listings:", error);
  }
}

main().catch(console.error);