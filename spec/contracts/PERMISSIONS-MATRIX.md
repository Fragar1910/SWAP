# Permissions Matrix: Role-Based Access Control

**Contract ID:** PERMISSIONS-MATRIX
**Version:** 1.0
**Last Updated:** 2026-03-22
**Status:** Active

## Overview

**Description:** This document specifies the role-based access control (RBAC) model for the Solana Swap Program, defining which actors can perform which operations and how permissions are enforced at the smart contract level.

**Security Model:**
- **Role Assignment:** Immutable after market creation (authority cannot be transferred in MVP)
- **Enforcement Level:** On-chain via Anchor constraints (signer checks, has_one checks)
- **Permissionless Operations:** Swaps are permissionless - any user can execute
- **Privileged Operations:** Market initialization, price setting, and liquidity addition are restricted

**Traceability:**
- **Requirements:** REQ-F-008 (Authority-Only Market Modification), REQ-F-009 (Public Swap Access), REQ-NF-006 (Signer Verification)
- **Use Cases:** UC-001 through UC-005
- **Constraints:** REQ-C-010 (Single Administrator Per Market)

---

## Table of Contents

1. [Actor Roles](#actor-roles)
2. [Permission Matrix](#permission-matrix)
3. [Instruction-Level Permissions](#instruction-level-permissions)
4. [Account-Level Permissions](#account-level-permissions)
5. [Permission Enforcement Mechanisms](#permission-enforcement-mechanisms)
6. [Security Considerations](#security-considerations)

---

## Actor Roles

### Role Definitions

| Role ID | Role Name | Description | Identification | Cardinality |
|---------|-----------|-------------|----------------|-------------|
| R-ADMIN | Administrator | Market authority with privileged access to price and liquidity management | Wallet public key stored in `market.authority` | 1 per market |
| R-USER | User (Trader) | Any wallet that can execute swaps at published rates | Any Solana wallet with token balances | Many |
| R-PROGRAM | Swap Program | On-chain smart contract with authority over vaults | Program ID (derived from program deployment) | 1 (singleton) |
| R-TOKEN-PROGRAM | SPL Token Program | Standard Solana token program (CPI target) | Token Program ID (`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`) | 1 (system) |

### Role Assignment

**Administrator (R-ADMIN):**
- Assigned during market initialization
- Stored in `market.authority` field (Pubkey)
- **Immutable:** Cannot be changed after market creation (REQ-C-010)
- **Scope:** Authority over single market (different markets can have different administrators)

**User (R-USER):**
- **Implicit Role:** Any connected wallet
- **No Registration:** No on-chain registration required
- **Permissionless:** Can execute swaps without prior authorization

**Program Authorities:**
- **Swap Program:** Owns MarketAccount PDAs
- **Token Program:** Owns vault TokenAccounts (standard SPL Token accounts)

---

## Permission Matrix

### Summary Table

| Operation | Administrator (R-ADMIN) | User (R-USER) | Swap Program (R-PROGRAM) | Token Program |
|-----------|--------------------------|---------------|--------------------------|---------------|
| **Market Operations** |
| Create market (initialize_market) | ✓ | ✓ | - | - |
| Update price (set_price) | ✓ | ✗ | - | - |
| Add liquidity (add_liquidity) | ✓ | ✗ | - | - |
| Query market data | ✓ | ✓ | - | - |
| **Swap Operations** |
| Execute swap (swap) | ✓ | ✓ | - | - |
| Query swap history | ✓ | ✓ | - | - |
| **Account Operations** |
| Read MarketAccount | ✓ | ✓ | ✓ (owns) | - |
| Modify MarketAccount | ✓ (via instructions) | ✗ | ✓ (internal) | - |
| Read Vault balances | ✓ | ✓ | ✓ | ✓ (owns) |
| Transfer from Vault | ✗ | ✗ | ✓ (via CPI with PDA signer) | ✓ (executes) |
| **Event Monitoring** |
| Listen to events | ✓ | ✓ | - | - |

**Legend:**
- ✓ = Permitted
- ✗ = Denied (transaction fails)
- - = Not applicable

---

## Instruction-Level Permissions

### initialize_market

**Permission:** Permissionless (any wallet can create markets)

**Access Control:**
- **Payer:** Must be a signer (pays rent for account creation)
- **Authority:** Set to payer's public key automatically
- **Validation:** Anchor enforces `init` constraint (prevents duplicate markets)

**Enforcement:**
```rust
#[account(mut)]
pub authority: Signer<'info>,
```

**Rationale:** Market creation is permissionless to allow decentralized exchange creation. Anyone can bootstrap a market for any token pair.

**Traceability:** REQ-F-001, UC-001

---

### set_price

**Permission:** Restricted to market.authority (Administrator only)

**Access Control:**
- **Signer:** Must be market.authority
- **Validation:** Anchor `has_one` constraint verifies `authority.key() == market.authority`

**Enforcement:**
```rust
#[account(
    mut,
    has_one = authority @ ErrorCode::Unauthorized,
)]
pub market: Account<'info, MarketAccount>,

pub authority: Signer<'info>,
```

**Authorization Flow:**
1. Anchor deserializes accounts
2. Validates `authority` is a signer (signature present)
3. Verifies `authority.key() == market.authority` (has_one constraint)
4. If any check fails, transaction fails before instruction executes

**Error Response:**
- If `authority` is not a signer: `Missing required signature`
- If `authority.key() != market.authority`: `A has_one constraint was violated` (ErrorCode: `ConstraintHasOne`)

**Rationale:** Only the market creator should control pricing to prevent unauthorized manipulation.

**Traceability:** REQ-F-002, REQ-F-008, REQ-NF-006, UC-002

---

### add_liquidity

**Permission:** Restricted to market.authority (Administrator only)

**Access Control:**
- **Signer:** Must be market.authority
- **Validation:** Anchor `has_one` constraint on market
- **Token Ownership:** Validated that authority owns authority_token_a and authority_token_b

**Enforcement:**
```rust
#[account(
    mut,
    has_one = authority @ ErrorCode::Unauthorized,
    has_one = token_mint_a,
    has_one = token_mint_b,
)]
pub market: Account<'info, MarketAccount>,

#[account(
    mut,
    constraint = authority_token_a.mint == market.token_mint_a,
    constraint = authority_token_a.owner == authority.key(),
)]
pub authority_token_a: Account<'info, TokenAccount>,

// Similar for authority_token_b

pub authority: Signer<'info>,
```

**Authorization Flow:**
1. Verify `authority` is signer
2. Verify `authority.key() == market.authority`
3. Verify authority owns both token accounts
4. Verify token account mints match market mints
5. Execute CPI to Token Program (authority signs as owner)

**Error Response:**
- If not authority: `Unauthorized` or `ConstraintHasOne`
- If insufficient balance: `InsufficientFunds` (Token Program error)

**Rationale:** Only administrator should provide initial liquidity to ensure controlled market setup.

**Traceability:** REQ-F-003, REQ-F-004, REQ-F-005, REQ-F-008, UC-003

---

### swap

**Permission:** Permissionless (any user can execute)

**Access Control:**
- **Signer:** User wallet (any Signer)
- **No Authority Check:** No restriction on who can invoke
- **Token Ownership:** Validated that user owns user_token_a and user_token_b

**Enforcement:**
```rust
#[account(
    mut,
    constraint = user_token_a.mint == market.token_mint_a,
    constraint = user_token_a.owner == user.key(),
)]
pub user_token_a: Account<'info, TokenAccount>,

// Similar for user_token_b

pub user: Signer<'info>,
```

**Authorization Flow:**
1. Verify `user` is signer (user must sign transaction)
2. Verify user owns both token accounts
3. Verify token account mints match market mints
4. Execute swap logic (no identity-based restrictions)

**Error Response:**
- If user insufficient balance: `InsufficientFunds` (Token Program)
- If vault insufficient liquidity: `InsufficientLiquidity` (custom error)
- If price not set: `PriceNotSet` (custom error)

**Rationale:** Decentralized exchange must allow permissionless trading. Any user with tokens can swap.

**Traceability:** REQ-F-006, REQ-F-007, REQ-F-009, UC-004, UC-005

---

## Account-Level Permissions

### MarketAccount PDA

**Owner:** Swap Program
**Authority:** Market.authority (Administrator)

| Operation | Administrator | User | Swap Program | Enforcement |
|-----------|---------------|------|--------------|-------------|
| Create | ✓ (via initialize_market) | ✓ (any payer) | ✓ (owns account) | Anchor `init` constraint |
| Read | ✓ | ✓ | ✓ | Public read access |
| Modify (price) | ✓ (via set_price) | ✗ | ✓ (internal) | `has_one = authority` constraint |
| Modify (other fields) | ✗ | ✗ | ✓ (internal) | Immutable after creation |
| Delete | ✗ | ✗ | ✗ | Not supported (permanent) |

**Security Invariants:**
- `authority` field is immutable after creation
- `token_mint_a` and `token_mint_b` are immutable
- `price` can only be updated by authority via set_price
- `decimals_a`, `decimals_b`, `bump` are immutable

---

### Vault TokenAccounts (vault_a, vault_b)

**Owner:** SPL Token Program
**Authority:** Market PDA (Swap Program signs with PDA)

| Operation | Administrator | User | Swap Program | Token Program | Enforcement |
|-----------|---------------|------|--------------|---------------|-------------|
| Create | ✓ (payer in initialize_market) | - | ✓ (authority = market PDA) | ✓ (creates account) | Anchor `init` with `token::authority` |
| Read balance | ✓ | ✓ | ✓ | ✓ | Public read access |
| Transfer into vault | ✓ (via add_liquidity) | ✓ (during swap) | - | ✓ (executes CPI) | Token ownership verification |
| Transfer out of vault | ✗ | ✗ | ✓ (PDA signer in swap) | ✓ (executes CPI) | PDA signing authority |
| Close | ✗ | ✗ | ✗ | - | Not supported in MVP |

**Security Invariants:**
- Vault authority is always market PDA (cannot change)
- Only market PDA can sign transfers out of vaults
- Transfers out only occur during swap instruction (controlled)
- No direct user access to vault transfers

**PDA Signing Mechanism:**
```rust
// Swap program signs as vault authority using PDA seeds
token::transfer(
    CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: vault_b,
            to: user_token_b,
            authority: market, // Market PDA as authority
        },
        &[&[
            b"market",
            market.token_mint_a.as_ref(),
            market.token_mint_b.as_ref(),
            &[market.bump],
        ]],
    ),
    output_amount,
)?;
```

---

### User TokenAccounts (user_token_a, user_token_b)

**Owner:** SPL Token Program
**Authority:** User wallet

| Operation | Administrator | User | Swap Program | Token Program | Enforcement |
|-----------|---------------|------|--------------|---------------|-------------|
| Read balance | ✓ | ✓ (owner) | ✓ | ✓ | Public read access |
| Transfer from account | - | ✓ (owner) | - | ✓ (executes CPI) | User must sign as owner |
| Receive tokens | - | ✓ (any account can receive) | - | ✓ | No restriction |

**Security Invariants:**
- User must sign to transfer tokens out (during swap input transfer)
- Swap program never has authority over user token accounts
- Swap program only transfers into user accounts (output transfer)

---

## Permission Enforcement Mechanisms

### Anchor Constraint System

Anchor provides declarative constraint enforcement:

**1. Signer Constraint:**
```rust
pub authority: Signer<'info>,
```
- **Enforces:** Account must have provided a signature
- **Fails with:** `Missing required signature` (Anchor error)

**2. Has-One Constraint:**
```rust
#[account(
    has_one = authority @ ErrorCode::Unauthorized,
)]
pub market: Account<'info, MarketAccount>,
```
- **Enforces:** `authority.key() == market.authority`
- **Fails with:** `ConstraintHasOne` or custom error (ErrorCode::Unauthorized)

**3. Custom Constraint:**
```rust
#[account(
    constraint = user_token_a.owner == user.key(),
)]
pub user_token_a: Account<'info, TokenAccount>,
```
- **Enforces:** Arbitrary boolean condition
- **Fails with:** `ConstraintRaw` (Anchor error)

**4. Init Constraint:**
```rust
#[account(
    init,
    payer = authority,
    seeds = [...],
    bump,
)]
pub market: Account<'info, MarketAccount>,
```
- **Enforces:** Account does not already exist
- **Fails with:** `AccountAlreadyInitialized` (Anchor error)

---

### Runtime Validation

Additional runtime checks in instruction logic:

**Amount Validation:**
```rust
require!(amount > 0, ErrorCode::InvalidAmount);
require!(amount_a > 0 || amount_b > 0, ErrorCode::InvalidAmount);
```

**Price Validation:**
```rust
require!(market.price > 0, ErrorCode::PriceNotSet);
```

**Liquidity Validation:**
```rust
require!(source_vault.amount >= output_amount, ErrorCode::InsufficientLiquidity);
```

---

### CPI Permission Delegation

**Swap Program → Token Program:**

The swap program delegates token transfer authority via CPI:

1. **User → Vault transfers:** User signs, program invokes CPI
2. **Vault → User transfers:** Program signs with PDA, invokes CPI

**Token Program enforces:**
- Transfer authority must match token account authority
- Sufficient balance in source account
- Valid token accounts (correct mint, not frozen)

---

## Security Considerations

### Attack Vectors and Mitigations

#### 1. Unauthorized Price Manipulation

**Attack:** Non-administrator attempts to call set_price
**Mitigation:** Anchor `has_one` constraint checks authority
**Validation Point:** Account deserialization (before instruction logic)
**Result:** Transaction fails with `ConstraintHasOne` error

#### 2. Unauthorized Liquidity Withdrawal

**Attack:** User attempts to transfer tokens from vaults
**Mitigation:** Vault authority is market PDA; only program can sign
**Validation Point:** Token Program CPI authority check
**Result:** Token Program rejects transfer (authority mismatch)

#### 3. Front-Running Price Changes

**Attack:** User submits swap at old price, administrator updates price before confirmation
**Mitigation (MVP):** No mitigation - user receives output at execution-time price
**Future Enhancement:** Add min_output_amount parameter for slippage protection (REQ-NF-007)
**Risk Level:** Medium (users can protect themselves by monitoring price)

#### 4. Reentrancy Attacks

**Attack:** Malicious token program attempts to re-invoke swap during CPI
**Mitigation:** Solana's single-threaded execution model prevents reentrancy
**Validation Point:** Runtime (Solana BPF loader)
**Result:** Reentrancy is architecturally impossible on Solana

#### 5. Privilege Escalation

**Attack:** User attempts to pose as administrator
**Mitigation:** Public key validation (has_one constraint) cannot be bypassed
**Validation Point:** Cryptographic signature verification
**Result:** Transaction fails if signature missing or authority mismatch

#### 6. Market Impersonation

**Attack:** Attacker creates malicious market with similar mint addresses
**Mitigation:** Markets are PDAs (deterministic addresses); clients should verify PDA derivation
**Best Practice:** UI should display full token mint addresses for verification
**Traceability:** REQ-F-011 (PDA derivation documentation)

---

### Permission Audit Checklist

**Instruction-Level Checks:**
- [ ] initialize_market: No unintended authority assigned
- [ ] set_price: Only market.authority can invoke
- [ ] add_liquidity: Only market.authority can invoke
- [ ] swap: Any user can invoke (permissionless verified)

**Account-Level Checks:**
- [ ] MarketAccount: Program ownership verified
- [ ] Vaults: Token Program ownership verified
- [ ] Vaults: Market PDA authority verified
- [ ] User token accounts: User ownership verified

**CPI Authority Checks:**
- [ ] User → Vault transfers: User signs as authority
- [ ] Vault → User transfers: Market PDA signs as authority
- [ ] PDA derivation: Seeds and bump match stored values

**Runtime Validation:**
- [ ] Amount > 0 enforced in swap and add_liquidity
- [ ] Price > 0 enforced before swap calculation
- [ ] Vault liquidity checked before transfer
- [ ] Overflow protection via checked arithmetic

---

## Permission Testing Strategy

### Test Cases

**TC-PERM-001: Administrator Can Set Price**
```rust
#[tokio::test]
async fn test_administrator_can_set_price() {
    let authority_keypair = read_keypair_file("authority.json").unwrap();
    let new_price = 2_800_000_u64;

    let tx = program.methods.set_price(new_price)
        .accounts({ market, authority: authority_keypair.pubkey() })
        .signers([&authority_keypair])
        .rpc().await;

    assert!(tx.is_ok());
}
```

**TC-PERM-002: Non-Administrator Cannot Set Price**
```rust
#[tokio::test]
async fn test_non_admin_cannot_set_price() {
    let attacker_keypair = Keypair::new(); // Not the authority
    let new_price = 2_800_000_u64;

    let result = program.methods.set_price(new_price)
        .accounts({ market, authority: attacker_keypair.pubkey() })
        .signers([&attacker_keypair])
        .rpc().await;

    assert!(result.is_err());
    assert_error!(result, ErrorCode::Unauthorized); // Or ConstraintHasOne
}
```

**TC-PERM-003: Any User Can Execute Swap**
```rust
#[tokio::test]
async fn test_any_user_can_swap() {
    let random_user = Keypair::new();
    // Fund user with tokens...

    let tx = program.methods.swap(amount, true)
        .accounts({ market, vaults, user_tokens, user: random_user.pubkey() })
        .signers([&random_user])
        .rpc().await;

    assert!(tx.is_ok());
}
```

**TC-PERM-004: Cannot Transfer From Vault Directly**
```rust
#[tokio::test]
async fn test_cannot_steal_from_vault() {
    let attacker = Keypair::new();

    // Attempt direct transfer from vault (outside swap instruction)
    let result = token_program.transfer(
        vault_b,
        attacker_token_account,
        attacker.pubkey(), // Attacker as authority (invalid)
        amount
    ).await;

    assert!(result.is_err()); // Token Program rejects (authority mismatch)
}
```

---

## Future Enhancements

### Multi-Sig Administrator (Not in MVP)

**Proposal:** Use multi-signature wallet as market.authority

**Implementation:**
- Deploy market with multi-sig address as authority
- Use Squads Protocol or similar multi-sig solution
- set_price and add_liquidity require M-of-N approvals

**Security Benefit:** Prevents single-point-of-failure for privileged operations

**Traceability:** Addresses REQ-C-010 limitation (single administrator)

---

### Role Transfer (Not in MVP)

**Proposal:** Allow authority transfer to new wallet

**Implementation:**
```rust
pub fn transfer_authority(
    ctx: Context<TransferAuthority>,
    new_authority: Pubkey,
) -> Result<()> {
    // Current authority signs
    ctx.accounts.market.authority = new_authority;
    emit!(AuthorityTransferred { ... });
    Ok(())
}
```

**Security Consideration:** Must be carefully audited to prevent unauthorized transfers

---

### Fee Collection Permissions (Future)

**Proposal:** Add swap fees collected by protocol

**Permissions:**
- **Fee Setter:** Administrator can set fee percentage
- **Fee Collector:** Designated wallet can withdraw collected fees
- **Disable Fees:** Governance vote required

**Implementation:**
```rust
pub struct MarketAccount {
    // ... existing fields
    pub fee_bps: u16,            // Fee in basis points (e.g., 30 = 0.3%)
    pub fee_collector: Pubkey,   // Wallet authorized to collect fees
}
```

---

## References

**Requirements:**
- REQ-F-008: Authority-Only Market Modification
- REQ-F-009: Public Swap Access
- REQ-NF-005: PDA Ownership Verification
- REQ-NF-006: Signer Verification
- REQ-NF-008: Reentrancy Protection
- REQ-C-010: Single Administrator Per Market

**Use Cases:**
- UC-001: Initialize Market
- UC-002: Set Exchange Rate
- UC-003: Add Liquidity
- UC-004: Swap Token A to B
- UC-005: Swap Token B to A

**Entities:**
- ENT-ADMIN-001: Administrator
- ENT-USER-001: User

**API Contracts:**
- API-SOLANA-PROGRAM: On-chain instruction constraints

---

**Changelog:**

| Version | Date       | Changes                                     |
|---------|------------|---------------------------------------------|
| 1.0     | 2026-03-22 | Initial permissions matrix specification    |
