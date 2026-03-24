# Architecture Design - Solana SWAP DEX

> **Generated:** 2026-03-23
> **Phase:** Plan-Architect - Phase 4 (Architecture Design)
> **Methodology:** C4 Model (Context, Container, Component, Code)
> **Status:** Complete

---

## Purpose

This document provides the complete architectural blueprint for the Solana SWAP fixed-price DEX. It uses the C4 model to visualize the system at multiple levels of abstraction, from high-level context to implementation details.

**Audience:**
- Developers implementing the system (FASE-0 through FASE-5)
- Technical reviewers validating design decisions
- Future maintainers understanding system structure

---

## Table of Contents

1. [C4 Level 1: System Context](#c4-level-1-system-context)
2. [C4 Level 2: Container View](#c4-level-2-container-view)
3. [C4 Level 3: Component View (Solana Program)](#c4-level-3-component-view-solana-program)
4. [C4 Level 3: Component View (Web UI)](#c4-level-3-component-view-web-ui)
5. [Deployment View](#deployment-view)
6. [Physical Data Model](#physical-data-model)
7. [Technology Stack](#technology-stack)
8. [Cross-Cutting Concerns](#cross-cutting-concerns)

---

## C4 Level 1: System Context

### Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                         External Systems                            │
│                                                                      │
│   ┌──────────────┐              ┌──────────────┐                   │
│   │   SPL Token  │              │   Solana     │                   │
│   │   Program    │              │  Blockchain  │                   │
│   │              │              │  (Validator  │                   │
│   │ (Mint, ATA)  │              │   Network)   │                   │
│   └──────┬───────┘              └───────┬──────┘                   │
│          │                              │                           │
└──────────┼──────────────────────────────┼───────────────────────────┘
           │                              │
           │                              │
           │        ┌──────────────────────────────────┐
           │        │                                  │
           └───────►│   Solana SWAP DEX System        │
                    │                                  │
                    │   • Initialize Markets           │
                    │   • Set Exchange Rates           │
                    │   • Add Liquidity                │
                    │   • Execute Token Swaps          │
                    │                                  │
                    └──────┬──────────────┬────────────┘
                           │              │
                           │              │
         ┌─────────────────┴──┐     ┌────┴─────────────────┐
         │                    │     │                      │
    ┌────▼─────┐         ┌───▼────┐│                 ┌────▼─────┐
    │ Admin    │         │  User  ││                 │ Phantom  │
    │          │         │        ││                 │ Wallet   │
    │ • Creates│         │ • Swaps││                 │          │
    │   markets│         │   tokens│                 │ (Browser │
    │ • Sets   │         │        ││                 │Extension)│
    │   prices │         │        ││                 │          │
    │ • Adds   │         │        ││                 └──────────┘
    │   liqui  │         │        ││
    └──────────┘         └────────┘│
                                    │
                         External Actors
```

### Key Relationships

| Actor/System | Relationship | Description |
|--------------|--------------|-------------|
| **Administrator** | Uses | Creates markets, sets exchange rates, provides liquidity |
| **User** | Uses | Executes token swaps at published rates |
| **Phantom Wallet** | Authenticates | Browser extension providing wallet connectivity |
| **Solana Blockchain** | Hosts | Executes smart contract transactions, stores state |
| **SPL Token Program** | Depends On | Manages token mints, transfers, account creation |

### System Scope

**In Scope:**
- Fixed-price token swaps (A↔B bidirectional)
- Market creation and liquidity management
- PDA-based vault security
- Event emission for auditability

**Out of Scope (MVP):**
- Automated Market Maker (AMM) curves
- Liquidity provider (LP) tokens
- Fee collection mechanisms
- Oracle-based dynamic pricing
- Multi-signature authority
- Swap history UI / event indexing

---

## C4 Level 2: Container View

### Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Solana SWAP DEX System                                │
│                                                                               │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                      Web Browser                                      │  │
│   │                                                                        │  │
│   │   ┌────────────────────────────────────────────────────────────┐    │  │
│   │   │  React Web Application (SPA)                               │    │  │
│   │   │  Technology: React 18 + TypeScript + Chakra UI             │    │  │
│   │   │                                                              │    │  │
│   │   │  Components:                                                 │    │  │
│   │   │  • Administrator Dashboard (Create markets, set prices)      │    │  │
│   │   │  • Swap Interface (User swaps)                               │    │  │
│   │   │  • Wallet Connection (Solana Wallet Adapter)                 │    │  │
│   │   │                                                              │    │  │
│   │   │  State Management: Zustand                                   │    │  │
│   │   └────────┬─────────────────────────────────────────────────────┘    │  │
│   │            │                                                            │  │
│   │            │ RPC calls (JSON-RPC over HTTPS/WSS)                      │  │
│   │            │ • getAccountInfo                                          │  │
│   │            │ • sendTransaction                                          │  │
│   │            │ • getProgramAccounts                                       │  │
│   │            ▼                                                            │  │
│   └────────────┼─────────────────────────────────────────────────────────┘  │
│                │                                                              │
│                │                                                              │
│   ┌────────────┼─────────────────────────────────────────────────────────┐  │
│   │            ▼                                                          │  │
│   │   ┌──────────────────────────────────────────────────────────────┐  │  │
│   │   │  Solana RPC Node (Helius / Public)                           │  │  │
│   │   │  Technology: Solana Validator + RPC API                      │  │  │
│   │   │                                                              │  │  │
│   │   │  • Receives transactions from clients                        │  │  │
│   │   │  • Routes to Solana validators                               │  │  │
│   │   │  • Provides account data queries                             │  │  │
│   │   │  • WebSocket subscriptions for events                        │  │  │
│   │   └────────┬─────────────────────────────────────────────────────┘  │  │
│   │            │                                                          │  │
│   └────────────┼──────────────────────────────────────────────────────────┘  │
│                │                                                              │
│   ┌────────────┼──────────────────────────────────────────────────────────┐  │
│   │            ▼                                                          │  │
│   │   ┌──────────────────────────────────────────────────────────────┐  │  │
│   │   │  Solana Blockchain (Devnet / Mainnet)                        │  │  │
│   │   │  Technology: Solana Validator Network                        │  │  │
│   │   │                                                              │  │  │
│   │   │  ┌───────────────────────────────────────────────────────┐  │  │  │
│   │   │  │  SWAP Program (Smart Contract)                        │  │  │  │
│   │   │  │  Language: Rust + Anchor Framework 0.31.0             │  │  │  │
│   │   │  │  Program ID: SwapProgramXXXXXXXXXXXXXXX...            │  │  │  │
│   │   │  │                                                        │  │  │  │
│   │   │  │  Instructions:                                         │  │  │  │
│   │   │  │  • initialize_market (create trading pair)            │  │  │  │
│   │   │  │  • set_price (update exchange rate)                   │  │  │  │
│   │   │  │  • add_liquidity (fund vaults)                        │  │  │  │
│   │   │  │  • swap (exchange tokens)                             │  │  │  │
│   │   │  │                                                        │  │  │  │
│   │   │  │  Accounts (PDAs):                                     │  │  │  │
│   │   │  │  • MarketAccount (market metadata)                    │  │  │  │
│   │   │  │  • VaultA, VaultB (token liquidity)                   │  │  │  │
│   │   │  └────────┬───────────────────────────────────────────────┘  │  │  │
│   │   │           │ Calls (CPI)                                      │  │  │
│   │   │           ▼                                                   │  │  │
│   │   │  ┌───────────────────────────────────────────────────────┐  │  │  │
│   │   │  │  SPL Token Program (External)                         │  │  │  │
│   │   │  │  Program ID: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA│  │  │  │
│   │   │  │                                                        │  │  │  │
│   │   │  │  • Token transfers (user ↔ vaults)                    │  │  │  │
│   │   │  │  • Mint metadata reads                                │  │  │  │
│   │   │  │  • Token account initialization                       │  │  │  │
│   │   │  └───────────────────────────────────────────────────────┘  │  │  │
│   │   └──────────────────────────────────────────────────────────────┘  │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Container Responsibilities

#### 1. React Web Application (Frontend)
**Technology:** React 18, TypeScript, Chakra UI, Zustand, Solana Wallet Adapter

**Responsibilities:**
- Render user interface for administrators and users
- Connect to Solana wallets (Phantom, Solflare)
- Build and submit transactions to RPC node
- Display account data (balances, market info)
- Handle user input validation
- Provide real-time feedback (transaction confirmations, errors)

**Key Dependencies:**
- Solana RPC Node (for queries and transaction submission)
- Wallet extensions (for transaction signing)

**Data Storage:** Browser localStorage (wallet connection state, preferences)

---

#### 2. Solana RPC Node
**Technology:** Solana Validator + RPC API (Helius / Public endpoint)

**Responsibilities:**
- Accept client RPC requests (getAccountInfo, sendTransaction, etc.)
- Forward transactions to validator network
- Provide account data queries
- WebSocket subscriptions for real-time updates

**Key Dependencies:**
- Solana Blockchain (validator network)

**Data Storage:** None (stateless gateway to blockchain)

---

#### 3. SWAP Program (Smart Contract)
**Technology:** Rust, Anchor Framework 0.31.0

**Responsibilities:**
- **initialize_market**: Create trading pair, initialize vaults
- **set_price**: Update exchange rate (authority-only)
- **add_liquidity**: Transfer tokens to vaults (authority-only)
- **swap**: Execute token exchanges (permissionless)
- Emit events for auditability
- Enforce business rules and invariants

**Key Dependencies:**
- SPL Token Program (for token transfers via CPI)

**Data Storage:** On-chain accounts (MarketAccount, TokenAccounts)

---

#### 4. SPL Token Program (External)
**Technology:** Rust, SPL Token standard

**Responsibilities:**
- Manage token mints and supplies
- Execute token transfers
- Create Associated Token Accounts (ATAs)
- Validate token account ownership

**Data Storage:** On-chain token accounts and mint metadata

---

## C4 Level 3: Component View (Solana Program)

### Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                    SWAP Program (Anchor)                                │
│  Program ID: SwapProgramXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX             │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐ │
│   │  Instructions (Entry Points)                                      │ │
│   │                                                                    │ │
│   │  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐   │ │
│   │  │ initialize      │  │ set_price    │  │ add_liquidity    │   │ │
│   │  │ _market         │  │              │  │                  │   │ │
│   │  │                 │  │ (Admin only) │  │ (Admin only)     │   │ │
│   │  │ • Creates PDA   │  │ • Updates    │  │ • Transfers      │   │ │
│   │  │   market        │  │   market.    │  │   tokens to      │   │ │
│   │  │ • Initializes   │  │   price      │  │   vaults         │   │ │
│   │  │   vault_a,      │  │ • Emits      │  │ • Emits          │   │ │
│   │  │   vault_b       │  │   PriceSet   │  │   LiquidityAdded │   │ │
│   │  │ • Emits         │  │   event      │  │   event          │   │ │
│   │  │   MarketInit    │  └──────┬───────┘  └──────────────────┘   │ │
│   │  │   event         │         │                                  │ │
│   │  └─────────────────┘         │                                  │ │
│   │                               │                                  │ │
│   │  ┌────────────────────────────┼──────────────────────────────┐ │ │
│   │  │ swap                       │                              │ │ │
│   │  │                            ▼                              │ │ │
│   │  │ (Permissionless)      Uses market.price                  │ │ │
│   │  │ • Calculates output   for calculation                    │ │ │
│   │  │ • Transfers user→vault                                   │ │ │
│   │  │ • Transfers vault→user (PDA signer)                      │ │ │
│   │  │ • Emits SwapExecuted event                               │ │ │
│   │  └──────────────────────────────────────────────────────────┘ │ │
│   └────────────────┬───────────────────────────────────────────────┘ │
│                    │                                                  │
│   ┌────────────────▼───────────────────────────────────────────────┐ │
│   │  State (Account Structures)                                    │ │
│   │                                                                 │ │
│   │  ┌──────────────────┐       ┌───────────────┐                 │ │
│   │  │ MarketAccount    │       │ VaultA        │                 │ │
│   │  │                  │       │ (TokenAccount)│                 │ │
│   │  │ • authority      │──────►│ PDA: [vault_a,│                 │ │
│   │  │ • token_mint_a   │       │      market]  │                 │ │
│   │  │ • token_mint_b   │       │ • mint: mint_a│                 │ │
│   │  │ • price (u64)    │       │ • authority:  │                 │ │
│   │  │ • decimals_a     │       │   market      │                 │ │
│   │  │ • decimals_b     │       │ • balance     │                 │ │
│   │  │ • bump           │       └───────────────┘                 │ │
│   │  │                  │                                          │ │
│   │  │ PDA: [market,    │       ┌───────────────┐                 │ │
│   │  │      mint_a,     │       │ VaultB        │                 │ │
│   │  │      mint_b]     │──────►│ (TokenAccount)│                 │ │
│   │  └──────────────────┘       │ PDA: [vault_b,│                 │ │
│   │                              │      market]  │                 │ │
│   │                              │ • mint: mint_b│                 │ │
│   │                              │ • authority:  │                 │ │
│   │                              │   market      │                 │ │
│   │                              │ • balance     │                 │ │
│   │                              └───────────────┘                 │ │
│   └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐ │
│   │  Utils (Helper Modules)                                         │ │
│   │                                                                  │ │
│   │  ┌────────────────────────────────────────────────────────────┐│ │
│   │  │ swap_math                                                   ││ │
│   │  │                                                             ││ │
│   │  │ • calculate_a_to_b_output(amount, market) -> u64          ││ │
│   │  │   Formula: (input × price × 10^decimals_b) /              ││ │
│   │  │            (10^6 × 10^decimals_a)                          ││ │
│   │  │                                                             ││ │
│   │  │ • calculate_b_to_a_output(amount, market) -> u64          ││ │
│   │  │   Formula: (input × 10^6 × 10^decimals_a) /               ││ │
│   │  │            (price × 10^decimals_b)                         ││ │
│   │  │                                                             ││ │
│   │  │ Uses: Checked arithmetic (ADR-005)                         ││ │
│   │  └────────────────────────────────────────────────────────────┘│ │
│   └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐ │
│   │  Events (Audit Trail)                                           │ │
│   │                                                                  │ │
│   │  • MarketInitialized (market, mints, authority, timestamp)      │ │
│   │  • PriceSet (market, authority, old_price, new_price, timestamp)│ │
│   │  • LiquidityAdded (market, authority, amounts, balances, ...)   │ │
│   │  • SwapExecuted (market, user, direction, amounts, timestamp)   │ │
│   └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐ │
│   │  Error Codes                                                     │ │
│   │                                                                  │ │
│   │  • 6000: Overflow                                                │ │
│   │  • 6001: DivisionByZero                                          │ │
│   │  • 6002: InvalidAmount                                           │ │
│   │  • 6003: PriceNotSet                                             │ │
│   │  • 6004: InsufficientLiquidity                                   │ │
│   │  • 6005: SameTokenSwapDisallowed                                 │ │
│   │  • 6006: Unauthorized                                            │ │
│   │  • 6007: InvalidDecimals                                         │ │
│   └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐ │
│   │  Constants                                                       │ │
│   │                                                                  │ │
│   │  • MARKET_SEED: b"market"                                        │ │
│   │  • VAULT_A_SEED: b"vault_a"                                      │ │
│   │  • VAULT_B_SEED: b"vault_b"                                      │ │
│   │  • PRICE_PRECISION: 1_000_000 (10^6)                             │ │
│   │  • MAX_DECIMALS: 18                                              │ │
│   └─────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Interactions

**Instruction Flow (swap A→B example):**
1. Client calls `swap(amount=100, swap_a_to_b=true)`
2. Anchor deserializes accounts (market, vaults, user token accounts)
3. `swap::handler()` validates input (amount > 0)
4. Calls `swap_math::calculate_a_to_b_output(100, market)`
   - Uses checked arithmetic to compute output
   - Returns 200 (assuming price = 2.0)
5. Checks `vault_b.amount >= 200` (sufficient liquidity)
6. Executes CPI: `token::transfer(user_token_a → vault_a, 100)`
7. Executes CPI with PDA signer: `token::transfer(vault_b → user_token_b, 200)`
8. Emits `SwapExecuted` event
9. Returns success

---

## C4 Level 3: Component View (Web UI)

### Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                    React Web Application                              │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐ │
│   │  Pages (Routes)                                                 │ │
│   │                                                                  │ │
│   │  /admin                           /swap                          │ │
│   │  ┌──────────────────────┐        ┌──────────────────────┐      │ │
│   │  │ AdminDashboard.tsx   │        │ SwapInterface.tsx    │      │ │
│   │  │                      │        │                      │      │ │
│   │  │ • Initialize Market  │        │ • Token Selection    │      │ │
│   │  │   Form               │        │ • Amount Input       │      │ │
│   │  │ • Set Price Form     │        │ • Direction Toggle   │      │ │
│   │  │ • Add Liquidity Form │        │ • Output Preview     │      │ │
│   │  │                      │        │ • Execute Swap Btn   │      │ │
│   │  └──────────┬───────────┘        └──────────┬───────────┘      │ │
│   │             │                               │                   │ │
│   │             └───────────┬───────────────────┘                   │ │
│   │                         │                                        │ │
│   └─────────────────────────┼────────────────────────────────────────┘ │
│                             │                                          │
│   ┌─────────────────────────▼────────────────────────────────────────┐ │
│   │  Contexts (React Context API)                                    │ │
│   │                                                                   │ │
│   │  ┌───────────────────────────────────────────────────────────┐  │ │
│   │  │ AnchorContext.tsx                                          │  │ │
│   │  │                                                             │  │ │
│   │  │ • program: Program<SwapProgram>                            │  │ │
│   │  │ • connection: Connection                                   │  │ │
│   │  │ • Initializes Anchor provider                              │  │ │
│   │  │ • Exposes program methods to components                    │  │ │
│   │  └───────────────────────────────────────────────────────────┘  │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐ │
│   │  Stores (Zustand State Management)                             │ │
│   │                                                                  │ │
│   │  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐  │ │
│   │  │ useWalletStore │  │ useMarketStore │  │ useSwapStore    │  │ │
│   │  │                │  │                │  │                 │  │ │
│   │  │ • connected    │  │ • price        │  │ • inputAmount   │  │ │
│   │  │ • publicKey    │  │ • vaultABalance│  │ • outputAmount  │  │ │
│   │  │ • connect()    │  │ • vaultBBalance│  │ • direction     │  │ │
│   │  │ • disconnect() │  │ • fetchMarket()│  │ • loading       │  │ │
│   │  └────────────────┘  └────────────────┘  └─────────────────┘  │ │
│   └────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐ │
│   │  External Dependencies                                          │ │
│   │                                                                  │ │
│   │  • @solana/wallet-adapter-react (Wallet connection)             │ │
│   │  • @coral-xyz/anchor (Program interaction)                      │ │
│   │  • @chakra-ui/react (UI components)                             │ │
│   │  • @solana/spl-token (Token utilities)                          │ │
│   │  • zustand (State management)                                   │ │
│   └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**AdminDashboard.tsx:**
- Render forms for administrative operations
- Call program methods (initialize_market, set_price, add_liquidity)
- Handle transaction confirmations and errors
- Display current market state

**SwapInterface.tsx:**
- Render swap form (input amount, token selection, direction)
- Calculate output amount preview (client-side)
- Call program.methods.swap()
- Handle wallet balance queries

**AnchorContext.tsx:**
- Initialize Anchor provider with wallet and connection
- Expose `program` object to all components
- Manage RPC connection lifecycle

**Zustand Stores:**
- Provide reactive state updates
- Persist wallet connection (localStorage)
- Cache market data to reduce RPC calls

---

## Deployment View

### Development Environment (Localnet)

```
Developer Machine
├── solana-test-validator (local blockchain)
│   ├── Listens: http://127.0.0.1:8899
│   ├── Deployed Programs:
│   │   └── SWAP Program (auto-deployed via `anchor test`)
│   └── Auto-funded test wallets
│
├── React Dev Server (http://localhost:3000)
│   └── Connects to: http://127.0.0.1:8899
│
└── Terminal: `anchor test` (runs integration tests)
```

**Deployment Command:**
```bash
anchor build && anchor test
```

**Use Case:** Development, unit testing, integration testing

---

### Staging Environment (Devnet)

```
┌─────────────────────────────────────────────────────────────┐
│  Solana Devnet (Public Test Network)                        │
│  RPC Endpoint: https://api.devnet.solana.com                │
│                                                              │
│  ├── SWAP Program (deployed)                                │
│  │   Program ID: SwapProgramXXXXXXXXXXXXXXXXXXX           │
│  │   Upgrade Authority: Developer wallet                    │
│  │                                                           │
│  ├── Test Token Mints                                        │
│  │   ├── Fake USDC (6 decimals)                            │
│  │   └── Fake SOL (9 decimals)                             │
│  │                                                           │
│  └── Test Markets                                            │
│      └── USDC/SOL market (seeded with test liquidity)       │
└──────────────────────────────────────────────────────────────┘
                                   ▲
                                   │ RPC calls
                                   │
┌──────────────────────────────────┼───────────────────────────┐
│  Vercel / Netlify (Frontend Hosting)                         │
│  URL: https://swap-dex-demo.vercel.app                       │
│                                                              │
│  ├── React App (static build)                                │
│  ├── Environment Variables:                                  │
│  │   └── REACT_APP_RPC_ENDPOINT=https://api.devnet.solana.com
│  │   └── REACT_APP_PROGRAM_ID=SwapProgramXXXXX             │
│  └── CDN: Cached static assets                              │
└──────────────────────────────────────────────────────────────┘
```

**Deployment Commands:**
```bash
# Deploy program to devnet
anchor deploy --provider.cluster devnet

# Deploy frontend
cd app && npm run build && vercel deploy --prod
```

**Use Case:** Public demo, user acceptance testing (UAT)

---

### Production Environment (Mainnet - Future)

```
┌─────────────────────────────────────────────────────────────┐
│  Solana Mainnet-Beta                                         │
│  RPC Endpoint: https://api.helius.dev/v0/xxx (Paid)        │
│                                                              │
│  ├── SWAP Program (audited, immutable)                      │
│  │   Program ID: SwapProgramXXXXXXXXXXXXXXXXXXX           │
│  │   Upgrade Authority: Multi-sig (Squads)                  │
│  │                                                           │
│  ├── Real Token Markets                                      │
│  │   ├── USDC/SOL                                           │
│  │   ├── USDT/SOL                                           │
│  │   └── RAY/SOL                                            │
│  │                                                           │
│  └── Monitoring                                              │
│      ├── Prometheus (metrics)                                │
│      └── Grafana (dashboards)                                │
└──────────────────────────────────────────────────────────────┘
                                   ▲
                                   │
┌──────────────────────────────────┼───────────────────────────┐
│  Cloudflare / Vercel Pro (Frontend + CDN)                    │
│  URL: https://swap.yourproject.com                           │
│                                                              │
│  ├── React App (production build)                            │
│  ├── Environment Variables:                                  │
│  │   └── REACT_APP_RPC_ENDPOINT=https://api.helius.dev/...  │
│  │   └── REACT_APP_PROGRAM_ID=SwapProgramXXXXX             │
│  ├── CDN: Global edge caching                               │
│  └── Analytics: Google Analytics, Mixpanel                   │
└──────────────────────────────────────────────────────────────┘
```

**Requirements for Production:**
- Security audit (Halborn, OtterSec, Neodyme)
- Multi-sig upgrade authority (Squads 2-of-3)
- Paid RPC provider (Helius, QuickNode)
- Monitoring and alerting
- Backup liquidity management procedures

---

## Physical Data Model

### On-Chain Account Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  MarketAccount (PDA)                                                 │
│  Seeds: [b"market", token_mint_a, token_mint_b]                     │
│  Size: 115 bytes (8 discriminator + 107 data)                       │
│  Rent: ~0.0016 SOL (~$0.16 at $100/SOL)                             │
│                                                                       │
│  ┌──────────────────┬──────────┬─────────────────────────────────┐  │
│  │ Field            │ Type     │ Value Example                   │  │
│  ├──────────────────┼──────────┼─────────────────────────────────┤  │
│  │ authority        │ Pubkey   │ 5Z...xyz (admin wallet)         │  │
│  │ token_mint_a     │ Pubkey   │ EPjFWdd...USDC (USDC mint)      │  │
│  │ token_mint_b     │ Pubkey   │ So11111...SOL (Wrapped SOL)     │  │
│  │ price            │ u64      │ 50_000 (1 USDC = 0.05 SOL)      │  │
│  │ decimals_a       │ u8       │ 6 (USDC decimals)               │  │
│  │ decimals_b       │ u8       │ 9 (SOL decimals)                │  │
│  │ bump             │ u8       │ 255 (PDA bump seed)             │  │
│  └──────────────────┴──────────┴─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  VaultA (SPL TokenAccount - PDA)                                     │
│  Seeds: [b"vault_a", market_pda]                                     │
│  Size: 165 bytes (SPL Token standard)                                │
│  Rent: ~0.00203 SOL                                                  │
│                                                                       │
│  ┌──────────────────┬──────────┬─────────────────────────────────┐  │
│  │ Field            │ Type     │ Value Example                   │  │
│  ├──────────────────┼──────────┼─────────────────────────────────┤  │
│  │ mint             │ Pubkey   │ EPjFWdd...USDC                  │  │
│  │ owner            │ Pubkey   │ SwapProgramXXXX (program ID)    │  │
│  │ amount           │ u64      │ 500_000_000 (500 USDC)          │  │
│  │ delegate         │ Option   │ None                            │  │
│  │ state            │ Enum     │ Initialized                     │  │
│  │ is_native        │ Option   │ None (not wrapped SOL)          │  │
│  │ close_authority  │ Option   │ None                            │  │
│  └──────────────────┴──────────┴─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  VaultB (SPL TokenAccount - PDA)                                     │
│  Seeds: [b"vault_b", market_pda]                                     │
│  Size: 165 bytes                                                     │
│  Rent: ~0.00203 SOL                                                  │
│                                                                       │
│  ┌──────────────────┬──────────┬─────────────────────────────────┐  │
│  │ Field            │ Type     │ Value Example                   │  │
│  ├──────────────────┼──────────┼─────────────────────────────────┤  │
│  │ mint             │ Pubkey   │ So11111...SOL                   │  │
│  │ owner            │ Pubkey   │ SwapProgramXXXX                 │  │
│  │ amount           │ u64      │ 25_000_000_000 (25 SOL)         │  │
│  │ ...              │ ...      │ ...                             │  │
│  └──────────────────┴──────────┴─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Account Relationships

```
MarketAccount (market_pda)
    │
    ├── has authority: Administrator.publicKey
    ├── references: token_mint_a (USDC)
    ├── references: token_mint_b (SOL)
    │
    ├─► VaultA (vault_a_pda)
    │   ├── mint: token_mint_a
    │   ├── authority: market_pda (allows program to sign CPIs)
    │   └── balance: 500 USDC
    │
    └─► VaultB (vault_b_pda)
        ├── mint: token_mint_b
        ├── authority: market_pda
        └── balance: 25 SOL
```

### State Transitions

**Market Lifecycle:**
1. **Uninitialized** → `initialize_market()` → **Active (price=0)**
2. **Active (price=0)** → `set_price(new_price)` → **Active (price > 0)**
3. **Active** → `add_liquidity(...)` → **Active (vaults funded)**
4. **Active** → `swap(...)` → **Active (vault balances updated)**
5. *(No end state - markets exist indefinitely)*

**Vault Balance Invariants:**
- Vault balance can only decrease via `swap` instruction (withdrawals not allowed in MVP)
- Vault balance can only increase via `add_liquidity` or `swap` (receiving tokens)

---

## Technology Stack

### Backend (Solana Program)

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Language | Rust | 1.75+ | Smart contract language |
| Framework | Anchor | 0.31.0 | Reduces boilerplate, type safety |
| Blockchain | Solana | 1.18+ | Layer-1 blockchain |
| Standard | SPL Token | Latest | Token standard (mints, transfers) |
| Testing | anchor-test | 0.31.0 | TypeScript integration tests |
| Unit Testing | cargo test | (Rust std) | Unit tests for swap_math |

### Frontend (Web Application)

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Language | TypeScript | 5.3+ | Type-safe JavaScript |
| Framework | React | 18.2+ | UI component library |
| UI Components | Chakra UI | 2.8+ | Accessible, themeable components |
| State Management | Zustand | 4.5+ | Lightweight global state |
| Wallet Integration | @solana/wallet-adapter-react | 0.15+ | Connect to Phantom, Solflare |
| Solana Client | @solana/web3.js | 1.95+ | RPC calls, transaction building |
| Anchor Client | @coral-xyz/anchor | 0.31.0 | Program interaction (IDL-based) |
| Build Tool | Create React App | 5.0+ | Webpack, Babel, dev server |

### Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| RPC Provider | Helius / Solana Public | Transaction submission, account queries |
| Hosting | Vercel / Netlify | Static site hosting (frontend) |
| Blockchain | Solana Devnet (MVP), Mainnet (prod) | Smart contract execution |

---

## Cross-Cutting Concerns

### Security

**Implemented Protections:**
- ✅ Checked arithmetic (overflow/underflow protection - ADR-005)
- ✅ PDA-based vaults (no private keys, only program can sign)
- ✅ Authority constraints (`has_one = authority` in Anchor)
- ✅ Same-token market rejection (`require!(mint_a != mint_b)`)
- ✅ Price validation (prevents division by zero)
- ✅ Sufficient liquidity checks (prevents overdraft)
- ✅ Input validation (amount > 0, decimals ≤ 18)

**Known Limitations (Documented for Educational Project):**
- ❌ No security audit (not production-ready)
- ❌ Single administrator authority (centralization risk - ADR-003)
- ❌ No multi-sig or governance (future enhancement)
- ❌ No rate limiting (RPC-level, not program-level)
- ❌ No circuit breakers or emergency pause

**Mitigation for Educational Use:**
- Use test tokens only (no real value)
- Clearly label as educational project
- Do not deploy to mainnet without audit

---

### Performance

**Compute Unit Budget:**
- Target: < 12,000 CU per swap (with events)
- Max acceptable: 50,000 CU (REQ-NF-014)

**Measured Performance (estimated):**
- Account deserialization: ~2,000 CU
- Swap calculation (checked arithmetic): ~1,500 CU
- Token transfer (user → vault): ~3,000 CU
- Token transfer (vault → user with PDA signer): ~3,500 CU
- Event emission: ~2,000 CU
- **Total: ~12,000 CU** ✅ Meets target

**Frontend Performance:**
- Initial load time: < 3 seconds (REQ-NF-015)
- UI responsiveness: < 500ms for RPC queries (REQ-NF-015)
- Bundle size target: < 500KB (gzipped)

**Optimization Techniques Applied:**
- Tree-shaking (unused code removal)
- Code splitting (React lazy loading)
- Chakra UI (lightweight component library)
- Zustand (3KB state management)

---

### Scalability

**Current Limitations:**
- **Throughput**: Limited by Solana network (65,000 TPS theoretical, ~2,000 TPS actual)
- **Liquidity**: No automatic rebalancing (administrator must monitor vault balances)
- **Markets**: Unlimited (each market is isolated PDA)

**Scalability Considerations:**
- Each market is independent (no shared state → parallelizable)
- Vaults are PDAs (no hot account contention)
- Events are emitted (off-chain indexing can scale horizontally)

**Future Enhancements (Phase 2+):**
- AMM curves (automatic pricing, no admin intervention)
- Multi-hop swaps (A → B → C in single transaction)
- Liquidity provider tokens (distribute ownership)

---

### Monitoring & Observability

**Implemented (MVP):**
- Console logging (browser DevTools)
- Transaction signatures (viewable in Solscan/Solana Explorer)
- Event emission (on-chain audit trail)

**Future Enhancements (Production):**
- Prometheus metrics (transaction count, success rate, latency)
- Grafana dashboards (visualize KPIs)
- Alerting (low vault balance, high error rate)
- Sentry error tracking (frontend crashes)

---

### Maintainability

**Documentation:**
- Inline code comments (Rust doc comments, JSDoc)
- README.md (setup, deployment, usage)
- CONTRIBUTING.md (development workflow)
- ADRs (architecture decision records)
- This ARCHITECTURE.md document

**Code Quality:**
- Rust: `cargo fmt`, `cargo clippy` (linter)
- TypeScript: ESLint, Prettier
- Tests: >80% coverage (REQ-NF-020)

**Versioning:**
- Semantic versioning (0.1.0 → 1.0.0)
- Git tags for releases
- Changelog.md (track changes)

---

## References

### Internal Documents
- [ADRs](../spec/adr/) - Architecture decision records
- [Specifications](../spec/README.md) - Technical specs
- [FASE Files](./fases/README.md) - Implementation phases
- [Requirements](../requirements/REQUIREMENTS.md) - Functional & NFR

### External Resources
- [C4 Model](https://c4model.com/) - Architecture visualization framework
- [Anchor Book](https://book.anchor-lang.com/) - Anchor framework docs
- [Solana Architecture](https://docs.solana.com/cluster/overview) - Blockchain design
- [SPL Token](https://spl.solana.com/token) - Token standard docs

---

**Generated by:** plan-architect skill, Phase 4
**Next Phase:** Phase 5 (Plan Generation) → Create PLAN.md and per-FASE execution plans
