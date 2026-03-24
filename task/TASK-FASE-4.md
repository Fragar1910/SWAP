# Tasks: FASE-4 - Frontend Application (React UI)

> **Input:** plan/fases/FASE-4.md
> **Generated:** 2026-03-24
> **Total tasks:** 20
> **Parallel capacity:** 4 concurrent streams
> **Critical path:** 8 tasks, ~4 hours

---

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 20 |
| Parallelizable | 12 (60%) |
| Setup phase | 3 tasks |
| Foundation phase | 3 tasks |
| UI Components phase | 8 tasks |
| Integration phase | 3 tasks |
| Test phase | 2 tasks |
| Verification phase | 1 task |
| Estimated effort | 10 hours |

## Traceability

| Spec Reference | Task Coverage |
|---------------|---------------|
| UI-001 | TASK-F4-006 through F4-011 |
| UI-002 | TASK-F4-012 through F4-017 |
| UC-006 | TASK-F4-002, TASK-F4-018 |
| REQ-F-012 | TASK-F4-007 |
| REQ-F-013 | TASK-F4-008 |
| REQ-F-014 | TASK-F4-009 |
| REQ-F-015 | TASK-F4-013 |
| REQ-F-016 | TASK-F4-014 |
| REQ-C-007 | TASK-F4-003, TASK-F4-004 |
| ADR-001 | TASK-F4-004 (Anchor integration) |

---

## Phase 1: Setup (Project Scaffolding)

**Purpose:** Initialize React project with TypeScript and install dependencies.
**Checkpoint:** Project builds and runs successfully.

- [ ] TASK-F4-001 Create React TypeScript project | `app/`
  - **Commit:** `chore(frontend): initialize React TypeScript project`
  - **Acceptance:**
    - Command executed: `npx create-react-app app --template typescript`
    - Directory created: `app/` in project root
    - React app runs successfully: `npm start` (port 3000)
    - TypeScript configuration present: `app/tsconfig.json`
    - Default App.tsx renders without errors
  - **Refs:** FASE-4, REQ-C-007
  - **Revert:** SAFE | Delete `app/` directory
  - **Review:**
    - [ ] App runs on http://localhost:3000
    - [ ] TypeScript compilation works
    - [ ] No console errors

- [ ] TASK-F4-002 Install Solana and wallet dependencies | `app/package.json`
  - **Commit:** `chore(frontend): add Solana, Anchor, and wallet adapter dependencies`
  - **Acceptance:**
    - Updated file: `app/package.json`
    - Dependencies added:
      - `@coral-xyz/anchor: ^0.31.0` (Anchor TypeScript client)
      - `@solana/wallet-adapter-base: ^0.9.23`
      - `@solana/wallet-adapter-react: ^0.15.35`
      - `@solana/wallet-adapter-react-ui: ^0.9.35`
      - `@solana/wallet-adapter-wallets: ^0.19.32`
      - `@solana/web3.js: ^1.95.0`
      - `@solana/spl-token: ^0.4.8`
      - `react-router-dom: ^6.20.0`
    - Command executed: `npm install` (installs all dependencies)
    - `node_modules/` populated
  - **Refs:** FASE-4, UC-006, REQ-C-007
  - **Blocked-by:** TASK-F4-001
  - **Revert:** SAFE | Revert package.json, delete node_modules
  - **Review:**
    - [ ] All dependencies installed without errors
    - [ ] `npm start` still works after install
    - [ ] No version conflicts in package-lock.json

- [ ] TASK-F4-003 Copy program IDL to frontend | `app/src/idl/swap_program.json`
  - **Commit:** `chore(frontend): add program IDL for TypeScript client`
  - **Acceptance:**
    - Directory created: `app/src/idl/`
    - File created: `app/src/idl/swap_program.json`
    - Content: Copy of `target/idl/swap_program.json` from Anchor build
    - IDL contains:
      - `address` field (program ID)
      - 4 instructions: `initialize_market`, `set_price`, `add_liquidity`, `swap`
      - 1 account: `MarketAccount`
      - 8 errors, 4 events
    - TypeScript can import: `import idl from '../idl/swap_program.json';`
  - **Refs:** FASE-4, REQ-C-007, ADR-001
  - **Blocked-by:** TASK-F3-011 (program must be built with IDL generated)
  - **Revert:** SAFE | Delete `app/src/idl/` directory
  - **Review:**
    - [ ] IDL file is valid JSON
    - [ ] Program ID matches deployed program
    - [ ] All 4 instructions present in IDL

---

## Phase 2: Foundation (Context Providers)

**Purpose:** Setup Anchor program provider and wallet integration.
**Checkpoint:** Wallet connection functional, program client available.

- [ ] TASK-F4-004 Create AnchorContext provider | `app/src/contexts/AnchorContext.tsx`
  - **Commit:** `feat(frontend): add Anchor program context provider`
  - **Acceptance:**
    - File created: `app/src/contexts/AnchorContext.tsx`
    - Imports: `AnchorProvider`, `Program`, `Idl` from `@coral-xyz/anchor`
    - Imports: `useAnchorWallet` from `@solana/wallet-adapter-react`
    - Context: `AnchorContext` with `{ program: Program | null, connection: Connection }`
    - Provider component: `AnchorProviderComponent` wrapping children
    - Hook: `useAnchor()` returns `{ program, connection }`
    - Constants: `PROGRAM_ID` (from IDL), `NETWORK = 'http://127.0.0.1:8899'` (localnet)
    - Program instantiated when wallet connected
    - Connection created with `'confirmed'` commitment
  - **Refs:** FASE-4, REQ-C-007, ADR-001
  - **Blocked-by:** TASK-F4-003
  - **Revert:** SAFE | Delete file
  - **Review:**
    - [ ] Context created with correct TypeScript types
    - [ ] Program initialized only when wallet connected
    - [ ] Network configurable (localnet/devnet/mainnet)

- [ ] TASK-F4-005 Setup App.tsx with wallet and routing providers | `app/src/App.tsx`
  - **Commit:** `feat(frontend): setup wallet providers and routing`
  - **Acceptance:**
    - Updated file: `app/src/App.tsx`
    - Imports: `ConnectionProvider`, `WalletProvider` from `@solana/wallet-adapter-react`
    - Imports: `PhantomWalletAdapter`, `SolflareWalletAdapter` from `@solana/wallet-adapter-wallets`
    - Imports: `WalletModalProvider` from `@solana/wallet-adapter-react-ui`
    - Imports: `BrowserRouter`, `Routes`, `Route`, `Link` from `react-router-dom`
    - Imports wallet adapter CSS: `require('@solana/wallet-adapter-react-ui/styles.css')`
    - Wallet adapters: Phantom, Solflare
    - Endpoint: `http://127.0.0.1:8899` (localnet)
    - Routes: `/admin` (AdminDashboard), `/swap` (SwapInterface), `/` (SwapInterface default)
    - Navigation bar with links to Admin and Swap
    - Provider hierarchy: ConnectionProvider → WalletProvider → WalletModalProvider → AnchorProviderComponent → Router
    - `autoConnect` enabled
  - **Refs:** FASE-4, UC-006
  - **Blocked-by:** TASK-F4-004
  - **Revert:** SAFE | Revert to default App.tsx
  - **Review:**
    - [ ] Wallet modal opens when clicking connect button
    - [ ] Routes navigate correctly
    - [ ] Navigation bar displays on all pages
    - [ ] Phantom and Solflare wallets listed in modal

- [ ] TASK-F4-006 [P] Create basic CSS styling | `app/src/App.css`
  - **Commit:** `style(frontend): add base CSS for layout and forms`
  - **Acceptance:**
    - Updated file: `app/src/App.css`
    - Styles for: `body`, `nav`, `nav a`, `.admin-dashboard`, `.swap-interface`
    - Styles for: `.section`, `h1`, `h2`, `input`, `select`, `button`
    - Styles for: `.status`, `.output`, `.wallet-adapter-button`
    - Color scheme: Professional (white backgrounds, green buttons, blue status)
    - Layout: Centered content (max-width 600px)
    - Forms: Full-width inputs with padding and borders
    - Responsive: Works on desktop and mobile
  - **Refs:** FASE-4
  - **Blocked-by:** None (can be done in parallel)
  - **Revert:** SAFE | Delete CSS rules
  - **Review:**
    - [ ] Forms visually appealing
    - [ ] Buttons have hover effects
    - [ ] Status messages clearly visible
    - [ ] Navigation bar styled correctly

---

## Phase 3: UI Components (Admin Dashboard)

**Purpose:** Implement administrator dashboard with 3 management forms.
**Checkpoint:** Admin can initialize markets, set prices, add liquidity.

- [ ] TASK-F4-007 [P] Create AdminDashboard component scaffold | `app/src/pages/AdminDashboard.tsx`
  - **Commit:** `feat(admin): create administrator dashboard scaffold`
  - **Acceptance:**
    - Directory created: `app/src/pages/`
    - File created: `app/src/pages/AdminDashboard.tsx`
    - Component: `AdminDashboard` functional component
    - Hooks: `useAnchor()`, `useWallet()`
    - State variables: `tokenMintA`, `tokenMintB`, `price`, `amountA`, `amountB`, `status`
    - Renders: Title "Administrator Dashboard", `<WalletMultiButton />`
    - Renders: 3 sections (placeholders): Initialize Market, Set Exchange Rate, Add Liquidity
    - Renders: Status display area
    - Export: `export default AdminDashboard`
  - **Refs:** FASE-4, UI-001, REQ-F-012, REQ-F-013, REQ-F-014
  - **Blocked-by:** None (can be done in parallel)
  - **Revert:** SAFE | Delete file
  - **Review:**
    - [ ] Component renders without errors
    - [ ] WalletMultiButton displays
    - [ ] State management working

- [ ] TASK-F4-008 [P] Implement Initialize Market form handler | `app/src/pages/AdminDashboard.tsx`
  - **Commit:** `feat(admin): implement initialize market instruction handler`
  - **Acceptance:**
    - Function: `handleInitializeMarket` async function
    - Validation: Wallet connected check
    - PDA derivation:
      - `marketPDA = findProgramAddressSync([MARKET_SEED, mintA, mintB])`
      - `vaultA = findProgramAddressSync([VAULT_A_SEED, marketPDA])`
      - `vaultB = findProgramAddressSync([VAULT_B_SEED, marketPDA])`
    - Instruction call: `program.methods.initializeMarket().accounts({...}).rpc()`
    - Status updates: Loading ("⏳ Initializing..."), success ("✅ Market initialized!"), error ("❌ Error: ...")
    - Form inputs: 2 text inputs for Token A and B mint addresses
    - Button: "Initialize Market" calls handler
  - **Refs:** FASE-4, UI-001, REQ-F-012, UC-001
  - **Blocked-by:** TASK-F4-007
  - **Revert:** SAFE | Delete handler function and form
  - **Review:**
    - [ ] PDA derivation matches on-chain seeds (MARKET_SEED, VAULT_A_SEED, VAULT_B_SEED)
    - [ ] Transaction succeeds with valid mints
    - [ ] Error handling displays user-friendly messages
    - [ ] Status updates in real-time

- [ ] TASK-F4-009 [P] Implement Set Price form handler | `app/src/pages/AdminDashboard.tsx`
  - **Commit:** `feat(admin): implement set price instruction handler`
  - **Acceptance:**
    - Function: `handleSetPrice` async function
    - Wallet check: Same as initialize
    - PDA derivation: `marketPDA` from token mints
    - Price conversion: Human-readable (e.g., 2.0) → u64 (2_000_000) via `Math.floor(parseFloat(price) * 1_000_000)`
    - Instruction call: `program.methods.setPrice(new BN(priceU64)).accounts({...}).rpc()`
    - Status updates: Loading, success, error
    - Form inputs: Number input for price (step="0.01")
    - Button: "Set Price" calls handler
  - **Refs:** FASE-4, UI-001, REQ-F-013, UC-002
  - **Blocked-by:** TASK-F4-007
  - **Revert:** SAFE | Delete handler function and form
  - **Review:**
    - [ ] Price conversion matches PRICE_PRECISION (6 decimals)
    - [ ] Authority check implicit (wallet signer)
    - [ ] Transaction succeeds with valid price
    - [ ] Status displays new price in human-readable form

- [ ] TASK-F4-010 [P] Implement Add Liquidity form handler | `app/src/pages/AdminDashboard.tsx`
  - **Commit:** `feat(admin): implement add liquidity instruction handler`
  - **Acceptance:**
    - Function: `handleAddLiquidity` async function
    - Wallet check: Same as previous handlers
    - Mint info retrieval: `getMint(connection, mintA)` to get decimals
    - Amount conversion: Human-readable → base units via `Math.floor(parseFloat(amountA) * Math.pow(10, mintAInfo.decimals))`
    - PDA derivation: `marketPDA`, `vaultA`, `vaultB`
    - Authority token accounts: `getAssociatedTokenAddress(mintA, wallet.publicKey)`
    - Instruction call: `program.methods.addLiquidity(new BN(amountAU64), new BN(amountBU64)).accounts({...}).rpc()`
    - Status updates: Loading, success, error
    - Form inputs: 2 number inputs for Token A and B amounts
    - Button: "Add Liquidity" calls handler
  - **Refs:** FASE-4, UI-001, REQ-F-014, UC-003
  - **Blocked-by:** TASK-F4-007
  - **Revert:** SAFE | Delete handler function and form
  - **Review:**
    - [ ] Amount conversion uses correct decimal places from mint
    - [ ] Authority token accounts derived correctly
    - [ ] Handles case where authority doesn't have token accounts (error message)
    - [ ] Transaction succeeds with valid amounts

- [ ] TASK-F4-011 Wire AdminDashboard to routing | `app/src/App.tsx`
  - **Commit:** `chore(admin): wire AdminDashboard to /admin route`
  - **Acceptance:**
    - Updated file: `app/src/App.tsx`
    - Import: `import AdminDashboard from './pages/AdminDashboard';`
    - Route added: `<Route path="/admin" element={<AdminDashboard />} />`
    - Navigation link works: Clicking "Admin Dashboard" navigates to `/admin`
    - Component renders in router outlet
  - **Refs:** FASE-4, UI-001
  - **Blocked-by:** TASK-F4-008, TASK-F4-009, TASK-F4-010
  - **Revert:** SAFE | Remove import and route
  - **Review:**
    - [ ] Route navigation works
    - [ ] Component displays correctly
    - [ ] No console errors

---

## Phase 4: UI Components (Swap Interface)

**Purpose:** Implement user swap interface with output preview.
**Checkpoint:** Users can execute swaps with real-time output calculation.

- [ ] TASK-F4-012 [P] Create SwapInterface component scaffold | `app/src/pages/SwapInterface.tsx`
  - **Commit:** `feat(swap): create swap interface scaffold`
  - **Acceptance:**
    - File created: `app/src/pages/SwapInterface.tsx`
    - Component: `SwapInterface` functional component
    - Hooks: `useAnchor()`, `useWallet()`
    - State variables: `tokenMintA`, `tokenMintB`, `inputAmount`, `swapDirection`, `outputAmount`, `status`
    - Renders: Title "Token Swap", `<WalletMultiButton />`
    - Renders: Swap form section (placeholder)
    - Renders: Output preview area
    - Renders: Status display area
    - Export: `export default SwapInterface`
  - **Refs:** FASE-4, UI-002, REQ-F-015
  - **Blocked-by:** None (can be done in parallel)
  - **Revert:** SAFE | Delete file
  - **Review:**
    - [ ] Component renders without errors
    - [ ] State initialized correctly
    - [ ] WalletMultiButton displays

- [ ] TASK-F4-013 [P] Implement swap output calculation (preview) | `app/src/pages/SwapInterface.tsx`
  - **Commit:** `feat(swap): add real-time output amount calculation`
  - **Acceptance:**
    - Function: `handleCalculateOutput` async function
    - Fetch market account: `program.account.marketAccount.fetch(marketPDA)`
    - Fetch mint info: `getMint(connection, mintA)` and `getMint(connection, mintB)` for decimals
    - Input conversion: Human-readable → base units
    - Calculation (A→B): `numerator = inputU64 * market.price * 10^decimals_b`, `denominator = 1_000_000 * 10^decimals_a`, `outputU64 = floor(numerator / denominator)`
    - Calculation (B→A): `numerator = inputU64 * 1_000_000 * 10^decimals_a`, `denominator = market.price * 10^decimals_b`, `outputU64 = floor(numerator / denominator)`
    - Output conversion: Base units → human-readable via `outputU64 / Math.pow(10, decimals)`
    - Updates: `setOutputAmount(outputHuman.toFixed(6))`
    - Triggered: `onChange` and `onBlur` of input amount field
  - **Refs:** FASE-4, UI-002, REQ-F-016, ADR-002 (formula matches on-chain)
  - **Blocked-by:** TASK-F4-012
  - **Revert:** SAFE | Delete calculation function
  - **Review:**
    - [ ] Calculation matches on-chain swap_math formulas exactly
    - [ ] Output updates in real-time as user types
    - [ ] Handles errors (market not found, price=0) gracefully
    - [ ] Decimals handled correctly for both tokens

- [ ] TASK-F4-014 [P] Implement swap execution handler | `app/src/pages/SwapInterface.tsx`
  - **Commit:** `feat(swap): implement swap transaction execution`
  - **Acceptance:**
    - Function: `handleSwap` async function
    - Wallet check: Connected validation
    - Input conversion: Human-readable → base units
    - PDA derivation: `marketPDA`, `vaultA`, `vaultB`
    - User token accounts: `getAssociatedTokenAddress(mintA, wallet.publicKey)`, `getAssociatedTokenAddress(mintB, wallet.publicKey)`
    - Instruction call: `program.methods.swap(new BN(inputU64), swapDirection === 'AtoB').accounts({...}).rpc()`
    - Status updates: Loading ("⏳ Executing swap..."), success ("✅ Swap successful!"), error
    - Post-swap: Clear input amount and output amount
    - Button: "Execute Swap" calls handler
  - **Refs:** FASE-4, UI-002, REQ-F-015, UC-004, UC-005
  - **Blocked-by:** TASK-F4-012
  - **Revert:** SAFE | Delete handler function
  - **Review:**
    - [ ] Swap direction boolean matches instruction: `true` for A→B, `false` for B→A
    - [ ] User token accounts derived correctly
    - [ ] Transaction succeeds with valid input
    - [ ] Error messages user-friendly (insufficient balance, insufficient liquidity)

- [ ] TASK-F4-015 [P] Add swap form UI elements | `app/src/pages/SwapInterface.tsx`
  - **Commit:** `feat(swap): add form inputs and controls`
  - **Acceptance:**
    - Input: Token A mint address (text input)
    - Input: Token B mint address (text input)
    - Select: Swap direction dropdown (`<option value="AtoB">Token A → Token B</option>`, `<option value="BtoA">Token B → Token A</option>`)
    - Input: Input amount (number input, placeholder shows correct token based on direction)
    - Output display: `<div className="output">You will receive: {outputAmount} {outputToken}</div>`
    - Button: "Execute Swap" (calls `handleSwap`)
    - Status: `<div className="status">{status}</div>`
  - **Refs:** FASE-4, UI-002, REQ-F-015, REQ-F-016
  - **Blocked-by:** TASK-F4-013, TASK-F4-014
  - **Revert:** SAFE | Remove form elements
  - **Review:**
    - [ ] Form layout matches AdminDashboard style
    - [ ] Direction select updates input/output labels dynamically
    - [ ] Output preview updates on input change
    - [ ] Button disabled when wallet not connected

- [ ] TASK-F4-016 Wire SwapInterface to routing | `app/src/App.tsx`
  - **Commit:** `chore(swap): wire SwapInterface to / and /swap routes`
  - **Acceptance:**
    - Updated file: `app/src/App.tsx`
    - Import: `import SwapInterface from './pages/SwapInterface';`
    - Routes added:
      - `<Route path="/swap" element={<SwapInterface />} />`
      - `<Route path="/" element={<SwapInterface />} />` (default route)
    - Navigation link works: Clicking "Swap Tokens" navigates to `/swap`
    - Landing page shows SwapInterface by default
  - **Refs:** FASE-4, UI-002
  - **Blocked-by:** TASK-F4-015
  - **Revert:** SAFE | Remove import and routes
  - **Review:**
    - [ ] Both routes render SwapInterface
    - [ ] Default `/` route works
    - [ ] Navigation functional

- [ ] TASK-F4-017 Import App.css in App.tsx | `app/src/App.tsx`
  - **Commit:** `style(frontend): import base CSS styles`
  - **Acceptance:**
    - Updated file: `app/src/App.tsx`
    - Import added at top: `import './App.css';`
    - Styles applied to all components
    - Visual verification: Forms, buttons, navigation styled correctly
  - **Refs:** FASE-4
  - **Blocked-by:** TASK-F4-006
  - **Revert:** SAFE | Remove import
  - **Review:**
    - [ ] Styles applied correctly
    - [ ] No CSS conflicts
    - [ ] Responsive layout works

---

## Phase 5: Integration (Build & Test)

**Purpose:** Verify frontend integrates correctly with deployed program.
**Checkpoint:** End-to-end workflow functional (wallet → admin → swap).

- [ ] TASK-F4-018 Manual integration testing | Documentation
  - **Commit:** `test(frontend): document manual integration test results`
  - **Acceptance:**
    - Test flow documented:
      1. Start program: `anchor localnet` or `solana-test-validator`
      2. Deploy program: `anchor deploy`
      3. Update PROGRAM_ID in `AnchorContext.tsx` with deployed address
      4. Start frontend: `npm start`
      5. Connect Phantom wallet
      6. Navigate to Admin Dashboard
      7. Initialize market with test token mints
      8. Set price (e.g., 2.0)
      9. Add liquidity (e.g., 1000 Token A, 2000 Token B)
      10. Navigate to Swap Interface
      11. Execute A→B swap (100 Token A)
      12. Verify user received 200 Token B
      13. Execute B→A swap (200 Token B)
      14. Verify user received 100 Token A
    - All steps pass without errors
    - Screenshots or logs captured as evidence
    - Known issues documented (if any)
  - **Refs:** FASE-4, UI-001, UI-002, UC-001 through UC-006
  - **Blocked-by:** TASK-F4-016, TASK-F4-017
  - **Revert:** SAFE | N/A (documentation only)
  - **Review:**
    - [ ] All 14 test steps completed successfully
    - [ ] No critical bugs found
    - [ ] User experience smooth

- [ ] TASK-F4-019 [P] Error handling and edge case validation | `app/src/pages/*.tsx`
  - **Commit:** `fix(frontend): improve error handling for edge cases`
  - **Acceptance:**
    - Error case: Wallet not connected → Display "❌ Connect wallet first"
    - Error case: Invalid mint address → Display "❌ Invalid mint address"
    - Error case: Transaction failed → Display transaction error message
    - Error case: Insufficient balance → Display "❌ Insufficient token balance"
    - Error case: Insufficient liquidity → Display "❌ Insufficient liquidity in vault"
    - Error case: Price not set → Display "❌ Price not set for this market"
    - Loading states: Disable buttons during transaction execution
    - Success states: Clear form inputs after successful transaction
  - **Refs:** FASE-4, REQ-NF-008 (error handling)
  - **Blocked-by:** TASK-F4-018
  - **Revert:** SAFE | Revert error handling improvements
  - **Review:**
    - [ ] All error cases tested
    - [ ] User-friendly error messages
    - [ ] No generic "Transaction failed" messages (specific errors shown)
    - [ ] Buttons disabled during loading

---

## Phase 6: Verification (Final Validation)

**Purpose:** Verify all FASE-4 acceptance criteria met.
**Checkpoint:** Frontend production-ready.

- [ ] TASK-F4-020 Verify all FASE-4 acceptance criteria | Documentation
  - **Commit:** `docs(frontend): verify FASE-4 completion checklist`
  - **Acceptance:**
    - Checklist from FASE-4.md marked as complete:
      - [x] `npm start` launches UI successfully
      - [x] Wallet connection works (Phantom, Solflare)
      - [x] Admin dashboard displays all 3 forms
      - [x] Initialize market creates PDAs correctly
      - [x] Set price updates market on-chain
      - [x] Add liquidity transfers tokens to vaults
      - [x] Swap interface calculates output amounts correctly
      - [x] Swap execution transfers tokens atomically
      - [x] Error messages display for failed transactions
      - [x] UI updates after successful transactions
    - Production build tested: `npm run build` succeeds
    - Build output: `app/build/` directory created
    - Deployment instructions documented in FASE-4.md
  - **Refs:** FASE-4
  - **Blocked-by:** TASK-F4-019
  - **Revert:** SAFE | N/A (documentation only)
  - **Review:**
    - [ ] All 10 criteria verified
    - [ ] Production build successful
    - [ ] Deployment instructions clear

---

## Dependencies

### Task Dependency Graph

```
Setup Phase:
TASK-F4-001 (create React app)
    ↓
TASK-F4-002 (install deps)
    ↓
TASK-F4-003 (copy IDL)
    ↓
Foundation Phase:
TASK-F4-004 (AnchorContext)
    ↓
TASK-F4-005 (App.tsx setup)
    ↓
┌───────────────┬───────────────┐
│               │               │
UI Components:  Styling:
F4-006 [P]      F4-007 [P]      (can run in parallel)
(CSS)           (AdminDashboard scaffold)
                    ↓
    ┌───────────────┼───────────────┐
    │               │               │
F4-008 [P]      F4-009 [P]      F4-010 [P]
(Init Market)   (Set Price)     (Add Liq)
    │               │               │
    └───────────────┴───────────────┘
                    ↓
                F4-011 (wire admin route)

                F4-012 [P] (SwapInterface scaffold)
                    ↓
    ┌───────────────┼───────────────┐
    │               │               │
F4-013 [P]      F4-014 [P]
(calc output)   (swap exec)
    │               │
    └───────────────┴───────────────┘
                    ↓
                F4-015 [P] (form UI)
                    ↓
                F4-016 (wire swap route)

                F4-017 (import CSS)
                    ↓
Integration Phase:
                F4-018 (integration test)
                    ↓
                F4-019 [P] (error handling)
                    ↓
Verification Phase:
                F4-020 (completion check)
```

### Critical Path

```
TASK-F4-001 → F4-002 → F4-003 → F4-004 → F4-005 → F4-007 → F4-008 → F4-011 → F4-018 → F4-020
Total: 10 tasks, ~4 hours
```

### Parallel Execution Plan

**Wave 1 (after F4-005):**
- TASK-F4-006 (CSS)
- TASK-F4-007 (AdminDashboard scaffold)
- TASK-F4-012 (SwapInterface scaffold)
**Duration:** 30 min (parallelized from 90 min)

**Wave 2 (after F4-007):**
- TASK-F4-008 (Initialize Market handler)
- TASK-F4-009 (Set Price handler)
- TASK-F4-010 (Add Liquidity handler)
**Duration:** 40 min (parallelized from 120 min)

**Wave 3 (after F4-012):**
- TASK-F4-013 (Calculate output)
- TASK-F4-014 (Swap execution)
**Duration:** 30 min (parallelized from 60 min)

**Wave 4 (after F4-018):**
- TASK-F4-019 (Error handling)
**Duration:** 60 min

**Total with parallelization:** ~4 hours (critical path) vs. 10 hours (sequential)

---

## Cross-FASE Dependencies

| From | To | Reason |
|------|----|--------|
| TASK-F3-011 | TASK-F4-003 | Requires generated IDL from program build |
| TASK-F2-011 | TASK-F4-018 | Requires deployed program for integration testing |

---

## Notes

- **CRITICAL:** Update `PROGRAM_ID` in `AnchorContext.tsx` after deploying program to localnet/devnet
- **Network Configuration:** Change `NETWORK` constant for different environments (localnet → devnet → mainnet-beta)
- **Wallet Support:** Currently supports Phantom and Solflare. Add more wallets by importing from `@solana/wallet-adapter-wallets`
- **Production Deployment:** Use Vercel or Netlify for frontend hosting. Environment variables needed: `REACT_APP_PROGRAM_ID`, `REACT_APP_RPC_ENDPOINT`
- **Testing:** This FASE focuses on manual integration testing. Automated frontend tests (Jest, React Testing Library) can be added in FASE-5
- **Styling:** Basic CSS provided. Can be enhanced with UI frameworks (Chakra UI, Material-UI, Tailwind CSS) in future iterations

---

**Generated by:** task-generator skill
**Source:** plan/fases/FASE-4.md
**Critical Path:** 4 hours (10 sequential tasks)
**Parallelization Opportunity:** 6 hours saved with 4 concurrent workers
