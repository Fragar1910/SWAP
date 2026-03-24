# Traceability Matrix - Solana SWAP

> **Complete Bidirectional Mapping**
> **From Requirements to Implementation**
> **Generated:** 2026-03-22
> **Version:** 1.0

---

## Overview

This document provides complete **bidirectional traceability** for the Solana SWAP project. It maps:
- Requirements → Use Cases → API Contracts → Events
- Requirements → NFRs → ADRs → Implementation Constraints
- Use Cases → BDD Scenarios → Code → Tests
- Orphan Detection (specs without requirements, requirements without specs)

### Traceability Notation

- **REQ-F-xxx**: Functional Requirements
- **REQ-NF-xxx**: Non-Functional Requirements
- **REQ-C-xxx**: Constraint Requirements
- **UC-xxx**: Use Cases
- **WF-xxx**: Workflows
- **API-xxx**: API Contracts
- **BDD-xxx**: BDD Scenarios (Event IDs)
- **ADR-xxx**: Architecture Decision Records
- **INV-xxx**: Invariants

---

## Functional Requirements Traceability

### REQ-F-001: Initialize Decentralized Token Market

**Requirement:** The system SHALL allow an administrator to initialize a new decentralized exchange market for a pair of SPL tokens by specifying two token mint addresses (token_mint_a and token_mint_b). The system SHALL create a MarketAccount PDA using deterministic seeds [b"market", token_mint_a, token_mint_b] and two vault PDAs (vault_a, vault_b) as TokenAccounts to store liquidity.

**Forward Traceability:**
- **Use Cases**: UC-001 (Initialize Market)
- **Workflows**: WF-001 (Market Setup and Operation)
- **API Contracts**: API-solana-program → initialize_market instruction
- **Events**: MarketInitialized (in EVENTS-swap-program.md)
- **Entities**: ENT-MKT-001 (MarketAccount), ENT-VLT-001 (Vault)
- **Invariants**: INV-MKT-001 (uniqueness), INV-MKT-003 (mint immutability), INV-VLT-003 (single mint)
- **ADRs**: ADR-004 (PDA Architecture)
- **Tests**: test_initialize_market_success, test_market_uniqueness

**Coverage Status**: ✅ Complete

---

### REQ-F-002: Set Exchange Rate

**Requirement:** The system SHALL allow the market authority to set or update the exchange rate (price) for the token pair. The price SHALL be stored as a u64 value representing "1 Token A = price/10^6 Token B" with 6 decimal places of precision.

**Forward Traceability:**
- **Use Cases**: UC-002 (Set Exchange Rate)
- **Workflows**: WF-002 (Exchange Rate Management)
- **API Contracts**: API-solana-program → set_price instruction
- **Events**: PriceSet (in EVENTS-swap-program.md)
- **Value Objects**: VO-PRICE-001 (Price representation)
- **Invariants**: INV-MKT-004 (non-negativity), INV-SWP-005 (price validity)
- **ADRs**: ADR-002 (Fixed Pricing Model)
- **Tests**: test_set_price_success, test_price_validation

**Coverage Status**: ✅ Complete

---

### REQ-F-003: Add Liquidity - Token A Only

**Requirement:** The system SHALL allow the market authority to add liquidity to vault_a by transferring Token A from the authority's Associated Token Account to vault_a via CPI to the SPL Token Program.

**Forward Traceability:**
- **Use Cases**: UC-003 (Add Liquidity) → Normal Flow, AF1 (Add Token A Only)
- **Workflows**: WF-001 (Market Setup and Operation)
- **API Contracts**: API-solana-program → add_liquidity instruction (amount_a > 0, amount_b = 0)
- **Events**: LiquidityAdded (in EVENTS-swap-program.md)
- **Invariants**: INV-VLT-005 (balance conservation)
- **Tests**: test_add_liquidity_token_a_only

**Coverage Status**: ✅ Complete

---

### REQ-F-004: Add Liquidity - Token B Only

**Requirement:** The system SHALL allow the market authority to add liquidity to vault_b by transferring Token B from the authority's Associated Token Account to vault_b via CPI to the SPL Token Program.

**Forward Traceability:**
- **Use Cases**: UC-003 (Add Liquidity) → AF2 (Add Token B Only)
- **Workflows**: WF-001 (Market Setup and Operation)
- **API Contracts**: API-solana-program → add_liquidity instruction (amount_a = 0, amount_b > 0)
- **Events**: LiquidityAdded (in EVENTS-swap-program.md)
- **Invariants**: INV-VLT-005 (balance conservation)
- **Tests**: test_add_liquidity_token_b_only

**Coverage Status**: ✅ Complete

---

### REQ-F-005: Add Liquidity - Both Tokens Atomically

**Requirement:** The system SHALL allow the market authority to add liquidity to both vaults atomically by transferring both Token A and Token B in a single transaction. If either transfer fails, both SHALL be rolled back.

**Forward Traceability:**
- **Use Cases**: UC-003 (Add Liquidity) → Normal Flow (both amounts > 0)
- **Workflows**: WF-001 (Market Setup and Operation)
- **API Contracts**: API-solana-program → add_liquidity instruction (amount_a > 0, amount_b > 0)
- **Events**: LiquidityAdded (in EVENTS-swap-program.md)
- **Invariants**: INV-VLT-005 (balance conservation), INV-SWP-002 (atomicity)
- **Tests**: test_add_liquidity_both_tokens, test_partial_transfer_failure

**Coverage Status**: ✅ Complete

---

### REQ-F-006: Swap Token A to B

**Requirement:** The system SHALL allow any user to swap Token A for Token B by transferring Token A to vault_a and receiving Token B from vault_b. The output amount SHALL be calculated as: amount_b = (amount × price × 10^decimals_b) / (10^6 × 10^decimals_a).

**Forward Traceability:**
- **Use Cases**: UC-004 (Swap Token A to B)
- **Workflows**: WF-001 (Market Setup and Operation)
- **API Contracts**: API-solana-program → swap instruction (swap_a_to_b = true)
- **Events**: SwapExecuted (in EVENTS-swap-program.md)
- **Invariants**: INV-SWP-003 (calculation correctness), INV-SWP-001 (positive amounts)
- **Tests**: test_swap_a_to_b_success, test_swap_calculation_a_to_b

**Coverage Status**: ✅ Complete

---

### REQ-F-007: Swap Token B to A

**Requirement:** The system SHALL allow any user to swap Token B for Token A by transferring Token B to vault_b and receiving Token A from vault_a. The output amount SHALL be calculated as: amount_a = (amount × 10^6 × 10^decimals_a) / (price × 10^decimals_b).

**Forward Traceability:**
- **Use Cases**: UC-005 (Swap Token B to A)
- **Workflows**: WF-001 (Market Setup and Operation)
- **API Contracts**: API-solana-program → swap instruction (swap_a_to_b = false)
- **Events**: SwapExecuted (in EVENTS-swap-program.md)
- **Invariants**: INV-SWP-003 (calculation correctness), INV-SWP-005 (price validity)
- **Tests**: test_swap_b_to_a_success, test_swap_calculation_b_to_a

**Coverage Status**: ✅ Complete

---

### REQ-F-008: Authority-Only Operations

**Requirement:** The system SHALL restrict the following operations to the market authority only: set_price, add_liquidity. The system SHALL verify that the transaction signer's public key matches market.authority before executing these instructions.

**Forward Traceability:**
- **Use Cases**: UC-002 (Set Exchange Rate) → EF1 (Unauthorized Access), UC-003 (Add Liquidity) → EF4 (Unauthorized Access)
- **API Contracts**: API-solana-program → set_price, add_liquidity (has_one = authority constraint)
- **Permissions**: PERMISSIONS-MATRIX.md → Administrator role
- **Invariants**: INV-AUTH-001 (signer requirement), INV-MKT-002 (authority immutability)
- **ADRs**: ADR-003 (Single Authority Model)
- **Tests**: test_unauthorized_set_price, test_unauthorized_add_liquidity

**Coverage Status**: ✅ Complete

---

### REQ-F-009: Permissionless Swaps

**Requirement:** The system SHALL allow any user to execute swap transactions without requiring authorization from the market authority. Users only need to sign with their own wallet to transfer tokens from their ATAs.

**Forward Traceability:**
- **Use Cases**: UC-004 (Swap Token A to B), UC-005 (Swap Token B to A) → Normal Flow
- **API Contracts**: API-solana-program → swap instruction (no authority constraint on user account)
- **Permissions**: PERMISSIONS-MATRIX.md → User role
- **Business Rules**: BR-020, BR-029 (swaps are permissionless)
- **Tests**: test_any_user_can_swap

**Coverage Status**: ✅ Complete

---

### REQ-F-010: Store Token Metadata

**Requirement:** The system SHALL store token metadata (decimals_a, decimals_b) in the MarketAccount to enable correct price calculations and amount conversions.

**Forward Traceability:**
- **Use Cases**: UC-001 (Initialize Market) → Step 8 (decimals stored), AF3 (decimals auto-detection)
- **API Contracts**: API-solana-program → MarketAccount struct (decimals_a, decimals_b fields)
- **Entities**: ENT-MKT-001 (MarketAccount)
- **Invariants**: INV-MKT-005 (decimals range [0, 18])
- **Tests**: test_decimals_stored_correctly, test_decimals_range

**Coverage Status**: ✅ Complete

---

### REQ-F-011: PDA-Based Vault Management

**Requirement:** The system SHALL use Program Derived Addresses (PDAs) for vault accounts and market accounts, enabling the program to sign CPI transfers without requiring external private keys. Vaults SHALL be derived using seeds [b"vault_a", market.key()] and [b"vault_b", market.key()].

**Forward Traceability:**
- **Use Cases**: UC-001 (Initialize Market) → Steps 7-12 (PDA derivation)
- **API Contracts**: API-solana-program → Vault PDA seeds, bump constraints
- **Entities**: ENT-VLT-001 (Vault)
- **Invariants**: INV-PDA-001 (determinism), INV-PDA-002 (ownership), INV-VLT-002 (PDA authority)
- **ADRs**: ADR-004 (PDA Architecture)
- **Tests**: test_pda_determinism, test_vault_authority

**Coverage Status**: ✅ Complete

---

### REQ-F-012: Display User Token Balances

**Requirement:** The web UI SHALL display the user's current Token A and Token B balances after wallet connection by querying the user's Associated Token Accounts via RPC.

**Forward Traceability:**
- **Use Cases**: UC-006 (Connect Wallet) → Step 16, UC-004/005 (balance display in UI)
- **API Contracts**: API-web-ui.md → BalanceDisplay component
- **Tests**: test_balance_display_after_connection

**Coverage Status**: ✅ Complete (API-web-ui.md)

---

### REQ-F-013: Display Market Exchange Rate

**Requirement:** The web UI SHALL display the current market exchange rate in human-readable format (e.g., "1 Token A = 2.5 Token B") by querying market.price and converting from u64 to decimal.

**Forward Traceability:**
- **Use Cases**: UC-004 (Swap A to B) → Step 4, UC-005 (Swap B to A) → Step 4
- **API Contracts**: API-web-ui.md → PriceDisplay component
- **Value Objects**: VO-PRICE-001 (Price formatting)
- **Tests**: test_price_display_formatting

**Coverage Status**: ✅ Complete (API-web-ui.md)

---

### REQ-F-014: Display Vault Liquidity

**Requirement:** The web UI SHALL display the current liquidity levels in vault_a and vault_b to inform users about available swap capacity.

**Forward Traceability:**
- **Use Cases**: UC-004 (Swap A to B) → Step 5, UC-005 (Swap B to A) → Step 5
- **API Contracts**: API-web-ui.md → LiquidityDisplay component
- **Tests**: test_liquidity_display_accuracy

**Coverage Status**: ✅ Complete (API-web-ui.md)

---

### REQ-F-015: Calculate Expected Swap Output

**Requirement:** The web UI SHALL calculate and display the expected output amount for a proposed swap in real-time as the user inputs the swap amount, using the same formula as the on-chain program.

**Forward Traceability:**
- **Use Cases**: UC-004 (Swap A to B) → Step 8, UC-005 (Swap B to A) → Step 8
- **API Contracts**: API-web-ui.md → SwapCalculator component
- **Invariants**: INV-SWP-003 (calculation correctness)
- **Tests**: test_ui_calculation_matches_on_chain

**Coverage Status**: ✅ Complete (API-web-ui.md)

---

### REQ-F-016: Phantom Wallet Integration

**Requirement:** The web UI SHALL integrate with Phantom wallet to enable users to connect their wallets, view balances, and sign transactions.

**Forward Traceability:**
- **Use Cases**: UC-006 (Connect Wallet) → Complete use case
- **API Contracts**: API-web-ui.md → WalletAdapter component
- **Business Rules**: BR-038 (Phantom is required wallet)
- **Tests**: test_phantom_connection, test_wallet_signing

**Coverage Status**: ✅ Complete (UC-006, API-web-ui.md)

---

## Non-Functional Requirements Traceability

### REQ-NF-001: Checked Arithmetic

**Requirement:** All arithmetic operations involving token amounts and price calculations SHALL use checked arithmetic (checked_mul, checked_div, checked_add, checked_sub) to prevent integer overflow and underflow.

**Forward Traceability:**
- **Use Cases**: UC-004/005 → EF5 (Arithmetic Overflow)
- **API Contracts**: API-solana-program → swap instruction → checked arithmetic in calculation
- **Invariants**: INV-SWP-006 (overflow protection)
- **ADRs**: ADR-005 (Checked Arithmetic Strategy)
- **Business Rules**: BR-023, BR-032 (checked operations)
- **Tests**: test_overflow_protection, test_underflow_protection

**Coverage Status**: ✅ Complete

---

### REQ-NF-002: Division by Zero Prevention

**Requirement:** The system SHALL validate that market.price > 0 before executing B→A swaps to prevent division by zero errors.

**Forward Traceability:**
- **Use Cases**: UC-005 (Swap B to A) → EF3 (Price Not Set), Step 17 (price validation)
- **API Contracts**: API-solana-program → swap instruction → price validation
- **Invariants**: INV-SWP-005 (price validity for B→A)
- **Business Rules**: BR-033 (price > 0 required)
- **Tests**: test_price_not_set_b_to_a, test_division_by_zero_prevented

**Coverage Status**: ✅ Complete

---

### REQ-NF-003: Liquidity Validation

**Requirement:** The system SHALL validate that the output vault has sufficient balance to fulfill the calculated swap amount before executing the token transfer CPI.

**Forward Traceability:**
- **Use Cases**: UC-004 → EF2 (Insufficient Liquidity), UC-005 → EF2 (Insufficient Liquidity)
- **API Contracts**: API-solana-program → swap instruction → liquidity pre-check
- **Invariants**: INV-VLT-004 (sufficient liquidity), INV-SWP-004 (liquidity pre-check)
- **Business Rules**: BR-025, BR-034 (liquidity validation)
- **Tests**: test_insufficient_liquidity_vault_b, test_insufficient_liquidity_vault_a

**Coverage Status**: ✅ Complete

---

### REQ-NF-004: Zero Amount Rejection

**Requirement:** The system SHALL reject swap transactions with amount = 0 and add_liquidity transactions where both amount_a = 0 AND amount_b = 0.

**Forward Traceability:**
- **Use Cases**: UC-003 → EF3 (Both Amounts Zero), UC-004 → EF3 (Zero Amount), UC-005 → EF4 (Zero Amount)
- **API Contracts**: API-solana-program → swap, add_liquidity → amount validation
- **Invariants**: INV-SWP-001 (positive amounts)
- **Business Rules**: BR-013 (at least one amount > 0)
- **Tests**: test_zero_amount_rejection, test_both_amounts_zero

**Coverage Status**: ✅ Complete

---

### REQ-NF-005: PDA Ownership Validation

**Requirement:** The system SHALL validate that all Program Derived Addresses (PDAs) are owned by the swap program to prevent account substitution attacks.

**Forward Traceability:**
- **Use Cases**: UC-001 → Market PDA creation with program ownership
- **API Contracts**: API-solana-program → Account<'info, T> constraints (Anchor enforces ownership)
- **Invariants**: INV-PDA-002 (program ownership), INV-VLT-002 (PDA authority)
- **ADRs**: ADR-001 (Anchor Framework - built-in ownership checks), ADR-004 (PDA Architecture)
- **Tests**: test_pda_ownership, test_account_owned_by_wrong_program

**Coverage Status**: ✅ Complete

---

### REQ-NF-006: Signer Verification

**Requirement:** The system SHALL verify that the transaction signer's public key matches the expected authority for privileged operations (set_price, add_liquidity).

**Forward Traceability:**
- **Use Cases**: UC-002 → EF1 (Unauthorized Access), UC-003 → EF4 (Unauthorized Access)
- **API Contracts**: API-solana-program → Signer<'info> constraint, has_one = authority
- **Invariants**: INV-AUTH-001 (signer requirement)
- **ADRs**: ADR-001 (Anchor Framework - automatic signer checks)
- **Tests**: test_unauthorized_set_price, test_signer_constraint

**Coverage Status**: ✅ Complete

---

### REQ-NF-007: Idempotency Protection

**Requirement:** The system SHALL prevent duplicate market creation for the same token pair by using deterministic PDA derivation and Anchor's `init` constraint.

**Forward Traceability:**
- **Use Cases**: UC-001 → EF2 (Market Already Exists)
- **API Contracts**: API-solana-program → initialize_market → init constraint
- **Invariants**: INV-MKT-001 (market uniqueness), INV-PDA-001 (deterministic derivation)
- **Business Rules**: BR-001 (each token pair has one market)
- **Tests**: test_duplicate_market_creation_fails

**Coverage Status**: ✅ Complete

---

### REQ-NF-008: Token Mint Validation

**Requirement:** The system SHALL validate that token mint addresses exist on-chain and have valid metadata before creating the market.

**Forward Traceability:**
- **Use Cases**: UC-001 → EF4 (Token Mint Not Found)
- **API Contracts**: API-solana-program → initialize_market → Account<'info, Mint> constraint
- **Tests**: test_invalid_mint_address, test_mint_not_found

**Coverage Status**: ✅ Complete

---

### REQ-NF-009: Event Emission - Market Initialized

**Requirement:** The system SHALL emit a MarketInitialized event upon successful market creation, including market PDA, token mints, authority, and timestamp.

**Forward Traceability:**
- **Use Cases**: UC-001 → Step 13 (emit MarketInitialized event)
- **API Contracts**: API-solana-program → MarketInitialized event schema
- **Events**: EVENTS-swap-program.md → MarketInitialized
- **Invariants**: INV-EVT-001 (event emission), INV-EVT-002 (event accuracy)
- **ADRs**: ADR-006 (Event Emission Strategy)
- **Tests**: test_market_initialized_event_emitted

**Coverage Status**: ✅ Complete

---

### REQ-NF-010: Event Emission - Price Set

**Requirement:** The system SHALL emit a PriceSet event when the exchange rate is updated, including old_price, new_price, and timestamp.

**Forward Traceability:**
- **Use Cases**: UC-002 → Step 14 (emit PriceSet event)
- **API Contracts**: API-solana-program → PriceSet event schema
- **Events**: EVENTS-swap-program.md → PriceSet
- **Invariants**: INV-EVT-001, INV-EVT-002
- **ADRs**: ADR-006 (Event Emission Strategy)
- **Tests**: test_price_set_event_emitted, test_price_event_accuracy

**Coverage Status**: ✅ Complete

---

### REQ-NF-011: Event Emission - Liquidity Added

**Requirement:** The system SHALL emit a LiquidityAdded event when liquidity is provisioned, including amount_a, amount_b, and timestamp.

**Forward Traceability:**
- **Use Cases**: UC-003 → Step 15 (emit LiquidityAdded event)
- **API Contracts**: API-solana-program → LiquidityAdded event schema
- **Events**: EVENTS-swap-program.md → LiquidityAdded
- **Invariants**: INV-EVT-001, INV-EVT-002
- **ADRs**: ADR-006 (Event Emission Strategy)
- **Tests**: test_liquidity_added_event_emitted

**Coverage Status**: ✅ Complete

---

### REQ-NF-012: Event Emission - Swap Executed

**Requirement:** The system SHALL emit a SwapExecuted event for every successful swap, including user, direction, input_amount, output_amount, and timestamp.

**Forward Traceability:**
- **Use Cases**: UC-004 → Step 21, UC-005 → Step 22 (emit SwapExecuted event)
- **API Contracts**: API-solana-program → SwapExecuted event schema
- **Events**: EVENTS-swap-program.md → SwapExecuted
- **Invariants**: INV-EVT-001, INV-EVT-002
- **ADRs**: ADR-006 (Event Emission Strategy)
- **Tests**: test_swap_executed_event_emitted, test_swap_event_accuracy

**Coverage Status**: ✅ Complete

---

### REQ-NF-013: Transaction Confirmation Time

**Requirement:** The system SHALL process swap transactions within 1 block confirmation time on Solana mainnet (target: p99 < 800ms).

**Forward Traceability:**
- **NFR Documents**: PERFORMANCE.md → Section 2 (Transaction Confirmation Time)
- **Use Cases**: UC-004, UC-005 → Normal Flow execution time
- **Tests**: load_test_baseline, test_confirmation_latency

**Coverage Status**: ✅ Complete (PERFORMANCE.md)

---

### REQ-NF-014: Compute Unit Efficiency

**Requirement:** The system SHALL execute swap instructions within 50,000 compute units to minimize transaction fees.

**Forward Traceability:**
- **NFR Documents**: PERFORMANCE.md → Section 3 (Compute Unit Efficiency)
- **API Contracts**: API-solana-program → swap instruction optimization
- **ADRs**: ADR-001 (Anchor Framework - compute overhead acceptable)
- **Tests**: test_compute_units_under_limit

**Coverage Status**: ✅ Complete (PERFORMANCE.md)

---

### REQ-NF-015: UI Responsiveness

**Requirement:** The web UI SHALL display transaction status updates within 500ms of receiving on-chain confirmation.

**Forward Traceability:**
- **NFR Documents**: PERFORMANCE.md → Section 4 (UI Responsiveness)
- **Use Cases**: UC-004, UC-005 → Step 23/24 (UI update after confirmation)
- **API Contracts**: API-web-ui.md → Real-time balance updates
- **Tests**: test_ui_update_latency

**Coverage Status**: ✅ Complete (PERFORMANCE.md, API-web-ui.md)

---

### REQ-NF-016: Atomicity Guarantee

**Requirement:** All token transfers within a swap or liquidity operation SHALL be atomic - either all succeed or all fail together.

**Forward Traceability:**
- **Use Cases**: UC-003 → EF6 (Partial Transfer Failure), UC-004/005 → Atomicity in transfer steps
- **Invariants**: INV-SWP-002 (atomicity), INV-VLT-005 (balance conservation), INV-GLOBAL-001 (no state leaks)
- **Business Rules**: BR-014, BR-026, BR-035 (atomic transfers)
- **Tests**: test_swap_atomicity, test_partial_transfer_rollback

**Coverage Status**: ✅ Complete

---

### REQ-NF-017: Deterministic Account Derivation

**Requirement:** The system SHALL use deterministic PDA derivation to ensure that the same seeds always produce the same account addresses.

**Forward Traceability:**
- **Use Cases**: UC-001 → Step 7 (deterministic PDA derivation)
- **Invariants**: INV-PDA-001 (determinism), INV-PDA-003 (uniqueness)
- **ADRs**: ADR-004 (PDA Architecture)
- **Tests**: test_pda_determinism, test_pda_derivation_consistency

**Coverage Status**: ✅ Complete

---

### REQ-NF-018: Audit Trail via Events

**Requirement:** The system SHALL maintain a complete audit trail of all state-changing operations through event emission.

**Forward Traceability:**
- **NFR Documents**: OBSERVABILITY.md → Event-based audit trail
- **Events**: EVENTS-swap-program.md → All event types
- **Invariants**: INV-EVT-001 (event emission for all state changes)
- **ADRs**: ADR-006 (Event Emission Strategy)
- **Tests**: test_event_emission_completeness

**Coverage Status**: ✅ Complete (OBSERVABILITY.md, EVENTS-swap-program.md)

---

## Constraint Requirements Traceability

### REQ-C-002: Anchor Framework Requirement

**Requirement:** The project MUST use the Anchor framework (version 0.31.0 or higher) for all smart contract development.

**Forward Traceability:**
- **ADRs**: ADR-001 (Anchor Framework) → Complete decision record
- **API Contracts**: API-solana-program.md → Uses Anchor syntax throughout
- **Implementation**: Cargo.toml → anchor-lang = "0.31.0"
- **Tests**: All tests use Anchor test framework

**Rationale**: ADR-001

**Coverage Status**: ✅ Complete

---

### REQ-C-007: Phantom Wallet Requirement

**Requirement:** The web UI MUST support Phantom wallet as the primary wallet provider.

**Forward Traceability:**
- **Use Cases**: UC-006 (Connect Wallet) → Phantom-specific flows
- **API Contracts**: API-web-ui.md → WalletAdapter (Phantom)
- **Business Rules**: BR-038 (Phantom is required wallet)
- **Tests**: test_phantom_connection, test_phantom_transaction_signing

**Coverage Status**: ✅ Complete

---

### REQ-C-008: Educational Purpose

**Requirement:** The project is designed for educational purposes and SHALL prioritize code clarity, documentation, and learning value.

**Forward Traceability:**
- **ADRs**: ADR-001 (Anchor chosen for educational value), ADR-002 (Fixed pricing for simplicity)
- **All Specifications**: Comprehensive inline documentation
- **Tests**: Test names are self-documenting, include educational comments

**Coverage Status**: ✅ Complete

---

## Use Cases → API Contracts Mapping

| Use Case | API Instruction | Event Emitted | BDD Scenario |
|----------|----------------|---------------|--------------|
| UC-001: Initialize Market | initialize_market | MarketInitialized | BDD-001 |
| UC-002: Set Exchange Rate | set_price | PriceSet | BDD-002 |
| UC-003: Add Liquidity | add_liquidity | LiquidityAdded | BDD-003 |
| UC-004: Swap Token A to B | swap(amount, true) | SwapExecuted | BDD-004 |
| UC-005: Swap Token B to A | swap(amount, false) | SwapExecuted | BDD-005 |
| UC-006: Connect Wallet | (Frontend only - no on-chain instruction) | - | BDD-006 |

---

## Use Cases → BDD Scenarios Mapping

### BDD-001: Initialize Market

**Scenario**: Administrator initializes a new token market

```gherkin
Given an administrator wallet with 0.01 SOL balance
And two valid SPL token mint addresses (Token A, Token B)
And no existing market for this token pair
When the administrator invokes initialize_market with mints
Then a MarketAccount PDA is created at deterministic address
And vault_a TokenAccount is created for Token A
And vault_b TokenAccount is created for Token B
And MarketInitialized event is emitted
And the market.authority is set to administrator's public key
```

**Traceability**: UC-001, REQ-F-001, REQ-F-010, REQ-F-011, REQ-NF-009

---

### BDD-002: Set Exchange Rate

**Scenario**: Administrator sets the market price

```gherkin
Given an initialized market with authority = Admin A
And Admin A's wallet is connected
When Admin A invokes set_price with new_price = 2_500_000 (2.5)
Then the market.price field is updated to 2_500_000
And a PriceSet event is emitted with old_price and new_price
And the transaction confirms successfully
```

**Traceability**: UC-002, REQ-F-002, REQ-F-008, REQ-NF-010

---

### BDD-003: Add Liquidity

**Scenario**: Administrator adds tokens to both vaults

```gherkin
Given an initialized market
And authority has 10,000 Token A and 25,000 Token B
When authority invokes add_liquidity(10000, 25000)
Then 10,000 Token A is transferred from authority ATA to vault_a
And 25,000 Token B is transferred from authority ATA to vault_b
And LiquidityAdded event is emitted with amounts
And the transaction confirms successfully
```

**Traceability**: UC-003, REQ-F-003, REQ-F-004, REQ-F-005, REQ-NF-011

---

### BDD-004: Swap Token A to B

**Scenario**: User swaps Token A for Token B at fixed rate

```gherkin
Given an initialized market with price = 2_500_000
And vault_a has 5,000 Token A
And vault_b has 12,500 Token B
And user has 100 Token A
When user invokes swap(100, true)
Then the system calculates output_b = 250 Token B
And 100 Token A is transferred from user to vault_a
And 250 Token B is transferred from vault_b to user
And SwapExecuted event is emitted with input=100, output=250
And the transaction confirms successfully
```

**Traceability**: UC-004, REQ-F-006, REQ-F-009, REQ-NF-012

---

### BDD-005: Swap Token B to A

**Scenario**: User swaps Token B for Token A (reverse direction)

```gherkin
Given an initialized market with price = 2_500_000 (> 0)
And vault_a has 3,000 Token A
And vault_b has 7,500 Token B
And user has 250 Token B
When user invokes swap(250, false)
Then the system calculates output_a = 100 Token A
And 250 Token B is transferred from user to vault_b
And 100 Token A is transferred from vault_a to user
And SwapExecuted event is emitted with input=250, output=100
And the transaction confirms successfully
```

**Traceability**: UC-005, REQ-F-007, REQ-F-009, REQ-NF-002, REQ-NF-012

---

### BDD-006: Connect Wallet

**Scenario**: User connects Phantom wallet to web UI

```gherkin
Given the user has Phantom wallet installed
And the web UI is loaded
When the user clicks "Connect Wallet"
Then Phantom wallet popup is displayed
And user selects account and clicks "Connect"
Then the UI stores the user's public key
And the UI displays wallet address (truncated)
And the UI fetches and displays user's token balances
And wallet-dependent features become enabled
```

**Traceability**: UC-006, REQ-F-016, REQ-F-012, REQ-F-013, REQ-F-014

---

## Orphan Detection Report

### Requirements Without Specifications

**None detected** - All functional requirements (REQ-F-001 through REQ-F-016) and non-functional requirements (REQ-NF-001 through REQ-NF-018) have corresponding use cases, API contracts, invariants, and/or ADRs.

### Specifications Without Requirements

**None detected** - All use cases (UC-001 through UC-006), workflows (WF-001, WF-002), API contracts, and ADRs trace back to explicit requirements.

### Untested Invariants

**None detected** - All invariants in `domain/05-INVARIANTS.md` have corresponding test assertions documented.

---

## Coverage Statistics

### Requirements Coverage

| Category | Total | Covered | Uncovered | Coverage % |
|----------|-------|---------|-----------|------------|
| Functional Requirements (REQ-F) | 16 | 16 | 0 | 100% |
| Non-Functional Requirements (REQ-NF) | 18 | 18 | 0 | 100% |
| Constraint Requirements (REQ-C) | 3 | 3 | 0 | 100% |
| **Total** | **37** | **37** | **0** | **100%** |

### Use Case Coverage

| Use Case | Requirements Satisfied | API Coverage | Event Coverage | Test Coverage |
|----------|----------------------|--------------|----------------|---------------|
| UC-001 | REQ-F-001, REQ-F-010, REQ-F-011, REQ-NF-009 | ✅ initialize_market | ✅ MarketInitialized | ✅ |
| UC-002 | REQ-F-002, REQ-F-008, REQ-NF-010 | ✅ set_price | ✅ PriceSet | ✅ |
| UC-003 | REQ-F-003, REQ-F-004, REQ-F-005, REQ-NF-011 | ✅ add_liquidity | ✅ LiquidityAdded | ✅ |
| UC-004 | REQ-F-006, REQ-F-009, REQ-NF-012 | ✅ swap (A→B) | ✅ SwapExecuted | ✅ |
| UC-005 | REQ-F-007, REQ-F-009, REQ-NF-002, REQ-NF-012 | ✅ swap (B→A) | ✅ SwapExecuted | ✅ |
| UC-006 | REQ-F-016, REQ-F-012–015 | ✅ Frontend APIs | N/A | ✅ |

### API Contract Coverage

| API Contract | Use Cases | Events | Tests |
|--------------|-----------|--------|-------|
| initialize_market | UC-001 | MarketInitialized | ✅ |
| set_price | UC-002 | PriceSet | ✅ |
| add_liquidity | UC-003 | LiquidityAdded | ✅ |
| swap (A→B) | UC-004 | SwapExecuted | ✅ |
| swap (B→A) | UC-005 | SwapExecuted | ✅ |

### Invariant Coverage

| Invariant Category | Count | Tested | Coverage % |
|-------------------|-------|--------|------------|
| Market Invariants (INV-MKT) | 5 | 5 | 100% |
| Vault Invariants (INV-VLT) | 5 | 5 | 100% |
| Swap Invariants (INV-SWP) | 6 | 6 | 100% |
| Authority Invariants (INV-AUTH) | 2 | 2 | 100% |
| PDA Invariants (INV-PDA) | 3 | 3 | 100% |
| Event Invariants (INV-EVT) | 2 | 2 | 100% |
| Global Invariants (INV-GLOBAL) | 1 | 1 | 100% |
| **Total** | **24** | **24** | **100%** |

---

## Reverse Traceability (Implementation → Requirements)

### Code → Use Case → Requirement Chain

```
programs/solana-swap/src/lib.rs
  ├── initialize_market() → UC-001 → REQ-F-001, REQ-F-010, REQ-F-011
  ├── set_price() → UC-002 → REQ-F-002, REQ-F-008
  ├── add_liquidity() → UC-003 → REQ-F-003, REQ-F-004, REQ-F-005
  └── swap() → UC-004/005 → REQ-F-006, REQ-F-007, REQ-F-009

programs/solana-swap/src/state.rs
  └── MarketAccount → ENT-MKT-001 → REQ-F-010

programs/solana-swap/src/errors.rs
  └── ErrorCode → REQ-NF-001, REQ-NF-002, REQ-NF-003, REQ-NF-004

programs/solana-swap/src/events.rs
  ├── MarketInitialized → REQ-NF-009
  ├── PriceSet → REQ-NF-010
  ├── LiquidityAdded → REQ-NF-011
  └── SwapExecuted → REQ-NF-012
```

---

## Change Impact Analysis Guide

### How to Use This Matrix

When modifying specifications or requirements:

1. **Identify Affected Requirement**: Find the requirement ID (e.g., REQ-F-006)
2. **Check Forward Traceability**: Review all downstream artifacts:
   - Use Cases
   - API Contracts
   - Events
   - Invariants
   - Tests
3. **Update All Linked Artifacts**: Ensure consistency across the chain
4. **Validate Coverage**: Run `validate-traceability` script to detect breaks
5. **Update This Matrix**: Add/modify traceability entries

### Example: Changing Swap Calculation Formula

**Scenario**: Requirement REQ-F-006 changes to support slippage protection.

**Impact Cascade**:
1. **Requirement**: Update REQ-F-006 description
2. **Use Case**: Update UC-004 Normal Flow (add slippage step), AF2 (slippage protection)
3. **API Contract**: Update `swap` instruction signature (add `min_output_amount` parameter)
4. **Event**: Update SwapExecuted event (add `slippage` field)
5. **Invariant**: Add INV-SWP-007 (slippage enforcement)
6. **Tests**: Add `test_slippage_protection`, update `test_swap_calculation_a_to_b`
7. **This Matrix**: Update REQ-F-006 row with new traceability links

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-22 | Initial traceability matrix |
|  |  | - 37 requirements mapped |
|  |  | - 6 use cases traced |
|  |  | - 4 workflows linked |
|  |  | - 5 API contracts documented |
|  |  | - 6 BDD scenarios defined |
|  |  | - 24 invariants traced |
|  |  | - 100% coverage achieved |

---

**Maintenance Note**: This matrix is a living document. Update it whenever requirements or specifications change to maintain traceability integrity.
