# UC-003: Add Liquidity

**ID:** UC-003
**Priority:** Must
**Actor:** Administrator
**Trigger:** Administrator needs to provision tokens into market vaults to enable user swaps
**Preconditions:**
- Market has been initialized (UC-001 completed)
- Administrator's wallet is the market.authority account
- Administrator has Token A and/or Token B balances in their Associated Token Accounts (ATAs)
- Administrator's token balances >= amounts to be deposited
- Administrator has sufficient SOL for transaction fees
**Postconditions:**
- Vault A balance increased by amount_a (if amount_a > 0)
- Vault B balance increased by amount_b (if amount_b > 0)
- Administrator's token balances decreased by corresponding amounts
- LiquidityAdded event is emitted with market, amount_a, amount_b, timestamp (if REQ-NF-011 is implemented)
- Market has sufficient liquidity to fulfill swap requests up to deposited amounts
**Traceability:** REQ-F-003, REQ-F-004, REQ-F-005, REQ-F-008, REQ-NF-004, REQ-NF-006, REQ-NF-011, REQ-NF-016

## Description
The Add Liquidity use case enables the market administrator to deposit Token A and/or Token B into the market's vault PDAs. Liquidity is required for the market to fulfill user swap requests. Without sufficient vault balances, swaps will fail with "InsufficientLiquidity" errors.

The add_liquidity instruction supports three modes:
1. Add Token A only (amount_a > 0, amount_b = 0)
2. Add Token B only (amount_a = 0, amount_b > 0)
3. Add both tokens atomically (amount_a > 0, amount_b > 0)

The instruction performs Cross-Program Invocations (CPIs) to the SPL Token Program to transfer tokens from the administrator's ATAs to the vault PDAs. The administrator signs the transfers as the token account authority. The market PDA acts as the destination authority for the vaults.

All transfers within a single instruction are atomic - if any transfer fails (e.g., insufficient balance), all transfers are rolled back, ensuring consistent state. The instruction rejects calls where both amounts are zero (REQ-NF-004).

## Normal Flow
1. Administrator connects Phantom wallet (authority account) to web UI
2. Administrator navigates to "Add Liquidity" page for target market
3. UI displays current vault balances:
   - Vault A: 1000 Token A
   - Vault B: 2500 Token B
4. UI displays administrator's token balances:
   - Wallet Token A: 5000
   - Wallet Token B: 10000
5. Administrator inputs amount_a = 1500 (Token A to deposit)
6. Administrator inputs amount_b = 3000 (Token B to deposit)
7. UI validates amount_a > 0 OR amount_b > 0 (at least one non-zero)
8. UI validates administrator's Token A balance >= 1500
9. UI validates administrator's Token B balance >= 3000
10. UI displays confirmation: "Deposit 1500 Token A and 3000 Token B?"
11. Administrator confirms and signs transaction with Phantom wallet
12. System verifies signer matches market.authority
13. System performs CPI to Token Program: transfer 1500 Token A from authority_token_a ATA to vault_a PDA
14. System performs CPI to Token Program: transfer 3000 Token B from authority_token_b ATA to vault_b PDA
15. System emits LiquidityAdded event with market PDA, amount_a=1500, amount_b=3000, timestamp
16. Transaction confirms on-chain
17. UI displays success: "Liquidity added successfully"
18. UI refreshes vault balances:
    - Vault A: 2500 Token A (+1500)
    - Vault B: 5500 Token B (+3000)
19. UI refreshes administrator's wallet balances:
    - Wallet Token A: 3500 (-1500)
    - Wallet Token B: 7000 (-3000)

## Alternative Flows

### AF1: Add Token A Only
1. Administrator wants to add only Token A liquidity
2. At Normal Flow step 5, inputs amount_a = 2000
3. At Normal Flow step 6, leaves amount_b = 0 (or skips field)
4. UI validates amount_a > 0 (satisfied)
5. Continues with Normal Flow step 8
6. At step 13, system transfers only Token A
7. Step 14 is skipped (no Token B transfer)
8. Event emitted: amount_a=2000, amount_b=0
9. Only Vault A balance increases

### AF2: Add Token B Only
1. Administrator wants to add only Token B liquidity
2. At Normal Flow step 5, leaves amount_a = 0 (or skips field)
3. At Normal Flow step 6, inputs amount_b = 5000
4. UI validates amount_b > 0 (satisfied)
5. Continues with Normal Flow step 9
6. Step 13 is skipped (no Token A transfer)
7. At step 14, system transfers only Token B
8. Event emitted: amount_a=0, amount_b=5000
9. Only Vault B balance increases

### AF3: Add Maximum Available Balance
1. At step 5, administrator clicks "Max" button next to Token A field
2. UI auto-fills amount_a with administrator's full Token A balance (5000)
3. At step 6, administrator clicks "Max" button next to Token B field
4. UI auto-fills amount_b with administrator's full Token B balance (10000)
5. Continues with Normal Flow step 7
6. After transaction, administrator's token balances = 0 (all deposited)

### AF4: Add Liquidity via CLI Script
1. Developer loads market PDA, authority keypair, and token ATAs
2. Script calls program.methods.addLiquidity(amount_a, amount_b).accounts({...}).signers([authority]).rpc()
3. Script waits for transaction confirmation
4. Script queries vault balances and logs new totals
5. Returns success status

### AF5: Recurring Liquidity Provisioning (Scheduled)
1. Administrator configures automated script to run daily
2. Script queries current vault balances
3. If vault_a < threshold_a, script calculates top_up_a = threshold_a - vault_a
4. If vault_b < threshold_b, script calculates top_up_b = threshold_b - vault_b
5. Script invokes add_liquidity with calculated amounts
6. Ensures vaults maintain minimum liquidity levels

## Exception Flows

### EF1: Insufficient Token A Balance
1. At step 8, UI validates administrator's Token A balance
2. Administrator's balance (1000) < amount_a (1500)
3. Client-side validation fails
4. UI displays error: "Insufficient Token A balance. You have 1000 but tried to deposit 1500."
5. Submit button remains disabled
6. Administrator must reduce amount_a or cancel operation
7. Alternatively, if validation is skipped and transaction is submitted:
   - Token Program CPI fails with InsufficientFunds error
   - Transaction is reverted atomically
   - System displays: "Transaction failed: Insufficient Token A in your wallet"

### EF2: Insufficient Token B Balance
1. At step 9, UI validates administrator's Token B balance
2. Administrator's balance (2000) < amount_b (3000)
3. Client-side validation fails
4. UI displays error: "Insufficient Token B balance. You have 2000 but tried to deposit 3000."
5. Submit button remains disabled
6. Administrator must reduce amount_b or cancel operation

### EF3: Both Amounts Are Zero
1. At step 7, UI validates amount_a > 0 OR amount_b > 0
2. Administrator left both fields as 0
3. Validation fails
4. UI displays error: "You must specify at least one token amount to deposit."
5. Submit button remains disabled
6. Administrator must input amount_a > 0 OR amount_b > 0
7. Alternatively, if on-chain validation catches this:
   - Transaction fails with InvalidAmount error
   - System displays: "Invalid amounts: at least one amount must be greater than 0"

### EF4: Unauthorized Access Attempt
1. At step 12, system verifies transaction signer matches market.authority
2. Signer public key ≠ market.authority public key
3. Anchor fails signer constraint check
4. Transaction is rejected before instruction handler executes
5. System responds with error: "Unauthorized: Only the market authority can add liquidity. Current authority: 9xKbP... Your address: 7qRmT..."
6. UI displays: "You do not have permission to add liquidity to this market."
7. No state changes occur
8. Transaction fails with authorization error code

### EF5: Token Account Not Found
1. At step 13, system attempts to transfer from authority_token_a ATA
2. ATA does not exist for administrator's wallet + Token A mint
3. Token Program CPI fails with AccountNotFound error
4. Transaction is reverted
5. System responds with error: "Token A account not found for your wallet. Please create an Associated Token Account first."
6. UI suggests: "Initialize Token A account by receiving a small transfer or clicking 'Create Account'"
7. Administrator must create ATA before retrying

### EF6: Partial Transfer Failure (Atomicity Test)
1. At step 13, Token A transfer succeeds (1500 Token A moved to vault_a)
2. At step 14, Token B transfer fails (e.g., vault_b PDA authority mismatch)
3. Solana runtime detects transaction failure
4. All state changes are rolled back atomically
5. Token A transfer is reverted (1500 returned to administrator)
6. Transaction fails with error from step 14
7. System displays: "Transaction failed: Token B transfer error. No tokens were moved."
8. Vault balances remain unchanged
9. Administrator's wallet balances remain unchanged

### EF7: Insufficient SOL for Transaction Fee
1. At step 11, administrator signs transaction
2. Wallet balance < transaction fee (typically ~0.000005 SOL)
3. Transaction simulation fails
4. System responds with error: "Insufficient SOL for transaction fee. Please add SOL to your wallet."
5. Transaction is not submitted
6. Administrator must fund wallet and retry

### EF8: Vault PDA Not Initialized
1. At step 13, system attempts to transfer to vault_a PDA
2. Vault_a account does not exist (market initialization incomplete)
3. Token Program CPI fails with InvalidAccountData error
4. Transaction is reverted
5. System responds with error: "Market vault not found. The market may not be properly initialized."
6. UI suggests: "Contact support or re-initialize the market"
7. This indicates a critical system state error

### EF9: Amount Exceeds u64::MAX (Overflow)
1. At step 5 or 6, administrator inputs extremely large value (e.g., from script)
2. Value > 18446744073709551615 (u64::MAX)
3. Client-side parsing fails
4. UI displays error: "Amount too large. Maximum value is 18446744073709551615."
5. Administrator must input valid u64 value
6. Alternatively, if value causes overflow in calculation:
   - Checked arithmetic fails on-chain
   - Transaction reverts with arithmetic overflow error

## Business Rules
- BR-012: Only the market authority can add liquidity (REQ-F-008)
- BR-013: At least one amount (amount_a or amount_b) must be > 0 (REQ-NF-004)
- BR-014: Token transfers are atomic - both succeed or both fail (REQ-NF-016)
- BR-015: Administrator must have sufficient token balances in their ATAs
- BR-016: Vaults are PDAs owned by the swap program with authority = market PDA
- BR-017: Liquidity can be added at any time (before or after swaps begin)
- BR-018: There is no maximum liquidity limit (constrained only by u64::MAX per token)
- BR-019: Liquidity withdrawal is not implemented in this version (administrator cannot remove liquidity)

## Acceptance Criteria

### AC1: Add Token A Only (REQ-F-003)
- **AC1.1**: GIVEN an initialized market, administrator signature, and administrator's Token A account with balance >= amount_a
- **AC1.2**: WHEN the administrator invokes add_liquidity with amount_a > 0 and amount_b = 0
- **AC1.3**: THEN the system SHALL perform a CPI to the Token Program to transfer amount_a tokens from authority_token_a to vault_a
- **AC1.4**: AND the administrator's Token A balance SHALL decrease by amount_a
- **AC1.5**: AND the vault_a balance SHALL increase by amount_a
- **AC1.6**: AND the transaction SHALL confirm successfully

### AC2: Add Token B Only (REQ-F-004)
- **AC2.1**: GIVEN an initialized market, administrator signature, and administrator's Token B account with balance >= amount_b
- **AC2.2**: WHEN the administrator invokes add_liquidity with amount_a = 0 and amount_b > 0
- **AC2.3**: THEN the system SHALL perform a CPI to the Token Program to transfer amount_b tokens from authority_token_b to vault_b
- **AC2.4**: AND the administrator's Token B balance SHALL decrease by amount_b
- **AC2.5**: AND the vault_b balance SHALL increase by amount_b
- **AC2.6**: AND the transaction SHALL confirm successfully

### AC3: Add Both Tokens Atomically (REQ-F-005)
- **AC3.1**: GIVEN an initialized market, administrator signature, and sufficient balances in both token accounts
- **AC3.2**: WHEN the administrator invokes add_liquidity with amount_a > 0 AND amount_b > 0
- **AC3.3**: THEN the system SHALL transfer amount_a to vault_a AND amount_b to vault_b
- **AC3.4**: AND IF either transfer fails THEN both transfers SHALL be rolled back (REQ-NF-016)
- **AC3.5**: AND all balance changes SHALL be atomic (all succeed or all fail)

### AC4: Zero Amount Rejection (REQ-NF-004)
- **AC4.1**: GIVEN an add_liquidity instruction with amount_a = 0 AND amount_b = 0
- **AC4.2**: WHEN the instruction is invoked
- **AC4.3**: THEN the transaction SHALL fail with an "InvalidAmount" error
- **AC4.4**: AND no token transfers SHALL occur

### AC5: Authority-Only Access (REQ-F-008, REQ-NF-006)
- **AC5.1**: GIVEN a market with authority = Administrator A
- **AC5.2**: WHEN a different account (not Administrator A) attempts to invoke add_liquidity
- **AC5.3**: THEN the transaction SHALL fail with an authorization error
- **AC5.4**: AND no state changes SHALL be persisted

### AC6: Event Emission (REQ-NF-011)
- **AC6.1**: GIVEN a successful add_liquidity instruction
- **AC6.2**: WHEN tokens are transferred to vaults
- **AC6.3**: THEN a LiquidityAdded event SHALL be emitted with fields: market (Pubkey), amount_a (u64), amount_b (u64), timestamp (i64)
