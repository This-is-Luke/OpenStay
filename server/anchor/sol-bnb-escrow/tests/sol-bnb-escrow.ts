import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolBnbEscrow } from "../target/types/sol_bnb_escrow";
import { assert } from "chai";

describe("sol-bnb-escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolBnbEscrow as Program<SolBnbEscrow>;

  const guest = anchor.web3.Keypair.generate();
  const host = anchor.web3.Keypair.generate();
  const bookingId = new anchor.BN(1);
  const amountLamports = new anchor.BN(0.01 * anchor.web3.LAMPORTS_PER_SOL);

  let escrowPda: anchor.web3.PublicKey;
  let bump: number;

  it("Initialize escrow", async () => {
    [escrowPda, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("escrow"), bookingId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    await provider.connection.requestAirdrop(guest.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(host.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);

    await program.methods
      .initializeEscrow(bookingId, amountLamports)
      .accounts({
        payer: provider.wallet.publicKey,
        guest: guest.publicKey,
        host: host.publicKey,
        escrowState: escrowPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const escrowState = await program.account.escrowState.fetch(escrowPda);
    assert.equal(escrowState.amount.toNumber(), amountLamports.toNumber());
  });

  it("Deposit funds into escrow", async () => {
    const guestProvider = new anchor.AnchorProvider(provider.connection, new anchor.Wallet(guest), {});
    anchor.setProvider(guestProvider);

    await program.methods
      .deposit()
      .accounts({
        guest: guest.publicKey,
        escrowState: escrowPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const balance = await provider.connection.getBalance(escrowPda);
    assert(balance >= amountLamports.toNumber());
  });

  it("Release funds to host", async () => {
    anchor.setProvider(provider);
    await program.methods
      .release()
      .accounts({
        authority: provider.wallet.publicKey,
        escrowState: escrowPda,
        host: host.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const escrowState = await program.account.escrowState.fetch(escrowPda);
    assert.isTrue(escrowState.released);
  });
});
