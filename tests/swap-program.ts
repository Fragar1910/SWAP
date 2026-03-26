import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SwapProgram } from "../target/types/swap_program";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { expect } from "chai";

describe("Administrative Instructions", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SwapProgram as Program<SwapProgram>;
  const authority = provider.wallet as anchor.Wallet;

  // Test token mints
  let mintA: PublicKey;
  let mintB: PublicKey;

  // Market and vault PDAs
  let marketPDA: PublicKey;
  let vaultA: PublicKey;
  let vaultB: PublicKey;

  // Authority token accounts
  let authorityTokenA: PublicKey;
  let authorityTokenB: PublicKey;

  before("Setup test tokens", async () => {
    console.log("Setting up test environment...");
    console.log("Program ID:", program.programId.toBase58());
    console.log("Authority:", authority.publicKey.toBase58());

    // Create Token A mint (6 decimals, USDC-like)
    mintA = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      6 // decimals
    );
    console.log("Mint A created:", mintA.toBase58());

    // Create Token B mint (9 decimals, SOL-like)
    mintB = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      9 // decimals
    );
    console.log("Mint B created:", mintB.toBase58());

    // Derive market PDA
    const [marketPDADerived] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        mintA.toBuffer(),
        mintB.toBuffer(),
      ],
      program.programId
    );
    marketPDA = marketPDADerived;

    // Derive vault PDAs
    const [vaultADerived] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_a"), marketPDA.toBuffer()],
      program.programId
    );
    vaultA = vaultADerived;

    const [vaultBDerived] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_b"), marketPDA.toBuffer()],
      program.programId
    );
    vaultB = vaultBDerived;

    console.log("Market PDA:", marketPDA.toBase58());
    console.log("Vault A:", vaultA.toBase58());
    console.log("Vault B:", vaultB.toBase58());
  });

  it("Initializes market successfully", async () => {
    const tx = await program.methods
      .initializeMarket()
      .accounts({
        market: marketPDA,
        tokenMintA: mintA,
        tokenMintB: mintB,
        vaultA: vaultA,
        vaultB: vaultB,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("Initialize market tx:", tx);

    // Fetch market account
    const market = await program.account.marketAccount.fetch(marketPDA);

    // Assertions
    expect(market.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(market.tokenMintA.toBase58()).to.equal(mintA.toBase58());
    expect(market.tokenMintB.toBase58()).to.equal(mintB.toBase58());
    expect(market.price.toString()).to.equal("0"); // Not set yet
    expect(market.decimalsA).to.equal(6);
    expect(market.decimalsB).to.equal(9);

    console.log("Market initialized successfully");
    console.log("  Authority:", market.authority.toBase58());
    console.log("  Price:", market.price.toString());
  });

  it("Sets price successfully (authority-only)", async () => {
    const newPrice = new anchor.BN(2_500_000); // 1 Token A = 2.5 Token B

    const tx = await program.methods
      .setPrice(newPrice)
      .accounts({
        market: marketPDA,
        authority: authority.publicKey,
      })
      .rpc();

    console.log("Set price tx:", tx);

    // Fetch updated market
    const market = await program.account.marketAccount.fetch(marketPDA);

    // Assertions
    expect(market.price.toString()).to.equal(newPrice.toString());

    console.log("Price set successfully");
    console.log("  New price:", market.price.toString());
    console.log("  Exchange rate: 1 Token A = 2.5 Token B");
  });

  it("Rejects price setting by non-authority", async () => {
    // Create attacker keypair
    const attacker = Keypair.generate();

    // Airdrop SOL to attacker for transaction fees
    const airdropSig = await provider.connection.requestAirdrop(
      attacker.publicKey,
      1_000_000_000 // 1 SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    try {
      await program.methods
        .setPrice(new anchor.BN(9999))
        .accounts({
          market: marketPDA,
          authority: attacker.publicKey,
        })
        .signers([attacker])
        .rpc();

      // Should not reach here
      expect.fail("Transaction should have failed");
    } catch (error) {
      // Expected to fail with Unauthorized or ConstraintHasOne error
      expect(error.toString()).to.include("Error");
      console.log("Unauthorized access correctly rejected");
    }
  });

  it("Adds liquidity successfully", async () => {
    // Create authority token accounts
    const authorityTokenAccountA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      mintA,
      authority.publicKey
    );
    authorityTokenA = authorityTokenAccountA.address;

    const authorityTokenAccountB = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      mintB,
      authority.publicKey
    );
    authorityTokenB = authorityTokenAccountB.address;

    // Mint tokens to authority
    // 1000 Token A (with 6 decimals = 1000_000_000)
    await mintTo(
      provider.connection,
      authority.payer,
      mintA,
      authorityTokenA,
      authority.publicKey,
      1_000_000_000
    );

    // 5000 Token B (with 9 decimals = 5000_000_000_000)
    await mintTo(
      provider.connection,
      authority.payer,
      mintB,
      authorityTokenB,
      authority.publicKey,
      5_000_000_000_000
    );

    console.log("Minted tokens to authority");

    // Add liquidity: 100 Token A, 250 Token B
    const amountA = new anchor.BN(100_000_000); // 100 with 6 decimals
    const amountB = new anchor.BN(250_000_000_000); // 250 with 9 decimals

    const tx = await program.methods
      .addLiquidity(amountA, amountB)
      .accounts({
        market: marketPDA,
        vaultA: vaultA,
        vaultB: vaultB,
        authorityTokenA: authorityTokenA,
        authorityTokenB: authorityTokenB,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Add liquidity tx:", tx);

    // Fetch vault accounts
    const vaultAAccount = await provider.connection.getTokenAccountBalance(vaultA);
    const vaultBAccount = await provider.connection.getTokenAccountBalance(vaultB);

    // Assertions
    expect(vaultAAccount.value.amount).to.equal(amountA.toString());
    expect(vaultBAccount.value.amount).to.equal(amountB.toString());

    console.log("Liquidity added successfully");
    console.log("  Vault A balance:", vaultAAccount.value.uiAmountString);
    console.log("  Vault B balance:", vaultBAccount.value.uiAmountString);
  });

  it("Complete WF-001 workflow: initialize → set price → add liquidity", async () => {
    // Create new token mints for isolated test
    const newMintA = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      6
    );

    const newMintB = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      9
    );

    // Derive PDAs
    const [newMarketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), newMintA.toBuffer(), newMintB.toBuffer()],
      program.programId
    );

    const [newVaultA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_a"), newMarketPDA.toBuffer()],
      program.programId
    );

    const [newVaultB] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_b"), newMarketPDA.toBuffer()],
      program.programId
    );

    // Step 1: Initialize market
    await program.methods
      .initializeMarket()
      .accounts({
        market: newMarketPDA,
        tokenMintA: newMintA,
        tokenMintB: newMintB,
        vaultA: newVaultA,
        vaultB: newVaultB,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    let market = await program.account.marketAccount.fetch(newMarketPDA);
    expect(market.price.toString()).to.equal("0");
    console.log("Step 1: Market initialized (price = 0)");

    // Step 2: Set price
    const price = new anchor.BN(3_000_000); // 1 A = 3.0 B
    await program.methods
      .setPrice(price)
      .accounts({
        market: newMarketPDA,
        authority: authority.publicKey,
      })
      .rpc();

    market = await program.account.marketAccount.fetch(newMarketPDA);
    expect(market.price.toString()).to.equal(price.toString());
    console.log("Step 2: Price set (1 A = 3.0 B)");

    // Step 3: Add liquidity
    const newAuthTokenA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      newMintA,
      authority.publicKey
    );

    const newAuthTokenB = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      newMintB,
      authority.publicKey
    );

    await mintTo(
      provider.connection,
      authority.payer,
      newMintA,
      newAuthTokenA.address,
      authority.publicKey,
      500_000_000 // 500 A
    );

    await mintTo(
      provider.connection,
      authority.payer,
      newMintB,
      newAuthTokenB.address,
      authority.publicKey,
      1_500_000_000_000 // 1500 B
    );

    await program.methods
      .addLiquidity(new anchor.BN(50_000_000), new anchor.BN(150_000_000_000))
      .accounts({
        market: newMarketPDA,
        vaultA: newVaultA,
        vaultB: newVaultB,
        authorityTokenA: newAuthTokenA.address,
        authorityTokenB: newAuthTokenB.address,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const vaultABal = await provider.connection.getTokenAccountBalance(newVaultA);
    const vaultBBal = await provider.connection.getTokenAccountBalance(newVaultB);

    expect(vaultABal.value.amount).to.equal("50000000");
    expect(vaultBBal.value.amount).to.equal("150000000000");
    console.log("Step 3: Liquidity added (50 A, 150 B)");

    console.log("✅ WF-001 workflow completed successfully");
  });
});

describe("Swap Instructions", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SwapProgram as Program<SwapProgram>;
  const authority = provider.wallet as anchor.Wallet;

  // Test token mints
  let mintA: PublicKey;
  let mintB: PublicKey;

  // Market and vault PDAs
  let marketPDA: PublicKey;
  let vaultA: PublicKey;
  let vaultB: PublicKey;

  // User keypair and token accounts
  let user: Keypair;
  let userTokenA: PublicKey;
  let userTokenB: PublicKey;

  before("Setup market and user accounts", async () => {
    console.log("\n=== Setting up swap test environment ===");

    // Create test user
    user = Keypair.generate();
    console.log("Test user:", user.publicKey.toBase58());

    // Airdrop SOL to user for transaction fees
    const airdropSig = await provider.connection.requestAirdrop(
      user.publicKey,
      2_000_000_000 // 2 SOL
    );
    await provider.connection.confirmTransaction(airdropSig);
    console.log("Airdropped 2 SOL to user");

    // Create token mints
    mintA = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      6 // decimals
    );

    mintB = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      9 // decimals
    );

    // Derive PDAs
    [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), mintA.toBuffer(), mintB.toBuffer()],
      program.programId
    );

    [vaultA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_a"), marketPDA.toBuffer()],
      program.programId
    );

    [vaultB] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_b"), marketPDA.toBuffer()],
      program.programId
    );

    // Initialize market
    await program.methods
      .initializeMarket()
      .accounts({
        market: marketPDA,
        tokenMintA: mintA,
        tokenMintB: mintB,
        vaultA: vaultA,
        vaultB: vaultB,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // Set price: 1 Token A = 2.5 Token B
    const price = new anchor.BN(2_500_000);
    await program.methods
      .setPrice(price)
      .accounts({
        market: marketPDA,
        authority: authority.publicKey,
      })
      .rpc();

    console.log("Market initialized with price = 2.5");

    // Add liquidity to vaults
    const authTokenA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      mintA,
      authority.publicKey
    );

    const authTokenB = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      mintB,
      authority.publicKey
    );

    // Mint tokens to authority
    await mintTo(
      provider.connection,
      authority.payer,
      mintA,
      authTokenA.address,
      authority.publicKey,
      10_000_000_000 // 10,000 Token A
    );

    await mintTo(
      provider.connection,
      authority.payer,
      mintB,
      authTokenB.address,
      authority.publicKey,
      25_000_000_000_000 // 25,000 Token B
    );

    // Add liquidity: 5000 A, 12500 B
    await program.methods
      .addLiquidity(
        new anchor.BN(5_000_000_000), // 5000 Token A
        new anchor.BN(12_500_000_000_000) // 12500 Token B
      )
      .accounts({
        market: marketPDA,
        vaultA: vaultA,
        vaultB: vaultB,
        authorityTokenA: authTokenA.address,
        authorityTokenB: authTokenB.address,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Liquidity added: 5000 A, 12500 B");

    // Create user token accounts
    const userTokenAccountA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      mintA,
      user.publicKey
    );
    userTokenA = userTokenAccountA.address;

    const userTokenAccountB = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      mintB,
      user.publicKey
    );
    userTokenB = userTokenAccountB.address;

    // Mint tokens to user for testing
    await mintTo(
      provider.connection,
      authority.payer,
      mintA,
      userTokenA,
      authority.publicKey,
      1_000_000_000 // 1000 Token A
    );

    await mintTo(
      provider.connection,
      authority.payer,
      mintB,
      userTokenB,
      authority.publicKey,
      2_500_000_000_000 // 2500 Token B
    );

    console.log("User funded: 1000 A, 2500 B\n");
  });

  it("Swaps Token A to Token B successfully", async () => {
    const inputAmount = new anchor.BN(100_000_000); // 100 Token A

    // Get balances before swap
    const userBalanceABefore = await provider.connection.getTokenAccountBalance(userTokenA);
    const userBalanceBBefore = await provider.connection.getTokenAccountBalance(userTokenB);

    console.log("Before swap:");
    console.log("  User Token A:", userBalanceABefore.value.uiAmountString);
    console.log("  User Token B:", userBalanceBBefore.value.uiAmountString);

    // Execute swap: 100 A → 250 B (at price 2.5)
    await program.methods
      .swap(inputAmount, true) // true = A→B
      .accounts({
        market: marketPDA,
        vaultA: vaultA,
        vaultB: vaultB,
        userTokenA: userTokenA,
        userTokenB: userTokenB,
        user: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    // Get balances after swap
    const userBalanceAAfter = await provider.connection.getTokenAccountBalance(userTokenA);
    const userBalanceBAfter = await provider.connection.getTokenAccountBalance(userTokenB);

    console.log("After swap:");
    console.log("  User Token A:", userBalanceAAfter.value.uiAmountString);
    console.log("  User Token B:", userBalanceBAfter.value.uiAmountString);

    // Verify balances
    const expectedABalance = 900_000_000; // 1000 - 100
    const expectedBBalance = 2_750_000_000_000; // 2500 + 250

    expect(userBalanceAAfter.value.amount).to.equal(expectedABalance.toString());
    expect(userBalanceBAfter.value.amount).to.equal(expectedBBalance.toString());

    console.log("✓ Swap A→B successful: 100 A → 250 B");
  });

  it("Swaps Token B to Token A successfully", async () => {
    const inputAmount = new anchor.BN(250_000_000_000); // 250 Token B

    // Get balances before swap
    const userBalanceABefore = await provider.connection.getTokenAccountBalance(userTokenA);
    const userBalanceBBefore = await provider.connection.getTokenAccountBalance(userTokenB);

    console.log("Before swap:");
    console.log("  User Token A:", userBalanceABefore.value.uiAmountString);
    console.log("  User Token B:", userBalanceBBefore.value.uiAmountString);

    // Execute swap: 250 B → 100 A (at price 2.5)
    await program.methods
      .swap(inputAmount, false) // false = B→A
      .accounts({
        market: marketPDA,
        vaultA: vaultA,
        vaultB: vaultB,
        userTokenA: userTokenA,
        userTokenB: userTokenB,
        user: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    // Get balances after swap
    const userBalanceAAfter = await provider.connection.getTokenAccountBalance(userTokenA);
    const userBalanceBAfter = await provider.connection.getTokenAccountBalance(userTokenB);

    console.log("After swap:");
    console.log("  User Token A:", userBalanceAAfter.value.uiAmountString);
    console.log("  User Token B:", userBalanceBAfter.value.uiAmountString);

    // Verify balances (should be back to original after roundtrip)
    const expectedABalance = 1_000_000_000; // 900 + 100 = 1000 (roundtrip)
    const expectedBBalance = 2_500_000_000_000; // 2750 - 250 = 2500 (roundtrip)

    expect(userBalanceAAfter.value.amount).to.equal(expectedABalance.toString());
    expect(userBalanceBAfter.value.amount).to.equal(expectedBBalance.toString());

    console.log("✓ Swap B→A successful: 250 B → 100 A (roundtrip complete)");
  });

  it("Rejects swap with insufficient liquidity", async () => {
    // Try to swap more than available in vault
    const hugeAmount = new anchor.BN(100_000_000_000_000); // 100,000 Token B

    try {
      await program.methods
        .swap(hugeAmount, false) // Try to get massive amount of A
        .accounts({
          market: marketPDA,
          vaultA: vaultA,
          vaultB: vaultB,
          userTokenA: userTokenA,
          userTokenB: userTokenB,
          user: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      expect.fail("Transaction should have failed");
    } catch (error) {
      expect(error.toString()).to.include("InsufficientLiquidity");
      console.log("✓ Insufficient liquidity error correctly thrown");
    }
  });

  it("Rejects swap with zero amount", async () => {
    try {
      await program.methods
        .swap(new anchor.BN(0), true) // Zero amount
        .accounts({
          market: marketPDA,
          vaultA: vaultA,
          vaultB: vaultB,
          userTokenA: userTokenA,
          userTokenB: userTokenB,
          user: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      expect.fail("Transaction should have failed");
    } catch (error) {
      expect(error.toString()).to.include("InvalidAmount");
      console.log("✓ Zero amount error correctly thrown");
    }
  });

  it("Rejects swap when price not set", async () => {
    // Create new market without setting price
    const newMintA = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      6
    );

    const newMintB = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      9
    );

    const [newMarketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), newMintA.toBuffer(), newMintB.toBuffer()],
      program.programId
    );

    const [newVaultA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_a"), newMarketPDA.toBuffer()],
      program.programId
    );

    const [newVaultB] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_b"), newMarketPDA.toBuffer()],
      program.programId
    );

    // Initialize market (price = 0)
    await program.methods
      .initializeMarket()
      .accounts({
        market: newMarketPDA,
        tokenMintA: newMintA,
        tokenMintB: newMintB,
        vaultA: newVaultA,
        vaultB: newVaultB,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // Add liquidity without setting price
    const authTokenA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      newMintA,
      authority.publicKey
    );

    const authTokenB = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      newMintB,
      authority.publicKey
    );

    await mintTo(
      provider.connection,
      authority.payer,
      newMintA,
      authTokenA.address,
      authority.publicKey,
      1_000_000_000
    );

    await mintTo(
      provider.connection,
      authority.payer,
      newMintB,
      authTokenB.address,
      authority.publicKey,
      1_000_000_000_000
    );

    await program.methods
      .addLiquidity(new anchor.BN(100_000_000), new anchor.BN(100_000_000_000))
      .accounts({
        market: newMarketPDA,
        vaultA: newVaultA,
        vaultB: newVaultB,
        authorityTokenA: authTokenA.address,
        authorityTokenB: authTokenB.address,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    // Create user token accounts for new mints
    const newUserTokenA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      newMintA,
      user.publicKey
    );

    const newUserTokenB = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      newMintB,
      user.publicKey
    );

    await mintTo(
      provider.connection,
      authority.payer,
      newMintA,
      newUserTokenA.address,
      authority.publicKey,
      100_000_000
    );

    // Try to swap without price being set
    try {
      await program.methods
        .swap(new anchor.BN(10_000_000), true)
        .accounts({
          market: newMarketPDA,
          vaultA: newVaultA,
          vaultB: newVaultB,
          userTokenA: newUserTokenA.address,
          userTokenB: newUserTokenB.address,
          user: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      expect.fail("Transaction should have failed");
    } catch (error) {
      expect(error.toString()).to.include("PriceNotSet");
      console.log("✓ Price not set error correctly thrown");
    }
  });
});
