# UC-006: Connect Wallet

**ID:** UC-006
**Priority:** Must
**Actor:** User, Administrator
**Trigger:** User/Administrator opens the web UI and needs to interact with the Solana blockchain
**Preconditions:**
- User has a compatible browser (Chrome, Firefox, Brave, Edge)
- Phantom wallet browser extension is installed (or user is willing to install it)
**Postconditions:**
- Phantom wallet is connected to the web UI
- User's public key (wallet address) is displayed in the UI
- UI has permission to request transaction signatures from the wallet
- User can now access wallet-dependent features (initialize market, add liquidity, set price, swap)
**Traceability:** REQ-F-016, REQ-F-012, REQ-F-013, REQ-F-014, REQ-F-015

## Description
The Connect Wallet use case establishes the authentication and authorization mechanism for all blockchain interactions in the Solana SWAP web UI. Phantom wallet serves as both the identity provider (via public key) and transaction signer for the application.

When a user clicks "Connect Wallet", the UI invokes the Phantom wallet adapter, which triggers a browser popup asking the user to approve the connection. The user selects which wallet account(s) to connect and grants permission for the dApp to view their public address and request transaction signatures.

Once connected, the UI stores the wallet's public key in React state (or context) and displays it prominently (typically truncated, e.g., "7qRmT...3nKp"). The wallet connection persists across page navigations within the session and can be configured to auto-reconnect on page reload.

The wallet connection is a prerequisite for:
- **Administrator actions**: Initialize market (UC-001), Set exchange rate (UC-002), Add liquidity (UC-003)
- **User actions**: Swap Token A to B (UC-004), Swap Token B to A (UC-005)

Without a connected wallet, all transaction buttons are disabled or hidden, and the UI displays a prominent "Connect Wallet" call-to-action.

## Normal Flow
1. User opens the Solana SWAP web UI in their browser (e.g., https://swap.example.com)
2. UI loads and detects no wallet is currently connected
3. UI displays a landing page with prominent "Connect Wallet" button
4. UI displays message: "Connect your Phantom wallet to start trading"
5. User clicks "Connect Wallet" button
6. UI invokes Phantom wallet adapter: `await wallet.connect()`
7. Phantom wallet extension triggers and displays popup window
8. Popup shows: "swap.example.com wants to connect to your wallet"
9. Popup lists available wallet accounts (e.g., Account 1: 7qRmT...3nKp, Account 2: 9xKbP...5fLm)
10. User selects desired account (e.g., Account 1)
11. User clicks "Connect" button in Phantom popup
12. Phantom returns wallet public key to the web UI
13. UI stores public key in React state/context
14. UI updates header to display connected wallet address: "Connected: 7qRmT...3nKp" (truncated)
15. UI enables wallet-dependent features (navigation tabs, swap interface, admin panels)
16. UI may display user's SOL balance and token balances (queries on-chain data)
17. "Connect Wallet" button changes to "Disconnect" or shows a wallet menu
18. User can now interact with all application features
19. Connection persists across page navigations within the session

## Alternative Flows

### AF1: Auto-Reconnect on Page Reload
1. User previously connected wallet in a prior session
2. User returns to web UI (page reload or new tab)
3. At step 2, UI detects wallet adapter has stored connection preference (localStorage)
4. UI automatically invokes `wallet.connect()` in background
5. If Phantom is unlocked, connection succeeds silently without popup
6. UI displays connected state immediately (step 14)
7. If Phantom is locked, connection fails → falls back to Normal Flow step 3

### AF2: Wallet Account Switching
1. User is already connected with Account 1
2. User opens Phantom extension and switches to Account 2
3. Phantom emits "accountChanged" event
4. UI wallet adapter detects event and updates stored public key
5. UI refreshes display: "Connected: 9xKbP...5fLm"
6. UI re-queries balances for new account
7. If user was on admin pages requiring specific authority, UI may display warning: "You switched accounts. You may no longer have admin permissions."

### AF3: Connect from Mobile Browser (Phantom Mobile)
1. User opens web UI on mobile device (iOS/Android)
2. At step 7, instead of browser extension, Phantom mobile app is invoked via deep link
3. User is redirected to Phantom app
4. User approves connection in mobile app
5. User is redirected back to browser with connection established
6. Continues with Normal Flow step 13

### AF4: Disconnect Wallet
1. User clicks "Disconnect" button or wallet menu → "Disconnect"
2. UI invokes `wallet.disconnect()`
3. Phantom connection is terminated
4. UI clears stored public key from state
5. UI hides wallet-dependent features
6. UI returns to step 3 of Normal Flow (displays "Connect Wallet" button)
7. User must reconnect to perform transactions

### AF5: Change Wallet Account Before Connecting
1. At step 7, Phantom popup displays
2. User realizes they want to connect a different account
3. User clicks "Cancel" in Phantom popup
4. User opens Phantom extension separately and switches active account
5. User returns to web UI and clicks "Connect Wallet" again
6. Continues with Normal Flow from step 5 with desired account

## Exception Flows

### EF1: Phantom Not Installed
1. At step 6, UI invokes wallet adapter
2. Wallet adapter detects no Phantom provider in `window.solana`
3. Connection attempt fails with "Wallet not found" error
4. UI catches error and displays message: "Phantom wallet not detected. Please install Phantom to continue."
5. UI shows "Install Phantom" button with link to https://phantom.app/download
6. User clicks link, navigates to Phantom website
7. User installs browser extension
8. User reloads web UI page
9. Returns to Normal Flow step 1 with Phantom now installed

### EF2: User Rejects Connection
1. At step 11, Phantom popup displays "Connect" and "Cancel" buttons
2. User clicks "Cancel" or closes the popup window
3. Phantom returns error: "User rejected the request"
4. UI wallet adapter catches error
5. UI displays message: "Wallet connection cancelled. Click 'Connect Wallet' to try again."
6. UI remains in disconnected state (no public key stored)
7. User can retry connection at any time

### EF3: Phantom Wallet Locked
1. At step 7, Phantom extension is installed but currently locked (user not logged in)
2. Phantom popup displays password entry screen
3. User enters incorrect password
4. Phantom displays error: "Incorrect password. Try again."
5. User enters correct password
6. Phantom unlocks and displays connection approval prompt
7. Continues with Normal Flow step 9
8. Alternatively, if user closes popup without unlocking:
   - Returns to EF2 (user rejects connection)

### EF4: Network Mismatch
1. At step 12, Phantom connects successfully
2. UI queries Phantom for current network (cluster)
3. Phantom is connected to mainnet-beta, but UI is configured for devnet
4. UI detects network mismatch
5. UI displays warning: "Network mismatch detected. Your wallet is connected to mainnet-beta, but this app uses devnet. Please switch networks in Phantom settings."
6. UI shows instructions: "Open Phantom → Settings → Change Network → Select Devnet"
7. Connection is established but UI disables transaction features until network matches
8. User switches network in Phantom
9. Phantom emits "networkChanged" event (if supported) or user refreshes page
10. UI validates network match and enables features

### EF5: Multiple Wallet Extensions Detected
1. At step 6, UI detects multiple wallet adapters (e.g., Phantom, Solflare, Backpack)
2. UI displays wallet selection modal: "Choose a wallet"
3. Modal shows icons/buttons for Phantom, Solflare, Backpack
4. User clicks "Phantom"
5. Continues with Normal Flow step 7 using Phantom adapter
6. If user selects different wallet, UI uses corresponding adapter

### EF6: Connection Timeout
1. At step 6, UI invokes wallet adapter with 30-second timeout
2. User does not respond to Phantom popup within timeout period
3. Connection attempt times out
4. UI displays error: "Connection timeout. Please try again."
5. Phantom popup automatically closes (or remains open awaiting action)
6. UI returns to disconnected state
7. User can retry connection

### EF7: Wallet Adapter Compatibility Error
1. At step 6, UI invokes outdated version of Phantom adapter
2. Phantom extension has been updated to new API version
3. Adapter fails with compatibility error
4. UI displays error: "Wallet adapter error. Please refresh the page or contact support."
5. UI logs error details for debugging: "Adapter version X.Y.Z incompatible with Phantom vA.B.C"
6. Developer must update wallet adapter library to resolve

### EF8: User Disconnects During Transaction
1. User is connected and initiates a swap transaction (UC-004)
2. Phantom popup displays transaction approval
3. While popup is open, user opens Phantom extension and clicks "Disconnect" or "Lock"
4. Transaction approval fails with "Wallet disconnected" error
5. UI displays: "Wallet disconnected during transaction. Please reconnect and try again."
6. Transaction is not submitted
7. UI returns to disconnected state
8. User must reconnect wallet (Normal Flow) and retry transaction

### EF9: Browser Blocks Popup (Popup Blocker)
1. At step 7, browser's popup blocker prevents Phantom popup from opening
2. UI detects no response from Phantom
3. UI displays message: "Popup blocked. Please allow popups for this site and try again."
4. UI shows instructions with screenshot highlighting browser's popup blocker icon
5. User clicks browser's popup blocker icon and selects "Always allow popups from swap.example.com"
6. User retries connection (clicks "Connect Wallet" again)
7. Popup opens successfully and continues with Normal Flow step 8

## Business Rules
- BR-038: Phantom wallet is the required wallet provider (REQ-C-007)
- BR-039: Users can connect only one wallet account at a time per browser session
- BR-040: Wallet connection is session-based and may require reconnection on page reload (unless auto-reconnect is configured)
- BR-041: Wallet connection grants permission to request transaction signatures but does NOT automatically approve transactions
- BR-042: Users must explicitly approve each transaction in the Phantom popup
- BR-043: The UI must not request wallet connection automatically on page load (user must initiate)
- BR-044: Wallet public key serves as the user's identity for authorization checks (e.g., market.authority)
- BR-045: The UI should validate the connected wallet's network matches the expected cluster (localnet/devnet/mainnet)

## Acceptance Criteria
- **AC1**: GIVEN a user opens the web UI
- **AC2**: AND the user has Phantom wallet installed in their browser
- **AC3**: WHEN the user clicks "Connect Wallet"
- **AC4**: THEN the UI SHALL prompt the user to connect via Phantom wallet
- **AC5**: AND IF Phantom is installed THEN the UI SHALL establish a connection and display the user's public key (truncated format, e.g., "7qRmT...3nKp")
- **AC6**: AND the connection SHALL grant the UI permission to request transaction signatures for subsequent operations
- **AC7**: AND wallet-dependent features (Initialize Market, Add Liquidity, Set Price, Swap) SHALL become accessible
- **AC8**: AND the UI SHALL persist the connection across page navigations within the session
- **AC9**: AND WHEN Phantom is not installed THEN the UI SHALL display a message with a link to install Phantom (e.g., "Phantom wallet not detected. Install it at https://phantom.app/download")
- **AC10**: AND WHEN the user rejects the connection request THEN the UI SHALL display "Connection cancelled" and remain in disconnected state
- **AC11**: AND WHEN the user clicks "Disconnect" THEN the wallet SHALL be disconnected and the UI SHALL return to the initial state requiring connection
- **AC12**: AND the UI SHALL display the user's SOL balance and token balances (if ATAs exist) after successful connection
