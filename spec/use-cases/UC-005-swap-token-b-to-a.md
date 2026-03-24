# UC-005: Swap Token B to A

**ID:** UC-005
**Priority:** Must
**Actor:** User (Trader)
**Trigger:** User wants to exchange Token B for Token A at the market's fixed exchange rate (inverse direction)
**Preconditions:**
- Market has been initialized (UC-001 completed)
- Market price has been set to a value > 0 (UC-002 completed) - **CRITICAL for B→A direction**
- Vault A has sufficient liquidity to fulfill the calculated output amount
- User has Phantom wallet connected
- User has Token B balance >= swap amount in their ATA
- User has sufficient SOL for transaction fees
**Postconditions:**
- User's Token B balance decreased by input amount
- User's Token A balance increased by calculated output amount (amount_a)
- Vault B balance increased by input amount
- Vault A balance decreased by output amount
- SwapExecuted event emitted with swap details (if REQ-NF-012 is implemented)
**Traceability:** REQ-F-007, REQ-F-009, REQ-NF-001, REQ-NF-002, REQ-NF-003, REQ-NF-004, REQ-NF-012

## Description
The Swap Token B to A use case enables any user to exchange Token B for Token A at the market's current fixed exchange rate in the reverse direction. This completes the bidirectional swap functionality required by the project specification.

The swap calculation uses the inverse formula:
```
amount_a = (amount × 10^6 × 10^decimals_a) / (price × 10^decimals_b)
```

Where:
- `amount` = input Token B quantity (in base units)
- `price` = market.price (stored as u64, represents 1 Token A = price/10^6 Token B)
- `decimals_a` = Token A decimals (e.g., 9 for typical SPL tokens)
- `decimals_b` = Token B decimals (e.g., 6 for USDC-like tokens)

**CRITICAL**: This formula requires division by `price`. If price = 0, the transaction MUST fail to prevent division by zero (REQ-NF-002). The system validates price > 0 before attempting the calculation.

The instruction performs two atomic CPI transfers:
1. Transfer `amount` Token B from user's ATA to vault_b (user signs as authority)
2. Transfer `amount_a` Token A from vault_a to user's ATA (market PDA signs as vault authority using stored bump seed)

If either transfer fails, the entire transaction reverts. The system validates price > 0, amount > 0, and vault_a has sufficient balance before executing transfers. All arithmetic uses checked operations (especially checked_div) to prevent overflow and division errors.

## Normal Flow
1. User connects Phantom wallet to web UI
2. User navigates to "Swap" interface
3. UI displays user's token balances:
   - Token A: 500
   - Token B: 1000
4. UI displays current market exchange rate: "1 Token A = 2.5 Token B" (or "1 Token B = 0.4 Token A")
5. UI displays vault liquidity:
   - Vault A: 3000 Token A
   - Vault B: 7500 Token B
6. User selects swap direction: "Token B → Token A"
7. User inputs amount = 250 (Token B to swap)
8. UI calculates expected output using formula:
   - price = 2500000 (stored value for 2.5)
   - amount_a = (250 × 10^6 × 10^9) / (2500000 × 10^6) = 100 Token A
9. UI displays: "You will receive approximately 100 Token A"
10. UI validates user's Token B balance >= 250 (satisfied)
11. UI validates vault_a balance >= 100 (satisfied: 3000 >= 100)
12. UI validates price > 0 (satisfied: 2500000 > 0)
13. User clicks "Swap" button
14. User reviews transaction details in Phantom wallet popup
15. User approves and signs transaction
16. System verifies amount > 0 (satisfied: 250 > 0)
17. System verifies price > 0 (satisfied: 2500000 > 0) - **CRITICAL validation**
18. System calculates amount_a using checked_div to prevent division by zero
19. System verifies vault_a.amount >= 100 (sufficient liquidity check)
20. System performs CPI: transfer 250 Token B from user_token_b to vault_b (user signs)
21. System performs CPI: transfer 100 Token A from vault_a to user_token_a (market PDA signs with bump)
22. System emits SwapExecuted event: market, user, swap_a_to_b=false, input=250, output=100, timestamp
23. Transaction confirms on-chain
24. UI displays success: "Swap successful! You exchanged 250 Token B for 100 Token A"
25. UI refreshes balances:
    - User Token A: 600 (+100)
    - User Token B: 750 (-250)
    - Vault A: 2900 (-100)
    - Vault B: 7750 (+250)

## Alternative Flows

### AF1: Swap with Maximum Input Amount
1. At step 7, user clicks "Max" button
2. UI auto-fills amount with user's full Token B balance (1000)
3. UI calculates output: amount_a = 400 Token A
4. UI validates vault_a >= 400 (satisfied)
5. Continues with Normal Flow step 9
6. After transaction, user's Token B balance = 0

### AF2: Reverse Rate Display
1. At step 4, UI displays both rate formats:
   - Forward: "1 Token A = 2.5 Token B"
   - Reverse: "1 Token B = 0.4 Token A"
2. User understands conversion in both directions
3. Proceeds with Normal Flow step 6

### AF3: Swap via CLI/Script
1. Trader runs automated script with parameters: amount=250, direction="b_to_a"
2. Script derives user ATAs for Token A and Token B
3. Script validates price > 0 client-side (prevents obvious failures)
4. Script calls program.methods.swap(amount, false).accounts({...}).signers([user]).rpc()
5. Script waits for transaction confirmation
6. Script queries updated balances and logs results
7. Returns success status

### AF4: Arbitrage Trading (Fast Execution)
1. Trader monitors price differences between this market and external exchanges
2. When profitable arbitrage opportunity detected (e.g., external price > market price)
3. Trader executes B→A swap on this market (buy Token A cheap)
4. Trader immediately sells Token A on external exchange (sell high)
5. Captures price difference as profit

### AF5: Dollar-Cost Averaging (Recurring Swaps)
1. User schedules automated script to run weekly
2. Script swaps fixed amount of Token B (e.g., 100) for Token A
3. Averages price over time (not affected by short-term volatility)
4. Continues with Normal Flow for each execution

## Exception Flows

### EF1: Insufficient Token B Balance
1. At step 10, UI validates user's Token B balance
2. User's balance (200) < amount (250)
3. Client-side validation fails
4. UI displays error: "Insufficient Token B balance. You have 200 but tried to swap 250."
5. Submit button remains disabled
6. User must reduce amount or cancel operation
7. Alternatively, if transaction is submitted:
   - Token Program CPI fails with InsufficientFunds error at step 20
   - Transaction reverts atomically
   - UI displays: "Transaction failed: Insufficient Token B in your wallet"

### EF2: Insufficient Liquidity in Vault A
1. At step 11, UI validates vault_a balance
2. Vault A balance (50) < calculated amount_a (100)
3. Client-side validation fails
4. UI displays error: "Insufficient liquidity in Vault A. Requested 100 Token A, but only 50 available. Try a smaller amount."
5. Submit button remains disabled
6. User must reduce swap amount or wait for administrator to add liquidity
7. Alternatively, if on-chain check catches this:
   - At step 19, system fails with InsufficientLiquidity error
   - Transaction reverts before any transfers
   - UI displays: "Swap failed: Not enough Token A in the liquidity pool"

### EF3: Price Not Set (price = 0) - CRITICAL CASE
1. Market was initialized but administrator never called set_price (price = 0)
2. At step 12, UI validates price > 0
3. Validation fails (price = 0)
4. UI displays error: "Swap unavailable: Exchange rate not set for this direction (Token B → Token A). Contact market administrator."
5. Submit button is disabled
6. User cannot proceed with swap
7. Alternatively, if on-chain validation catches this:
   - At step 17, system validates price > 0
   - Validation fails
   - Transaction reverts with PriceNotSet or DivisionByZero error
   - UI displays: "Swap failed: Exchange rate must be set to a value greater than 0"
8. **This is specific to B→A direction** due to division by price in formula

### EF4: Zero Amount Input
1. At step 7, user inputs amount = 0 or leaves field empty
2. At step 16, system validates amount > 0
3. Validation fails
4. UI displays error: "Amount must be greater than 0"
5. Submit button remains disabled
6. User must input amount > 0
7. Alternatively, if on-chain validation catches this:
   - Transaction fails with InvalidAmount error
   - UI displays: "Invalid swap amount: must be greater than 0"

### EF5: Arithmetic Overflow in Calculation
1. At step 18, system calculates amount_a using checked_mul and checked_div
2. User inputs very large amount (e.g., amount = u64::MAX / 2)
3. Intermediate calculation (amount × 10^6 × 10^decimals_a) overflows u64
4. Checked arithmetic returns None
5. Transaction fails with ArithmeticOverflow error
6. UI displays: "Swap calculation overflow. Please reduce the swap amount."
7. User must input smaller amount

### EF6: Division by Zero (Edge Case - Should Be Caught by EF3)
1. Price validation somehow bypassed (bug or attack)
2. At step 18, system attempts checked_div with price = 0 in denominator
3. Checked_div returns None (division by zero)
4. Transaction fails with DivisionByZero or ArithmeticError
5. UI displays: "Critical error: Division by zero in swap calculation"
6. This indicates a system bug - should never occur if validations are correct

### EF7: Token Account Not Found
1. At step 20, system attempts to transfer from user_token_b ATA
2. ATA does not exist for user's wallet + Token B mint
3. Token Program CPI fails with AccountNotFound error
4. Transaction reverts
5. UI displays error: "Token B account not found. Please create an Associated Token Account first."
6. UI suggests: "Initialize Token B account by receiving a small transfer or clicking 'Create Account'"
7. User must create ATA before retrying swap

### EF8: Vault PDA Authority Mismatch
1. At step 21, system attempts to transfer from vault_a using market PDA signer
2. Vault_a authority ≠ market PDA (data corruption or attack)
3. Token Program CPI fails with OwnerMismatch or InvalidAuthority error
4. Transaction reverts (step 20 transfer is rolled back)
5. System displays: "Critical error: Vault authority mismatch. Contact support."
6. This indicates a severe system integrity issue

### EF9: Transaction Timeout/RPC Error
1. At step 23, transaction is submitted but RPC does not respond within timeout
2. Transaction status unknown
3. UI displays: "Transaction timeout. Status unknown. Signature: 5XyZ..."
4. UI suggests: "Check transaction on Solana Explorer or wait for confirmation"
5. UI provides link to explorer
6. User can manually verify if swap executed by checking balances

### EF10: User Rejects Transaction in Wallet
1. At step 15, Phantom wallet displays approval prompt
2. User clicks "Reject" or closes popup
3. Wallet returns UserRejectedRequest error
4. UI displays: "Transaction cancelled by user"
5. No transaction is submitted
6. User can retry swap or navigate away

### EF11: Precision Loss Warning
1. At step 8, UI calculates amount_a = 0.00001 Token A (very small output)
2. After decimal conversion, output rounds to 0 base units
3. UI displays warning: "Output amount too small (rounds to 0). Increase swap amount."
4. Submit button disabled
5. User must input larger amount to get meaningful output

## Business Rules
- BR-029: Swaps are permissionless - any user can execute (REQ-F-009)
- BR-030: Swap rate is inverse of A→B rate, calculated using fixed price
- BR-031: Output calculation formula: amount_a = (amount × 10^6 × 10^decimals_a) / (price × 10^decimals_b)
- BR-032: All arithmetic uses checked operations, especially checked_div for price division (REQ-NF-001)
- BR-033: **System MUST validate price > 0 before calculation to prevent division by zero** (REQ-NF-002)
- BR-034: System validates vault has sufficient balance before transfer (REQ-NF-003)
- BR-035: Both token transfers are atomic - all succeed or all fail (REQ-NF-016)
- BR-036: User pays transaction fees (typically ~0.000005 SOL)
- BR-037: B→A direction is MORE sensitive to price=0 than A→B (division vs multiplication)

## Acceptance Criteria
- **AC1**: GIVEN an initialized market with price > 0, user signature, user Token B balance >= amount, and vault_a balance >= calculated amount_a
- **AC2**: WHEN the user invokes swap with amount and swap_a_to_b = false
- **AC3**: THEN the system SHALL validate price > 0 to prevent division by zero (REQ-NF-002)
- **AC4**: AND the system SHALL calculate amount_a = (amount × 10^6 × 10^decimals_a) / (price × 10^decimals_b) using checked_div to avoid division errors (REQ-NF-001)
- **AC5**: AND the system SHALL transfer amount Token B from user_token_b to vault_b via CPI with user as authority
- **AC6**: AND the system SHALL transfer amount_a Token A from vault_a to user_token_a via CPI with market PDA as signer using seeds [b"market", market.token_mint_a, market.token_mint_b, market.bump]
- **AC7**: AND the user's Token B balance SHALL decrease by amount
- **AC8**: AND the user's Token A balance SHALL increase by amount_a
- **AC9**: AND the vault_b balance SHALL increase by amount
- **AC10**: AND the vault_a balance SHALL decrease by amount_a
- **AC11**: AND a SwapExecuted event SHALL be emitted with market, user, swap_a_to_b=false, input_amount=amount, output_amount=amount_a, timestamp
- **AC12**: AND WHEN amount = 0, THEN the transaction SHALL fail with InvalidAmount error (REQ-NF-004)
- **AC13**: AND **WHEN price = 0, THEN the transaction SHALL fail with PriceNotSet or DivisionByZero error BEFORE attempting calculation** (REQ-NF-002)
- **AC14**: AND WHEN vault_a balance < amount_a, THEN the transaction SHALL fail with InsufficientLiquidity error (REQ-NF-003)
- **AC15**: AND WHEN arithmetic overflow or division error occurs, THEN the transaction SHALL fail with ArithmeticError
- **AC16**: AND any user (not just administrator) SHALL be able to execute this swap (REQ-F-009)
- **AC17**: AND the B→A swap SHALL function symmetrically to the A→B swap, providing true bidirectional exchange capability (REQ-F-007)
