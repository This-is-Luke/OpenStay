import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolBnbEscrow } from "../target/types/sol_bnb_escrow";
import * as assert from "assert";

describe("sol_bnb_escrow", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.SolBnbEscrow as Program<SolBnbEscrow>;

    // --- Global Constants ---
    const PRICE_LAMPORTS = new anchor.BN(1_000_000_000); // 1 SOL
    const METADATA_URI_1 = "ipfs://host1listing";
    const METADATA_URI_2 = "ipfs://host2listing";

    // --- SETUP HOOKS ---
    before(async () => {
        // Airdrop funds to default provider wallet
        const airdropAmount = 100 * anchor.web3.LAMPORTS_PER_SOL;
        await provider.connection.requestAirdrop(provider.wallet.publicKey, airdropAmount);
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    // --- Helper function to create unique PDAs ---
    function createListingPdas(hostPublicKey: anchor.web3.PublicKey) {
        const [listingPda, listingBump] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("listing"), hostPublicKey.toBuffer()],
            program.programId
        );
        const [escrowPda, escrowBump] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("escrow"), listingPda.toBuffer()],
            program.programId
        );
        return { listingPda, escrowPda, listingBump, escrowBump };
    }

    // --- Test Suite for create_listing ---
    
    it("1. create_listing: Creates a listing and verifies its state", async () => {
        // Create unique host for this test
        const host = anchor.web3.Keypair.generate();
        await provider.connection.requestAirdrop(host.publicKey, 50 * anchor.web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { listingPda, escrowPda } = createListingPdas(host.publicKey);

        // Act: Create the listing
        await program.methods
            .createListing(PRICE_LAMPORTS, METADATA_URI_1)
            .accounts({
                listing: listingPda,
                host: host.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([host])
            .rpc();
        
        // Assert: Fetch and verify account data
        const listing = await program.account.listing.fetch(listingPda);
        assert.ok(listing.host.equals(host.publicKey), "Host key mismatch");
        assert.ok(listing.priceLamports.eq(PRICE_LAMPORTS), "Price mismatch");
        assert.strictEqual(listing.metadataUri, METADATA_URI_1, "URI mismatch");
        assert.strictEqual(listing.isBooked, false, "Listing should not be booked initially");
        
        console.log("✓ Listing created successfully");
        console.log("  Listing PDA:", listingPda.toBase58());
    });
    
    // --- Test Suite for book_listing ---

    it("2. book_listing: Books the listing and deposits SOL to escrow", async () => {
        const host = anchor.web3.Keypair.generate();
        const guest = anchor.web3.Keypair.generate();
        
        await provider.connection.requestAirdrop(host.publicKey, 50 * anchor.web3.LAMPORTS_PER_SOL);
        await provider.connection.requestAirdrop(guest.publicKey, 50 * anchor.web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { listingPda, escrowPda } = createListingPdas(host.publicKey);

        // Arrange: Create listing first
        await program.methods
            .createListing(PRICE_LAMPORTS, METADATA_URI_1)
            .accounts({
                listing: listingPda,
                host: host.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([host])
            .rpc();
        
        const initialGuestBalance = await provider.connection.getBalance(guest.publicKey);
        
        // Act: Call the instruction
        await program.methods
            .bookListing()
            .accounts({
                listing: listingPda,
                escrow: escrowPda,
                guest: guest.publicKey,
                host: host.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([guest])
            .rpc();

        // Assert: Check listing state
        const listing = await program.account.listing.fetch(listingPda);
        assert.strictEqual(listing.isBooked, true, "Listing should be booked");
        assert.ok(listing.guest.equals(guest.publicKey), "Guest mismatch");
        
        // Assert: Check escrow balance
        const escrowBalance = await provider.connection.getBalance(escrowPda);
        assert.ok(new anchor.BN(escrowBalance).gte(PRICE_LAMPORTS), "Escrow balance is incorrect");
        
        console.log("✓ Listing booked successfully");
        console.log("  Escrow balance:", escrowBalance, "lamports");
    });
    
    it("3. book_listing: Fails to book an already booked listing", async () => {
        const host = anchor.web3.Keypair.generate();
        const guest = anchor.web3.Keypair.generate();
        
        await provider.connection.requestAirdrop(host.publicKey, 50 * anchor.web3.LAMPORTS_PER_SOL);
        await provider.connection.requestAirdrop(guest.publicKey, 50 * anchor.web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { listingPda, escrowPda } = createListingPdas(host.publicKey);

        // Create and book the listing
        await program.methods
            .createListing(PRICE_LAMPORTS, METADATA_URI_1)
            .accounts({
                listing: listingPda,
                host: host.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([host])
            .rpc();

        await program.methods
            .bookListing()
            .accounts({
                listing: listingPda,
                escrow: escrowPda,
                guest: guest.publicKey,
                host: host.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([guest])
            .rpc();

        // The listing is now booked. Try to book it again with a different guest.
        try {
            const newGuest = anchor.web3.Keypair.generate();
            await provider.connection.requestAirdrop(newGuest.publicKey, 50 * anchor.web3.LAMPORTS_PER_SOL);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            await program.methods
                .bookListing()
                .accounts({
                    listing: listingPda,
                    escrow: escrowPda,
                    guest: newGuest.publicKey,
                    host: host.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .signers([newGuest])
                .rpc();
            assert.fail("Transaction should have failed with AlreadyBooked error.");
        } catch (error: any) {
            // Assert: Verify the custom error code
            const errorCode = error?.error?.errorCode?.code || error?.message;
            assert.strictEqual(errorCode, "AlreadyBooked", `Expected AlreadyBooked but got: ${errorCode}`);
            console.log("✓ Failed to book already booked listing as expected");
        }
    });

    // --- Test Suite for release_payment ---

    it("4. release_payment: Releases payment to host and resets listing", async () => {
        const host = anchor.web3.Keypair.generate();
        const guest = anchor.web3.Keypair.generate();
        
        await provider.connection.requestAirdrop(host.publicKey, 50 * anchor.web3.LAMPORTS_PER_SOL);
        await provider.connection.requestAirdrop(guest.publicKey, 50 * anchor.web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { listingPda, escrowPda } = createListingPdas(host.publicKey);

        // Create and book the listing
        await program.methods
            .createListing(PRICE_LAMPORTS, METADATA_URI_1)
            .accounts({
                listing: listingPda,
                host: host.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([host])
            .rpc();

        await program.methods
            .bookListing()
            .accounts({
                listing: listingPda,
                escrow: escrowPda,
                guest: guest.publicKey,
                host: host.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([guest])
            .rpc();

        const initialHostBalance = await provider.connection.getBalance(host.publicKey);
        const escrowBalanceBefore = await provider.connection.getBalance(escrowPda);
        
        console.log("  Before release:");
        console.log("    Escrow balance:", escrowBalanceBefore, "lamports");
        console.log("    Host balance:", initialHostBalance, "lamports");
        
        // Act: Call the instruction (Guest must sign to confirm release)
        // Note: Host must sign as well since they own the listing
        await program.methods
            .releasePayment()
            .accounts({
                listing: listingPda,
                escrow: escrowPda,
                host: host.publicKey,
                guest: guest.publicKey, 
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([guest, host])
            .rpc();

        // Assert: Check listing state reset
        const listing = await program.account.listing.fetch(listingPda);
        assert.strictEqual(listing.isBooked, false, "Listing state not reset");
        
        // Assert: Check escrow balance
        const finalEscrowBalance = await provider.connection.getBalance(escrowPda);
        assert.strictEqual(finalEscrowBalance, 0, "Escrow account was not drained");

        // Assert: Check host balance (received the payment)
        const finalHostBalance = await provider.connection.getBalance(host.publicKey);
        const receivedAmount = finalHostBalance - initialHostBalance;
        assert.ok(receivedAmount >= PRICE_LAMPORTS.toNumber() * 0.99, "Host did not receive sufficient payment");

        console.log("✓ Payment released and listing reset successfully");
        console.log("  Host received:", receivedAmount, "lamports");
    });

    it("5. release_payment: Fails when called by an invalid guest", async () => {
        const host = anchor.web3.Keypair.generate();
        const guest = anchor.web3.Keypair.generate();
        
        await provider.connection.requestAirdrop(host.publicKey, 50 * anchor.web3.LAMPORTS_PER_SOL);
        await provider.connection.requestAirdrop(guest.publicKey, 50 * anchor.web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { listingPda, escrowPda } = createListingPdas(host.publicKey);

        // Create and book the listing
        await program.methods
            .createListing(PRICE_LAMPORTS, METADATA_URI_1)
            .accounts({
                listing: listingPda,
                host: host.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([host])
            .rpc();

        await program.methods
            .bookListing()
            .accounts({
                listing: listingPda,
                escrow: escrowPda,
                guest: guest.publicKey,
                host: host.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([guest])
            .rpc();
            
        // Create a bad actor keypair and fund them
        const badActor = anchor.web3.Keypair.generate();
        await provider.connection.requestAirdrop(badActor.publicKey, 50 * anchor.web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Act: Try to release payment using the bad actor as a signer
        try {
            await program.methods
                .releasePayment()
                .accounts({
                    listing: listingPda,
                    escrow: escrowPda,
                    host: host.publicKey,
                    guest: badActor.publicKey, // Bad actor is the signer
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .signers([badActor, host])
                .rpc();
            assert.fail("Transaction should have failed with InvalidGuest error.");
        } catch (error: any) {
            // Assert: Verify the custom error code
            const errorCode = error?.error?.errorCode?.code || error?.message;
            assert.strictEqual(errorCode, "InvalidGuest", `Expected InvalidGuest but got: ${errorCode}`);
            console.log("✓ Failed to release payment by invalid guest as expected");
        }
    });

    // --- Test Suite for get_all_listings (Client-Side Fetch) ---

    it("6. Retrieves all active listings via client-side fetch", async () => {
        const host1 = anchor.web3.Keypair.generate();
        const host2 = anchor.web3.Keypair.generate();
        
        await provider.connection.requestAirdrop(host1.publicKey, 50 * anchor.web3.LAMPORTS_PER_SOL);
        await provider.connection.requestAirdrop(host2.publicKey, 50 * anchor.web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { listingPda: listing1Pda } = createListingPdas(host1.publicKey);
        const { listingPda: listing2Pda } = createListingPdas(host2.publicKey);
        
        // Create the first listing
        await program.methods
            .createListing(PRICE_LAMPORTS, METADATA_URI_1)
            .accounts({
                listing: listing1Pda,
                host: host1.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([host1])
            .rpc();

        // Create the second listing (from a different host)
        await program.methods
            .createListing(new anchor.BN(500000000), METADATA_URI_2)
            .accounts({
                listing: listing2Pda,
                host: host2.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([host2])
            .rpc();

        // Act: Fetch all accounts of that type
        const allListings = await program.account.listing.all();

        // Assert: Verify we found at least two listings
        console.log(`✓ Found ${allListings.length} total listings`);
        assert.ok(allListings.length >= 2, "Should find at least two listings");
        
        // Check data of the fetched listings
        const listingUris = allListings.map(l => l.account.metadataUri);
        assert.ok(listingUris.includes(METADATA_URI_1), "First listing URI is missing.");
        assert.ok(listingUris.includes(METADATA_URI_2), "Second listing URI is missing.");
        
        console.log("✓ Successfully retrieved all listings");
        allListings.forEach((listing, index) => {
            console.log(`  Listing ${index + 1}: ${listing.account.metadataUri} (${listing.account.priceLamports.toNumber()} lamports)`);
        });
    });
});