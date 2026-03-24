# UC-002: Set Exchange Rate

**ID:** UC-002
**Priority:** Must
**Actor:** Administrator
**Trigger:** Administrator needs to establish or update the exchange rate between Token A and Token B in a market
**Preconditions:**
- Market has been initialized (UC-001 completed)
- Administrator's wallet is the market.authority account
- Administrator has sufficient SOL for transaction fees
**Postconditions:**
- Market price field is updated to the new exchange rate value
- PriceSet event is emitted with old_price, new_price, and timestamp (if REQ-NF-010 is implemented)
- Market is ready to process swaps (if price > 0)
**Traceability:** REQ-F-002, REQ-F-008, REQ-NF-002, REQ-NF-006, REQ-NF-010

## Description
The Set Exchange Rate use case allows the market administrator to define or update the conversion rate between Token A and Token B. The price is stored as a u64 value representing "1 Token A = price/10^6 Token B". For example, price=2000000 means 1 Token A = 2 Token B, and price=500000 means 1 Token A = 0.5 Token B.

This instruction is authority-restricted: only the wallet account that created the market (stored in market.authority) can invoke set_price. The system validates the signer matches the authority before allowing the update. This prevents unauthorized manipulation of exchange rates, which would be a critical security vulnerability.

The price must be set to a value > 0 before users can perform swaps in the B→A direction (to avoid division by zero). The A→B direction can technically proceed with price=0, but would result in zero Token B output, which is rejected by zero-amount validation.

## Normal Flow
1. Administrator connects Phantom wallet (authority account) to web UI or CLI
2. Administrator navigates to market management interface for target market
3. UI displays current market price (e.g., "1 Token A = 2.5 Token B")
4. Administrator selects "Set Exchange Rate" or "Update Price"
5. UI displays input form with field for new price value
6. Administrator inputs desired exchange rate (e.g., 1 Token A = 3.2 Token B)
7. UI converts human-readable rate to u64 format (3.2 → 3200000)
8. UI displays confirmation: "Set price to 3200000 (1 A = 3.2 B)?"
9. Administrator reviews and confirms transaction
10. Administrator signs transaction with Phantom wallet
11. System verifies signer (administrator) matches market.authority
12. System captures old_price value from market account
13. System updates market.price field to new_price (3200000)
14. System emits PriceSet event with market PDA, old_price, new_price, timestamp
15. Transaction confirms on-chain
16. UI displays success: "Exchange rate updated to 3.2 Token B per 1 Token A"
17. UI refreshes market data to show new price
18. Swaps can now proceed using the updated rate

## Alternative Flows

### AF1: Set Initial Price (First Time)
1. Administrator opens newly created market (price currently = 0)
2. UI displays warning: "Price not set. Swaps cannot execute until a price is configured."
3. Administrator clicks "Set Price" button
4. At Normal Flow step 3, old_price = 0
5. Administrator sets initial price (e.g., 1000000 for 1:1 ratio)
6. Continues with Normal Flow from step 8
7. Market is now operational for swaps

### AF2: Set Price via CLI Script
1. Developer loads market PDA and authority keypair
2. Script calls program.methods.setPrice(new_price).accounts({...}).signers([authority]).rpc()
3. Script waits for transaction confirmation
4. Script queries updated market account and logs new price
5. Returns success status

### AF3: Price Adjustment Based on External Oracle
1. Administrator monitors external price feed (e.g., CoinGecko, Pyth)
2. Automated script detects price deviation > threshold (e.g., 2%)
3. Script calculates new target price in u64 format
4. Script invokes set_price with calculated value
5. Continues with Normal Flow from step 11
6. Log records: "Price adjusted from X to Y based on oracle feed"

### AF4: Gradual Price Update (Time-Weighted)
1. Administrator wants to change price from 2.0 to 3.0 over 10 steps
2. Administrator uses admin script with loop: for step in 1..=10
3. Script calculates intermediate price: 2.0 + (step * 0.1)
4. Script invokes set_price with intermediate value
5. Script waits for confirmation before next iteration
6. After 10 transactions, final price = 3.0
7. Reduces impact of sudden price changes on active traders

## Exception Flows

### EF1: Unauthorized Access Attempt
1. At step 11, system compares transaction signer with market.authority
2. Signer public key ≠ market.authority public key
3. Anchor fails signer constraint check
4. Transaction is rejected before instruction handler executes
5. System responds with error: "Unauthorized: Only the market authority can set the price. Current authority: 9xKbP... Your address: 7qRmT..."
6. UI displays: "You do not have permission to modify this market's price."
7. No state changes are persisted
8. Transaction fails with authorization error code

### EF2: Invalid Price Value (Zero)
1. At step 6, administrator inputs exchange rate = 0
2. UI validates price > 0 client-side
3. Validation fails
4. System responds with warning: "Price must be greater than 0. Enter a valid exchange rate."
5. Submit button remains disabled
6. Administrator must input price > 0 to proceed
7. Alternatively, if validation is skipped and transaction is submitted:
   - Transaction succeeds (price=0 is technically valid on-chain)
   - But swaps will fail with "PriceNotSet" error in B→A direction
   - A→B swaps will result in zero output (caught by zero-amount validation)

### EF3: Price Overflow (Unrealistic Value)
1. At step 6, administrator inputs extremely large price (e.g., 18446744073709551615 = u64::MAX)
2. UI may display warning: "This exchange rate is unusually high. Are you sure?"
3. Administrator confirms
4. Transaction is submitted and succeeds (no on-chain validation for max price)
5. Subsequent swaps may fail due to arithmetic overflow in calculation phase
6. System should implement client-side sanity checks (e.g., price < 1e15)

### EF4: Wallet Not Connected
1. At step 1, administrator tries to access UI without connecting wallet
2. UI detects no wallet connection
3. UI displays: "Please connect your Phantom wallet to continue"
4. UI shows "Connect Wallet" button
5. Administrator must complete wallet connection before accessing price management
6. Returns to Normal Flow step 1

### EF5: Insufficient SOL for Transaction Fee
1. At step 10, administrator signs transaction
2. Wallet balance < transaction fee (typically 0.000005 SOL)
3. Transaction simulation fails
4. System responds with error: "Insufficient SOL for transaction fee. Please add SOL to your wallet."
5. Transaction is not submitted
6. Administrator must fund wallet and retry

### EF6: Transaction Fails Due to RPC Error
1. At step 15, transaction is submitted to RPC node
2. RPC node returns error (e.g., "429 Too Many Requests" or "503 Service Unavailable")
3. Transaction is not processed
4. System responds with error: "RPC error: Unable to process transaction. Please try again."
5. UI suggests: "Wait a moment and retry, or switch to a different RPC endpoint"
6. No state changes occur
7. Administrator can retry transaction

### EF7: Concurrent Price Updates (Race Condition)
1. Two administrators (if multi-sig or key sharing) attempt to set price simultaneously
2. Both transactions reference the same market account
3. One transaction confirms first (e.g., old_price=1000000 → new_price=1500000)
4. Second transaction references stale market state (old_price=1000000)
5. Second transaction succeeds (overwrites first update, e.g., new_price=2000000)
6. PriceSet events show: Event1(1000000→1500000), Event2(1000000→2000000)
7. Final price = 2000000 (last write wins)
8. Solution: Implement optimistic locking with version numbers (future enhancement)

## Business Rules
- BR-006: Only the market authority can modify the exchange rate
- BR-007: Price represents "1 Token A = price/10^6 Token B" (6 decimal places of precision)
- BR-008: Price = 0 is a valid state but prevents B→A swaps (division by zero)
- BR-009: Price updates take effect immediately for all subsequent swaps
- BR-010: Historical prices are not stored on-chain (only current price persists)
- BR-011: Price changes are logged via events for off-chain tracking and auditing

## Acceptance Criteria
- **AC1**: GIVEN an initialized market with authority = Administrator A
- **AC2**: AND Administrator A's wallet is connected and has sufficient SOL for transaction fees
- **AC3**: WHEN Administrator A invokes set_price with a new price value (u64) representing "1 Token A = price/10^6 Token B"
- **AC4**: THEN the market.price field SHALL be updated to the new value
- **AC5**: AND a PriceSet event SHALL be emitted with market PDA, old_price, new_price, and timestamp
- **AC6**: AND the transaction SHALL confirm successfully
- **AC7**: AND WHEN a different account (not Administrator A) attempts to invoke set_price
- **AC8**: THEN the transaction SHALL fail with an authorization error before execution
- **AC9**: AND no state changes SHALL be persisted
- **AC10**: AND WHEN price is set to 0, THEN subsequent B→A swaps SHALL fail with "PriceNotSet" or division-by-zero error
