# API Contract: Web UI Components

**Contract ID:** API-WEB-UI
**Version:** 1.0
**Last Updated:** 2026-03-22
**Status:** Active

## Overview

**Description:** This document specifies the API contract for the web-based user interface of the Solana Swap application. It defines React component interfaces, wallet adapter integration, RPC connection management, transaction building/signing patterns, error handling, and status display mechanisms.

**Technology Stack:**
- **Framework:** React 18+ with Next.js 13+
- **Language:** TypeScript
- **Wallet:** Phantom Wallet via @solana/wallet-adapter-react
- **Blockchain Library:** @solana/web3.js, @coral-xyz/anchor
- **Styling:** Tailwind CSS or Material-UI (recommended)
- **State Management:** React Context API or Zustand

**Traceability:**
- **Requirements:** REQ-F-012 through REQ-F-016, REQ-NF-023, REQ-NF-024
- **Use Cases:** UC-001 through UC-006
- **Workflows:** WF-001, WF-002

---

## Table of Contents

1. [Application Architecture](#application-architecture)
2. [Wallet Integration](#wallet-integration)
3. [RPC Connection Management](#rpc-connection-management)
4. [React Components](#react-components)
5. [Transaction Management](#transaction-management)
6. [Error Handling](#error-handling)
7. [State Management](#state-management)
8. [Type Definitions](#type-definitions)

---

## Application Architecture

### Directory Structure

```
app/
├── pages/
│   ├── index.tsx                    # Home page / Market list
│   ├── initialize-market.tsx        # Market initialization (admin)
│   ├── market/[marketId].tsx        # Market detail page
│   ├── swap.tsx                     # Swap interface (user)
│   └── _app.tsx                     # App wrapper with providers
├── components/
│   ├── wallet/
│   │   ├── WalletButton.tsx         # Connect/Disconnect wallet
│   │   └── WalletProvider.tsx       # Wallet adapter provider
│   ├── market/
│   │   ├── InitializeMarketForm.tsx # Market creation form
│   │   ├── SetPriceForm.tsx         # Price update form
│   │   ├── AddLiquidityForm.tsx     # Liquidity addition form
│   │   └── MarketDetails.tsx        # Market info display
│   ├── swap/
│   │   ├── SwapForm.tsx             # Token swap interface
│   │   ├── SwapPreview.tsx          # Output amount preview
│   │   └── SwapHistory.tsx          # Recent swap events
│   ├── common/
│   │   ├── ErrorDisplay.tsx         # Error message component
│   │   ├── LoadingSpinner.tsx       # Loading indicator
│   │   └── TransactionStatus.tsx    # Transaction status tracker
├── hooks/
│   ├── useProgram.ts                # Anchor program instance
│   ├── useMarket.ts                 # Market data fetching
│   ├── useSwap.ts                   # Swap execution logic
│   └── useTransactionStatus.ts      # Transaction tracking
├── utils/
│   ├── anchor.ts                    # Anchor provider setup
│   ├── pdaUtils.ts                  # PDA derivation helpers
│   ├── formatters.ts                # Token amount formatters
│   └── errorUtils.ts                # Error parsing/formatting
└── types/
    ├── market.ts                    # Market-related types
    ├── swap.ts                      # Swap-related types
    └── transaction.ts               # Transaction types
```

---

## Wallet Integration

### WalletProvider Component

**Description:** Wraps the application with Solana wallet adapter context, supporting Phantom wallet.

**File:** `components/wallet/WalletProvider.tsx`

```typescript
import React, { FC, useMemo } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import default styles
require('@solana/wallet-adapter-react-ui/styles.css');

interface WalletProviderProps {
  children: React.ReactNode;
}

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  // Network selection (can be env variable)
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Wallet adapters (Phantom only for MVP)
  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
```

**Traceability:** REQ-F-016, UC-006

---

### WalletButton Component

**Description:** Connect/Disconnect wallet button with user's public key display.

**File:** `components/wallet/WalletButton.tsx`

```typescript
import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletButton: React.FC = () => {
  const { publicKey, connected } = useWallet();

  return (
    <div className="flex items-center gap-4">
      <WalletMultiButton />
      {connected && publicKey && (
        <div className="text-sm text-gray-600">
          Connected: {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
        </div>
      )}
    </div>
  );
};
```

**Props:**
- None (uses wallet adapter context)

**State:**
- `publicKey`: User's connected wallet address
- `connected`: Connection status

**Events:**
- `onClick`: Opens wallet selection modal (handled by WalletMultiButton)

**Traceability:** REQ-F-016

---

## RPC Connection Management

### useProgram Hook

**Description:** Provides initialized Anchor program instance with connection and wallet.

**File:** `hooks/useProgram.ts`

```typescript
import { useMemo } from 'react';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import idl from '../idl/solana_swap.json';

const PROGRAM_ID = new PublicKey('Swap11111111111111111111111111111111111111111');

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const program = useMemo(() => {
    if (!wallet.publicKey) return null;

    const provider = new AnchorProvider(
      connection,
      wallet as any,
      AnchorProvider.defaultOptions()
    );

    return new Program(idl as Idl, PROGRAM_ID, provider);
  }, [connection, wallet]);

  return program;
}
```

**Returns:**
- `program: Program | null` - Anchor program instance (null if wallet not connected)

**Dependencies:**
- `@solana/wallet-adapter-react` - Wallet and connection hooks
- `@coral-xyz/anchor` - Anchor framework

**Traceability:** All use cases requiring on-chain interaction

---

## React Components

### InitializeMarketForm Component

**Description:** Form for administrators to create new markets.

**File:** `components/market/InitializeMarketForm.tsx`

```typescript
import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useProgram } from '../../hooks/useProgram';

interface InitializeMarketFormProps {
  onSuccess?: (marketPda: PublicKey) => void;
}

export const InitializeMarketForm: React.FC<InitializeMarketFormProps> = ({ onSuccess }) => {
  const [tokenMintA, setTokenMintA] = useState('');
  const [tokenMintB, setTokenMintB] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const program = useProgram();
  const { publicKey } = useWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !publicKey) return;

    setLoading(true);
    setError(null);

    try {
      // Validate addresses
      const mintA = new PublicKey(tokenMintA);
      const mintB = new PublicKey(tokenMintB);

      // Derive PDAs
      const [marketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('market'), mintA.toBuffer(), mintB.toBuffer()],
        program.programId
      );

      const [vaultAPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_a'), marketPda.toBuffer()],
        program.programId
      );

      const [vaultBPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_b'), marketPda.toBuffer()],
        program.programId
      );

      // Execute transaction
      const tx = await program.methods
        .initializeMarket()
        .accounts({
          market: marketPda,
          vaultA: vaultAPda,
          vaultB: vaultBPda,
          tokenMintA: mintA,
          tokenMintB: mintB,
          authority: publicKey,
        })
        .rpc();

      console.log('Market initialized:', tx);
      onSuccess?.(marketPda);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize market');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Token A Mint Address</label>
        <input
          type="text"
          value={tokenMintA}
          onChange={(e) => setTokenMintA(e.target.value)}
          placeholder="7xKXtg2CW87d97TXJSDpbD5jBkhe..."
          className="w-full px-3 py-2 border rounded"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Token B Mint Address</label>
        <input
          type="text"
          value={tokenMintB}
          onChange={(e) => setTokenMintB(e.target.value)}
          placeholder="9yJEn5RT3YyFZqvJayV5e8xVF3W..."
          className="w-full px-3 py-2 border rounded"
          required
        />
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <button
        type="submit"
        disabled={loading || !publicKey}
        className="w-full bg-blue-600 text-white py-2 rounded disabled:bg-gray-400"
      >
        {loading ? 'Initializing...' : 'Initialize Market'}
      </button>
    </form>
  );
};
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSuccess` | `(marketPda: PublicKey) => void` | No | Callback invoked with market PDA on successful creation |

**State:**
- `tokenMintA: string` - Token A mint address input
- `tokenMintB: string` - Token B mint address input
- `loading: boolean` - Transaction submission state
- `error: string | null` - Error message (if any)

**Events:**
- `onSubmit` - Form submission, triggers market initialization

**Traceability:** REQ-F-012, UC-001

---

### SetPriceForm Component

**Description:** Form for administrators to update exchange rates.

**File:** `components/market/SetPriceForm.tsx`

```typescript
import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useProgram } from '../../hooks/useProgram';

interface SetPriceFormProps {
  marketPda: PublicKey;
  currentPrice: number; // Human-readable (e.g., 2.5)
  onSuccess?: () => void;
}

export const SetPriceForm: React.FC<SetPriceFormProps> = ({ marketPda, currentPrice, onSuccess }) => {
  const [newPrice, setNewPrice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const program = useProgram();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program) return;

    setLoading(true);
    setError(null);

    try {
      const priceValue = parseFloat(newPrice);
      if (isNaN(priceValue) || priceValue <= 0) {
        throw new Error('Price must be a positive number');
      }

      // Convert to u64 format (price × 10^6)
      const priceU64 = Math.floor(priceValue * 1_000_000);

      const tx = await program.methods
        .setPrice(new anchor.BN(priceU64))
        .accounts({ market: marketPda })
        .rpc();

      console.log('Price updated:', tx);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to update price');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Current Exchange Rate: 1 Token A = {currentPrice} Token B
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">New Exchange Rate</label>
        <input
          type="number"
          step="0.000001"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          placeholder="2.8"
          className="w-full px-3 py-2 border rounded"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          1 Token A = {newPrice || '0'} Token B
        </p>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded disabled:bg-gray-400"
      >
        {loading ? 'Updating...' : 'Update Price'}
      </button>
    </form>
  );
};
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `marketPda` | `PublicKey` | Yes | Market PDA address |
| `currentPrice` | `number` | Yes | Current exchange rate (human-readable) |
| `onSuccess` | `() => void` | No | Callback on successful update |

**State:**
- `newPrice: string` - New exchange rate input
- `loading: boolean` - Transaction state
- `error: string | null` - Error message

**Traceability:** REQ-F-014, UC-002

---

### AddLiquidityForm Component

**Description:** Form for administrators to add liquidity to vaults.

**File:** `components/market/AddLiquidityForm.tsx`

```typescript
import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '../../hooks/useProgram';

interface AddLiquidityFormProps {
  marketPda: PublicKey;
  tokenMintA: PublicKey;
  tokenMintB: PublicKey;
  vaultABalance: number;
  vaultBBalance: number;
  onSuccess?: () => void;
}

export const AddLiquidityForm: React.FC<AddLiquidityFormProps> = ({
  marketPda,
  tokenMintA,
  tokenMintB,
  vaultABalance,
  vaultBBalance,
  onSuccess
}) => {
  const [amountA, setAmountA] = useState<string>('');
  const [amountB, setAmountB] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const program = useProgram();
  const { publicKey } = useWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !publicKey) return;

    setLoading(true);
    setError(null);

    try {
      const amountAValue = parseFloat(amountA) || 0;
      const amountBValue = parseFloat(amountB) || 0;

      if (amountAValue === 0 && amountBValue === 0) {
        throw new Error('At least one amount must be greater than 0');
      }

      // Get authority token accounts
      const authorityTokenA = await getAssociatedTokenAddress(tokenMintA, publicKey);
      const authorityTokenB = await getAssociatedTokenAddress(tokenMintB, publicKey);

      // Derive vault PDAs
      const [vaultAPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_a'), marketPda.toBuffer()],
        program.programId
      );

      const [vaultBPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_b'), marketPda.toBuffer()],
        program.programId
      );

      // Convert to base units (assuming 9 decimals for A, 6 for B - adjust as needed)
      const amountAU64 = Math.floor(amountAValue * 1e9);
      const amountBU64 = Math.floor(amountBValue * 1e6);

      const tx = await program.methods
        .addLiquidity(new anchor.BN(amountAU64), new anchor.BN(amountBU64))
        .accounts({
          market: marketPda,
          vaultA: vaultAPda,
          vaultB: vaultBPda,
          authorityTokenA,
          authorityTokenB,
          tokenMintA,
          tokenMintB,
        })
        .rpc();

      console.log('Liquidity added:', tx);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to add liquidity');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium">Vault A Balance</label>
          <p className="text-lg font-bold">{vaultABalance.toLocaleString()}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Vault B Balance</label>
          <p className="text-lg font-bold">{vaultBBalance.toLocaleString()}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Token A Amount</label>
        <input
          type="number"
          step="0.000000001"
          value={amountA}
          onChange={(e) => setAmountA(e.target.value)}
          placeholder="10000"
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Token B Amount</label>
        <input
          type="number"
          step="0.000001"
          value={amountB}
          onChange={(e) => setAmountB(e.target.value)}
          placeholder="25000"
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded disabled:bg-gray-400"
      >
        {loading ? 'Adding Liquidity...' : 'Add Liquidity'}
      </button>
    </form>
  );
};
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `marketPda` | `PublicKey` | Yes | Market PDA address |
| `tokenMintA` | `PublicKey` | Yes | Token A mint address |
| `tokenMintB` | `PublicKey` | Yes | Token B mint address |
| `vaultABalance` | `number` | Yes | Current Vault A balance (for display) |
| `vaultBBalance` | `number` | Yes | Current Vault B balance (for display) |
| `onSuccess` | `() => void` | No | Callback on success |

**Traceability:** REQ-F-013, UC-003

---

### SwapForm Component

**Description:** Main swap interface for users to exchange tokens.

**File:** `components/swap/SwapForm.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '../../hooks/useProgram';
import { SwapPreview } from './SwapPreview';

interface SwapFormProps {
  marketPda: PublicKey;
  tokenMintA: PublicKey;
  tokenMintB: PublicKey;
  exchangeRate: number; // Human-readable price
  decimalsA: number;
  decimalsB: number;
  onSuccess?: () => void;
}

export const SwapForm: React.FC<SwapFormProps> = ({
  marketPda,
  tokenMintA,
  tokenMintB,
  exchangeRate,
  decimalsA,
  decimalsB,
  onSuccess
}) => {
  const [amount, setAmount] = useState<string>('');
  const [direction, setDirection] = useState<'AtoB' | 'BtoA'>('AtoB');
  const [outputAmount, setOutputAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const program = useProgram();
  const { publicKey } = useWallet();

  // Calculate output amount
  useEffect(() => {
    const inputAmount = parseFloat(amount) || 0;
    if (inputAmount === 0) {
      setOutputAmount(0);
      return;
    }

    if (direction === 'AtoB') {
      setOutputAmount(inputAmount * exchangeRate);
    } else {
      setOutputAmount(inputAmount / exchangeRate);
    }
  }, [amount, direction, exchangeRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !publicKey) return;

    setLoading(true);
    setError(null);

    try {
      const inputAmount = parseFloat(amount);
      if (inputAmount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Get user token accounts
      const userTokenA = await getAssociatedTokenAddress(tokenMintA, publicKey);
      const userTokenB = await getAssociatedTokenAddress(tokenMintB, publicKey);

      // Derive vault PDAs
      const [vaultAPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_a'), marketPda.toBuffer()],
        program.programId
      );

      const [vaultBPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_b'), marketPda.toBuffer()],
        program.programId
      );

      // Convert to base units
      const amountU64 = Math.floor(
        inputAmount * Math.pow(10, direction === 'AtoB' ? decimalsA : decimalsB)
      );

      const tx = await program.methods
        .swap(new anchor.BN(amountU64), direction === 'AtoB')
        .accounts({
          market: marketPda,
          vaultA: vaultAPda,
          vaultB: vaultBPda,
          userTokenA,
          userTokenB,
        })
        .rpc();

      console.log('Swap executed:', tx);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to execute swap');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setDirection('AtoB')}
          className={`flex-1 py-2 rounded ${
            direction === 'AtoB' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          Token A → Token B
        </button>
        <button
          type="button"
          onClick={() => setDirection('BtoA')}
          className={`flex-1 py-2 rounded ${
            direction === 'BtoA' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          Token B → Token A
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Input Amount ({direction === 'AtoB' ? 'Token A' : 'Token B'})
          </label>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        <SwapPreview
          inputAmount={parseFloat(amount) || 0}
          outputAmount={outputAmount}
          direction={direction}
          exchangeRate={exchangeRate}
        />

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={loading || !publicKey}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:bg-gray-400"
        >
          {loading ? 'Swapping...' : 'Swap'}
        </button>
      </form>
    </div>
  );
};
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `marketPda` | `PublicKey` | Yes | Market PDA address |
| `tokenMintA` | `PublicKey` | Yes | Token A mint |
| `tokenMintB` | `PublicKey` | Yes | Token B mint |
| `exchangeRate` | `number` | Yes | Current exchange rate |
| `decimalsA` | `number` | Yes | Token A decimals |
| `decimalsB` | `number` | Yes | Token B decimals |
| `onSuccess` | `() => void` | No | Callback on success |

**Traceability:** REQ-F-015, UC-004, UC-005

---

## Transaction Management

### Transaction Status States

```typescript
export enum TransactionStatus {
  Idle = 'idle',
  Building = 'building',
  Signing = 'signing',
  Pending = 'pending',
  Confirming = 'confirming',
  Confirmed = 'confirmed',
  Failed = 'failed',
}

export interface TransactionState {
  status: TransactionStatus;
  signature?: string;
  error?: string;
}
```

### useTransactionStatus Hook

**File:** `hooks/useTransactionStatus.ts`

```typescript
import { useState, useCallback } from 'react';
import { Connection } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';

export function useTransactionStatus() {
  const { connection } = useConnection();
  const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.Idle);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const track = useCallback(async (txSignature: string) => {
    setSignature(txSignature);
    setStatus(TransactionStatus.Pending);
    setError(null);

    try {
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(txSignature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      setStatus(TransactionStatus.Confirmed);
    } catch (err: any) {
      setStatus(TransactionStatus.Failed);
      setError(err.message || 'Transaction failed');
    }
  }, [connection]);

  const reset = useCallback(() => {
    setStatus(TransactionStatus.Idle);
    setSignature(null);
    setError(null);
  }, []);

  return { status, signature, error, track, reset };
}
```

**Traceability:** REQ-NF-015

---

## Error Handling

### Error Display Component

**File:** `components/common/ErrorDisplay.tsx`

```typescript
import React from 'react';

interface ErrorDisplayProps {
  error: string | null;
  onDismiss?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  // Parse common errors
  const parseError = (err: string): string => {
    if (err.includes('InsufficientLiquidity')) {
      return 'Insufficient liquidity in pool. Try a smaller amount or wait for more liquidity.';
    }
    if (err.includes('PriceNotSet')) {
      return 'Exchange rate not configured. Contact the market administrator.';
    }
    if (err.includes('InvalidAmount')) {
      return 'Invalid amount: must be greater than 0.';
    }
    if (err.includes('Unauthorized')) {
      return 'You are not authorized to perform this operation.';
    }
    if (err.includes('User rejected')) {
      return 'Transaction was rejected in your wallet.';
    }
    return err;
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded p-4">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-red-800 font-medium mb-1">Error</h4>
          <p className="text-red-700 text-sm">{parseError(error)}</p>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-red-800 hover:text-red-900">
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
```

**Traceability:** REQ-NF-024

---

## State Management

### Market Context

**File:** `contexts/MarketContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useProgram } from '../hooks/useProgram';

interface MarketData {
  authority: PublicKey;
  tokenMintA: PublicKey;
  tokenMintB: PublicKey;
  price: number; // Human-readable
  decimalsA: number;
  decimalsB: number;
  vaultABalance: number;
  vaultBBalance: number;
}

interface MarketContextType {
  market: MarketData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const MarketProvider: React.FC<{ marketPda: PublicKey; children: React.ReactNode }> = ({
  marketPda,
  children
}) => {
  const [market, setMarket] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const program = useProgram();

  const refresh = async () => {
    if (!program) return;

    setLoading(true);
    setError(null);

    try {
      const marketAccount = await program.account.marketAccount.fetch(marketPda);

      // Fetch vault balances
      const [vaultAPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_a'), marketPda.toBuffer()],
        program.programId
      );

      const [vaultBPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_b'), marketPda.toBuffer()],
        program.programId
      );

      const vaultA = await program.provider.connection.getTokenAccountBalance(vaultAPda);
      const vaultB = await program.provider.connection.getTokenAccountBalance(vaultBPda);

      setMarket({
        authority: marketAccount.authority,
        tokenMintA: marketAccount.tokenMintA,
        tokenMintB: marketAccount.tokenMintB,
        price: marketAccount.price.toNumber() / 1_000_000,
        decimalsA: marketAccount.decimalsA,
        decimalsB: marketAccount.decimalsB,
        vaultABalance: parseFloat(vaultA.value.uiAmountString || '0'),
        vaultBBalance: parseFloat(vaultB.value.uiAmountString || '0'),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [program, marketPda]);

  return (
    <MarketContext.Provider value={{ market, loading, error, refresh }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within MarketProvider');
  }
  return context;
};
```

---

## Type Definitions

### Market Types

**File:** `types/market.ts`

```typescript
import { PublicKey } from '@solana/web3.js';

export interface MarketAccount {
  authority: PublicKey;
  tokenMintA: PublicKey;
  tokenMintB: PublicKey;
  price: number; // u64 on-chain, number in TS
  decimalsA: number;
  decimalsB: number;
  bump: number;
}

export interface MarketInfo {
  pda: PublicKey;
  account: MarketAccount;
  vaultA: PublicKey;
  vaultB: PublicKey;
  vaultABalance: number;
  vaultBBalance: number;
}
```

### Swap Types

**File:** `types/swap.ts`

```typescript
export type SwapDirection = 'AtoB' | 'BtoA';

export interface SwapParams {
  amount: number;
  direction: SwapDirection;
  minOutputAmount?: number; // Future: slippage protection
}

export interface SwapResult {
  signature: string;
  inputAmount: number;
  outputAmount: number;
  effectiveRate: number;
}
```

---

## Testing Checklist

**Wallet Integration:**
- [ ] Phantom wallet connects successfully
- [ ] Wallet disconnection works
- [ ] Public key displayed correctly

**Market Initialization:**
- [ ] Form validates token mint addresses
- [ ] Market created successfully with valid inputs
- [ ] Error displayed if market already exists
- [ ] Success callback invoked with correct market PDA

**Price Setting:**
- [ ] Current price displayed correctly
- [ ] New price validated (> 0)
- [ ] Price updated successfully
- [ ] Error displayed if unauthorized

**Liquidity Addition:**
- [ ] Vault balances displayed correctly
- [ ] Liquidity added to Vault A only
- [ ] Liquidity added to Vault B only
- [ ] Liquidity added to both vaults
- [ ] Error displayed if amount_a = amount_b = 0

**Swap Execution:**
- [ ] Direction toggle works (A→B, B→A)
- [ ] Output amount calculated correctly
- [ ] Swap executes successfully
- [ ] Balances refresh after swap
- [ ] Error displayed on failure (insufficient balance, liquidity, etc.)

**Error Handling:**
- [ ] All custom errors parsed and displayed user-friendly
- [ ] Wallet rejection handled gracefully
- [ ] Network errors handled with retry suggestion

---

## References

**Requirements:**
- REQ-F-012 through REQ-F-016
- REQ-NF-023, REQ-NF-024, REQ-NF-015

**Use Cases:**
- UC-001 through UC-006

**Workflows:**
- WF-001: Market Setup and Operation
- WF-002: Exchange Rate Management

---

**Changelog:**

| Version | Date       | Changes                                     |
|---------|------------|---------------------------------------------|
| 1.0     | 2026-03-22 | Initial web UI API contract specification   |
