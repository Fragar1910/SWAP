# ADR-004: Program Derived Address (PDA) Architecture for Markets and Vaults

**Status:** Accepted
**Date:** 2026-03-22
**Deciders:** Technical Architect, Development Team
**Traceability:** REQ-F-001, REQ-F-011, REQ-NF-005

## Context

The Solana SWAP program needs deterministic account addresses for:
1. **Market accounts**: Store market metadata (authority, token mints, price, decimals)
2. **Vault accounts**: Hold Token A and Token B liquidity (SPL token accounts)

Solana programs cannot directly own accounts or sign Cross-Program Invocations (CPIs). We must choose between:
1. **Program Derived Addresses (PDAs)**: Deterministic addresses derived from seeds, allowing programs to sign CPIs
2. **User-Owned Accounts**: Accounts owned by user wallets with explicit delegation
3. **External Signer Accounts**: Separate keypairs generated and stored off-chain

The decision impacts security, determinism, and the ability to transfer tokens from vaults during swaps.

## Decision

We will use **Program Derived Addresses (PDAs)** for all on-chain accounts:
- **Market PDA**: Seeds = `[b"market", token_mint_a.key(), token_mint_b.key()]`
- **Vault A PDA**: Seeds = `[b"vault_a", market.key()]`
- **Vault B PDA**: Seeds = `[b"vault_b", market.key()]`

Each PDA's bump seed will be stored in the associated account structure for efficient reuse during CPI signing.

## Rationale

1. **Deterministic Discovery**: Clients can derive account addresses without querying the blockchain:
   ```typescript
   const [marketPDA] = PublicKey.findProgramAddressSync(
       [Buffer.from("market"), mintA.toBuffer(), mintB.toBuffer()],
       programId
   );
   ```
   This enables stateless clients and simplifies UI development (REQ-F-012 through REQ-F-016).

2. **Program Authority**: PDAs allow the program to sign CPIs, critical for transferring tokens from vaults during swaps:
   ```rust
   let signer_seeds = &[
       b"market",
       market.token_mint_a.as_ref(),
       market.token_mint_b.as_ref(),
       &[market.bump],  // Stored bump seed
   ];
   token::transfer(
       CpiContext::new_with_signer(token_program, accounts, &[&signer_seeds[..]]),
       amount
   )?;
   ```

3. **Security**: PDAs have no private keys, eliminating key theft risk. Only the program can sign for PDAs, enforcing that token transfers follow program logic (REQ-NF-005).

4. **Uniqueness Guarantee**: Anchor's `init` constraint ensures each token pair has exactly one market (REQ-NF-017):
   ```rust
   #[account(
       init,
       seeds = [b"market", token_mint_a.key().as_ref(), token_mint_b.key().as_ref()],
       bump,
       payer = authority,
       space = 8 + MarketAccount::INIT_SPACE
   )]
   pub market: Account<'info, MarketAccount>,
   ```
   Second initialization attempt fails because PDA already exists.

5. **Hierarchical Structure**: Vaults derive from market PDA, creating clear ownership:
   ```
   token_mint_a + token_mint_b → market PDA
   market PDA → vault_a PDA (Token A)
   market PDA → vault_b PDA (Token B)
   ```

6. **No Off-Chain Storage**: Bump seeds stored on-chain (`MarketAccount.bump`) avoid expensive recomputation during each swap (saves ~5,000 CU per instruction).

## Alternatives Considered

### Alternative 1: User-Owned Accounts with Delegation
- **Pros:**
  - Simpler mental model (accounts owned by users, like traditional wallets)
  - Existing tooling supports user-owned accounts

- **Cons:**
  - Requires administrator to pre-create vault accounts (manual setup step)
  - Vaults need `Delegate` authority assigned to program, creating security complexity
  - Non-deterministic addresses (clients must query or store vault addresses)
  - Program cannot sign CPIs (must transfer tokens through delegation, which is less secure)
  - Lost keypairs brick the system
  - Doesn't scale to n-pairs (REQ-NF-025): Each market would need manual vault creation

- **Why Rejected:** Delegation model is more complex and less secure than PDAs. Solana best practices strongly favor PDAs for program-controlled accounts.

### Alternative 2: External Signer Keypairs Stored Off-Chain
- **Pros:**
  - Program can sign with explicit keypairs
  - Simple ownership model (program owns keypairs)

- **Cons:**
  - **Critical flaw**: Private keys must be stored off-chain or in program binary, introducing key theft risk
  - No deterministic address derivation (clients must query)
  - Key rotation is complex (requires updating program binary or on-chain storage)
  - Violates Solana security model (programs should not handle private keys)
  - Cannot be stored on-chain securely (anyone can read account data)

- **Why Rejected:** Storing private keys off-chain or in program binary is a severe security anti-pattern. PDAs eliminate this risk entirely.

### Alternative 3: Single Global Vault per Token (Shared Across Markets)
- **Pros:**
  - Capital efficiency: One large liquidity pool serves multiple markets
  - Simpler account structure (fewer PDAs)

- **Cons:**
  - Accounting complexity: Must track liquidity allocations per market
  - Cross-market contamination: One market's liquidity issues affect all markets
  - Security risk: Vulnerability in one market could drain global vault
  - Unclear ownership: Which market's authority controls shared vault?
  - Doesn't align with fixed-price model: Each market has independent pricing, so shared liquidity makes no sense

- **Why Rejected:** Violates separation of concerns. Each market should be isolated (REQ-NF-025: "multiple independent markets").

### Alternative 4: Market PDA Without Token Mint Seeds
- **Pros:**
  - Simpler seed structure: `[b"market", counter]` where counter is a u64 index

- **Cons:**
  - Non-deterministic: Clients must query to find market for token pair
  - Requires storing counter state on-chain (additional account, rent costs)
  - No automatic uniqueness: Counter logic must manually prevent duplicate markets
  - Worse UX: UI must iterate or maintain off-chain index

- **Why Rejected:** Token mint seeds provide natural uniqueness and deterministic discovery. Counter adds unnecessary complexity.

## Consequences

### Positive:
- **Deterministic Discovery**: Clients can derive all account addresses without RPC calls:
  ```typescript
  // Derive market
  const [market, marketBump] = await PublicKey.findProgramAddress(
      [Buffer.from("market"), mintA.toBuffer(), mintB.toBuffer()],
      programId
  );
  // Derive vaults
  const [vaultA] = await PublicKey.findProgramAddress(
      [Buffer.from("vault_a"), market.toBuffer()],
      programId
  );
  ```
- **No Private Key Management**: Eliminates key theft, loss, and rotation risks (REQ-NF-005)
- **Atomic CPI Signing**: Program signs for vaults using stored bump seeds (no external coordination)
- **Automatic Uniqueness**: Anchor enforces one market per token pair (prevents duplicate markets)
- **Scalability**: Supports unlimited markets with zero state coordination (REQ-NF-025)
- **Testability**: Deterministic addresses simplify test setup (REQ-NF-022)
- **Rent Efficiency**: Vaults are token accounts (smallest possible size for liquidity storage)

### Negative:
- **Bump Seed Storage Overhead**: Each `MarketAccount` must store bump seed (1 byte), but this is negligible (8-byte discriminator + account data is already ~100+ bytes)
- **Compute Cost for Derivation**: `find_program_address` costs ~5,000 CU, but this is paid by client during address derivation (not in swap instruction)
- **Learning Curve**: Students must understand PDA derivation, bump seeds, and CPI signing with seeds (mitigated by Anchor's abstractions)
- **Collision Risk (Theoretical)**: If all 256 bump seeds are exhausted, PDA cannot be created (probability ≈ 2^-256, effectively impossible)
- **No Key Rotation**: PDA seeds are immutable; cannot "rotate" market address without creating new market

## Implementation Notes

### Technical Details:

1. **Market PDA Derivation**:
   ```rust
   #[derive(Accounts)]
   #[instruction(token_mint_a: Pubkey, token_mint_b: Pubkey)]
   pub struct InitializeMarket<'info> {
       #[account(
           init,
           seeds = [b"market", token_mint_a.as_ref(), token_mint_b.as_ref()],
           bump,
           payer = authority,
           space = 8 + MarketAccount::INIT_SPACE
       )]
       pub market: Account<'info, MarketAccount>,
       // ...
   }
   ```
   - `seeds`: Deterministic inputs (literal + token mints)
   - `bump`: Anchor automatically finds and stores bump in `market.bump`
   - `init`: Creates account and sets program as owner

2. **Vault PDA Derivation**:
   ```rust
   #[account(
       init,
       seeds = [b"vault_a", market.key().as_ref()],
       bump,
       payer = authority,
       token::mint = token_mint_a,
       token::authority = market,  // Market PDA is vault's authority
   )]
   pub vault_a: Account<'info, TokenAccount>,
   ```
   - Vault authority is the market PDA (hierarchical ownership)
   - Allows market to sign CPIs transferring tokens from vaults

3. **CPI Signing with Stored Bump**:
   ```rust
   pub fn swap(ctx: Context<Swap>, amount: u64, swap_a_to_b: bool) -> Result<()> {
       let market = &ctx.accounts.market;

       // Calculate output amount...

       // Transfer from vault using PDA signer
       let signer_seeds = &[
           b"market",
           market.token_mint_a.as_ref(),
           market.token_mint_b.as_ref(),
           &[market.bump],  // Use stored bump (avoids recomputation)
       ];

       token::transfer(
           CpiContext::new_with_signer(
               ctx.accounts.token_program.to_account_info(),
               Transfer {
                   from: ctx.accounts.vault_b.to_account_info(),
                   to: ctx.accounts.user_token_b.to_account_info(),
                   authority: ctx.accounts.market.to_account_info(),
               },
               &[&signer_seeds[..]],  // Signer seeds for CPI
           ),
           amount_b,
       )?;
       Ok(())
   }
   ```

4. **Account Structure**:
   ```rust
   #[account]
   pub struct MarketAccount {
       pub authority: Pubkey,        // 32 bytes
       pub token_mint_a: Pubkey,     // 32 bytes
       pub token_mint_b: Pubkey,     // 32 bytes
       pub price: u64,               // 8 bytes
       pub decimals_a: u8,           // 1 byte
       pub decimals_b: u8,           // 1 byte
       pub bump: u8,                 // 1 byte (stored for CPI signing)
   }
   // Total: 107 bytes + 8-byte discriminator = 115 bytes
   // Rent: ~0.0016 SOL (at current rates)
   ```

### Seed Design Rationale:

**Why token_mint_a + token_mint_b for market?**
- Provides natural uniqueness: Only one market per token pair
- Allows deterministic discovery: Given mint addresses, clients derive market address
- Alternative `[b"market", counter]` would require on-chain counter maintenance

**Why market.key() for vaults?**
- Establishes clear ownership hierarchy: Market → Vaults
- Simplifies multi-market scenarios: Each market has isolated vaults
- Alternative `[b"vault_a", token_mint_a]` would create global vaults (conflicts with isolated markets)

**Why store bump on-chain?**
- Avoids recomputing bump during every swap (~5,000 CU saved)
- Anchor convention: Always store bump for PDAs that sign CPIs
- Cost: 1 byte per market (negligible vs compute savings)

### Client-Side Derivation Example:

```typescript
import { PublicKey } from "@solana/web3.js";

async function deriveMarketAccounts(
    programId: PublicKey,
    mintA: PublicKey,
    mintB: PublicKey
) {
    // Derive market PDA
    const [marketPDA, marketBump] = await PublicKey.findProgramAddress(
        [
            Buffer.from("market"),
            mintA.toBuffer(),
            mintB.toBuffer(),
        ],
        programId
    );

    // Derive vault PDAs
    const [vaultA] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_a"), marketPDA.toBuffer()],
        programId
    );
    const [vaultB] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_b"), marketPDA.toBuffer()],
        programId
    );

    return { marketPDA, vaultA, vaultB, marketBump };
}
```

### Security Properties:

1. **No Private Keys**: PDAs have no corresponding private keys (they fall off Ed25519 curve)
2. **Exclusive Program Control**: Only the program can generate valid CPI signatures for PDAs
3. **Deterministic Authorization**: Cannot forge PDA signatures (requires program execution)
4. **Immune to Key Theft**: Attackers cannot steal PDA "keys" because they don't exist

### Testing Strategy:

```typescript
describe("PDA Derivation", () => {
    it("Derives deterministic market PDA", async () => {
        const [marketPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("market"), mintA.toBuffer(), mintB.toBuffer()],
            program.programId
        );

        const marketAccount = await program.account.marketAccount.fetch(marketPDA);
        expect(marketAccount.tokenMintA.toString()).to.equal(mintA.toString());
    });

    it("Prevents duplicate market creation", async () => {
        // First initialization succeeds
        await program.methods.initializeMarket().accounts({...}).rpc();

        // Second initialization fails (PDA already exists)
        await expect(
            program.methods.initializeMarket().accounts({...}).rpc()
        ).to.be.rejected;
    });
});
```

## References

- [Solana Cookbook - PDAs](https://solanacookbook.com/core-concepts/pdas.html)
- [Anchor Book - Program Derived Addresses](https://book.anchor-lang.com/anchor_in_depth/PDAs.html)
- [Solana Program Library - Associated Token Account](https://spl.solana.com/associated-token-account) - Similar PDA pattern
- [Metaplex Metadata - PDA Design](https://docs.metaplex.com/programs/token-metadata/accounts) - Industry example of PDA architecture
- [Solana Security Audit - PDA Best Practices](https://github.com/coral-xyz/sealevel-attacks/tree/master/programs) - Common PDA vulnerabilities
- REQ-F-011: PDA Derivation requirement
- REQ-NF-005: PDA Ownership Verification requirement
