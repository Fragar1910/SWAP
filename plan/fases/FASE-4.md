# FASE-4: Frontend Application (React UI)

**Status:** Not Started
**Priority:** HIGH
**Estimated Effort:** 10 hours
**Dependencies:** FASE-3 (program must be deployed with working swap instruction)

---

## Objective

Build a React-based web interface that allows administrators to manage markets (initialize, set prices, add liquidity) and users to execute token swaps. The UI integrates with Solana Wallet Adapter for wallet connectivity.

**Key Goal:** Non-technical users can interact with the DEX through a browser without CLI commands.

---

## Specifications Covered

| Spec File | Coverage | Focus Area |
|-----------|----------|------------|
| `spec/ui/UI-001-administrator-dashboard.md` | 100% | Admin UI components |
| `spec/ui/UI-002-user-swap-interface.md` | 100% | Swap UI components |
| `spec/use-cases/UC-006-connect-wallet.md` | 100% | Wallet integration |
| `requirements/REQUIREMENTS.md` | REQ-F-012 to REQ-F-016 | UI functional requirements |
| `spec/adr/ADR-006-event-emission.md` | 30% | Event listening for UI updates |

**No backend** - frontend directly communicates with Solana RPC (devnet/localnet).

---

## Deliverables

### 1. Project Setup & Dependencies

**Create React App:**
```bash
npx create-react-app app --template typescript
cd app
```

**Install Dependencies:**

**File:** `app/package.json`

```json
{
  "name": "swap-dex-ui",
  "version": "0.1.0",
  "dependencies": {
    "@coral-xyz/anchor": "^0.31.0",
    "@solana/wallet-adapter-base": "^0.9.23",
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-react-ui": "^0.9.35",
    "@solana/wallet-adapter-wallets": "^0.19.32",
    "@solana/web3.js": "^1.95.0",
    "@solana/spl-token": "^0.4.8",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "typescript": "^5.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
```

**Key Dependencies:**
- `@solana/wallet-adapter-react`: Wallet connection hooks
- `@solana/wallet-adapter-react-ui`: Pre-built wallet UI components
- `@coral-xyz/anchor`: TypeScript client for Anchor programs
- `@solana/spl-token`: Token account utilities

### 2. Anchor Program Context

**File:** `app/src/contexts/AnchorContext.tsx`

```typescript
import React, { createContext, useContext, useMemo } from 'react';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import idl from '../idl/swap_program.json';

// Import program ID from IDL or hardcode
const PROGRAM_ID = new PublicKey(idl.address);
const NETWORK = 'http://127.0.0.1:8899';  // Localnet (change to devnet for production)

interface AnchorContextValue {
    program: Program | null;
    connection: Connection;
}

const AnchorContext = createContext<AnchorContextValue>({
    program: null,
    connection: new Connection(NETWORK, 'confirmed'),
});

export const AnchorProviderComponent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const wallet = useAnchorWallet();
    const connection = useMemo(() => new Connection(NETWORK, 'confirmed'), []);

    const program = useMemo(() => {
        if (!wallet) return null;

        const provider = new AnchorProvider(connection, wallet, {
            commitment: 'confirmed',
        });

        return new Program(idl as Idl, provider);
    }, [wallet, connection]);

    return (
        <AnchorContext.Provider value={{ program, connection }}>
            {children}
        </AnchorContext.Provider>
    );
};

export const useAnchor = () => useContext(AnchorContext);
```

**Traceability:** REQ-C-007 (TypeScript client), ADR-001 (Anchor integration)

### 3. Administrator Dashboard

**File:** `app/src/pages/AdminDashboard.tsx`

```typescript
import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useAnchor } from '../contexts/AnchorContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getAssociatedTokenAddress, getMint } from '@solana/spl-token';

const AdminDashboard: React.FC = () => {
    const { program, connection } = useAnchor();
    const wallet = useWallet();

    const [tokenMintA, setTokenMintA] = useState('');
    const [tokenMintB, setTokenMintB] = useState('');
    const [price, setPrice] = useState('');
    const [amountA, setAmountA] = useState('');
    const [amountB, setAmountB] = useState('');
    const [status, setStatus] = useState('');

    // Initialize Market
    const handleInitializeMarket = async () => {
        if (!program || !wallet.publicKey) {
            setStatus('❌ Connect wallet first');
            return;
        }

        try {
            setStatus('⏳ Initializing market...');

            const mintA = new PublicKey(tokenMintA);
            const mintB = new PublicKey(tokenMintB);

            // Derive PDAs
            const [marketPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from('market'), mintA.toBuffer(), mintB.toBuffer()],
                program.programId
            );

            const [vaultA] = PublicKey.findProgramAddressSync(
                [Buffer.from('vault_a'), marketPDA.toBuffer()],
                program.programId
            );

            const [vaultB] = PublicKey.findProgramAddressSync(
                [Buffer.from('vault_b'), marketPDA.toBuffer()],
                program.programId
            );

            const tx = await program.methods
                .initializeMarket()
                .accounts({
                    market: marketPDA,
                    tokenMintA: mintA,
                    tokenMintB: mintB,
                    vaultA,
                    vaultB,
                    authority: wallet.publicKey,
                })
                .rpc();

            setStatus(`✅ Market initialized! TX: ${tx}`);
        } catch (error) {
            setStatus(`❌ Error: ${error.message}`);
        }
    };

    // Set Price
    const handleSetPrice = async () => {
        if (!program || !wallet.publicKey) {
            setStatus('❌ Connect wallet first');
            return;
        }

        try {
            setStatus('⏳ Setting price...');

            const mintA = new PublicKey(tokenMintA);
            const mintB = new PublicKey(tokenMintB);

            const [marketPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from('market'), mintA.toBuffer(), mintB.toBuffer()],
                program.programId
            );

            // Convert human-readable price to u64 (6 decimals)
            const priceU64 = Math.floor(parseFloat(price) * 1_000_000);

            const tx = await program.methods
                .setPrice(new BN(priceU64))
                .accounts({
                    market: marketPDA,
                    authority: wallet.publicKey,
                })
                .rpc();

            setStatus(`✅ Price set to ${price}! TX: ${tx}`);
        } catch (error) {
            setStatus(`❌ Error: ${error.message}`);
        }
    };

    // Add Liquidity
    const handleAddLiquidity = async () => {
        if (!program || !wallet.publicKey) {
            setStatus('❌ Connect wallet first');
            return;
        }

        try {
            setStatus('⏳ Adding liquidity...');

            const mintA = new PublicKey(tokenMintA);
            const mintB = new PublicKey(tokenMintB);

            // Get mint info to determine decimals
            const mintAInfo = await getMint(connection, mintA);
            const mintBInfo = await getMint(connection, mintB);

            // Convert human-readable amounts to base units
            const amountAU64 = Math.floor(parseFloat(amountA) * Math.pow(10, mintAInfo.decimals));
            const amountBU64 = Math.floor(parseFloat(amountB) * Math.pow(10, mintBInfo.decimals));

            // Derive PDAs
            const [marketPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from('market'), mintA.toBuffer(), mintB.toBuffer()],
                program.programId
            );

            const [vaultA] = PublicKey.findProgramAddressSync(
                [Buffer.from('vault_a'), marketPDA.toBuffer()],
                program.programId
            );

            const [vaultB] = PublicKey.findProgramAddressSync(
                [Buffer.from('vault_b'), marketPDA.toBuffer()],
                program.programId
            );

            // Get authority's token accounts
            const authorityTokenA = await getAssociatedTokenAddress(mintA, wallet.publicKey);
            const authorityTokenB = await getAssociatedTokenAddress(mintB, wallet.publicKey);

            const tx = await program.methods
                .addLiquidity(new BN(amountAU64), new BN(amountBU64))
                .accounts({
                    market: marketPDA,
                    vaultA,
                    vaultB,
                    authorityTokenA,
                    authorityTokenB,
                    authority: wallet.publicKey,
                })
                .rpc();

            setStatus(`✅ Liquidity added! TX: ${tx}`);
        } catch (error) {
            setStatus(`❌ Error: ${error.message}`);
        }
    };

    return (
        <div className="admin-dashboard">
            <h1>Administrator Dashboard</h1>
            <WalletMultiButton />

            <div className="section">
                <h2>1. Initialize Market</h2>
                <input
                    type="text"
                    placeholder="Token A Mint Address"
                    value={tokenMintA}
                    onChange={(e) => setTokenMintA(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Token B Mint Address"
                    value={tokenMintB}
                    onChange={(e) => setTokenMintB(e.target.value)}
                />
                <button onClick={handleInitializeMarket}>Initialize Market</button>
            </div>

            <div className="section">
                <h2>2. Set Exchange Rate</h2>
                <input
                    type="number"
                    placeholder="Price (1 Token A = X Token B)"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    step="0.01"
                />
                <button onClick={handleSetPrice}>Set Price</button>
            </div>

            <div className="section">
                <h2>3. Add Liquidity</h2>
                <input
                    type="number"
                    placeholder="Amount Token A"
                    value={amountA}
                    onChange={(e) => setAmountA(e.target.value)}
                />
                <input
                    type="number"
                    placeholder="Amount Token B"
                    value={amountB}
                    onChange={(e) => setAmountB(e.target.value)}
                />
                <button onClick={handleAddLiquidity}>Add Liquidity</button>
            </div>

            <div className="status">{status}</div>
        </div>
    );
};

export default AdminDashboard;
```

**Traceability:**
- UI-001: Administrator dashboard
- REQ-F-012: Initialize market form
- REQ-F-013: Set price form
- REQ-F-014: Add liquidity form

### 4. User Swap Interface

**File:** `app/src/pages/SwapInterface.tsx`

```typescript
import React, { useState } from 'react';
import { PublicKey, BN } from '@solana/web3.js';
import { useAnchor } from '../contexts/AnchorContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getAssociatedTokenAddress, getMint } from '@solana/spl-token';

const SwapInterface: React.FC = () => {
    const { program, connection } = useAnchor();
    const wallet = useWallet();

    const [tokenMintA, setTokenMintA] = useState('');
    const [tokenMintB, setTokenMintB] = useState('');
    const [inputAmount, setInputAmount] = useState('');
    const [swapDirection, setSwapDirection] = useState<'AtoB' | 'BtoA'>('AtoB');
    const [outputAmount, setOutputAmount] = useState('0');
    const [status, setStatus] = useState('');

    // Calculate output amount (preview)
    const handleCalculateOutput = async () => {
        if (!program || !tokenMintA || !tokenMintB || !inputAmount) return;

        try {
            const mintA = new PublicKey(tokenMintA);
            const mintB = new PublicKey(tokenMintB);

            const [marketPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from('market'), mintA.toBuffer(), mintB.toBuffer()],
                program.programId
            );

            const market = await program.account.marketAccount.fetch(marketPDA);

            const mintAInfo = await getMint(connection, mintA);
            const mintBInfo = await getMint(connection, mintB);

            const inputU64 = Math.floor(
                parseFloat(inputAmount) * Math.pow(10, swapDirection === 'AtoB' ? mintAInfo.decimals : mintBInfo.decimals)
            );

            // Replicate on-chain calculation
            let outputU64: number;
            if (swapDirection === 'AtoB') {
                const numerator = inputU64 * market.price.toNumber() * Math.pow(10, mintBInfo.decimals);
                const denominator = 1_000_000 * Math.pow(10, mintAInfo.decimals);
                outputU64 = Math.floor(numerator / denominator);
            } else {
                const numerator = inputU64 * 1_000_000 * Math.pow(10, mintAInfo.decimals);
                const denominator = market.price.toNumber() * Math.pow(10, mintBInfo.decimals);
                outputU64 = Math.floor(numerator / denominator);
            }

            const outputHuman = outputU64 / Math.pow(10, swapDirection === 'AtoB' ? mintBInfo.decimals : mintAInfo.decimals);
            setOutputAmount(outputHuman.toFixed(6));
        } catch (error) {
            console.error('Failed to calculate output:', error);
        }
    };

    // Execute Swap
    const handleSwap = async () => {
        if (!program || !wallet.publicKey) {
            setStatus('❌ Connect wallet first');
            return;
        }

        try {
            setStatus('⏳ Executing swap...');

            const mintA = new PublicKey(tokenMintA);
            const mintB = new PublicKey(tokenMintB);

            const mintAInfo = await getMint(connection, mintA);
            const mintBInfo = await getMint(connection, mintB);

            const inputU64 = Math.floor(
                parseFloat(inputAmount) * Math.pow(10, swapDirection === 'AtoB' ? mintAInfo.decimals : mintBInfo.decimals)
            );

            const [marketPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from('market'), mintA.toBuffer(), mintB.toBuffer()],
                program.programId
            );

            const [vaultA] = PublicKey.findProgramAddressSync(
                [Buffer.from('vault_a'), marketPDA.toBuffer()],
                program.programId
            );

            const [vaultB] = PublicKey.findProgramAddressSync(
                [Buffer.from('vault_b'), marketPDA.toBuffer()],
                program.programId
            );

            const userTokenA = await getAssociatedTokenAddress(mintA, wallet.publicKey);
            const userTokenB = await getAssociatedTokenAddress(mintB, wallet.publicKey);

            const tx = await program.methods
                .swap(new BN(inputU64), swapDirection === 'AtoB')
                .accounts({
                    market: marketPDA,
                    vaultA,
                    vaultB,
                    userTokenA,
                    userTokenB,
                    user: wallet.publicKey,
                })
                .rpc();

            setStatus(`✅ Swap successful! TX: ${tx}`);
            setInputAmount('');
            setOutputAmount('0');
        } catch (error) {
            setStatus(`❌ Error: ${error.message}`);
        }
    };

    return (
        <div className="swap-interface">
            <h1>Token Swap</h1>
            <WalletMultiButton />

            <div className="swap-form">
                <h2>Swap Tokens</h2>

                <input
                    type="text"
                    placeholder="Token A Mint Address"
                    value={tokenMintA}
                    onChange={(e) => setTokenMintA(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Token B Mint Address"
                    value={tokenMintB}
                    onChange={(e) => setTokenMintB(e.target.value)}
                />

                <select value={swapDirection} onChange={(e) => setSwapDirection(e.target.value as 'AtoB' | 'BtoA')}>
                    <option value="AtoB">Token A → Token B</option>
                    <option value="BtoA">Token B → Token A</option>
                </select>

                <input
                    type="number"
                    placeholder={`Input Amount (${swapDirection === 'AtoB' ? 'Token A' : 'Token B'})`}
                    value={inputAmount}
                    onChange={(e) => {
                        setInputAmount(e.target.value);
                        handleCalculateOutput();
                    }}
                    onBlur={handleCalculateOutput}
                />

                <div className="output">
                    <strong>You will receive:</strong> {outputAmount} {swapDirection === 'AtoB' ? 'Token B' : 'Token A'}
                </div>

                <button onClick={handleSwap}>Execute Swap</button>
            </div>

            <div className="status">{status}</div>
        </div>
    );
};

export default SwapInterface;
```

**Traceability:**
- UI-002: User swap interface
- REQ-F-015: Swap form with amount input
- REQ-F-016: Output amount preview

### 5. Wallet Integration

**File:** `app/src/App.tsx`

```typescript
import React, { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { AnchorProviderComponent } from './contexts/AnchorContext';
import AdminDashboard from './pages/AdminDashboard';
import SwapInterface from './pages/SwapInterface';

// Import wallet adapter CSS
require('@solana/wallet-adapter-react-ui/styles.css');

const App: React.FC = () => {
    const network = WalletAdapterNetwork.Devnet;  // Change to Mainnet for production
    const endpoint = useMemo(() => 'http://127.0.0.1:8899', []);  // Localnet

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter({ network }),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <AnchorProviderComponent>
                        <Router>
                            <nav>
                                <Link to="/admin">Admin Dashboard</Link>
                                <Link to="/swap">Swap Tokens</Link>
                            </nav>

                            <Routes>
                                <Route path="/admin" element={<AdminDashboard />} />
                                <Route path="/swap" element={<SwapInterface />} />
                                <Route path="/" element={<SwapInterface />} />
                            </Routes>
                        </Router>
                    </AnchorProviderComponent>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default App;
```

**Traceability:** UC-006 (Connect wallet), REQ-C-007 (TypeScript client)

### 6. CSS Styling (Basic)

**File:** `app/src/App.css`

```css
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f5f5f5;
}

nav {
    background-color: #333;
    padding: 15px;
    margin-bottom: 30px;
}

nav a {
    color: white;
    text-decoration: none;
    margin-right: 20px;
    font-weight: bold;
}

nav a:hover {
    text-decoration: underline;
}

.admin-dashboard, .swap-interface {
    max-width: 600px;
    margin: 0 auto;
    background: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.section {
    margin-bottom: 30px;
    padding: 20px;
    background: #f9f9f9;
    border-radius: 8px;
}

h1 {
    color: #333;
    margin-bottom: 20px;
}

h2 {
    color: #666;
    font-size: 18px;
    margin-bottom: 15px;
}

input, select {
    width: 100%;
    padding: 12px;
    margin-bottom: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 14px;
    box-sizing: border-box;
}

button {
    background-color: #4CAF50;
    color: white;
    padding: 12px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    width: 100%;
}

button:hover {
    background-color: #45a049;
}

button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

.status {
    margin-top: 20px;
    padding: 15px;
    background: #e7f3ff;
    border-left: 4px solid #2196F3;
    border-radius: 5px;
    font-size: 14px;
}

.output {
    margin: 15px 0;
    padding: 15px;
    background: #fff3cd;
    border-left: 4px solid #ffc107;
    border-radius: 5px;
}

.wallet-adapter-button {
    margin-bottom: 20px !important;
}
```

---

## Verification Checklist

**After FASE-4 completion, verify:**

- [ ] `npm start` launches UI successfully
- [ ] Wallet connection works (Phantom, Solflare)
- [ ] Admin dashboard displays all 3 forms
- [ ] Initialize market creates PDAs correctly
- [ ] Set price updates market on-chain
- [ ] Add liquidity transfers tokens to vaults
- [ ] Swap interface calculates output amounts correctly
- [ ] Swap execution transfers tokens atomically
- [ ] Error messages display for failed transactions
- [ ] UI updates after successful transactions

**Test Flow:**
1. Connect Phantom wallet
2. Navigate to Admin Dashboard
3. Initialize market (USDC/SOL example)
4. Set price (e.g., 1 USDC = 0.05 SOL)
5. Add liquidity (100 USDC, 5 SOL)
6. Navigate to Swap Interface
7. Execute swap (10 USDC → 0.5 SOL)
8. Verify balances updated

---

## Traceability Matrix

| Specification | Implementation | UI Element |
|---------------|----------------|------------|
| UC-006 (Connect Wallet) | WalletMultiButton | Wallet modal |
| REQ-F-012 (Initialize Market Form) | AdminDashboard initialize section | Form inputs + button |
| REQ-F-013 (Set Price Form) | AdminDashboard set price section | Number input + button |
| REQ-F-014 (Add Liquidity Form) | AdminDashboard liquidity section | Dual inputs + button |
| REQ-F-015 (Swap Form) | SwapInterface form | Amount input + direction select |
| REQ-F-016 (Output Preview) | handleCalculateOutput | Output display box |
| UI-001 | AdminDashboard.tsx | Full page |
| UI-002 | SwapInterface.tsx | Full page |

---

## Time Breakdown

| Task | Estimated Time |
|------|---------------|
| Project setup + dependencies | 30 min |
| Anchor context provider | 45 min |
| Admin dashboard UI | 120 min |
| Swap interface UI | 120 min |
| Wallet integration | 45 min |
| CSS styling | 60 min |
| Testing (manual) | 90 min |
| Bug fixes | 60 min |
| Documentation | 30 min |
| **Total** | **10 hours** |

---

## Deployment Instructions

**Build for Production:**
```bash
cd app
npm run build
```

**Deploy to Vercel/Netlify:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel deploy --prod
```

**Environment Variables (for production):**
```env
REACT_APP_PROGRAM_ID=<deployed_program_id>
REACT_APP_RPC_ENDPOINT=https://api.devnet.solana.com
REACT_APP_NETWORK=devnet
```

---

## Next Steps

After FASE-4 completion:
1. ✅ Commit frontend code
2. ✅ Deploy UI to hosting platform
3. ➡️ Proceed to **FASE-5** (Testing & Documentation)
4. Update program ID in `AnchorContext.tsx` with deployed program address

---

**Generated:** 2026-03-23
**Spec Coverage:** 3 files (UI specs, UC-006)
**Business Logic:** 100% (all user interactions implemented)
**Lines of Code:** ~600 (TypeScript) + ~150 (CSS)
