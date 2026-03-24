# UC-001: Initialize Market

**ID:** UC-001
**Priority:** Must
**Actor:** Administrator
**Trigger:** Administrator decides to create a new decentralized exchange market for two SPL tokens
**Preconditions:**
- Administrator has a Phantom wallet connected with sufficient SOL balance (for rent and transaction fees)
- Two valid SPL token mint addresses exist (Token A and Token B)
- No market already exists for the given token pair
**Postconditions:**
- A MarketAccount PDA is created and initialized
- Two vault PDAs (vault_a and vault_b) are created as TokenAccounts
- Market is ready to accept liquidity and price configuration
- MarketInitialized event is emitted (if REQ-NF-009 is implemented)
**Traceability:** REQ-F-001, REQ-F-010, REQ-F-011, REQ-NF-009, REQ-NF-017

## Description
The Initialize Market use case establishes the foundational infrastructure for a decentralized token swap market between two SPL tokens. The administrator invokes the initialize_market instruction with two token mint addresses (token_mint_a and token_mint_b). The system creates a MarketAccount PDA using deterministic seeds [b"market", token_mint_a.key, token_mint_b.key], along with two vault TokenAccount PDAs that will hold liquidity. The MarketAccount stores critical metadata including the authority (administrator's public key), token mint addresses, price (initialized to 0), decimal counts for both tokens, and the bump seed for PDA signing.

This operation is idempotent-safe due to Anchor's init constraint - attempting to initialize the same token pair twice will fail because the PDA already exists. This prevents duplicate markets and ensures deterministic market addresses that clients can derive independently.

## Normal Flow
1. Administrator connects Phantom wallet to the web UI or CLI tool
2. Administrator navigates to "Initialize Market" interface
3. Administrator inputs Token A mint address (e.g., mint_a: 7xKXtg2CW...)
4. Administrator inputs Token B mint address (e.g., mint_b: 9yJEn5RT...)
5. Administrator reviews transaction details (estimated rent: ~0.005 SOL)
6. Administrator confirms and signs the transaction
7. System derives MarketAccount PDA with seeds [b"market", token_mint_a, token_mint_b]
8. System creates MarketAccount with fields: authority, token_mint_a, token_mint_b, price=0, decimals_a, decimals_b, bump
9. System derives vault_a PDA with seeds [b"vault_a", market.key]
10. System creates vault_a as a TokenAccount owned by Token Program with authority = market PDA
11. System derives vault_b PDA with seeds [b"vault_b", market.key]
12. System creates vault_b as a TokenAccount owned by Token Program with authority = market PDA
13. System emits MarketInitialized event with market address, token mints, authority, and timestamp
14. Transaction confirms on-chain
15. UI displays success message with market PDA address: "Market created: 8dTv3QK..."
16. Administrator can now proceed to set price and add liquidity

## Alternative Flows

### AF1: Initialize via CLI/Script
1. Developer runs initialization script from command line
2. Script loads administrator keypair from filesystem
3. Script calls initialize_market with hardcoded or config-provided mint addresses
4. Script waits for transaction confirmation
5. Script logs market PDA address to console
6. Returns to Normal Flow step 13

### AF2: Initialize on Different Network
1. Administrator selects deployment target (localnet/devnet/mainnet)
2. UI updates RPC endpoint accordingly
3. UI validates wallet is connected to correct network
4. Proceeds with Normal Flow from step 3
5. Market is created on target network

### AF3: Token Decimals Auto-Detection
1. At step 8, system queries Token Program for decimals_a from mint_a account
2. System queries Token Program for decimals_b from mint_b account
3. System stores queried decimal values in MarketAccount
4. Continues with Normal Flow step 9

## Exception Flows

### EF1: Insufficient SOL Balance
1. At step 6, administrator submits transaction
2. System calculates total rent required (~0.005 SOL for accounts)
3. Wallet balance check fails (balance < rent + fees)
4. Transaction simulation fails before submission
5. System responds with error: "Insufficient SOL balance. You need at least 0.005 SOL to create a market. Current balance: 0.002 SOL."
6. UI suggests: "Please fund your wallet or try again later"
7. Transaction is not submitted
8. Administrator remains on initialization form

### EF2: Market Already Exists
1. At step 7, system attempts to create MarketAccount PDA
2. Anchor's init constraint checks if account already exists
3. Account with derived address already has data
4. Anchor fails transaction before instruction executes
5. System responds with error: "Market already exists for this token pair. Market address: 8dTv3QK..."
6. UI displays: "A market for these tokens already exists. Would you like to navigate to it?"
7. UI provides link to existing market page
8. No state changes are persisted

### EF3: Invalid Token Mint Address
1. At step 3 or 4, administrator inputs invalid address (wrong format or non-existent)
2. UI validates address format using PublicKey.isOnCurve() or similar
3. Validation fails (address is not a valid base58 Pubkey)
4. System responds with error: "Invalid token mint address format"
5. UI highlights the invalid field in red
6. Administrator must correct the address before proceeding
7. Returns to step 3 or 4

### EF4: Token Mint Not Found On-Chain
1. At step 8, system queries decimals for token_mint_a
2. Token mint account does not exist on-chain
3. RPC returns AccountNotFound error
4. Transaction simulation fails
5. System responds with error: "Token mint not found: 7xKXtg2CW... Please verify the address and ensure it exists on the current network (devnet/mainnet)."
6. Transaction is not submitted
7. Administrator must verify mint address and retry

### EF5: Vault Creation Fails
1. At step 10, system attempts to create vault_a TokenAccount
2. Token Program CPI fails (e.g., rent calculation error)
3. Transaction fails atomically (MarketAccount creation is rolled back)
4. System responds with error: "Failed to create token vault. Please check SOL balance and try again."
5. No PDAs are created
6. Administrator can retry transaction

### EF6: Network/RPC Timeout
1. At step 14, transaction is submitted but RPC does not respond within timeout (30s)
2. Transaction status is unknown
3. System responds with warning: "Transaction submitted but confirmation timed out. Transaction signature: 5XyZ..."
4. UI suggests: "Check transaction status on Solana Explorer or wait for confirmation"
5. UI provides link to explorer with transaction signature
6. Administrator can manually verify if market was created by querying the derived PDA

### EF7: Transaction Rejected by Wallet
1. At step 6, Phantom wallet displays approval prompt
2. Administrator clicks "Reject" or closes the wallet popup
3. Wallet returns UserRejectedRequest error
4. System responds with message: "Transaction cancelled by user"
5. No transaction is submitted
6. Administrator remains on initialization form and can retry

## Business Rules
- BR-001: Each token pair (A, B) can have only one market. Order matters: Market(A, B) ≠ Market(B, A)
- BR-002: Market authority is immutable after creation (set to initializer's public key)
- BR-003: Vaults are PDAs owned by the swap program, with authority delegated to the market PDA for signing CPIs
- BR-004: Initial price is set to 0 and must be updated via set_price before any swaps can occur
- BR-005: Market PDAs are deterministic and can be independently derived by clients without on-chain queries

## Acceptance Criteria
- **AC1**: GIVEN an administrator wallet with sufficient SOL balance (>= 0.005 SOL) and two valid SPL token mint addresses
- **AC2**: WHEN the administrator invokes initialize_market with token_mint_a and token_mint_b
- **AC3**: THEN a MarketAccount PDA SHALL be created with seeds [b"market", token_mint_a.key, token_mint_b.key]
- **AC4**: AND a vault_a TokenAccount PDA SHALL be created for Token A with authority = market PDA
- **AC5**: AND a vault_b TokenAccount PDA SHALL be created for Token B with authority = market PDA
- **AC6**: AND the MarketAccount SHALL store: authority (Pubkey), token_mint_a (Pubkey), token_mint_b (Pubkey), price (u64, initialized to 0), decimals_a (u8), decimals_b (u8), and bump (u8)
- **AC7**: AND the transaction SHALL confirm successfully on-chain
- **AC8**: AND WHEN attempting to initialize the same token pair again, THEN the transaction SHALL fail with an error indicating the market already exists
- **AC9**: AND the market PDA address SHALL be deterministically derived and returned to the administrator
