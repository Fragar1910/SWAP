# BDD-UC-001: Initialize Market Test Scenarios

**Feature:** Initialize Decentralized Token Market
**Use Case:** UC-001
**Requirements:** REQ-F-001, REQ-F-010, REQ-F-011, REQ-NF-009, REQ-NF-017
**Invariants:** INV-MKT-001, INV-MKT-002, INV-MKT-003, INV-PDA-001, INV-PDA-002, INV-PDA-003

## Background

```gherkin
Given a Solana test validator is running
And the SWAP program is deployed at program ID "SwapProgramXXXXXXXXXXXXXXXXXXXXXXXXXXX"
And an administrator wallet exists with public key "AdminXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
And the administrator wallet has a SOL balance of at least 1.0 SOL
And Token A mint exists at address "TokenAMintXXXXXXXXXXXXXXXXXXXXXXXXXXXX" with 9 decimals
And Token B mint exists at address "TokenBMintXXXXXXXXXXXXXXXXXXXXXXXXXXXX" with 6 decimals
```

---

## Happy Path Scenarios

### Scenario 1: Successfully Initialize a New Market

```gherkin
Feature: Market Initialization

Scenario: Administrator creates a new market for two SPL tokens
  Given the administrator is connected with Phantom wallet
  And no market exists for Token A mint "TokenAMintXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  And Token B mint "TokenBMintXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  When the administrator invokes initialize_market instruction
  And provides token_mint_a = "TokenAMintXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  And provides token_mint_b = "TokenBMintXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  Then a MarketAccount PDA is created with seeds [b"market", token_mint_a, token_mint_b]
  And the market PDA address is "MarketPDAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  And the MarketAccount contains field authority = "AdminXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  And the MarketAccount contains field token_mint_a = "TokenAMintXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  And the MarketAccount contains field token_mint_b = "TokenBMintXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  And the MarketAccount contains field price = 0
  And the MarketAccount contains field decimals_a = 9
  And the MarketAccount contains field decimals_b = 6
  And the MarketAccount contains field bump = 255 (or valid bump seed)
  And a vault_a TokenAccount PDA is created with seeds [b"vault_a", market_pda]
  And vault_a has authority = market PDA
  And vault_a has mint = Token A mint
  And vault_a has balance = 0
  And a vault_b TokenAccount PDA is created with seeds [b"vault_b", market_pda]
  And vault_b has authority = market PDA
  And vault_b has mint = Token B mint
  And vault_b has balance = 0
  And the transaction confirms successfully on-chain
  And the administrator's SOL balance decreases by approximately 0.005 SOL (rent + fees)
  And a MarketInitialized event is emitted with:
    | Field         | Value                                          |
    | market        | MarketPDAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX       |
    | token_mint_a  | TokenAMintXXXXXXXXXXXXXXXXXXXXXXXXXXXX         |
    | token_mint_b  | TokenBMintXXXXXXXXXXXXXXXXXXXXXXXXXXXX         |
    | authority     | AdminXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX        |
    | timestamp     | <current Unix timestamp>                       |
```

**Traceability:** REQ-F-001 (AC1-AC9), INV-MKT-001, INV-PDA-001

---

## Alternative Flow Scenarios

### Scenario 2: Initialize Market with Different Token Decimals

```gherkin
Scenario: Create market with tokens having different decimal precision
  Given Token A mint has 6 decimals (like USDC)
  And Token B mint has 9 decimals (like SOL)
  When the administrator invokes initialize_market with these tokens
  Then the MarketAccount stores decimals_a = 6
  And the MarketAccount stores decimals_b = 9
  And swap calculations will correctly account for decimal differences
  And the transaction confirms successfully
```

**Traceability:** REQ-F-010 (AC6), INV-MKT-005

---

### Scenario 3: Initialize Market on Devnet

```gherkin
Scenario: Deploy market to Solana devnet cluster
  Given the web UI is configured for devnet RPC endpoint "https://api.devnet.solana.com"
  And the administrator's Phantom wallet is connected to devnet
  When the administrator initializes the market
  Then the market is created on devnet
  And the market PDA can be queried at "https://api.devnet.solana.com"
  And the transaction signature is visible on Solana Explorer (devnet)
```

**Traceability:** REQ-NF-026, REQ-C-001

---

### Scenario 4: Query Market PDA Deterministically

```gherkin
Scenario: Client derives market PDA without on-chain query
  Given Token A mint = "TokenAMintXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  And Token B mint = "TokenBMintXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  When a client calls Pubkey.findProgramAddress with seeds:
    | Seed Type | Value                                      |
    | bytes     | b"market"                                  |
    | pubkey    | TokenAMintXXXXXXXXXXXXXXXXXXXXXXXXXXXX     |
    | pubkey    | TokenBMintXXXXXXXXXXXXXXXXXXXXXXXXXXXX     |
  Then the client receives market PDA = "MarketPDAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  And the client receives bump seed = 255 (or same as on-chain)
  And this matches the on-chain market account address exactly
```

**Traceability:** REQ-F-011 (AC4-AC5, AC9), INV-PDA-001, INV-PDA-003

---

## Exception Flow Scenarios

### Scenario 5: Insufficient SOL Balance for Rent

```gherkin
Scenario: Market creation fails due to insufficient rent funds
  Given the administrator wallet has SOL balance = 0.001 SOL
  And the required rent for market + vaults is approximately 0.005 SOL
  When the administrator attempts to initialize the market
  Then the transaction simulation fails before submission
  And the UI displays error: "Insufficient SOL balance. You need at least 0.005 SOL to create a market. Current balance: 0.001 SOL."
  And the transaction is NOT submitted to the network
  And no MarketAccount is created
  And no vault PDAs are created
  And the administrator's SOL balance remains 0.001 SOL
```

**Traceability:** UC-001 EF1

---

### Scenario 6: Market Already Exists (Idempotency Violation)

```gherkin
Scenario: Attempt to create duplicate market for same token pair
  Given a market already exists for Token A and Token B
  And the existing market PDA is "MarketPDAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  When the administrator attempts to initialize the market again
  And provides the same token_mint_a and token_mint_b
  Then Anchor's init constraint detects the account already exists
  And the transaction fails before the instruction handler executes
  And the error message is "Account already exists" or similar
  And the UI displays: "Market already exists for this token pair. Market address: MarketPDAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  And no state changes are persisted
  And the existing market data remains unchanged
```

**Traceability:** REQ-F-001 (AC8), REQ-NF-017, INV-MKT-001, UC-001 EF2

---

### Scenario 7: Invalid Token Mint Address Format

```gherkin
Scenario: Administrator provides malformed token mint address
  Given the administrator inputs token_mint_a = "invalid-address-123"
  And "invalid-address-123" is not a valid base58 Solana public key
  When the UI validates the input
  Then the validation fails before transaction submission
  And the UI displays error: "Invalid token mint address format"
  And the submit button remains disabled
  And no transaction is sent to the blockchain
```

**Traceability:** UC-001 EF3

---

### Scenario 8: Token Mint Does Not Exist On-Chain

```gherkin
Scenario: Provided token mint address has no on-chain account
  Given token_mint_a = "NonExistentMintXXXXXXXXXXXXXXXXXXXXXXXXX"
  And "NonExistentMintXXXXXXXXXXXXXXXXXXXXXXXXX" is a valid public key format
  But no account exists at this address on the blockchain
  When the administrator submits the initialize_market transaction
  Then the transaction simulation fails
  And the error is "Token mint not found: NonExistentMintXXXXXXXXXXXXXXXXXXXXXXXXX"
  And the UI displays: "Token mint not found. Please verify the address and ensure it exists on the current network (devnet/mainnet)."
  And the transaction is NOT submitted
```

**Traceability:** UC-001 EF4

---

### Scenario 9: Vault Creation Fails (Atomicity Test)

```gherkin
Scenario: Second vault creation fails, entire transaction reverts
  Given the MarketAccount creation succeeds
  And vault_a creation succeeds
  But vault_b creation fails (e.g., due to insufficient rent calculation error)
  When the transaction is processed
  Then Solana's transaction atomicity ensures all state changes are reverted
  And the MarketAccount is NOT persisted
  And vault_a is NOT persisted
  And vault_b is NOT created
  And the error message indicates vault creation failure
  And the administrator can retry with corrected parameters
```

**Traceability:** REQ-NF-016, INV-GLOBAL-001, UC-001 EF5

---

### Scenario 10: RPC Timeout During Transaction Confirmation

```gherkin
Scenario: Transaction submitted but confirmation times out
  Given the administrator submits the initialize_market transaction
  And the transaction signature is "5XyZTransactionSignatureXXXXXXXXXXXXXXXXXXX"
  When the RPC node does not respond within 30 seconds
  Then the UI displays: "Transaction submitted but confirmation timed out. Transaction signature: 5XyZTransactionSignatureXXXXXXXXXXXXXXXXXXX"
  And the UI suggests: "Check transaction status on Solana Explorer or wait for confirmation"
  And the UI provides a link to "https://explorer.solana.com/tx/5XyZTransactionSignatureXXXXXXXXXXXXXXXXXXX"
  And the administrator can manually query the market PDA to verify creation
  And if the transaction eventually confirms, the market is successfully created
```

**Traceability:** UC-001 EF6

---

### Scenario 11: User Rejects Transaction in Phantom Wallet

```gherkin
Scenario: Administrator cancels transaction approval
  Given the administrator clicks "Initialize Market" in the UI
  And Phantom wallet displays the transaction approval popup
  When the administrator clicks "Reject" in the Phantom popup
  Then the wallet returns error "User rejected the request"
  And the UI displays message: "Transaction cancelled by user"
  And no transaction is submitted to the blockchain
  And no state changes occur
  And the administrator can retry by clicking "Initialize Market" again
```

**Traceability:** UC-001 EF7

---

### Scenario 12: Wrong Token Program for Mints

```gherkin
Scenario: Token mint is not owned by SPL Token Program
  Given token_mint_a has owner = "MaliciousProgramXXXXXXXXXXXXXXXXXXXXXXXX"
  And token_mint_a.owner != SPL Token Program ID
  When the administrator attempts to initialize the market
  Then the account validation fails
  And the error is "Invalid token mint: not owned by SPL Token Program"
  And the transaction is rejected
  And no market is created
```

**Traceability:** REQ-C-004, REQ-NF-005

---

## Negative Test Scenarios

### Scenario 13: Initialize Market with Same Token for Both Mints

```gherkin
Scenario: Attempt to create market with identical token mints
  Given the administrator wallet is connected with 10 SOL
  And a USDC token mint exists at address "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  When the administrator invokes initialize_market with:
    | token_mint_a | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v |
    | token_mint_b | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v |
  Then the transaction SHALL fail with error "SameTokenSwapDisallowed"
  And the error message SHALL state "Cannot create market: token_mint_a and token_mint_b must be distinct"
  And no MarketAccount SHALL be created
  And the administrator's SOL balance SHALL be unchanged (tx rejected before fee deduction)
  And no MarketInitialized event SHALL be emitted
```

**Traceability:** UC-001, INV-MKT-006, BR-MKT-004

---

### Scenario 14: Extremely High Decimal Count

```gherkin
Scenario: Token mint has unsupported decimal count
  Given token_mint_a has decimals = 19
  And SPL Token standard maximum is 18
  When the mint account is queried
  Then the SPL Token Program rejects the mint creation
  And the mint cannot exist on-chain
  And the initialize_market instruction cannot reference this mint
```

**Traceability:** REQ-F-010, INV-MKT-005

---

## Summary

**Total Scenarios:** 14
- Happy Path: 1
- Alternative Flows: 4
- Exception Flows: 7
- Negative Tests: 2

**Coverage:**
- Requirements: REQ-F-001, REQ-F-010, REQ-F-011, REQ-NF-009, REQ-NF-016, REQ-NF-017, REQ-NF-026
- Invariants: INV-MKT-001, INV-MKT-002, INV-MKT-003, INV-MKT-005, INV-PDA-001, INV-PDA-002, INV-PDA-003, INV-GLOBAL-001
- Use Case Flows: UC-001 Normal Flow, AF1-AF3, EF1-EF7

**Test Oracles:**
- Market PDA determinism (same seeds = same address)
- Authority immutability (cannot change after creation)
- Vault ownership (vaults controlled by market PDA)
- Transaction atomicity (all-or-nothing account creation)
- Idempotency (duplicate initialization fails)
