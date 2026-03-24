# UC-004: Swap Token A to B

**ID:** UC-004
**Priority:** Must
**Actor:** User (Trader)
**Trigger:** User wants to exchange Token A for Token B at the market's fixed exchange rate
**Preconditions:**
- Market has been initialized (UC-001 completed)
- Market price has been set to a value > 0 (UC-002 completed)
- Vault B has sufficient liquidity to fulfill the calculated output amount
- User has Phantom wallet connected
- User has Token A balance >= swap amount in their ATA
- User has sufficient SOL for transaction fees
**Postconditions:**
- User's Token A balance decreased by input amount
- User's Token B balance increased by calculated output amount (amount_b)
- Vault A balance increased by input amount
- Vault B balance decreased by output amount
- SwapExecuted event emitted with swap details (if REQ-NF-012 is implemented)
**Traceability:** REQ-F-006, REQ-F-009, REQ-NF-001, REQ-NF-002, REQ-NF-003, REQ-NF-004, REQ-NF-012

## Description
The Swap Token A to B use case enables any user to exchange Token A for Token B at the market's current fixed exchange rate. This is the primary value proposition of the swap protocol - permissionless token exchange.

The swap calculation uses the formula:
```
amount_b = (amount × price × 10^decimals_b) / (10^6 × 10^decimals_a)
```

Where:
- `amount` = input Token A quantity (in base units)
- `price` = market.price (stored as u64, represents 1 Token A = price/10^6 Token B)
- `decimals_a` = Token A decimals (e.g., 9 for typical SPL tokens)
- `decimals_b` = Token B decimals (e.g., 6 for USDC-like tokens)

The instruction performs two atomic CPI transfers:
1. Transfer `amount` Token A from user's ATA to vault_a (user signs as authority)
2. Transfer `amount_b` Token B from vault_b to user's ATA (market PDA signs as vault authority using stored bump seed)

If either transfer fails, the entire transaction reverts. The system validates price > 0, amount > 0, and vault_b has sufficient balance before executing transfers. All arithmetic uses checked operations to prevent overflow.

## Normal Flow
1. User connects Phantom wallet to web UI
2. User navigates to "Swap" interface
3. UI displays user's token balances:
   - Token A: 1000
   - Token B: 500
4. UI displays current market exchange rate: "1 Token A = 2.5 Token B"
5. UI displays vault liquidity:
   - Vault A: 5000 Token A
   - Vault B: 12500 Token B
6. User selects swap direction: "Token A → Token B"
7. User inputs amount = 100 (Token A to swap)
8. UI calculates expected output using formula:
   - price = 2500000 (stored value for 2.5)
   - amount_b = (100 × 2500000 × 10^6) / (10^6 × 10^9) = 250 Token B
9. UI displays: "You will receive approximately 250 Token B"
10. UI validates user's Token A balance >= 100 (satisfied)
11. UI validates vault_b balance >= 250 (satisfied: 12500 >= 250)
12. User clicks "Swap" button
13. User reviews transaction details in Phantom wallet popup
14. User approves and signs transaction
15. System verifies amount > 0 (satisfied: 100 > 0)
16. System verifies price > 0 (satisfied: 2500000 > 0)
17. System calculates amount_b using checked arithmetic
18. System verifies vault_b.amount >= 250 (sufficient liquidity check)
19. System performs CPI: transfer 100 Token A from user_token_a to vault_a (user signs)
20. System performs CPI: transfer 250 Token B from vault_b to user_token_b (market PDA signs with bump)
21. System emits SwapExecuted event: market, user, swap_a_to_b=true, input=100, output=250, timestamp
22. Transaction confirms on-chain
23. UI displays success: "Swap successful! You exchanged 100 Token A for 250 Token B"
24. UI refreshes balances:
    - User Token A: 900 (-100)
    - User Token B: 750 (+250)
    - Vault A: 5100 (+100)
    - Vault B: 12250 (-250)

## Alternative Flows

### AF1: Swap with Maximum Input Amount
1. At step 7, user clicks "Max" button
2. UI auto-fills amount with user's full Token A balance (1000)
3. UI calculates output: amount_b = 2500 Token B
4. UI validates vault_b >= 2500 (satisfied)
5. Continues with Normal Flow step 9
6. After transaction, user's Token A balance = 0

### AF2: Swap with Slippage Protection (Future Enhancement)
1. At step 9, UI also displays min_output_amount based on user-selected slippage (e.g., 1%)
2. min_output_amount = 250 × (1 - 0.01) = 247.5 Token B
3. User confirms acceptable slippage
4. On-chain instruction validates actual_output >= min_output_amount
5. If price changed between submission and execution, transaction fails if slippage exceeded
6. Continues with Normal Flow step 12

### AF3: Swap via CLI/Script
1. Trader runs automated script with parameters: amount=100, direction="a_to_b"
2. Script derives user ATAs for Token A and Token B
3. Script calls program.methods.swap(amount, true).accounts({...}).signers([user]).rpc()
4. Script waits for transaction confirmation
5. Script queries updated balances and logs results
6. Returns success status

### AF4: Swap with Price Monitoring
1. User enables "Price Alert" feature in UI
2. User sets target rate: "Notify when 1 Token A >= 2.8 Token B"
3. UI monitors market price via WebSocket subscription
4. When price reaches 2.8, UI displays notification: "Target price reached!"
5. User proceeds with Normal Flow from step 6
6. Executes swap at favorable rate

### AF5: Batch Swaps (Multiple Transactions)
1. User wants to swap 1000 Token A in 10 batches of 100 each
2. User configures script with loop: for i in 1..=10
3. Script submits swap transaction with amount=100
4. Script waits for confirmation before next iteration
5. After 10 transactions, total swapped = 1000 Token A
6. Spreads price impact risk over time

## Exception Flows

### EF1: Insufficient Token A Balance
1. At step 10, UI validates user's Token A balance
2. User's balance (50) < amount (100)
3. Client-side validation fails
4. UI displays error: "Insufficient Token A balance. You have 50 but tried to swap 100."
5. Submit button remains disabled
6. User must reduce amount or cancel operation
7. Alternatively, if transaction is submitted:
   - Token Program CPI fails with InsufficientFunds error at step 19
   - Transaction reverts atomically
   - UI displays: "Transaction failed: Insufficient Token A in your wallet"

### EF2: Insufficient Liquidity in Vault B
1. At step 11, UI validates vault_b balance
2. Vault B balance (200) < calculated amount_b (250)
3. Client-side validation fails
4. UI displays error: "Insufficient liquidity in Vault B. Requested 250 Token B, but only 200 available. Try a smaller amount."
5. Submit button remains disabled
6. User must reduce swap amount or wait for administrator to add liquidity
7. Alternatively, if on-chain check catches this:
   - At step 18, system fails with InsufficientLiquidity error
   - Transaction reverts before any transfers
   - UI displays: "Swap failed: Not enough Token B in the liquidity pool"

### EF3: Zero Amount Input
1. At step 7, user inputs amount = 0 or leaves field empty
2. At step 15, system validates amount > 0
3. Validation fails
4. UI displays error: "Amount must be greater than 0"
5. Submit button remains disabled
6. User must input amount > 0
7. Alternatively, if on-chain validation catches this:
   - Transaction fails with InvalidAmount error
   - UI displays: "Invalid swap amount: must be greater than 0"

### EF4: Price Not Set (price = 0)
1. Market was initialized but administrator never called set_price
2. At step 16, system validates price > 0
3. Validation fails (price = 0)
4. Transaction reverts with PriceNotSet or DivisionByZero error
5. UI displays: "Swap unavailable: Exchange rate not set. Contact market administrator."
6. User cannot proceed with swap
7. Market must have price set before swaps can execute

### EF5: Arithmetic Overflow in Calculation
1. At step 17, system calculates amount_b using checked_mul and checked_div
2. User inputs very large amount (e.g., amount = u64::MAX - 1)
3. Intermediate calculation (amount × price × 10^decimals_b) overflows u64
4. Checked arithmetic returns None
5. Transaction fails with ArithmeticOverflow error
6. UI displays: "Swap calculation overflow. Please reduce the swap amount."
7. User must input smaller amount

### EF6: Token Account Not Found
1. At step 19, system attempts to transfer from user_token_a ATA
2. ATA does not exist for user's wallet + Token A mint
3. Token Program CPI fails with AccountNotFound error
4. Transaction reverts
5. UI displays error: "Token A account not found. Please create an Associated Token Account first."
6. UI suggests: "Initialize Token A account by receiving a small transfer or clicking 'Create Account'"
7. User must create ATA before retrying swap

### EF7: Vault PDA Authority Mismatch
1. At step 20, system attempts to transfer from vault_b using market PDA signer
2. Vault_b authority ≠ market PDA (data corruption or attack)
3. Token Program CPI fails with OwnerMismatch or InvalidAuthority error
4. Transaction reverts (step 19 transfer is rolled back)
5. System displays: "Critical error: Vault authority mismatch. Contact support."
6. This indicates a severe system integrity issue

### EF8: Transaction Timeout/RPC Error
1. At step 22, transaction is submitted but RPC does not respond within timeout
2. Transaction status unknown
3. UI displays: "Transaction timeout. Status unknown. Signature: 5XyZ..."
4. UI suggests: "Check transaction on Solana Explorer or wait for confirmation"
5. UI provides link to explorer
6. User can manually verify if swap executed by checking balances

### EF9: User Rejects Transaction in Wallet
1. At step 14, Phantom wallet displays approval prompt
2. User clicks "Reject" or closes popup
3. Wallet returns UserRejectedRequest error
4. UI displays: "Transaction cancelled by user"
5. No transaction is submitted
6. User can retry swap or navigate away

### EF10: Slippage Exceeded (Future Enhancement)
1. User sets max slippage = 1% (min_output = 247.5 Token B)
2. Between step 8 (preview) and step 22 (execution), administrator updates price
3. New price results in amount_b = 245 Token B (< 247.5)
4. On-chain slippage check fails
5. Transaction reverts with SlippageExceeded error
6. UI displays: "Price changed. Output would be 245 Token B, below your minimum of 247.5. Please retry with updated price."
7. User can adjust slippage tolerance or retry

## Business Rules
- BR-020: Swaps are permissionless - any user can execute (REQ-F-009)
- BR-021: Swap rate is fixed by administrator-controlled price (not AMM curve)
- BR-022: Output calculation formula: amount_b = (amount × price × 10^decimals_b) / (10^6 × 10^decimals_a)
- BR-023: All arithmetic uses checked operations to prevent overflow (REQ-NF-001)
- BR-024: System validates price > 0 before swap to prevent division errors (REQ-NF-002)
- BR-025: System validates vault has sufficient balance before transfer (REQ-NF-003)
- BR-026: Both token transfers are atomic - all succeed or all fail (REQ-NF-016)
- BR-027: User pays transaction fees (typically ~0.000005 SOL)
- BR-028: No slippage protection in current version (user gets exact calculated amount based on current price)

## Acceptance Criteria
- **AC1**: GIVEN an initialized market with price > 0, user signature, user Token A balance >= amount, and vault_b balance >= calculated amount_b
- **AC2**: WHEN the user invokes swap with amount and swap_a_to_b = true
- **AC3**: THEN the system SHALL calculate amount_b = (amount × price × 10^decimals_b) / (10^6 × 10^decimals_a) using checked arithmetic (REQ-NF-001)
- **AC4**: AND the system SHALL transfer amount Token A from user_token_a to vault_a via CPI with user as authority
- **AC5**: AND the system SHALL transfer amount_b Token B from vault_b to user_token_b via CPI with market PDA as signer using seeds [b"market", market.token_mint_a, market.token_mint_b, market.bump]
- **AC6**: AND the user's Token A balance SHALL decrease by amount
- **AC7**: AND the user's Token B balance SHALL increase by amount_b
- **AC8**: AND the vault_a balance SHALL increase by amount
- **AC9**: AND the vault_b balance SHALL decrease by amount_b
- **AC10**: AND a SwapExecuted event SHALL be emitted with market, user, swap_a_to_b=true, input_amount=amount, output_amount=amount_b, timestamp
- **AC11**: AND WHEN amount = 0, THEN the transaction SHALL fail with InvalidAmount error (REQ-NF-004)
- **AC12**: AND WHEN price = 0, THEN the transaction SHALL fail with PriceNotSet error (REQ-NF-002)
- **AC13**: AND WHEN vault_b balance < amount_b, THEN the transaction SHALL fail with InsufficientLiquidity error (REQ-NF-003)
- **AC14**: AND WHEN arithmetic overflow occurs, THEN the transaction SHALL fail with ArithmeticOverflow error
- **AC15**: AND any user (not just administrator) SHALL be able to execute this swap (REQ-F-009)
