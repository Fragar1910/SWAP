# Non-Functional Requirement: Security

**Document Version:** 1.0
**Date:** 2026-03-22
**Status:** Approved
**Traceability:** REQ-NF-001 to REQ-NF-008, REQ-F-008, REQ-NF-005, REQ-NF-006

---

## 1. Overview

This document defines the security controls, threat model, and security testing strategy for the Solana SWAP program. Security is paramount in blockchain applications handling user funds, even in educational contexts.

### 1.1 Security Posture

| Control Category | Implementation Status | Priority |
|-----------------|----------------------|----------|
| Arithmetic Overflow Protection | Implemented (checked arithmetic) | Critical |
| Division by Zero Protection | Implemented (explicit checks) | Critical |
| Access Control | Implemented (Anchor constraints) | Critical |
| PDA Ownership Verification | Implemented (Anchor constraints) | Critical |
| Reentrancy Protection | Inherent (Solana runtime) | Critical |
| Input Validation | Implemented (zero amount checks) | High |
| Liquidity Protection | Implemented (balance checks) | High |
| Slippage Protection | Not implemented (future) | Medium |

---

## 2. Threat Model

### 2.1 Assets to Protect

| Asset | Description | Threat Level |
|-------|-------------|--------------|
| Vault Token Balances | SPL tokens held in vault_a and vault_b PDAs | Critical |
| Exchange Rates | Market price stored in MarketAccount | High |
| Administrator Authority | Private key controlling market operations | Critical |
| User Token Balances | SPL tokens in user's associated token accounts | Critical |
| Program State | MarketAccount and vault account integrity | High |

### 2.2 Threat Actors

| Actor | Motivation | Capability | Risk Level |
|-------|------------|------------|------------|
| External Attacker | Steal tokens, manipulate prices | Advanced (blockchain expertise) | High |
| Malicious User | Exploit swap logic for profit | Medium (understanding of DeFi) | Medium |
| Compromised Administrator | Drain vaults, set unfavorable rates | Full control (holds private key) | Critical |
| Malicious Contract | Exploit via CPI reentrancy | Advanced (Solana program development) | Low (Solana runtime prevents) |

### 2.3 Attack Vectors and Mitigations

#### 2.3.1 Arithmetic Attacks

**Attack Vector:** Overflow/underflow in swap calculations to receive more tokens than deserved.

**Example:**
```rust
// Vulnerable code (unchecked arithmetic)
let amount_out = amount_in * price / SCALE;  // Overflows at u64::MAX

// Exploit: amount_in = u64::MAX → amount_out wraps to small value
```

**Mitigation (REQ-NF-001):**
```rust
// Secure code (checked arithmetic)
let amount_out = amount_in
    .checked_mul(price).ok_or(SwapError::Overflow)?
    .checked_div(SCALE).ok_or(SwapError::DivisionByZero)?;
```

**Test Coverage:**
```typescript
it("Prevents overflow in swap calculation", async () => {
    const hugeAmount = new BN("18446744073709551615");  // u64::MAX
    await expect(
        program.methods.swap(hugeAmount, true).accounts({...}).rpc()
    ).to.be.rejectedWith(/Overflow/);
});
```

#### 2.3.2 Division by Zero Attack

**Attack Vector:** Swap B→A when price = 0 causes division by zero, potentially crashing program or yielding undefined behavior.

**Example:**
```rust
// Vulnerable code (no price validation)
let amount_a = (amount_b * SCALE) / market.price;  // Crashes if price = 0
```

**Mitigation (REQ-NF-002):**
```rust
// Secure code (explicit validation)
require!(market.price > 0, SwapError::PriceNotSet);

let amount_a = amount_b
    .checked_mul(SCALE).ok_or(SwapError::Overflow)?
    .checked_div(market.price).ok_or(SwapError::DivisionByZero)?;
```

**Test Coverage:**
```typescript
it("Prevents swap when price is zero", async () => {
    // Initialize market without setting price (defaults to 0)
    await program.methods.initializeMarket().accounts({...}).rpc();

    await expect(
        program.methods.swap(new BN(1000), false).accounts({...}).rpc()
    ).to.be.rejectedWith(/PriceNotSet/);
});
```

#### 2.3.3 Vault Draining Attack

**Attack Vector:** Swap more tokens than vault holds, draining liquidity.

**Example:**
```rust
// Vulnerable code (no balance check)
token::transfer(ctx, vault_to_user, amount_out)?;  // Fails in Token Program if insufficient balance
```

**Mitigation (REQ-NF-003):**
```rust
// Secure code (pre-flight balance check)
let vault_balance = ctx.accounts.vault_b.amount;
require!(vault_balance >= amount_out, SwapError::InsufficientLiquidity);

token::transfer(ctx, vault_to_user, amount_out)?;
```

**Test Coverage:**
```typescript
it("Prevents swap exceeding vault balance", async () => {
    // Add only 1000 tokens to vault_b
    await program.methods.addLiquidity(new BN(0), new BN(1000)).accounts({...}).rpc();

    // Attempt swap requiring 10,000 tokens
    await expect(
        program.methods.swap(new BN(10000), true).accounts({...}).rpc()
    ).to.be.rejectedWith(/InsufficientLiquidity/);
});
```

#### 2.3.4 Zero Amount Attack

**Attack Vector:** Submit swap with amount = 0 to bypass calculations and emit false events.

**Example:**
```rust
// Vulnerable code (no input validation)
pub fn swap(ctx: Context<Swap>, amount: u64) -> Result<()> {
    // Calculation with amount = 0 → amount_out = 0
    // Transfer 0 tokens (succeeds but wastes compute)
}
```

**Mitigation (REQ-NF-004):**
```rust
// Secure code (input validation)
pub fn swap(ctx: Context<Swap>, amount: u64, swap_a_to_b: bool) -> Result<()> {
    require!(amount > 0, SwapError::InvalidAmount);

    // ... rest of logic
}
```

**Test Coverage:**
```typescript
it("Rejects swap with zero amount", async () => {
    await expect(
        program.methods.swap(new BN(0), true).accounts({...}).rpc()
    ).to.be.rejectedWith(/InvalidAmount/);
});
```

#### 2.3.5 PDA Ownership Attack

**Attack Vector:** Pass fake vault accounts not owned by Token Program or with wrong authority.

**Example:**
```rust
// Vulnerable code (no ownership check)
#[derive(Accounts)]
pub struct Swap<'info> {
    pub vault_a: AccountInfo<'info>,  // Unchecked! Could be any account
}
```

**Mitigation (REQ-NF-005):**
```rust
// Secure code (Anchor constraint enforcement)
#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(
        mut,
        seeds = [b"vault_a", market.key().as_ref()],
        bump,
        constraint = vault_a.mint == market.token_mint_a,  // Verify correct token
        constraint = vault_a.owner == token_program.key()  // Verify Token Program ownership
    )]
    pub vault_a: Account<'info, TokenAccount>,  // Anchor validates owner = Token Program
}
```

**Test Coverage:**
```typescript
it("Rejects swap with incorrect vault account", async () => {
    const fakeVault = Keypair.generate();

    await expect(
        program.methods.swap(new BN(1000), true).accounts({
            ...validAccounts,
            vaultA: fakeVault.publicKey,  // Wrong vault
        }).rpc()
    ).to.be.rejectedWith(/AccountNotInitialized|ConstraintSeeds/);
});
```

#### 2.3.6 Authority Spoofing Attack

**Attack Vector:** Non-administrator attempts to invoke set_price or add_liquidity.

**Example:**
```rust
// Vulnerable code (no authority check)
pub fn set_price(ctx: Context<SetPrice>, new_price: u64) -> Result<()> {
    ctx.accounts.market.price = new_price;  // Anyone can call!
    Ok(())
}
```

**Mitigation (REQ-NF-006):**
```rust
// Secure code (Anchor constraint enforcement)
#[derive(Accounts)]
pub struct SetPrice<'info> {
    #[account(
        mut,
        has_one = authority  // Anchor verifies market.authority == authority.key()
    )]
    pub market: Account<'info, MarketAccount>,
    pub authority: Signer<'info>,  // Anchor verifies authority signed transaction
}

pub fn set_price(ctx: Context<SetPrice>, new_price: u64) -> Result<()> {
    ctx.accounts.market.price = new_price;  // Only authority can reach here
    Ok(())
}
```

**Test Coverage:**
```typescript
it("Prevents non-authority from setting price", async () => {
    const attacker = Keypair.generate();
    await airdrop(connection, attacker.publicKey, 1 * LAMPORTS_PER_SOL);

    await expect(
        program.methods.setPrice(new BN(2000000))
            .accounts({
                market: marketPDA,
                authority: attacker.publicKey,
            })
            .signers([attacker])
            .rpc()
    ).to.be.rejectedWith(/A has one constraint was violated/);
});
```

#### 2.3.7 Reentrancy Attack

**Attack Vector:** Malicious token program invokes swap program during CPI callback.

**Example (theoretical on Ethereum):**
```solidity
// Vulnerable code (Ethereum-style reentrancy)
function swap() external {
    token.transfer(msg.sender, amount);  // External call
    userBalance[msg.sender] = 0;         // State update AFTER external call
}

// Attacker's token contract
function transfer() external {
    swap();  // Reenters before state is updated
}
```

**Mitigation (REQ-NF-008):**
```rust
// Solana inherent protection (single-threaded runtime)
pub fn swap(ctx: Context<Swap>, amount: u64, swap_a_to_b: bool) -> Result<()> {
    // 1. Calculate amount_out
    let amount_out = calculate_swap(amount, swap_a_to_b, &ctx.accounts.market)?;

    // 2. Transfer user → vault (CPI to Token Program)
    token::transfer(ctx_user_to_vault, amount)?;

    // 3. Transfer vault → user (CPI to Token Program)
    token::transfer(ctx_vault_to_user, amount_out)?;

    // Solana's single-threaded runtime prevents reentrancy during CPIs
    // State updates are atomic within a single instruction

    emit!(SwapExecuted { ... });
    Ok(())
}
```

**Why Solana is Safe:**
- Single-threaded transaction execution (no concurrent callbacks)
- All state changes are atomic within a transaction
- CPI calls cannot re-invoke the same instruction before completion

**Test Coverage:**
```typescript
// No explicit test needed (runtime guarantee)
// But verify atomicity: If second transfer fails, first transfer is rolled back
it("Reverts all transfers if swap fails", async () => {
    // Add insufficient liquidity to vault_b
    await program.methods.addLiquidity(new BN(100), new BN(10)).accounts({...}).rpc();

    const initialUserA = await getTokenBalance(userTokenA);
    const initialVaultA = await getTokenBalance(vaultA);

    // Attempt swap requiring more than vault_b holds
    await expect(
        program.methods.swap(new BN(1000), true).accounts({...}).rpc()
    ).to.be.rejected;

    // Verify no state changes (atomic rollback)
    expect(await getTokenBalance(userTokenA)).to.equal(initialUserA);
    expect(await getTokenBalance(vaultA)).to.equal(initialVaultA);
});
```

#### 2.3.8 Price Manipulation Attack

**Attack Vector:** Compromised administrator sets extremely unfavorable rates to extract value.

**Example:**
```typescript
// Attacker (compromised admin) sets price to 0.000001 (drains vault_b)
await program.methods.setPrice(new BN(1)).accounts({...}).rpc();

// User swaps 1000 Token A → receives 0.001 Token B (loses 99.9999% value)
```

**Mitigation:**
1. **Multi-Signature** (future): Require 2-of-3 signatures for price changes (see ADR-003 alternatives)
2. **Price Bounds** (future): Enforce min/max price thresholds
3. **Timelock** (future): Delay price changes by 24 hours (see ADR-003 alternatives)
4. **Audit Trail**: Emit PriceSet events (REQ-NF-010) for off-chain monitoring

**Current Mitigation (Educational Context):**
```rust
// Emit event for transparency (allows off-chain monitoring)
pub fn set_price(ctx: Context<SetPrice>, new_price: u64) -> Result<()> {
    require!(new_price > 0, SwapError::InvalidPrice);  // Prevent price = 0

    let old_price = ctx.accounts.market.price;
    ctx.accounts.market.price = new_price;

    emit!(PriceSet {
        market: ctx.accounts.market.key(),
        old_price,
        new_price,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
```

**Monitoring Strategy:**
```typescript
// Off-chain monitoring bot
program.addEventListener("PriceSet", (event) => {
    const priceChange = Math.abs(event.newPrice - event.oldPrice) / event.oldPrice;

    if (priceChange > 0.1) {  // Alert if price changes >10%
        alerts.send("Large price change detected", {
            market: event.market.toString(),
            oldPrice: event.oldPrice,
            newPrice: event.newPrice,
            changePercent: (priceChange * 100).toFixed(2) + "%",
        });
    }
});
```

---

## 3. Security Controls Implementation

### 3.1 Overflow Protection (REQ-NF-001)

**Implementation:**
```rust
use anchor_lang::prelude::*;

pub fn swap_a_to_b(amount_a: u64, market: &MarketAccount) -> Result<u64> {
    // amount_b = (amount_a × price × 10^decimals_b) / (10^6 × 10^decimals_a)

    let numerator = amount_a
        .checked_mul(market.price).ok_or(SwapError::Overflow)?
        .checked_mul(10u64.pow(market.decimals_b as u32)).ok_or(SwapError::Overflow)?;

    let denominator = 10u64.pow(6)
        .checked_mul(10u64.pow(market.decimals_a as u32)).ok_or(SwapError::Overflow)?;

    let amount_b = numerator
        .checked_div(denominator).ok_or(SwapError::DivisionByZero)?;

    Ok(amount_b)
}
```

**Audit Checklist:**
- [ ] All multiplication uses `checked_mul`
- [ ] All division uses `checked_div`
- [ ] All addition uses `checked_add`
- [ ] All subtraction uses `checked_sub`
- [ ] Overflow errors propagate as `SwapError::Overflow`

### 3.2 Division by Zero Protection (REQ-NF-002)

**Implementation:**
```rust
pub fn swap_b_to_a(amount_b: u64, market: &MarketAccount) -> Result<u64> {
    // Critical: Verify price > 0 before dividing
    require!(market.price > 0, SwapError::PriceNotSet);

    let numerator = amount_b
        .checked_mul(10u64.pow(6)).ok_or(SwapError::Overflow)?
        .checked_mul(10u64.pow(market.decimals_a as u32)).ok_or(SwapError::Overflow)?;

    let denominator = market.price
        .checked_mul(10u64.pow(market.decimals_b as u32)).ok_or(SwapError::Overflow)?;

    let amount_a = numerator
        .checked_div(denominator).ok_or(SwapError::DivisionByZero)?;

    Ok(amount_a)
}
```

**Audit Checklist:**
- [ ] All divisions check denominator > 0 before operation
- [ ] `require!(price > 0)` present in B→A swap logic
- [ ] Division by zero errors propagate as `SwapError::DivisionByZero`

### 3.3 Liquidity Protection (REQ-NF-003)

**Implementation:**
```rust
pub fn swap(ctx: Context<Swap>, amount: u64, swap_a_to_b: bool) -> Result<()> {
    let amount_out = calculate_swap(amount, swap_a_to_b, &ctx.accounts.market)?;

    // Check vault balance BEFORE attempting transfer
    let vault_balance = if swap_a_to_b {
        ctx.accounts.vault_b.amount
    } else {
        ctx.accounts.vault_a.amount
    };

    require!(vault_balance >= amount_out, SwapError::InsufficientLiquidity);

    // Transfers (guaranteed to succeed due to check above)
    // ...
}
```

**Audit Checklist:**
- [ ] Vault balance checked before token transfer CPI
- [ ] Error message is descriptive (`InsufficientLiquidity`)
- [ ] Check uses `>=` not `>` (exact balance OK)

### 3.4 Zero Amount Protection (REQ-NF-004)

**Implementation:**
```rust
pub fn swap(ctx: Context<Swap>, amount: u64, swap_a_to_b: bool) -> Result<()> {
    require!(amount > 0, SwapError::InvalidAmount);

    // ... rest of logic
}

pub fn add_liquidity(ctx: Context<AddLiquidity>, amount_a: u64, amount_b: u64) -> Result<()> {
    require!(amount_a > 0 || amount_b > 0, SwapError::InvalidAmount);

    // ... rest of logic
}
```

**Audit Checklist:**
- [ ] All input amounts validated > 0
- [ ] `add_liquidity` allows either amount_a OR amount_b (not both zero)
- [ ] Error message is clear (`InvalidAmount`)

### 3.5 PDA Ownership Verification (REQ-NF-005)

**Implementation:**
```rust
#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub market: Account<'info, MarketAccount>,  // Anchor verifies program owns this

    #[account(
        mut,
        seeds = [b"vault_a", market.key().as_ref()],
        bump,
        constraint = vault_a.mint == market.token_mint_a @ SwapError::InvalidVault
    )]
    pub vault_a: Account<'info, TokenAccount>,  // Anchor verifies Token Program owns this

    #[account(
        mut,
        seeds = [b"vault_b", market.key().as_ref()],
        bump,
        constraint = vault_b.mint == market.token_mint_b @ SwapError::InvalidVault
    )]
    pub vault_b: Account<'info, TokenAccount>,  // Anchor verifies Token Program owns this

    pub token_program: Program<'info, Token>,
}
```

**Audit Checklist:**
- [ ] All PDAs use `Account<'info, T>` not `AccountInfo<'info>` (enforces owner check)
- [ ] Vault seeds verified via `seeds` + `bump` constraints
- [ ] Vault mints verified against market (prevents wrong token substitution)
- [ ] Token Program account is `Program<'info, Token>` (enforces correct program ID)

### 3.6 Signer Verification (REQ-NF-006)

**Implementation:**
```rust
#[derive(Accounts)]
pub struct SetPrice<'info> {
    #[account(
        mut,
        has_one = authority @ SwapError::Unauthorized  // Verifies market.authority == authority.key()
    )]
    pub market: Account<'info, MarketAccount>,

    pub authority: Signer<'info>,  // Verifies authority signed transaction
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(
        mut,
        has_one = authority @ SwapError::Unauthorized
    )]
    pub market: Account<'info, MarketAccount>,

    pub authority: Signer<'info>,

    // ...
}
```

**Audit Checklist:**
- [ ] All privileged instructions use `Signer<'info>` for authority
- [ ] `has_one = authority` constraint present on market account
- [ ] Swap instruction does NOT require authority signer (permissionless)

### 3.7 Reentrancy Protection (REQ-NF-008)

**Implementation:**
```rust
// Solana runtime provides inherent reentrancy protection (single-threaded execution)
// No explicit code needed, but follow best practices:

pub fn swap(ctx: Context<Swap>, amount: u64, swap_a_to_b: bool) -> Result<()> {
    // 1. Validate inputs
    require!(amount > 0, SwapError::InvalidAmount);
    require!(ctx.accounts.market.price > 0, SwapError::PriceNotSet);

    // 2. Calculate outputs
    let amount_out = calculate_swap(amount, swap_a_to_b, &ctx.accounts.market)?;

    // 3. Verify vault balance
    let vault_balance = /* ... */;
    require!(vault_balance >= amount_out, SwapError::InsufficientLiquidity);

    // 4. Execute CPIs (all state changes within this instruction are atomic)
    token::transfer(ctx_user_to_vault, amount)?;
    token::transfer(ctx_vault_to_user, amount_out)?;

    // 5. Emit event (after all state changes)
    emit!(SwapExecuted { ... });

    Ok(())
}
```

**Best Practices:**
- Perform all validations before external calls (CPIs)
- Assume CPI may fail, rely on Solana's atomicity
- Emit events after all state changes
- Never trust data from external programs without validation

---

## 4. OWASP Considerations

### 4.1 OWASP Top 10 Web Application Security Risks (Adapted for Smart Contracts)

| OWASP Risk | Relevance to Solana SWAP | Mitigation |
|------------|-------------------------|------------|
| A01: Broken Access Control | High (unauthorized set_price) | Anchor `has_one` + `Signer` constraints |
| A02: Cryptographic Failures | Low (no user secrets stored) | N/A (PDA-based, no private key storage) |
| A03: Injection | Medium (arithmetic overflow) | Checked arithmetic, input validation |
| A04: Insecure Design | Medium (single admin authority) | Documented in ADR-003, educational context |
| A05: Security Misconfiguration | Low (no external dependencies) | Anchor framework enforces defaults |
| A06: Vulnerable Components | Low (minimal dependencies) | Pin Anchor version (0.31.0) |
| A07: Authentication Failures | High (signer verification) | Anchor `Signer<'info>` constraint |
| A08: Data Integrity Failures | High (overflow, reentrancy) | Checked arithmetic, atomic transactions |
| A09: Logging Failures | Medium (event emission) | Anchor events (REQ-NF-009 to REQ-NF-012) |
| A10: Server-Side Request Forgery | N/A (on-chain program) | N/A |

### 4.2 Smart Contract Specific Risks (Solana)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Arithmetic Overflow/Underflow | Critical | Checked arithmetic (REQ-NF-001) |
| Reentrancy | Low (Solana runtime prevents) | Solana single-threaded execution |
| Integer Division Precision Loss | Medium | Use scaled integers (price × 10^6) |
| Unchecked External Calls | Medium | Validate CPI return values |
| Uninitialized Storage | Low (Anchor prevents) | Anchor `init` constraint |
| Account Confusion | High | Anchor constraint system |
| Missing Signer Checks | Critical | Anchor `Signer<'info>` |
| Front-Running (Price Changes) | Medium | Event emission + monitoring (REQ-NF-007) |

---

## 5. Security Testing Strategy

### 5.1 Unit Tests (Security-Focused)

```typescript
describe("Security Tests", () => {
    describe("Arithmetic Protection", () => {
        it("Rejects swap causing multiplication overflow", async () => {
            const hugeAmount = new BN("18446744073709551615");  // u64::MAX
            await expect(
                program.methods.swap(hugeAmount, true).accounts({...}).rpc()
            ).to.be.rejectedWith(/Overflow/);
        });

        it("Rejects swap when price is zero (division by zero)", async () => {
            await program.methods.initializeMarket().accounts({...}).rpc();
            // Don't set price (defaults to 0)

            await expect(
                program.methods.swap(new BN(1000), false).accounts({...}).rpc()
            ).to.be.rejectedWith(/PriceNotSet/);
        });
    });

    describe("Access Control", () => {
        it("Prevents non-authority from setting price", async () => {
            const attacker = Keypair.generate();
            await expect(
                program.methods.setPrice(new BN(2000000))
                    .accounts({ authority: attacker.publicKey })
                    .signers([attacker])
                    .rpc()
            ).to.be.rejectedWith(/has one constraint/);
        });

        it("Prevents non-authority from adding liquidity", async () => {
            const attacker = Keypair.generate();
            await expect(
                program.methods.addLiquidity(new BN(1000), new BN(0))
                    .accounts({ authority: attacker.publicKey })
                    .signers([attacker])
                    .rpc()
            ).to.be.rejectedWith(/has one constraint/);
        });
    });

    describe("Input Validation", () => {
        it("Rejects swap with zero amount", async () => {
            await expect(
                program.methods.swap(new BN(0), true).accounts({...}).rpc()
            ).to.be.rejectedWith(/InvalidAmount/);
        });

        it("Rejects swap exceeding vault balance", async () => {
            await program.methods.addLiquidity(new BN(0), new BN(100)).accounts({...}).rpc();

            await expect(
                program.methods.swap(new BN(100000), true).accounts({...}).rpc()
            ).to.be.rejectedWith(/InsufficientLiquidity/);
        });
    });

    describe("Account Validation", () => {
        it("Rejects swap with incorrect vault account", async () => {
            const fakeVault = Keypair.generate();

            await expect(
                program.methods.swap(new BN(1000), true).accounts({
                    ...validAccounts,
                    vaultA: fakeVault.publicKey,
                }).rpc()
            ).to.be.rejectedWith(/AccountNotInitialized|ConstraintSeeds/);
        });

        it("Rejects swap with wrong token mint in vault", async () => {
            // Create vault with different mint
            const wrongMint = await createMint(connection, payer, authority, null, 9);
            const wrongVault = await createAccount(connection, payer, wrongMint, marketPDA);

            await expect(
                program.methods.swap(new BN(1000), true).accounts({
                    ...validAccounts,
                    vaultA: wrongVault,
                }).rpc()
            ).to.be.rejectedWith(/InvalidVault|ConstraintSeeds/);
        });
    });
});
```

### 5.2 Fuzzing Strategy

```typescript
import { randomBytes } from "crypto";

async function fuzzSwap(iterations: number) {
    const vulnerabilities = [];

    for (let i = 0; i < iterations; i++) {
        const amount = new BN(randomBytes(8));  // Random u64
        const swapAToB = Math.random() > 0.5;

        try {
            await program.methods.swap(amount, swapAToB).accounts({...}).rpc();
            // If swap succeeded, verify balances are correct
            const actualBalances = await getBalances();
            const expectedBalances = calculateExpectedBalances(amount, swapAToB);

            if (!balancesMatch(actualBalances, expectedBalances)) {
                vulnerabilities.push({
                    type: "Incorrect balance calculation",
                    amount: amount.toString(),
                    direction: swapAToB ? "A→B" : "B→A",
                });
            }
        } catch (error) {
            // Expected for invalid inputs (overflow, insufficient liquidity, etc.)
            // Log unexpected errors
            if (!isExpectedError(error)) {
                vulnerabilities.push({
                    type: "Unexpected error",
                    amount: amount.toString(),
                    error: error.message,
                });
            }
        }
    }

    return vulnerabilities;
}

// Run fuzzer
const results = await fuzzSwap(10000);
console.log(`Fuzzing complete. Found ${results.length} potential vulnerabilities.`);
```

### 5.3 Security Audit Checklist

**Pre-Audit:**
- [ ] All arithmetic operations use checked methods
- [ ] All division operations validate denominator > 0
- [ ] All input amounts validated > 0
- [ ] All PDAs verified via seeds + constraints
- [ ] All signer requirements enforced via `Signer<'info>`
- [ ] All vault balances checked before transfers
- [ ] Events emitted for all state changes
- [ ] Custom errors defined for all failure modes
- [ ] Test coverage > 90% (including edge cases)

**Audit Scope:**
- [ ] Smart contract code review (lib.rs, all instructions)
- [ ] Access control verification (SetPrice, AddLiquidity)
- [ ] Arithmetic safety verification (swap calculations)
- [ ] PDA derivation logic review
- [ ] CPI security review (token transfers)
- [ ] Event emission verification
- [ ] Test coverage review

**Post-Audit:**
- [ ] Address all critical findings
- [ ] Address all high-severity findings
- [ ] Document all accepted risks (educational context)
- [ ] Update documentation with audit report link

---

## 6. Incident Response Plan

### 6.1 Security Incident Classification

| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| Critical | Funds at immediate risk (e.g., vault drain) | < 1 hour | Halt program, notify all users |
| High | Exploit possible but not yet observed | < 4 hours | Deploy patch, monitor closely |
| Medium | Theoretical vulnerability, no exploit | < 24 hours | Schedule fix in next release |
| Low | Minor issue, no security impact | < 7 days | Document in backlog |

### 6.2 Emergency Procedures

**If Critical Vulnerability Detected:**
1. **Halt Program** (if program upgrade authority is retained):
   ```bash
   solana program close <PROGRAM_ID> --authority <UPGRADE_AUTHORITY>
   ```
2. **Notify Administrators**: Email/Discord blast to all market administrators
3. **Drain Vaults** (as administrator): Call `add_liquidity` with negative amounts (if implemented) to recover funds
4. **Deploy Fixed Version**: Test on devnet, then upgrade on mainnet
5. **Post-Mortem**: Document root cause, fix, and prevention measures

**Monitoring Alerts:**
- Large price changes (>10% in 1 minute)
- Vault balance drops >50% in 1 hour
- Repeated transaction failures (>10% failure rate)
- Anomalous swap volumes (>10x baseline)

---

## 7. References

- [Solana Security Best Practices](https://docs.solana.com/developing/programming-model/accounts#security)
- [Anchor Security Guide](https://book.anchor-lang.com/anchor_in_depth/security.html)
- [Sealevel Attacks Repository](https://github.com/coral-xyz/sealevel-attacks) - Common Solana vulnerabilities
- [OWASP Smart Contract Top 10](https://owasp.org/www-project-smart-contract-top-10/)
- [Neodyme Solana Security Workshop](https://workshop.neodyme.io/)
- [Trail of Bits Solana Security Audit Guidelines](https://github.com/trailofbits/publications/blob/master/reviews/SolanaSecurityAudit.pdf)
- REQ-NF-001 to REQ-NF-008: Security requirements
- ADR-003: Single Authority governance model
- ADR-005: Checked Arithmetic decision
