# Requirements Document

> **Project:** Solana Token SWAP - Educational Decentralized Exchange
> **Version:** 1.0
> **Last updated:** 2026-03-22
> **Status:** Draft

## 1. Introduction

### 1.1 Purpose
This document specifies the requirements for a decentralized token exchange (SWAP) program on the Solana blockchain using the Anchor framework. The system enables market creation, liquidity provision, and bidirectional token swaps between two SPL tokens at administrator-controlled exchange rates.

### 1.2 Scope
The system includes:
- Smart contract program (Rust/Anchor) for on-chain swap logic
- Test suite (TypeScript) for validation
- Web UI (React/Next.js) for user interaction
- Security and auditability measures

### 1.3 Stakeholders
- **Administrator (Initializer)**: Creates markets, sets exchange rates, provides liquidity
- **User (Trader)**: Executes token swaps at published rates
- **Developer**: Builds and maintains the system
- **Auditor**: Reviews security and compliance

---

## 2. Functional Requirements

### 2.1 Market Management

#### REQ-F-001: Initialize Market
- **Statement:** THE system SHALL create a decentralized market between two SPL tokens (Token A and Token B) when invoked by an administrator
- **Category:** Functional
- **Priority:** Must have
- **Source:** Section 1, 7, 8 - requirements_input.md
- **Rationale:** Markets are the foundational entity enabling all swap operations between token pairs
- **Acceptance criteria:**
  - GIVEN an administrator wallet with sufficient SOL balance and two valid SPL token mint addresses
  - WHEN the administrator invokes initialize_market with token_mint_a and token_mint_b
  - THEN a MarketAccount PDA SHALL be created with seeds [b"market", token_mint_a.key, token_mint_b.key]
  - AND a vault_a TokenAccount PDA SHALL be created for Token A with authority = market PDA
  - AND a vault_b TokenAccount PDA SHALL be created for Token B with authority = market PDA
  - AND the MarketAccount SHALL store authority, token_mint_a, token_mint_b, price (initialized to 0), decimals_a, decimals_b, and bump
- **Dependencies:** None

#### REQ-F-002: Set Exchange Rate
- **Statement:** WHEN an administrator invokes set_price, THE system SHALL update the exchange rate between Token A and Token B in the target market
- **Category:** Functional
- **Priority:** Must have
- **Source:** Section 8.2, 210, 260 - requirements_input.md
- **Rationale:** Exchange rates must be adjustable to reflect real-world market conditions or administrator policy
- **Acceptance criteria:**
  - GIVEN an initialized market and the administrator's signature
  - WHEN the administrator invokes set_price with a new price value (u64) representing "1 Token A = price/10^6 Token B"
  - THEN the market.price field SHALL be updated to the new value
  - AND only the market.authority SHALL be permitted to invoke this instruction
  - AND IF a non-authority account attempts to invoke set_price THEN the transaction SHALL fail with an authorization error
- **Dependencies:** REQ-F-001

#### REQ-F-003: Add Liquidity to Vault A
- **Statement:** WHEN an administrator invokes add_liquidity with amount_a > 0, THE system SHALL transfer amount_a tokens from the administrator's Token A account to vault_a
- **Category:** Functional
- **Priority:** Must have
- **Source:** Section 8.3, 210, 270 - requirements_input.md
- **Rationale:** Liquidity is required in vaults to fulfill swap requests from users
- **Acceptance criteria:**
  - GIVEN an initialized market, administrator signature, and administrator's Token A account with balance >= amount_a
  - WHEN the administrator invokes add_liquidity with amount_a > 0 and amount_b = 0
  - THEN the system SHALL perform a CPI to the Token Program to transfer amount_a tokens from authority_token_a to vault_a
  - AND the administrator's Token A balance SHALL decrease by amount_a
  - AND the vault_a balance SHALL increase by amount_a
- **Dependencies:** REQ-F-001

#### REQ-F-004: Add Liquidity to Vault B
- **Statement:** WHEN an administrator invokes add_liquidity with amount_b > 0, THE system SHALL transfer amount_b tokens from the administrator's Token B account to vault_b
- **Category:** Functional
- **Priority:** Must have
- **Source:** Section 8.3, 210, 270 - requirements_input.md
- **Rationale:** Liquidity is required in vaults to fulfill swap requests from users
- **Acceptance criteria:**
  - GIVEN an initialized market, administrator signature, and administrator's Token B account with balance >= amount_b
  - WHEN the administrator invokes add_liquidity with amount_a = 0 and amount_b > 0
  - THEN the system SHALL perform a CPI to the Token Program to transfer amount_b tokens from authority_token_b to vault_b
  - AND the administrator's Token B balance SHALL decrease by amount_b
  - AND the vault_b balance SHALL increase by amount_b
- **Dependencies:** REQ-F-001

#### REQ-F-005: Add Liquidity to Both Vaults
- **Statement:** WHEN an administrator invokes add_liquidity with both amount_a > 0 AND amount_b > 0, THE system SHALL transfer both token amounts to their respective vaults atomically
- **Category:** Functional
- **Priority:** Should have
- **Source:** Section 8.3, 270 - requirements_input.md
- **Rationale:** Administrators may want to provision both sides of the market in a single transaction
- **Acceptance criteria:**
  - GIVEN an initialized market, administrator signature, and sufficient balances in both token accounts
  - WHEN the administrator invokes add_liquidity with amount_a > 0 AND amount_b > 0
  - THEN the system SHALL transfer amount_a to vault_a AND amount_b to vault_b
  - AND IF either transfer fails THEN both transfers SHALL be rolled back
- **Dependencies:** REQ-F-003, REQ-F-004

### 2.2 Token Swap Operations

#### REQ-F-006: Swap Token A to Token B
- **Statement:** WHEN a user invokes swap with swap_a_to_b = true and amount > 0, THE system SHALL transfer amount Token A from the user to vault_a and transfer calculated amount_b Token B from vault_b to the user
- **Category:** Functional
- **Priority:** Must have
- **Source:** Section 1, 8.4, 210, 280, 290 - requirements_input.md
- **Rationale:** Core swap functionality for A→B direction
- **Acceptance criteria:**
  - GIVEN an initialized market with price > 0, user signature, user Token A balance >= amount, and vault_b balance >= calculated amount_b
  - WHEN the user invokes swap with amount and swap_a_to_b = true
  - THEN the system SHALL calculate amount_b = (amount × price × 10^decimals_b) / (10^6 × 10^decimals_a) using checked arithmetic
  - AND the system SHALL transfer amount Token A from user_token_a to vault_a via CPI with user as authority
  - AND the system SHALL transfer amount_b Token B from vault_b to user_token_b via CPI with market PDA as signer using seeds [b"market", market.token_mint_a, market.token_mint_b, market.bump]
  - AND the user's Token A balance SHALL decrease by amount
  - AND the user's Token B balance SHALL increase by amount_b
- **Dependencies:** REQ-F-001, REQ-F-002, REQ-F-004

#### REQ-F-007: Swap Token B to Token A
- **Statement:** WHEN a user invokes swap with swap_a_to_b = false and amount > 0, THE system SHALL transfer amount Token B from the user to vault_b and transfer calculated amount_a Token A from vault_a to the user
- **Category:** Functional
- **Priority:** Must have
- **Source:** Section 1, 8.4, 210, 290 - requirements_input.md (explicitly marked as required in Section 1: "también (Token B → Token A) como indica la guía de estudiantes")
- **Rationale:** Bidirectional swap capability completes the exchange functionality
- **Acceptance criteria:**
  - GIVEN an initialized market with price > 0, user signature, user Token B balance >= amount, and vault_a balance >= calculated amount_a
  - WHEN the user invokes swap with amount and swap_a_to_b = false
  - THEN the system SHALL calculate amount_a = (amount × 10^6 × 10^decimals_a) / (price × 10^decimals_b) using checked_div to avoid division by zero
  - AND the system SHALL transfer amount Token B from user_token_b to vault_a via CPI with user as authority
  - AND the system SHALL transfer amount_a Token A from vault_a to user_token_a via CPI with market PDA as signer
  - AND the user's Token B balance SHALL decrease by amount
  - AND the user's Token A balance SHALL increase by amount_a
- **Dependencies:** REQ-F-001, REQ-F-002, REQ-F-003

### 2.3 Access Control

#### REQ-F-008: Authority-Only Market Modification
- **Statement:** THE system SHALL restrict invocation of set_price and add_liquidity instructions to the market.authority account
- **Category:** Functional
- **Priority:** Must have
- **Source:** Section 210, 230, 260 - requirements_input.md
- **Rationale:** Prevent unauthorized manipulation of exchange rates and liquidity
- **Acceptance criteria:**
  - GIVEN a market with authority = Administrator A
  - WHEN a different account (not Administrator A) attempts to invoke set_price or add_liquidity
  - THEN the transaction SHALL fail with an authorization error
  - AND no state changes SHALL be persisted
- **Dependencies:** REQ-F-001, REQ-F-002, REQ-F-003, REQ-F-004

#### REQ-F-009: Public Swap Access
- **Statement:** THE system SHALL allow any account with valid token balances to invoke the swap instruction
- **Category:** Functional
- **Priority:** Must have
- **Source:** Section 210, 290 - requirements_input.md
- **Rationale:** Swaps are permissionless - any user can trade at published rates
- **Acceptance criteria:**
  - GIVEN an initialized market with liquidity and a valid price
  - WHEN any user account invokes swap with valid parameters
  - THEN the swap SHALL execute successfully regardless of the user's identity
  - AND no authorization check SHALL be performed on the user account
- **Dependencies:** REQ-F-006, REQ-F-007

### 2.4 Data Integrity

#### REQ-F-010: Market Account Data Structure
- **Statement:** THE system SHALL store market metadata in a MarketAccount with fields: authority (Pubkey), token_mint_a (Pubkey), token_mint_b (Pubkey), price (u64), decimals_a (u8), decimals_b (u8), bump (u8)
- **Category:** Functional
- **Priority:** Must have
- **Source:** Section 8.1, 220, 225 - requirements_input.md
- **Rationale:** Market data must be persistently stored on-chain to govern swap operations
- **Acceptance criteria:**
  - GIVEN a market initialization request
  - WHEN the MarketAccount is created
  - THEN the account SHALL be allocated with space = 8 (discriminator) + MarketAccount::INIT_SPACE
  - AND all fields SHALL be populated: authority, token_mint_a, token_mint_b, price (default 0), decimals_a, decimals_b, bump
  - AND the account SHALL be a PDA derived from seeds [b"market", token_mint_a, token_mint_b]
- **Dependencies:** REQ-F-001

#### REQ-F-011: Program Derived Address (PDA) Derivation
- **Statement:** THE system SHALL derive all PDAs deterministically using documented seeds and SHALL store bump seeds in account structures to avoid recomputation
- **Category:** Functional
- **Priority:** Must have
- **Source:** Section 7.1, 220, 290 - requirements_input.md
- **Rationale:** PDAs must be deterministic to allow programs to sign CPIs and for clients to find accounts
- **Acceptance criteria:**
  - GIVEN a market creation or account derivation request
  - WHEN a PDA is derived for market, vault_a, or vault_b
  - THEN the seeds SHALL be: market = [b"market", token_mint_a.key, token_mint_b.key], vault_a = [b"vault_a", market.key], vault_b = [b"vault_b", market.key]
  - AND the bump seed SHALL be found via Pubkey::find_program_address
  - AND the bump SHALL be stored in MarketAccount.bump for reuse in CPI signers
- **Dependencies:** REQ-F-001

### 2.5 User Interface

#### REQ-F-012: Web UI for Market Initialization
- **Statement:** THE web UI SHALL provide a form for administrators to initialize markets by connecting a Phantom wallet and submitting token mint addresses
- **Category:** Functional
- **Priority:** Should have
- **Source:** Section 13 - requirements_input.md
- **Rationale:** Administrators need a user-friendly interface to create markets without writing code
- **Acceptance criteria:**
  - GIVEN an administrator opens the web UI
  - WHEN the administrator connects their Phantom wallet and navigates to the "Initialize Market" page
  - THEN the UI SHALL display input fields for token_mint_a and token_mint_b
  - AND WHEN the administrator submits the form THEN the UI SHALL invoke the initialize_market instruction
  - AND the UI SHALL display a success message with the market PDA address OR an error message if the transaction fails
- **Dependencies:** REQ-F-001

#### REQ-F-013: Web UI for Adding Liquidity
- **Statement:** THE web UI SHALL provide a form for administrators to add liquidity to vaults by specifying token amounts
- **Category:** Functional
- **Priority:** Should have
- **Source:** Section 13 - requirements_input.md
- **Rationale:** Administrators need to provision liquidity through the UI
- **Acceptance criteria:**
  - GIVEN an administrator is connected to a market in the web UI
  - WHEN the administrator navigates to "Add Liquidity"
  - THEN the UI SHALL display input fields for amount_a and amount_b
  - AND the UI SHALL display current vault balances
  - AND WHEN the administrator submits THEN the UI SHALL invoke add_liquidity
  - AND the UI SHALL refresh vault balances after the transaction confirms
- **Dependencies:** REQ-F-003, REQ-F-004

#### REQ-F-014: Web UI for Setting Exchange Rate
- **Statement:** THE web UI SHALL provide a form for administrators to update the exchange rate
- **Category:** Functional
- **Priority:** Should have
- **Source:** Section 13 - requirements_input.md
- **Rationale:** Exchange rate adjustments must be accessible to administrators
- **Acceptance criteria:**
  - GIVEN an administrator is connected to a market in the web UI
  - WHEN the administrator navigates to "Set Price"
  - THEN the UI SHALL display the current price and an input field for the new price
  - AND the UI SHALL validate that price > 0
  - AND WHEN the administrator submits THEN the UI SHALL invoke set_price
  - AND the UI SHALL display the updated price after confirmation
- **Dependencies:** REQ-F-002

#### REQ-F-015: Web UI for Token Swaps
- **Statement:** THE web UI SHALL provide a swap interface for users to exchange tokens by specifying input amount and direction
- **Category:** Functional
- **Priority:** Should have
- **Source:** Section 13 - requirements_input.md
- **Rationale:** Users need a visual interface to perform swaps
- **Acceptance criteria:**
  - GIVEN a user connects their wallet to the web UI
  - WHEN the user navigates to "Swap"
  - THEN the UI SHALL display input fields for amount and swap direction (A→B or B→A)
  - AND the UI SHALL calculate and display the expected output amount based on the current price
  - AND the UI SHALL display the user's token balances
  - AND WHEN the user submits THEN the UI SHALL invoke the swap instruction
  - AND the UI SHALL refresh token balances after the transaction confirms
- **Dependencies:** REQ-F-006, REQ-F-007

#### REQ-F-016: Wallet Connection
- **Statement:** THE web UI SHALL support Phantom wallet connection for transaction signing
- **Category:** Functional
- **Priority:** Must have
- **Source:** Section 13 - requirements_input.md
- **Rationale:** Solana transactions require wallet signatures
- **Acceptance criteria:**
  - GIVEN a user opens the web UI
  - WHEN the user clicks "Connect Wallet"
  - THEN the UI SHALL prompt the user to connect via Phantom wallet
  - AND IF Phantom is installed THEN the UI SHALL establish a connection and display the user's public key
  - AND IF Phantom is not installed THEN the UI SHALL display a message with a link to install Phantom
- **Dependencies:** None

---

## 3. Nonfunctional Requirements

### 3.1 Security

#### REQ-NF-001: Overflow Protection
- **Statement:** THE system SHALL use checked arithmetic operations (checked_mul, checked_div, checked_add, checked_sub) for all token amount calculations to prevent overflow/underflow
- **Category:** Security
- **Priority:** Must have
- **Metric:** 100% of arithmetic operations on token amounts use checked methods
- **Source:** Section 290 - requirements_input.md, SWEBOK Security Best Practices
- **Acceptance criteria:**
  - GIVEN any swap or liquidity calculation
  - WHEN performing arithmetic on u64 values (amounts, prices)
  - THEN the code SHALL use checked_mul, checked_div, etc.
  - AND IF overflow/underflow is detected THEN the transaction SHALL fail with an error

#### REQ-NF-002: Division by Zero Protection
- **Statement:** THE system SHALL validate that market.price > 0 before executing swap calculations in the B→A direction
- **Category:** Security
- **Priority:** Must have
- **Metric:** Zero division-by-zero runtime errors in production
- **Source:** Section 290 - requirements_input.md
- **Acceptance criteria:**
  - GIVEN a swap request in the B→A direction
  - WHEN price = 0
  - THEN the system SHALL fail the transaction with a descriptive error (e.g., "PriceNotSet")
  - AND no division operation SHALL be attempted

#### REQ-NF-003: Insufficient Liquidity Protection
- **Statement:** THE system SHALL verify that the source vault has sufficient balance to fulfill the swap output amount before executing token transfers
- **Category:** Security
- **Priority:** Must have
- **Metric:** Zero "insufficient funds" CPI errors reaching the Token Program
- **Source:** Best practices inferred from Section 280, 290
- **Acceptance criteria:**
  - GIVEN a swap request for amount X in direction D
  - WHEN the calculated output amount > source vault balance
  - THEN the transaction SHALL fail with an "InsufficientLiquidity" error
  - AND no transfer CPI SHALL be invoked

#### REQ-NF-004: Zero Amount Validation
- **Statement:** THE system SHALL reject swap and add_liquidity instructions where all input amounts are zero
- **Category:** Security
- **Priority:** Must have
- **Metric:** 100% of zero-amount transactions rejected
- **Source:** Inferred from Section 270 requirement "amount_a o amount_b sean mayor que 0"
- **Acceptance criteria:**
  - GIVEN a swap instruction with amount = 0
  - WHEN the instruction is invoked
  - THEN the transaction SHALL fail with an "InvalidAmount" error
  - AND GIVEN an add_liquidity instruction with amount_a = 0 AND amount_b = 0
  - THEN the transaction SHALL fail with an "InvalidAmount" error

#### REQ-NF-005: PDA Ownership Verification
- **Statement:** THE system SHALL verify that vault PDAs are owned by the Token Program and that the market PDA is owned by the swap program before processing instructions
- **Category:** Security
- **Priority:** Must have
- **Metric:** 100% of account constraints include owner checks
- **Source:** Solana security best practices, Anchor framework patterns
- **Acceptance criteria:**
  - GIVEN any instruction receiving accounts
  - WHEN accounts are deserialized
  - THEN Anchor SHALL enforce owner constraints (Account<'info, MarketAccount> enforces program ownership, Account<'info, TokenAccount> enforces Token Program ownership)
  - AND IF an account has an incorrect owner THEN deserialization SHALL fail before instruction logic executes

#### REQ-NF-006: Signer Verification
- **Statement:** THE system SHALL verify that the authority account is a signer for set_price and add_liquidity instructions
- **Category:** Security
- **Priority:** Must have
- **Metric:** 100% of privileged instructions require valid signatures
- **Source:** Section 210, 260 - requirements_input.md
- **Acceptance criteria:**
  - GIVEN a set_price or add_liquidity instruction
  - WHEN the authority account is not a signer
  - THEN Anchor SHALL reject the transaction with a "Missing Signer" error before executing the instruction handler

#### REQ-NF-007: Front-Running Resistance (Price Slippage Protection)
- **Statement:** THE web UI SHOULD allow users to specify a maximum acceptable slippage percentage for swap transactions
- **Category:** Security
- **Priority:** Should have
- **Metric:** Slippage parameter available in UI and validated on-chain (future enhancement)
- **Source:** DeFi security best practices (implied by "mejores prácticas de seguridad")
- **Acceptance criteria:**
  - GIVEN a user initiates a swap in the UI
  - WHEN the user sets max slippage to 1%
  - THEN the UI SHALL calculate min_output_amount = expected_output × (1 - 0.01)
  - AND (future on-chain validation) the program SHALL fail the swap if actual output < min_output_amount

#### REQ-NF-008: Reentrancy Protection
- **Statement:** THE system SHALL NOT be vulnerable to reentrancy attacks during CPI token transfers
- **Category:** Security
- **Priority:** Must have
- **Metric:** Zero reentrancy vulnerabilities found in security audit
- **Source:** Solana security best practices (implied by "protección frente a VULNERABILIDADES")
- **Acceptance criteria:**
  - GIVEN the swap instruction performs two CPI calls (user→vault, vault→user)
  - WHEN a malicious token program attempts to re-invoke the swap program during a CPI callback
  - THEN Solana's single-threaded execution model SHALL prevent reentrancy
  - AND all state updates SHALL occur after all CPIs complete

### 3.2 Auditability

#### REQ-NF-009: Event Emission for Market Initialization
- **Statement:** THE system SHALL emit a MarketInitialized event containing market PDA, token_mint_a, token_mint_b, authority, and timestamp when a market is created
- **Category:** Auditability
- **Priority:** Should have
- **Metric:** 100% of market initializations emit events
- **Source:** Section 10, Exercise 3 - requirements_input.md
- **Acceptance criteria:**
  - GIVEN a successful initialize_market instruction
  - WHEN the instruction completes
  - THEN an event SHALL be emitted with fields: market (Pubkey), token_mint_a (Pubkey), token_mint_b (Pubkey), authority (Pubkey), timestamp (i64)

#### REQ-NF-010: Event Emission for Price Updates
- **Statement:** THE system SHALL emit a PriceSet event containing market PDA, old_price, new_price, and timestamp when the exchange rate is updated
- **Category:** Auditability
- **Priority:** Should have
- **Metric:** 100% of set_price invocations emit events
- **Source:** Section 10, Exercise 3 - requirements_input.md
- **Acceptance criteria:**
  - GIVEN a successful set_price instruction
  - WHEN the price is updated
  - THEN an event SHALL be emitted with fields: market (Pubkey), old_price (u64), new_price (u64), timestamp (i64)

#### REQ-NF-011: Event Emission for Liquidity Additions
- **Statement:** THE system SHALL emit a LiquidityAdded event containing market PDA, amount_a, amount_b, and timestamp when liquidity is added
- **Category:** Auditability
- **Priority:** Should have
- **Metric:** 100% of add_liquidity invocations emit events
- **Source:** Section 10, Exercise 3 - requirements_input.md
- **Acceptance criteria:**
  - GIVEN a successful add_liquidity instruction
  - WHEN tokens are transferred to vaults
  - THEN an event SHALL be emitted with fields: market (Pubkey), amount_a (u64), amount_b (u64), timestamp (i64)

#### REQ-NF-012: Event Emission for Swaps
- **Statement:** THE system SHALL emit a SwapExecuted event containing market PDA, user, direction, input_amount, output_amount, and timestamp when a swap is executed
- **Category:** Auditability
- **Priority:** Should have
- **Metric:** 100% of swap invocations emit events
- **Source:** Section 10, Exercise 3 - requirements_input.md
- **Acceptance criteria:**
  - GIVEN a successful swap instruction
  - WHEN tokens are exchanged
  - THEN an event SHALL be emitted with fields: market (Pubkey), user (Pubkey), swap_a_to_b (bool), input_amount (u64), output_amount (u64), timestamp (i64)

### 3.3 Performance

#### REQ-NF-013: Transaction Confirmation Time
- **Statement:** THE system SHALL process swap transactions within 1 block confirmation time on Solana mainnet (target: 400-800ms)
- **Category:** Performance
- **Priority:** Must have
- **Metric:** p99 transaction confirmation time < 800ms
- **Source:** Solana performance characteristics (inferred from "eficiente")
- **Acceptance criteria:**
  - GIVEN a swap instruction submitted to mainnet
  - WHEN the transaction is processed
  - THEN the transaction SHALL be confirmed and finalized within 1-2 blocks (400-800ms)
  - AND the confirmation latency SHALL be measured and logged

#### REQ-NF-014: Compute Unit Efficiency
- **Statement:** THE system SHALL execute swap instructions within 50,000 compute units to minimize transaction fees
- **Category:** Performance
- **Priority:** Should have
- **Metric:** Compute units consumed per swap < 50,000 CU
- **Source:** Solana compute budget best practices
- **Acceptance criteria:**
  - GIVEN a swap instruction
  - WHEN compute unit consumption is measured
  - THEN the instruction SHALL consume < 50,000 CU for typical swap operations
  - AND IF CU consumption exceeds 50,000 THEN optimization opportunities SHALL be identified

#### REQ-NF-015: UI Responsiveness
- **Statement:** THE web UI SHALL display transaction status updates within 500ms of receiving on-chain confirmation
- **Category:** Performance / Usability
- **Priority:** Should have
- **Metric:** p95 UI update latency < 500ms after on-chain confirmation
- **Source:** Section 13 - requirements_input.md (implied by "fácil de manejar")
- **Acceptance criteria:**
  - GIVEN a user submits a transaction via the UI
  - WHEN the transaction is confirmed on-chain
  - THEN the UI SHALL update the displayed balances and status within 500ms
  - AND the UI SHALL display intermediate states: "Pending", "Confirming", "Confirmed", "Failed"

### 3.4 Reliability

#### REQ-NF-016: Transaction Atomicity
- **Statement:** THE system SHALL ensure that all token transfers within a single instruction are atomic (all succeed or all fail)
- **Category:** Reliability
- **Priority:** Must have
- **Metric:** Zero partial state updates observed
- **Source:** Solana transaction atomicity guarantees
- **Acceptance criteria:**
  - GIVEN a swap instruction with two CPI transfers
  - WHEN the second transfer fails (e.g., insufficient vault balance)
  - THEN the first transfer SHALL be rolled back
  - AND no tokens SHALL be debited from the user

#### REQ-NF-017: Idempotency of Market Initialization
- **Statement:** THE system SHALL fail if attempting to initialize a market for a token pair that already exists
- **Category:** Reliability
- **Priority:** Must have
- **Metric:** Zero duplicate markets created
- **Source:** PDA uniqueness guarantees (inferred from Section 220)
- **Acceptance criteria:**
  - GIVEN a market already exists for token_mint_a and token_mint_b
  - WHEN initialize_market is invoked again with the same token_mint_a and token_mint_b
  - THEN the transaction SHALL fail because the PDA account already exists
  - AND Anchor's `init` constraint SHALL enforce this

### 3.5 Maintainability

#### REQ-NF-018: Code Documentation
- **Statement:** THE system SHALL document all public instructions, contexts, and account structures with inline Rust doc comments
- **Category:** Maintainability
- **Priority:** Should have
- **Metric:** 100% of public items have doc comments
- **Source:** Section 12 educational objectives - requirements_input.md
- **Acceptance criteria:**
  - GIVEN the lib.rs source code
  - WHEN reviewing public functions and structs
  - THEN each SHALL have a /// doc comment describing purpose, parameters, and behavior
  - AND `cargo doc` SHALL generate complete HTML documentation

#### REQ-NF-019: Formula Documentation
- **Statement:** THE system SHALL document the price calculation formulas for both swap directions in code comments and external documentation
- **Category:** Maintainability
- **Priority:** Should have
- **Metric:** Formulas documented in code and README
- **Source:** Section 8.4, Exercise 4 - requirements_input.md
- **Acceptance criteria:**
  - GIVEN the swap function
  - WHEN reviewing the calculation logic
  - THEN inline comments SHALL explain: amount_b = (amount × price × 10^decimals_b) / (10^6 × 10^decimals_a) for A→B
  - AND amount_a = (amount × 10^6 × 10^decimals_a) / (price × 10^decimals_b) for B→A
  - AND the README SHALL include these formulas with examples

### 3.6 Testability

#### REQ-NF-020: Automated Test Suite
- **Statement:** THE system SHALL include an automated TypeScript test suite that validates all instructions on a local test validator
- **Category:** Testability
- **Priority:** Must have
- **Metric:** Test suite passes with 100% instruction coverage
- **Source:** Section 9, 240, 250, 260, 270, 290, 300 - requirements_input.md
- **Acceptance criteria:**
  - GIVEN the test suite in tests/solana-swap-2025.ts
  - WHEN `anchor test` is executed
  - THEN tests SHALL cover: initialize_market, set_price, add_liquidity, swap (both directions)
  - AND all tests SHALL pass on solana-test-validator
  - AND test results SHALL be automatically verified in CI

#### REQ-NF-021: Test Coverage - Edge Cases
- **Statement:** THE test suite SHALL include tests for edge cases: zero amounts, insufficient liquidity, unauthorized access, price = 0, overflow conditions
- **Category:** Testability
- **Priority:** Must have
- **Metric:** Edge case tests cover all identified failure modes
- **Source:** Section 10, Exercise 2 - requirements_input.md
- **Acceptance criteria:**
  - GIVEN the test suite
  - WHEN reviewing test cases
  - THEN tests SHALL verify that:
    - swap with amount = 0 fails
    - swap with insufficient vault balance fails
    - set_price by non-authority fails
    - swap when price = 0 fails (B→A direction)
    - arithmetic overflow is handled gracefully

#### REQ-NF-022: Test Environment Setup
- **Statement:** THE test suite SHALL automatically set up the test environment including: airdropping SOL, creating token mints, creating ATAs, and minting test tokens
- **Category:** Testability
- **Priority:** Must have
- **Metric:** Tests run successfully in a fresh solana-test-validator with no manual setup
- **Source:** Section 250, 500 - requirements_input.md
- **Acceptance criteria:**
  - GIVEN a fresh solana-test-validator instance
  - WHEN the test suite runs
  - THEN the `before` hook SHALL:
    - Airdrop SOL to initializer and user wallets
    - Create mintA and mintB
    - Derive market, vault_a, vault_b PDAs
    - Create ATAs for initializer and user (for both tokens)
    - Mint test tokens to initializer and user
  - AND all tests SHALL execute without manual intervention

### 3.7 Usability

#### REQ-NF-023: UI Modern Design
- **Statement:** THE web UI SHALL follow modern design principles with a responsive layout, clear typography, and intuitive navigation inspired by leading crypto exchanges (e.g., Binance)
- **Category:** Usability
- **Priority:** Should have
- **Metric:** UI passes heuristic usability evaluation (Nielsen's 10 heuristics)
- **Source:** Section 13 - requirements_input.md
- **Acceptance criteria:**
  - GIVEN the web UI
  - WHEN evaluated by a UX designer
  - THEN the UI SHALL:
    - Use a component library (e.g., Material-UI, Ant Design, Chakra UI)
    - Display clear visual feedback for all actions
    - Be responsive (mobile, tablet, desktop)
    - Use consistent color scheme and spacing

#### REQ-NF-024: Error Messaging
- **Statement:** THE web UI SHALL display user-friendly error messages for transaction failures with actionable guidance
- **Category:** Usability
- **Priority:** Should have
- **Metric:** 100% of error states have user-friendly messages
- **Source:** Best practices inferred from Section 13
- **Acceptance criteria:**
  - GIVEN a transaction fails with "InsufficientLiquidity"
  - WHEN the error is displayed in the UI
  - THEN the message SHALL read: "Swap failed: Not enough tokens in the liquidity pool. Try a smaller amount or try again later."
  - AND the UI SHALL suggest corrective actions (reduce amount, check balance, contact support)

### 3.8 Scalability

#### REQ-NF-025: Multiple Market Support (Future Extension)
- **Statement:** THE system architecture SHALL support creation of multiple independent markets for different token pairs (n-pairs) without code modifications
- **Category:** Scalability
- **Priority:** Nice to have
- **Metric:** Ability to create 100+ markets without performance degradation
- **Source:** Section 210 - requirements_input.md ("El software podría servir para n-pares")
- **Acceptance criteria:**
  - GIVEN the current implementation
  - WHEN an administrator creates 100 different markets (each with unique token_mint_a and token_mint_b pairs)
  - THEN each market SHALL operate independently
  - AND no code changes SHALL be required to support additional markets
  - AND transaction performance SHALL not degrade with the number of markets

### 3.9 Portability

#### REQ-NF-026: Deployment Environment Support
- **Statement:** THE system SHALL support deployment to Solana localnet (solana-test-validator), devnet, and mainnet-beta without code changes
- **Category:** Portability
- **Priority:** Must have
- **Metric:** Successful deployment and operation on all three environments
- **Source:** Section 240, Anchor.toml configuration
- **Acceptance criteria:**
  - GIVEN the Anchor.toml configuration
  - WHEN deploying to localnet, devnet, or mainnet
  - THEN only the cluster URL and program ID SHALL need to be updated
  - AND all instructions SHALL function identically across environments

---

## 4. Constraints

### REQ-C-001: Solana Blockchain Platform
- **Statement:** The system must be implemented on the Solana blockchain
- **Type:** Technical
- **Source:** Section 1 - requirements_input.md
- **Rationale:** Project scope is Solana-specific educational content

### REQ-C-002: Anchor Framework
- **Statement:** The smart contract must use Anchor framework version 0.31.0 or higher
- **Type:** Technical
- **Source:** Section 2.3 - requirements_input.md
- **Rationale:** Anchor provides safety guarantees and simplified Solana development

### REQ-C-003: Rust Programming Language
- **Statement:** The smart contract must be written in Rust version 1.70.0 or higher
- **Type:** Technical
- **Source:** Section 2.1 - requirements_input.md
- **Rationale:** Solana programs are compiled from Rust

### REQ-C-004: SPL Token Standard
- **Statement:** All tokens must conform to the SPL Token standard
- **Type:** Technical
- **Source:** Section 7.2 - requirements_input.md
- **Rationale:** Interoperability with Solana ecosystem

### REQ-C-005: TypeScript for Tests
- **Statement:** Test suite must be written in TypeScript
- **Type:** Technical
- **Source:** Section 2.4, tests description - requirements_input.md
- **Rationale:** Anchor test framework uses TypeScript

### REQ-C-006: React and Next.js for UI
- **Statement:** The web UI must use React and Next.js (version 18 or higher)
- **Type:** Technical
- **Source:** Section 13 - requirements_input.md
- **Rationale:** Modern, widely-adopted frameworks for Solana dApp frontends

### REQ-C-007: Phantom Wallet Support
- **Statement:** The web UI must integrate with Phantom wallet for transaction signing
- **Type:** Technical
- **Source:** Section 13 - requirements_input.md
- **Rationale:** Phantom is the most popular Solana wallet

### REQ-C-008: Educational Context
- **Statement:** The project is designed for educational purposes and may not be suitable for production use without additional security audits
- **Type:** Business
- **Source:** Section 12 - requirements_input.md ("proyecto educativo")
- **Rationale:** This is a learning project for Solana development

### REQ-C-009: Fixed Price Model (No AMM)
- **Statement:** The system uses administrator-controlled fixed pricing, not an automated market maker (AMM) like constant product formula
- **Type:** Business
- **Source:** Section 200 - requirements_input.md ("Simula un exchange físico de tienda de cambio")
- **Rationale:** Simplified model for educational purposes

### REQ-C-010: Single Administrator Per Market
- **Statement:** Each market has a single authority account; multi-sig or role-based access control is out of scope
- **Type:** Business
- **Source:** Section 210, 220 - requirements_input.md
- **Rationale:** Simplified governance model for educational project

---

## 5. Traceability Matrix

| REQ ID | Type | Priority | Source | Acceptance Criteria | Stakeholder |
|--------|------|----------|--------|---------------------|-------------|
| REQ-F-001 | Functional | Must | Section 1, 7, 8 | Yes | Administrator, Developer |
| REQ-F-002 | Functional | Must | Section 8.2, 210, 260 | Yes | Administrator |
| REQ-F-003 | Functional | Must | Section 8.3, 210, 270 | Yes | Administrator |
| REQ-F-004 | Functional | Must | Section 8.3, 210, 270 | Yes | Administrator |
| REQ-F-005 | Functional | Should | Section 8.3, 270 | Yes | Administrator |
| REQ-F-006 | Functional | Must | Section 1, 8.4, 210, 280, 290 | Yes | User |
| REQ-F-007 | Functional | Must | Section 1, 8.4, 210, 290 | Yes | User |
| REQ-F-008 | Functional | Must | Section 210, 230, 260 | Yes | Administrator |
| REQ-F-009 | Functional | Must | Section 210, 290 | Yes | User |
| REQ-F-010 | Functional | Must | Section 8.1, 220, 225 | Yes | Developer |
| REQ-F-011 | Functional | Must | Section 7.1, 220, 290 | Yes | Developer |
| REQ-F-012 | Functional | Should | Section 13 | Yes | Administrator |
| REQ-F-013 | Functional | Should | Section 13 | Yes | Administrator |
| REQ-F-014 | Functional | Should | Section 13 | Yes | Administrator |
| REQ-F-015 | Functional | Should | Section 13 | Yes | User |
| REQ-F-016 | Functional | Must | Section 13 | Yes | User, Administrator |
| REQ-NF-001 | Security | Must | Section 290, SWEBOK | Yes | Developer, Auditor |
| REQ-NF-002 | Security | Must | Section 290 | Yes | Developer, Auditor |
| REQ-NF-003 | Security | Must | Section 280, 290 | Yes | Developer, Auditor |
| REQ-NF-004 | Security | Must | Section 270 | Yes | Developer, Auditor |
| REQ-NF-005 | Security | Must | Solana Best Practices | Yes | Developer, Auditor |
| REQ-NF-006 | Security | Must | Section 210, 260 | Yes | Developer, Auditor |
| REQ-NF-007 | Security | Should | DeFi Best Practices | Yes | User, Auditor |
| REQ-NF-008 | Security | Must | Solana Best Practices | Yes | Developer, Auditor |
| REQ-NF-009 | Auditability | Should | Section 10, Exercise 3 | Yes | Auditor |
| REQ-NF-010 | Auditability | Should | Section 10, Exercise 3 | Yes | Auditor |
| REQ-NF-011 | Auditability | Should | Section 10, Exercise 3 | Yes | Auditor |
| REQ-NF-012 | Auditability | Should | Section 10, Exercise 3 | Yes | Auditor |
| REQ-NF-013 | Performance | Must | Solana Characteristics | Yes | User, Developer |
| REQ-NF-014 | Performance | Should | Solana Best Practices | Yes | Developer |
| REQ-NF-015 | Performance/Usability | Should | Section 13 | Yes | User |
| REQ-NF-016 | Reliability | Must | Solana Guarantees | Yes | User, Developer |
| REQ-NF-017 | Reliability | Must | Section 220 | Yes | Administrator, Developer |
| REQ-NF-018 | Maintainability | Should | Section 12 | Yes | Developer |
| REQ-NF-019 | Maintainability | Should | Section 8.4, Exercise 4 | Yes | Developer |
| REQ-NF-020 | Testability | Must | Section 9, 240-300 | Yes | Developer |
| REQ-NF-021 | Testability | Must | Section 10, Exercise 2 | Yes | Developer |
| REQ-NF-022 | Testability | Must | Section 250, 500 | Yes | Developer |
| REQ-NF-023 | Usability | Should | Section 13 | Yes | User |
| REQ-NF-024 | Usability | Should | Section 13 | Yes | User |
| REQ-NF-025 | Scalability | Nice | Section 210 | Yes | Administrator |
| REQ-NF-026 | Portability | Must | Section 240 | Yes | Developer |
| REQ-C-001 | Constraint | - | Section 1 | N/A | All |
| REQ-C-002 | Constraint | - | Section 2.3 | N/A | Developer |
| REQ-C-003 | Constraint | - | Section 2.1 | N/A | Developer |
| REQ-C-004 | Constraint | - | Section 7.2 | N/A | Developer |
| REQ-C-005 | Constraint | - | Section 2.4 | N/A | Developer |
| REQ-C-006 | Constraint | - | Section 13 | N/A | Developer |
| REQ-C-007 | Constraint | - | Section 13 | N/A | Developer |
| REQ-C-008 | Constraint | - | Section 12 | N/A | All |
| REQ-C-009 | Constraint | - | Section 200 | N/A | Administrator, User |
| REQ-C-010 | Constraint | - | Section 210, 220 | N/A | Administrator |

---

## 6. Glossary

| Term | Definition |
|------|------------|
| **Administrator (Initializer)** | The wallet account that creates a market, sets exchange rates, and provides liquidity |
| **ATA (Associated Token Account)** | A deterministic token account address derived from a wallet and token mint |
| **Anchor** | Rust framework for Solana program development |
| **Bump Seed** | A value (0-255) used to derive a PDA that falls off the Ed25519 curve |
| **CPI (Cross-Program Invocation)** | A mechanism for one Solana program to call another |
| **Market** | A trading pair between Token A and Token B with associated vaults and exchange rate |
| **PDA (Program Derived Address)** | A deterministic account address owned by a program, used for signing CPIs |
| **SPL Token** | Solana Program Library token standard (similar to ERC-20) |
| **Swap** | Exchange of one token for another at the market's fixed exchange rate |
| **User (Trader)** | A wallet account that executes token swaps |
| **Vault** | A PDA-controlled token account that holds liquidity for one side of a market |

---

## 7. Appendix: Audit Findings Summary

### Critical Issues (FAIL)
1. **Vague security requirements**: Original document used terms like "mejores prácticas", "seguridad", "auditabilidad" without quantification → **Fixed** with specific requirements REQ-NF-001 through REQ-NF-008
2. **Missing acceptance criteria**: Original requirements lacked Given/When/Then format → **Fixed** with BDD-style criteria for all requirements
3. **Ambiguous UI requirements**: Terms like "moderna", "intuitiva", "fácil de manejar" → **Fixed** with REQ-NF-023, REQ-NF-024 with measurable criteria

### Warnings (WARN)
1. **Missing stakeholder analysis**: Original document focused on developer perspective → **Addressed** in Section 1.3 and traceability matrix
2. **Incomplete security coverage**: No mention of overflow, reentrancy, slippage → **Addressed** with REQ-NF-001 through REQ-NF-008
3. **No prioritization**: All requirements treated equally → **Addressed** with Must/Should/Nice priority levels

### Gaps Filled
1. **Security requirements**: Added 8 security-focused nonfunctional requirements (REQ-NF-001 to REQ-NF-008)
2. **Auditability requirements**: Added 4 event emission requirements (REQ-NF-009 to REQ-NF-012)
3. **Performance requirements**: Added 3 performance requirements (REQ-NF-013 to REQ-NF-015)
4. **Testability requirements**: Added 3 test coverage requirements (REQ-NF-020 to REQ-NF-022)
5. **Error handling**: Specified behavior for edge cases (zero amounts, insufficient liquidity, unauthorized access)

---

## 8. Next Steps

This requirements document is now ready for the next phase of the SDD pipeline:

1. **Review and Approval**: Stakeholders should review this document and approve it
2. **Specifications Engineering**: Run `/sdd:specifications-engineer` to transform these requirements into formal technical specifications
3. **Specification Audit**: Run `/sdd:spec-auditor` to validate specification quality
4. **Test Planning**: Run `/sdd:test-planner` to generate comprehensive test strategies
5. **Architecture Planning**: Run `/sdd:plan-architect` to create implementation plans

---

**Document Control**
- **Version**: 1.0 (Draft)
- **Created**: 2026-03-22
- **Author**: Requirements Engineer (SDD Pipeline)
- **Status**: Pending stakeholder approval
