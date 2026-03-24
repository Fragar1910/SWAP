# Glossary - Ubiquitous Language

> **Domain:** Solana Token SWAP - Decentralized Exchange
> **Version:** 1.0
> **Last updated:** 2026-03-22

## Purpose

This glossary establishes the **ubiquitous language** for the Solana SWAP project. All terms defined here must be used consistently across specifications, code, tests, and documentation.

---

## Core Domain Terms

### Market
**Definition:** A **directional** trading pair configuration that enables bidirectional swaps between Token A (base) and Token B (quote) at a fixed rate.

**Properties:**
- Identified by a unique PDA derived from the token mint addresses
- Has exactly one authority (administrator)
- Maintains two vaults (one per token)
- Stores a single exchange rate (price)

**Ordering Semantics:**
- Token A = **Base token** (first mint in PDA seeds)
- Token B = **Quote token** (second mint in PDA seeds)
- Market(USDC, SOL) ≠ Market(SOL, USDC) — these are **distinct markets** with **inverse prices**
- Example: Market(USDC, SOL) with price=0.05 (1 USDC = 0.05 SOL) vs Market(SOL, USDC) with price=20.0 (1 SOL = 20 USDC)

**Implication:** Swap pricing is asymmetric. UI should allow users to create markets in either direction.

**Synonyms:** Trading Pair, Exchange Pair
**Not to be confused with:** AMM Market (Automated Market Maker with liquidity pool pricing)

---

### Vault
**Definition:** A PDA-controlled SPL Token Account that holds liquidity for one side of a market.

**Properties:**
- Owned by the swap program (via PDA)
- Authority is the Market PDA
- Stores tokens of a single mint
- Balance must always be non-negative

**Types:**
- **Vault A**: Holds Token A liquidity
- **Vault B**: Holds Token B liquidity

**Synonyms:** Liquidity Reserve, Token Reserve
**Not to be confused with:** User Token Account

---

### Swap
**Definition:** An atomic transaction that exchanges a user's tokens of one type for tokens of another type at the market's fixed exchange rate.

**Properties:**
- Bidirectional: A→B or B→A
- Rate-based: Output calculated from input × exchange rate
- Atomic: Both transfers succeed or both fail
- Permissionless: Any user can invoke

**Formula (A→B):**
```
output_b = (input_a × price × 10^decimals_b) / (10^6 × 10^decimals_a)
```

**Formula (B→A):**
```
output_a = (input_b × 10^6 × 10^decimals_a) / (price × 10^decimals_b)
```

**Synonyms:** Trade, Exchange
**Not to be confused with:** Liquidity Provision

---

### Exchange Rate (Price)
**Definition:** The fixed ratio at which Token A can be exchanged for Token B in a market, expressed as a u64 value where `price / 10^6` represents "1 Token A = X Token B".

**Properties:**
- Stored as u64 (no decimals in Rust)
- Precision: 6 decimal places
- Example: `price = 1_500_000` means 1 Token A = 1.5 Token B
- Can be updated by authority
- Must be > 0 for swaps to execute

**Synonyms:** Price, Rate, Conversion Rate
**Not to be confused with:** Market Price (dynamic), Spot Price

---

### Administrator (Initializer, Authority)
**Definition:** The wallet account that creates a market, sets exchange rates, and provides liquidity to vaults.

**Responsibilities:**
- Initialize markets
- Set and update exchange rates
- Add liquidity to vaults
- Sign all privileged transactions

**Constraints:**
- Exactly one per market
- Cannot be changed after market creation
- Must sign all set_price and add_liquidity instructions

**Synonyms:** Market Creator, Liquidity Provider (in this context)
**Not to be confused with:** User (Trader)

---

### User (Trader)
**Definition:** Any wallet account that executes token swaps at published exchange rates.

**Responsibilities:**
- Initiate swap transactions
- Provide input tokens
- Receive output tokens

**Constraints:**
- No special permissions required
- Must have sufficient token balance
- Must have ATAs for both tokens in the market

**Synonyms:** Trader, Swapper
**Not to be confused with:** Administrator

---

## Solana/Anchor Technical Terms

### PDA (Program Derived Address)
**Definition:** A deterministic account address derived from seeds (byte arrays) and a program ID, used to allow programs to "own" and sign for accounts.

**Properties:**
- Derived using `Pubkey::find_program_address(seeds, program_id)`
- Falls off the Ed25519 elliptic curve (no private key exists)
- Bump seed ensures the address is not on the curve
- Used for: MarketAccount, Vault A, Vault B

**Seeds used in this project:**
- Market: `[b"market", token_mint_a.key, token_mint_b.key]`
- Vault A: `[b"vault_a", market.key]`
- Vault B: `[b"vault_b", market.key]`

---

### Bump Seed
**Definition:** A single byte (0-255) appended to PDA seeds to ensure the derived address falls off the Ed25519 curve.

**Properties:**
- Found via `find_program_address` (searches from 255 down to 0)
- Stored in MarketAccount for reuse in CPI signers
- Required for PDA to sign Cross-Program Invocations

---

### CPI (Cross-Program Invocation)
**Definition:** A mechanism for one Solana program to call instructions on another program within the same transaction.

**Used in this project:**
- Swap program → SPL Token Program (for token transfers)
- Authority: User (for user→vault) or Market PDA with signer seeds (for vault→user)

**Signer Seeds:**
```rust
&[
    b"market",
    market.token_mint_a.as_ref(),
    market.token_mint_b.as_ref(),
    &[market.bump]
]
```

---

### ATA (Associated Token Account)
**Definition:** A deterministic SPL Token Account address derived from a wallet address and a token mint address.

**Properties:**
- Derived using `get_associated_token_address(wallet, mint)`
- One ATA per (wallet, mint) pair
- Owned by the SPL Token Program
- Authority is the wallet

**Used in this project:**
- Users and administrators need ATAs for Token A and Token B
- Vaults are NOT ATAs (they are PDAs)

---

### SPL Token
**Definition:** Solana Program Library token standard, similar to ERC-20 on Ethereum.

**Components:**
- **Mint**: Defines the token (total supply, decimals, mint authority)
- **Token Account**: Holds a balance of tokens for a specific mint
- **Token Program**: The on-chain program that implements the standard

---

### MarketAccount
**Definition:** A custom account type (Anchor account) that stores market metadata on-chain.

**Fields:**
```rust
pub struct MarketAccount {
    pub authority: Pubkey,        // Administrator's wallet address
    pub token_mint_a: Pubkey,     // Mint address of Token A
    pub token_mint_b: Pubkey,     // Mint address of Token B
    pub price: u64,               // Exchange rate (price / 10^6)
    pub decimals_a: u8,           // Decimals of Token A
    pub decimals_b: u8,           // Decimals of Token B
    pub bump: u8,                 // PDA bump seed
}
```

**Account Type:** PDA, owned by the swap program

---

### Anchor
**Definition:** A Rust framework for Solana program development that provides:
- Declarative account constraints
- Automatic (de)serialization
- Type-safe CPI helpers
- IDL generation for clients

**Key Concepts:**
- **Instruction**: A public function in the `#[program]` module
- **Context**: The `ctx: Context<T>` parameter defining required accounts
- **Accounts struct**: Defines account constraints with macros (`#[account(init, mut, signer)]`)

---

## Behavioral Terms

### Liquidity
**Definition:** The total amount of tokens available in a vault for swaps.

**Properties:**
- Measured in token base units (considering decimals)
- Can be added by administrator via `add_liquidity`
- Cannot be withdrawn (not in scope for this project)
- Insufficient liquidity causes swap failure

**Synonyms:** Reserve Balance, Available Tokens

---

### Slippage (Future Feature)
**Definition:** The difference between expected output amount and actual output amount due to exchange rate changes between transaction submission and execution.

**Properties:**
- Not implemented in MVP (fixed rates, no slippage)
- Future enhancement: max_slippage parameter in UI
- On-chain validation: `actual_output >= min_output_amount`

---

### Atomicity
**Definition:** A transaction property ensuring that all operations within a transaction either succeed together or fail together (no partial execution).

**Guaranteed by:**
- Solana's transaction model (all instructions in a transaction are atomic)
- Used for swaps: user→vault transfer and vault→user transfer are atomic

---

### Idempotency
**Definition:** A property where repeating an operation with the same inputs produces the same result without unintended side effects.

**Applied to:**
- Market initialization: Cannot initialize the same market twice (PDA already exists)
- Not applied to: Swaps and liquidity additions (each invocation changes state)

---

## Event Terms (Auditability)

### Event
**Definition:** A structured log entry emitted by the program during instruction execution, capturing important state changes for off-chain indexing.

**Events in this project:**
- **MarketInitialized**: Emitted when a new market is created
- **PriceSet**: Emitted when the exchange rate is updated
- **LiquidityAdded**: Emitted when tokens are added to vaults
- **SwapExecuted**: Emitted when a swap completes successfully

**Properties:**
- Stored in transaction logs
- Indexed by off-chain services (e.g., The Graph, Solana FM)
- Used for analytics, auditing, and UI updates

---

## UI/Client Terms

### Phantom Wallet
**Definition:** A browser extension and mobile wallet for Solana, the most widely used wallet in the ecosystem.

**Responsibilities:**
- Store user's private keys
- Sign transactions on behalf of the user
- Manage token balances and ATAs

---

### Transaction Status
**Definition:** The lifecycle state of a submitted transaction.

**States:**
- **Pending**: Transaction submitted, awaiting validator processing
- **Confirming**: Transaction included in a block, awaiting finality
- **Confirmed**: Transaction finalized on-chain
- **Failed**: Transaction rejected (e.g., insufficient funds, constraint violation)

---

## Anti-Patterns and Exclusions

### What This System Is NOT:

**Not an AMM (Automated Market Maker):**
- No constant product formula (x × y = k)
- No dynamic pricing based on liquidity depth
- No liquidity provider tokens (LP tokens)
- No impermanent loss

**Not a Limit Order Book:**
- No order matching
- No bid/ask spreads
- No partial fills

**Not a Multi-Sig System:**
- Single administrator per market
- No distributed authority
- No governance tokens

**Not a Production DEX:**
- Educational project
- Fixed pricing model
- No advanced features (routing, aggregation, yield farming)

---

## Measurement Units

### Token Amounts
- **Base units**: Smallest indivisible unit (e.g., lamports for SOL)
- **Decimals**: Number of decimal places for human-readable amounts
- **Example**: 1 SOL = 1,000,000,000 lamports (decimals = 9)

### Time
- **Timestamp**: Unix timestamp in seconds (i64)
- **Block confirmation**: ~400-800ms on Solana mainnet

### Compute Units (CU)
- **Definition**: Computational cost of executing an instruction
- **Limit**: Solana enforces per-instruction CU limits
- **Target for swaps**: < 50,000 CU

---

## Domain Rules (Cross-References)

See `05-INVARIANTS.md` for formal specifications of business rules such as:
- Vault balances must be non-negative
- Exchange rate must be positive for swaps
- Market PDAs must be unique per token pair
- Token transfers must be atomic

---

## Changelog

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 1.0     | 2026-03-22 | Initial glossary from requirements |

---

**Traceability:** This glossary derives terms from requirements document Section 6 (Glossary) and expands them with technical precision for specification purposes.
