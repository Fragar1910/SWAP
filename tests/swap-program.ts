import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SwapProgram } from "../target/types/swap_program";

describe("swap_program", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SwapProgram as Program<SwapProgram>;

  it("Initializes test environment", async () => {
    // Log program ID and wallet public key
    console.log("Program ID:", program.programId.toBase58());
    console.log("Wallet:", provider.wallet.publicKey.toBase58());

    // Verify program is loaded
    console.log("Test environment initialized successfully");
  });
});
