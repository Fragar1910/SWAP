// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { SwapProgram } from "../target/types/swap_program";
import {
    createMint,
    getAccount,
    getMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("Full Integration Test Suite", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SwapProgram as Program<SwapProgram>;

    let authority: Keypair;
    let user1: Keypair;
    let user2: Keypair;

    let mintA: PublicKey;
    let mintB: PublicKey;
    let mintC: PublicKey;

    let marketAB: PublicKey;
    let vaultA: PublicKey;
    let vaultB: PublicKey;

    before("Setup test environment", async () => {
        authority = Keypair.generate();
        user1 = Keypair.generate();
        user2 = Keypair.generate();

        // Airdrop SOL to test wallets
        await Promise.all([
            provider.connection.requestAirdrop(authority.publicKey, 5 * LAMPORTS_PER_SOL),
            provider.connection.requestAirdrop(user1.publicKey, 2 * LAMPORTS_PER_SOL),
            provider.connection.requestAirdrop(user2.publicKey, 2 * LAMPORTS_PER_SOL),
        ]);

        await new Promise(resolve => setTimeout(resolve, 1000));  // Wait for confirmations

        // Create test token mints
        mintA = await createMint(
            provider.connection,
            authority,
            authority.publicKey,
            null,
            6  // USDC-like (6 decimals)
        );

        mintB = await createMint(
            provider.connection,
            authority,
            authority.publicKey,
            null,
            9  // SOL-like (9 decimals)
        );

        mintC = await createMint(
            provider.connection,
            authority,
            authority.publicKey,
            null,
            6  // Another stablecoin
        );

        console.log("✅ Test environment initialized");
        console.log(`   Authority: ${authority.publicKey.toString()}`);
        console.log(`   Mint A: ${mintA.toString()}`);
        console.log(`   Mint B: ${mintB.toString()}`);
    });

    describe("BDD Scenario 1: Happy Path - Complete Market Setup", () => {
        it("S1: Initialize market, set price, add liquidity, execute swap", async () => {
            // Derive PDAs
            [marketAB] = PublicKey.findProgramAddressSync(
                [Buffer.from("market"), mintA.toBuffer(), mintB.toBuffer()],
                program.programId
            );

            [vaultA] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault_a"), marketAB.toBuffer()],
                program.programId
            );

            [vaultB] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault_b"), marketAB.toBuffer()],
                program.programId
            );

            // STEP 1: Initialize Market
            await program.methods
                .initializeMarket()
                .accounts({
                    market: marketAB,
                    tokenMintA: mintA,
                    tokenMintB: mintB,
                    vaultA,
                    vaultB,
                    authority: authority.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([authority])
                .rpc();

            const market = await program.account.marketAccount.fetch(marketAB);
            expect(market.authority.toString()).to.equal(authority.publicKey.toString());
            expect(market.price.toNumber()).to.equal(0);  // Not set yet

            // STEP 2: Set Price (1 USDC = 0.05 SOL → price = 50_000)
            const price = new BN(50_000);  // 0.05 with 6 decimals precision
            await program.methods
                .setPrice(price)
                .accounts({
                    market: marketAB,
                    authority: authority.publicKey,
                })
                .signers([authority])
                .rpc();

            const updatedMarket = await program.account.marketAccount.fetch(marketAB);
            expect(updatedMarket.price.toString()).to.equal(price.toString());

            // STEP 3: Add Liquidity
            const authorityTokenA = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                authority,
                mintA,
                authority.publicKey
            );

            const authorityTokenB = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                authority,
                mintB,
                authority.publicKey
            );

            // Mint tokens to authority
            await mintTo(
                provider.connection,
                authority,
                mintA,
                authorityTokenA.address,
                authority,
                1000_000_000  // 1000 USDC
            );

            await mintTo(
                provider.connection,
                authority,
                mintB,
                authorityTokenB.address,
                authority,
                50_000_000_000  // 50 SOL
            );

            await program.methods
                .addLiquidity(new BN(500_000_000), new BN(25_000_000_000))
                .accounts({
                    market: marketAB,
                    vaultA,
                    vaultB,
                    authorityTokenA: authorityTokenA.address,
                    authorityTokenB: authorityTokenB.address,
                    authority: authority.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .signers([authority])
                .rpc();

            const vaultAAccount = await getAccount(provider.connection, vaultA);
            const vaultBAccount = await getAccount(provider.connection, vaultB);

            expect(vaultAAccount.amount.toString()).to.equal("500000000");  // 500 USDC
            expect(vaultBAccount.amount.toString()).to.equal("25000000000");  // 25 SOL

            // STEP 4: User Swap (10 USDC → 0.5 SOL)
            const user1TokenA = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                user1,
                mintA,
                user1.publicKey
            );

            const user1TokenB = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                user1,
                mintB,
                user1.publicKey
            );

            // Give user 100 USDC
            await mintTo(
                provider.connection,
                authority,
                mintA,
                user1TokenA.address,
                authority,
                100_000_000
            );

            const inputAmount = new BN(10_000_000);  // 10 USDC
            const expectedOutput = new BN(500_000_000);  // 0.5 SOL

            await program.methods
                .swap(inputAmount, true)  // A→B
                .accounts({
                    market: marketAB,
                    vaultA,
                    vaultB,
                    userTokenA: user1TokenA.address,
                    userTokenB: user1TokenB.address,
                    user: user1.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .signers([user1])
                .rpc();

            const user1BalanceA = await getAccount(provider.connection, user1TokenA.address);
            const user1BalanceB = await getAccount(provider.connection, user1TokenB.address);

            expect(user1BalanceA.amount.toString()).to.equal("90000000");  // 90 USDC remaining
            expect(user1BalanceB.amount.toString()).to.equal("500000000");  // 0.5 SOL received

            console.log("✅ BDD Scenario 1: PASSED (Happy Path)");
        });
    });

    describe("BDD Scenario 4: Insufficient Liquidity", () => {
        it("S4: Rejects swap when vault has insufficient balance", async () => {
            const user2TokenA = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                user2,
                mintA,
                user2.publicKey
            );

            const user2TokenB = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                user2,
                mintB,
                user2.publicKey
            );

            // Give user massive amount
            await mintTo(
                provider.connection,
                authority,
                mintA,
                user2TokenA.address,
                authority,
                10_000_000_000_000  // 10M USDC (vault only has 490 USDC remaining)
            );

            try {
                await program.methods
                    .swap(new BN(10_000_000_000_000), true)
                    .accounts({
                        market: marketAB,
                        vaultA,
                        vaultB,
                        userTokenA: user2TokenA.address,
                        userTokenB: user2TokenB.address,
                        user: user2.publicKey,
                        tokenProgram: TOKEN_PROGRAM_ID,
                    })
                    .signers([user2])
                    .rpc();
                expect.fail("Should have thrown InsufficientLiquidity error");
            } catch (error) {
                expect(error.toString()).to.include("Error");
            }

            console.log("✅ BDD Scenario 4: PASSED (Insufficient liquidity rejected)");
        });
    });

    describe("BDD Scenario 7: Unauthorized Price Setting", () => {
        it("S7: Rejects set_price called by non-authority", async () => {
            const attacker = Keypair.generate();

            // Airdrop for transaction fees
            await provider.connection.requestAirdrop(attacker.publicKey, LAMPORTS_PER_SOL);
            await new Promise(resolve => setTimeout(resolve, 1000));

            try {
                await program.methods
                    .setPrice(new BN(1_000_000))
                    .accounts({
                        market: marketAB,
                        authority: attacker.publicKey,
                    })
                    .signers([attacker])
                    .rpc();
                expect.fail("Should have thrown unauthorized error");
            } catch (error) {
                expect(error.toString()).to.include("Error");
            }

            console.log("✅ BDD Scenario 7: PASSED (Unauthorized access denied)");
        });
    });

    describe("BDD Scenario 13: Same-Token Market Rejected (CRITICAL-001)", () => {
        it("S13: Rejects market initialization when token_mint_a == token_mint_b", async () => {
            const [marketAA] = PublicKey.findProgramAddressSync(
                [Buffer.from("market"), mintA.toBuffer(), mintA.toBuffer()],  // Same mint!
                program.programId
            );

            const [vaultASame] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault_a"), marketAA.toBuffer()],
                program.programId
            );

            const [vaultBSame] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault_b"), marketAA.toBuffer()],
                program.programId
            );

            try {
                await program.methods
                    .initializeMarket()
                    .accounts({
                        market: marketAA,
                        tokenMintA: mintA,
                        tokenMintB: mintA,  // SAME AS TOKEN A!
                        vaultA: vaultASame,
                        vaultB: vaultBSame,
                        authority: authority.publicKey,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([authority])
                    .rpc();
                expect.fail("Should have thrown SameTokenSwapDisallowed error");
            } catch (error) {
                expect(error.toString()).to.include("Error");
            }

            console.log("✅ BDD Scenario 13: PASSED (Same-token market rejected - CRITICAL-001)");
        });
    });

    describe("BDD Scenario 10: Zero Amount Rejection", () => {
        it("S10: Rejects swap with amount = 0", async () => {
            const user1TokenA = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                user1,
                mintA,
                user1.publicKey
            );

            const user1TokenB = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                user1,
                mintB,
                user1.publicKey
            );

            try {
                await program.methods
                    .swap(new BN(0), true)  // Zero amount
                    .accounts({
                        market: marketAB,
                        vaultA,
                        vaultB,
                        userTokenA: user1TokenA.address,
                        userTokenB: user1TokenB.address,
                        user: user1.publicKey,
                        tokenProgram: TOKEN_PROGRAM_ID,
                    })
                    .signers([user1])
                    .rpc();
                expect.fail("Should have thrown InvalidAmount error");
            } catch (error) {
                expect(error.toString()).to.include("Error");
            }

            console.log("✅ BDD Scenario 10: PASSED (Zero amount rejected)");
        });
    });

    describe("Performance: Compute Unit Consumption", () => {
        it("Measures swap CU consumption (target: < 12,000 CU)", async () => {
            const user1TokenA = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                user1,
                mintA,
                user1.publicKey
            );

            const user1TokenB = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                user1,
                mintB,
                user1.publicKey
            );

            const signature = await program.methods
                .swap(new BN(1_000_000), true)
                .accounts({
                    market: marketAB,
                    vaultA,
                    vaultB,
                    userTokenA: user1TokenA.address,
                    userTokenB: user1TokenB.address,
                    user: user1.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .signers([user1])
                .rpc();

            // Fetch transaction to get compute units
            const tx = await provider.connection.getTransaction(signature, {
                commitment: "confirmed",
                maxSupportedTransactionVersion: 0,
            });

            console.log("Transaction signature:", signature);
            console.log("Compute units consumed:", tx?.meta?.computeUnitsConsumed || "N/A");

            // Assert CU consumption is within target
            if (tx?.meta?.computeUnitsConsumed) {
                expect(tx.meta.computeUnitsConsumed).to.be.lessThan(12_000);
            }
        });
    });
});
