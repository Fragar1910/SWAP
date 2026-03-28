import React, { useState, useEffect, useCallback } from 'react';
import { useAnchor } from '../contexts/AnchorContext';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { SwapPreview } from '../components/swap/SwapPreview';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { MarketDetails } from '../components/swap/MarketDetails';

const SwapInterface: React.FC = () => {
  const { program, connection } = useAnchor();
  const wallet = useAnchorWallet();

  // Swap state
  const [marketAddress, setMarketAddress] = useState('');
  const [inputAmount, setInputAmount] = useState('');
  const [swapAToB, setSwapAToB] = useState(true); // true = A→B, false = B→A
  const [swapStatus, setSwapStatus] = useState('');
  const [swapError, setSwapError] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  // Balance and market data
  const [balanceA, setBalanceA] = useState('0.00');
  const [balanceB, setBalanceB] = useState('0.00');
  const [expectedOutput, setExpectedOutput] = useState(0);
  const [price, setPrice] = useState(0);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [marketData, setMarketData] = useState<any>(null);

  const fetchBalances = useCallback(async () => {
    try {
      if (!program || !wallet || !marketAddress) return;

      setIsLoadingBalances(true);
      const market = new PublicKey(marketAddress);
      const marketAccount = await program.account.marketAccount.fetch(market);

      // Store price and market data
      setPrice(marketAccount.price.toNumber());
      setMarketData(marketAccount);

      // Get user token accounts
      const userTokenA = await getAssociatedTokenAddress(
        marketAccount.tokenMintA,
        wallet.publicKey
      );

      const userTokenB = await getAssociatedTokenAddress(
        marketAccount.tokenMintB,
        wallet.publicKey
      );

      // Fetch balances
      try {
        const balA = await connection.getTokenAccountBalance(userTokenA);
        setBalanceA(balA.value.uiAmountString || '0.00');
      } catch {
        setBalanceA('0.00');
      }

      try {
        const balB = await connection.getTokenAccountBalance(userTokenB);
        setBalanceB(balB.value.uiAmountString || '0.00');
      } catch {
        setBalanceB('0.00');
      }
    } catch (error: any) {
      console.error('Error fetching balances:', error);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [program, wallet, marketAddress, connection]);

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !wallet) {
      setSwapError('Please connect your wallet first');
      return;
    }

    setIsSwapping(true);
    setSwapError(null);
    setSwapStatus('');
    try {
      setSwapStatus('Validating inputs...');

      // Parse market address
      const market = new PublicKey(marketAddress);

      // Fetch market account
      const marketAccount = await program.account.marketAccount.fetch(market);

      // Derive vault PDAs
      const [vaultA] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_a'), market.toBuffer()],
        program.programId
      );

      const [vaultB] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_b'), market.toBuffer()],
        program.programId
      );

      // Get user token accounts
      const userTokenA = await getAssociatedTokenAddress(
        marketAccount.tokenMintA,
        wallet.publicKey
      );

      const userTokenB = await getAssociatedTokenAddress(
        marketAccount.tokenMintB,
        wallet.publicKey
      );

      // Convert input amount to base units
      const inputFloat = parseFloat(inputAmount);
      if (isNaN(inputFloat) || inputFloat <= 0) {
        throw new Error('Amount must be a positive number');
      }

      const decimals = swapAToB ? marketAccount.decimalsA : marketAccount.decimalsB;
      const amountScaled = Math.floor(inputFloat * Math.pow(10, decimals));
      const amountBN = new anchor.BN(amountScaled);

      setSwapStatus('Executing swap...');

      // Call swap instruction
      const tx = await (program.methods as any)
        .swap(amountBN, swapAToB)
        .accounts({
          market: market,
          vaultA: vaultA,
          vaultB: vaultB,
          userTokenA: userTokenA,
          userTokenB: userTokenB,
          user: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      setSwapStatus(`✅ Swap executed successfully!\n\nInput: ${inputFloat} ${swapAToB ? 'Token A' : 'Token B'}\nOutput: ~${expectedOutput} ${swapAToB ? 'Token B' : 'Token A'}\n\nTransaction: ${tx}`);

      // Clear input
      setInputAmount('');

      // Refresh balances
      setTimeout(fetchBalances, 1000);

    } catch (error: any) {
      console.error('Swap error:', error);
      setSwapError(error.message || JSON.stringify(error));
      setSwapStatus('');
    } finally {
      setIsSwapping(false);
    }
  };

  const toggleSwapDirection = () => {
    setSwapAToB(!swapAToB);
    setInputAmount(''); // Clear input when direction changes
  };

  // Fetch balances when wallet or market changes
  useEffect(() => {
    if (wallet && program && marketAddress) {
      fetchBalances();
    }
  }, [wallet, program, marketAddress, fetchBalances]);

  // Calculate expected output when input changes
  useEffect(() => {
    if (inputAmount && price > 0) {
      const inputFloat = parseFloat(inputAmount);
      if (!isNaN(inputFloat) && inputFloat > 0) {
        if (swapAToB) {
          const outputB = inputFloat * (price / 1_000_000);
          setExpectedOutput(outputB);
        } else {
          const outputA = inputFloat / (price / 1_000_000);
          setExpectedOutput(outputA);
        }
      } else {
        setExpectedOutput(0);
      }
    } else {
      setExpectedOutput(0);
    }
  }, [inputAmount, price, swapAToB]);

  return (
    <div className="swap-interface">
      <h1>Token Swap</h1>

      <section className="section">
        <h2>Swap Tokens</h2>

        {/* Market Selection */}
        <div className="form-group">
          <label htmlFor="marketAddress">Market Address</label>
          <input
            type="text"
            id="marketAddress"
            value={marketAddress}
            onChange={(e) => setMarketAddress(e.target.value)}
            placeholder="Enter market PDA address"
            required
          />
        </div>

        {/* Swap Direction Display */}
        <div className="swap-direction">
          {swapAToB ? 'Token A → Token B' : 'Token B → Token A'}
        </div>

        {/* Market Info */}
        {marketAddress && marketData && (
          <MarketDetails
            marketAddress={marketAddress}
            tokenMintA={marketData.tokenMintA}
            tokenMintB={marketData.tokenMintB}
            price={price / 1_000_000}
            vaultABalance={balanceA}
            vaultBBalance={balanceB}
            authority={marketData.authority}
          />
        )}

        {/* Swap Form */}
        <form onSubmit={handleSwap} style={{ marginTop: '1.5rem' }}>
          <div className="form-group">
            <label htmlFor="inputAmount">
              {swapAToB ? 'Amount of Token A to Swap' : 'Amount of Token B to Swap'}
            </label>
            <input
              type="number"
              id="inputAmount"
              step="0.000001"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              placeholder={`Enter amount of ${swapAToB ? 'Token A' : 'Token B'}`}
              required
            />

            {/* Balance Display */}
            <div className="balance-info">
              <span>Available:</span>
              <span>{swapAToB ? balanceA : balanceB} {swapAToB ? 'Token A' : 'Token B'}</span>
            </div>
          </div>

          {/* Swap Preview */}
          {inputAmount && price > 0 && (
            <SwapPreview
              inputAmount={parseFloat(inputAmount) || 0}
              outputAmount={expectedOutput}
              direction={swapAToB ? 'AtoB' : 'BtoA'}
              exchangeRate={price / 1_000_000}
            />
          )}

          {/* Error Display */}
          <ErrorDisplay error={swapError} onDismiss={() => setSwapError(null)} />

          {/* Swap Direction Toggle */}
          <button
            type="button"
            onClick={toggleSwapDirection}
            disabled={isSwapping}
            style={{ marginBottom: '1rem', backgroundColor: '#007bff', marginTop: '1rem' }}
          >
            🔄 Switch Direction ({swapAToB ? 'A→B' : 'B→A'})
          </button>

          {/* Execute Swap */}
          <button type="submit" disabled={!wallet || isSwapping} className={isSwapping ? 'loading' : ''}>
            {isSwapping ? 'Swapping...' : 'Execute Swap'}
          </button>

          {swapStatus && !swapError && (
            <div className={`status ${swapStatus.includes('successfully') ? 'success' : 'info'}`}>
              {swapStatus}
            </div>
          )}
        </form>
      </section>

      {/* Wallet Balances Section */}
      <section className="section">
        <h2>Your Balances</h2>
        <div className="balance-info">
          <span>Token A:</span>
          <span>{isLoadingBalances ? 'Loading...' : balanceA}</span>
        </div>
        <div className="balance-info">
          <span>Token B:</span>
          <span>{isLoadingBalances ? 'Loading...' : balanceB}</span>
        </div>
        {wallet && marketAddress && (
          <button
            type="button"
            onClick={fetchBalances}
            disabled={isLoadingBalances}
            className={`refresh-button ${isLoadingBalances ? 'loading' : ''}`}
          >
            {isLoadingBalances ? 'Refreshing...' : '🔄 Refresh Balances'}
          </button>
        )}
        {!wallet && (
          <div className="status info" style={{ marginTop: '1rem' }}>
            Connect your wallet to view balances
          </div>
        )}
      </section>
    </div>
  );
};

export default SwapInterface;
