# BDD Scenarios: UC-006 - Connect Wallet

**Use Case:** UC-006 - Connect Wallet
**Priority:** Must
**Actor:** User, Administrator
**Traceability:** REQ-F-016

---

## Background

```gherkin
Background: Web UI Environment
  Given the web UI is deployed and accessible at "http://localhost:3000"
  And the user has a compatible web browser (Chrome, Firefox, Edge, Brave)
  And the browser has internet connectivity
```

---

## Scenario 1: Successful Phantom Wallet Connection (Happy Path)

```gherkin
Scenario: User connects Phantom wallet successfully
  Given the user has Phantom wallet extension installed
  And Phantom wallet is unlocked with password "********"
  And Phantom wallet contains account "7xKXtg..." with 2.5 SOL
  When the user opens the web UI at "http://localhost:3000"
  And the user clicks the "Connect Wallet" button
  Then the Phantom wallet popup SHALL appear within 1 second
  And the popup SHALL display the prompt "Connect to Solana SWAP?"
  And the popup SHALL show the site origin "localhost:3000"
  When the user clicks "Connect" in the Phantom popup
  Then the popup SHALL close
  And the web UI SHALL display "Wallet Connected" status
  And the web UI SHALL display the public key "7xKXtg...2fQm" (truncated)
  And the web UI SHALL display the SOL balance "2.5 SOL"
  And the "Connect Wallet" button SHALL change to "Disconnect" button
  And the navigation menu SHALL show enabled options: "Initialize Market", "Add Liquidity", "Swap"
  And the connection status SHALL persist across page refreshes for 24 hours
```

---

## Scenario 2: Auto-Reconnect on Page Load

```gherkin
Scenario: Wallet auto-reconnects after page refresh
  Given the user previously connected Phantom wallet with public key "7xKXtg...2fQm"
  And the connection session is still valid (< 24 hours old)
  And Phantom wallet extension is still unlocked
  When the user refreshes the page (F5)
  Then the web UI SHALL auto-connect to Phantom wallet within 500ms
  And the web UI SHALL display "Wallet Connected" without showing popup
  And the web UI SHALL display the same public key "7xKXtg...2fQm"
  And the web UI SHALL fetch and display updated SOL balance
  And no user interaction SHALL be required
```

---

## Scenario 3: Account Switching Within Phantom

```gherkin
Scenario: User switches accounts in Phantom wallet
  Given the user is connected with account "7xKXtg...2fQm"
  And Phantom wallet has 3 accounts configured
  When the user opens Phantom extension popup
  And the user switches to account "9zLKbp...4gTn" within Phantom
  Then the web UI SHALL detect the account change within 1 second
  And the web UI SHALL update the displayed public key to "9zLKbp...4gTn"
  And the web UI SHALL fetch the SOL balance for the new account
  And the web UI SHALL emit a browser console log: "Wallet account changed: 9zLKbp...4gTn"
  And any pending transactions from the previous account SHALL be cancelled
  And the UI SHALL prompt the user: "Account changed. Any unsaved actions were cancelled."
```

---

## Scenario 4: Disconnect Wallet

```gherkin
Scenario: User disconnects wallet via UI
  Given the user is connected with Phantom wallet (public key "7xKXtg...2fQm")
  And the web UI displays "Disconnect" button
  When the user clicks the "Disconnect" button
  Then the web UI SHALL immediately clear the connection state
  And the web UI SHALL display "Connect Wallet" button again
  And the web UI SHALL hide the public key display
  And the web UI SHALL hide the SOL balance display
  And the navigation menu options SHALL be disabled: "Initialize Market", "Add Liquidity", "Swap"
  And the web UI SHALL display a toast notification: "Wallet disconnected"
  And the connection session SHALL be cleared from localStorage
```

---

## Exception Scenarios

### Exception 1: Phantom Wallet Not Installed

```gherkin
Scenario: User attempts to connect without Phantom installed
  Given the user does NOT have Phantom wallet extension installed
  And the browser is Chrome version 120+
  When the user opens the web UI at "http://localhost:3000"
  And the user clicks the "Connect Wallet" button
  Then the web UI SHALL detect the missing Phantom provider
  And the web UI SHALL display an error modal with:
    """
    Phantom Wallet Not Detected

    Please install Phantom to use this application.

    [Install Phantom] [Cancel]
    """
  And the "Install Phantom" button SHALL link to "https://phantom.app/download"
  And the connection attempt SHALL be aborted
  And the web UI SHALL remain in disconnected state
```

---

### Exception 2: User Rejects Connection

```gherkin
Scenario: User rejects wallet connection request
  Given the user has Phantom wallet installed and unlocked
  When the user clicks "Connect Wallet" button
  And the Phantom popup appears with "Connect to Solana SWAP?" prompt
  And the user clicks "Cancel" in the Phantom popup
  Then the popup SHALL close
  And the web UI SHALL display a warning toast: "Connection request was cancelled"
  And the web UI SHALL remain in disconnected state
  And the "Connect Wallet" button SHALL remain clickable
  And the user SHALL be able to retry connection immediately
```

---

### Exception 3: Phantom Wallet is Locked

```gherkin
Scenario: User attempts to connect with locked wallet
  Given the user has Phantom wallet installed
  And Phantom wallet is locked (requires password)
  When the user clicks "Connect Wallet" button
  Then the Phantom extension SHALL open in a new popup window
  And the popup SHALL display the password input screen
  When the user enters incorrect password "wrong_pass"
  And clicks "Unlock"
  Then Phantom SHALL display "Incorrect password" error
  And the connection SHALL NOT proceed
  When the user enters correct password "correct_pass"
  And clicks "Unlock"
  Then Phantom SHALL unlock successfully
  And the connection prompt "Connect to Solana SWAP?" SHALL appear
  When the user clicks "Connect"
  Then the web UI SHALL connect successfully
  And display the public key and balance
```

---

### Exception 4: Network Mismatch

```gherkin
Scenario: Phantom wallet is on different network
  Given the web UI is configured for Solana devnet
  And the user has Phantom wallet installed and unlocked
  And Phantom wallet is configured for mainnet-beta
  When the user clicks "Connect Wallet" button
  And the user approves the connection in Phantom popup
  Then the web UI SHALL detect the network mismatch
  And the web UI SHALL display an error modal:
    """
    Network Mismatch

    This application requires Solana Devnet.
    Your wallet is connected to Mainnet Beta.

    Please switch your wallet network to Devnet and try again.

    [OK]
    """
  And the connection SHALL be established but flagged as incompatible
  And all transaction buttons SHALL be disabled
  And a persistent warning banner SHALL display: "⚠️ Wrong network - switch to Devnet"
```

---

### Exception 5: Connection Timeout

```gherkin
Scenario: Phantom extension does not respond in time
  Given the user has Phantom wallet installed
  And the Phantom extension is experiencing performance issues
  When the user clicks "Connect Wallet" button
  And 10 seconds elapse without Phantom popup appearing
  Then the web UI SHALL timeout the connection attempt
  And the web UI SHALL display an error toast:
    """
    Connection timeout

    Phantom wallet did not respond. Please check:
    - Phantom extension is enabled
    - Browser is not blocking popups
    - Try refreshing the page
    """
  And the web UI SHALL log the timeout to browser console
  And the connection state SHALL remain disconnected
  And the user SHALL be able to retry
```

---

### Exception 6: Popup Blocker Interference

```gherkin
Scenario: Browser blocks Phantom popup
  Given the user's browser has popup blocker enabled
  And the user has Phantom wallet installed
  When the user clicks "Connect Wallet" button
  Then the browser popup blocker MAY prevent Phantom popup from appearing
  And the web UI SHALL detect the blocked popup within 2 seconds
  And the web UI SHALL display an info banner:
    """
    Popup Blocked

    Your browser blocked the wallet connection popup.
    Click the address bar icon to allow popups for this site.

    [Retry Connection]
    """
  When the user allows popups for "localhost:3000"
  And clicks "Retry Connection"
  Then the Phantom popup SHALL appear successfully
  And the connection flow SHALL proceed normally
```

---

### Exception 7: Stale Connection Session

```gherkin
Scenario: Connection session expires during use
  Given the user connected Phantom wallet 24 hours ago
  And the session token is now expired
  And the user is viewing the "Swap" page
  When the user attempts to execute a swap transaction
  Then the web UI SHALL detect the stale session
  And the web UI SHALL automatically disconnect the wallet
  And the web UI SHALL display a modal:
    """
    Session Expired

    Your wallet connection has expired for security.
    Please reconnect to continue.

    [Reconnect Wallet]
    """
  When the user clicks "Reconnect Wallet"
  Then the Phantom connection flow SHALL restart
  And the user SHALL re-authorize the connection
  And the user SHALL be returned to the "Swap" page upon successful reconnection
```

---

### Exception 8: Multiple Wallets Detected

```gherkin
Scenario: User has multiple Solana wallet extensions installed
  Given the user has both Phantom and Solflare extensions installed
  And both are enabled in the browser
  When the user clicks "Connect Wallet" button
  Then the web UI SHALL detect multiple wallet providers
  And the web UI SHALL display a wallet selection modal:
    """
    Select Wallet

    [Phantom]  [Solflare]  [Cancel]
    """
  When the user clicks "Phantom"
  Then the Phantom-specific connection flow SHALL proceed
  And the web UI SHALL remember the selection in localStorage
  And future connection attempts SHALL default to Phantom
  And the user SHALL see a "Change Wallet" option in settings
```

---

### Exception 9: RPC Connection Failure After Wallet Connection

```gherkin
Scenario: Solana RPC endpoint is unreachable
  Given the user successfully connected Phantom wallet
  And the web UI attempts to fetch on-chain data (SOL balance, market info)
  And the configured RPC endpoint "https://api.devnet.solana.com" is down
  When the RPC request times out after 5 seconds
  Then the web UI SHALL display an error banner:
    """
    ⚠️ Network Issue

    Connected to wallet but unable to fetch blockchain data.
    RPC endpoint may be unavailable. Some features may not work.
    """
  And the web UI SHALL retry the RPC connection every 30 seconds
  And the wallet connection status SHALL remain "Connected"
  And the public key SHALL still be displayed
  And the SOL balance SHALL show "-- SOL" (unavailable)
  And transaction buttons SHALL be disabled until RPC reconnects
```

---

## Business Rules

- **BR-040**: Wallet connection is session-based, expires after 24 hours of inactivity
- **BR-041**: Only Phantom wallet is supported in MVP (other wallets: future enhancement)
- **BR-042**: Connection requires explicit user approval (no silent auto-connect on first visit)
- **BR-043**: Public keys are displayed truncated (first 6 + last 4 chars) for readability
- **BR-044**: SOL balance is fetched on connection and updated every 10 seconds while connected
- **BR-045**: Network selection (devnet/mainnet) is application-level, not user-selectable in UI
- **BR-046**: All transactions require wallet connection + signature approval
- **BR-047**: Connection state persists in localStorage under key `walletConnection`

---

## Acceptance Criteria (from REQ-F-016)

✅ **Given** a user opens the web UI
✅ **When** the user clicks "Connect Wallet"
✅ **Then** the UI SHALL prompt the user to connect via Phantom wallet

✅ **And** **IF** Phantom is installed
✅ **Then** the UI SHALL establish a connection and display the user's public key

✅ **And** **IF** Phantom is not installed
✅ **Then** the UI SHALL display a message with a link to install Phantom

---

## Traceability

| Requirement | Scenario Coverage |
|-------------|-------------------|
| REQ-F-016 (Wallet Connection) | Scenarios 1-4, Exceptions 1-9 |
| REQ-F-012 (UI for Market Init) | Scenario 1 (enables navigation) |
| REQ-F-013 (UI for Add Liquidity) | Scenario 1 (enables navigation) |
| REQ-F-014 (UI for Set Price) | Scenario 1 (enables navigation) |
| REQ-F-015 (UI for Swaps) | Scenario 1 (enables navigation) |

---

**Test Implementation Notes:**

- Use Playwright or Cypress for E2E testing with Phantom mock
- Mock `window.solana` object for unit tests
- Test wallet adapter library: `@solana/wallet-adapter-react`
- Phantom test wallet: Use devnet keypair for CI/CD
- Network selection: Use environment variable `REACT_APP_SOLANA_NETWORK`

---

**Version:** 1.0
**Last Updated:** 2026-03-22
**Author:** Specifications Engineer (SDD Pipeline)
