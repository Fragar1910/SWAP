import React, { useState, useEffect } from 'react';
import { useAnchor } from '../contexts/AnchorContext';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';

const SwapInterface: React.FC = () => {
  const { program, connection } = useAnchor();
  const wallet = useAnchorWallet();

  // Swap state
  const [marketAddress, setMarketAddress] = useState('');
  const [inputAmount, setInputAmount] = useState('');
  const [swapAToB, setSwapAToB] = useState(true); // true = A→B, false = B→A
  const [swapStatus, setSwapStatus] = useState('');

  // Balance and market data
  const [balanceA, setBalanceA] = useState('0.00');
  const [balanceB, setBalanceB] = useState('0.00');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [price, setPrice] = useState(0);
  const [decimalsA, setDecimalsA] = useState(6);
  const [decimalsB, setDecimalsB] = useState(9);

  // Fetch balances when wallet or market changes
  useEffect(() => {
    if (wallet && program && marketAddress) {
      fetchBalances();
    }
  }, [wallet, program, marketAddress]);

  // Calculate expected output when input changes
  useEffect(() => {
    if (inputAmount && price > 0) {
      const inputFloat = parseFloat(inputAmount);
      if (!isNaN(inputFloat) && inputFloat > 0) {
        if (swapAToB) {
          const outputB = inputFloat * (price / 1_000_000);
          setExpectedOutput(outputB.toFixed(6));
        } else {
          const outputA = inputFloat / (price / 1_000_000);
          setExpectedOutput(outputA.toFixed(6));
        }
      } else {
        setExpectedOutput('');
      }
    } else {
      setExpectedOutput('');
    }
  }, [inputAmount, price, swapAToB]);

  const fetchBalances = async () => {
    try {
      if (!program || !wallet || !marketAddress) return;

      const market = new PublicKey(marketAddress);
      const marketAccount = await program.account.marketAccount.fetch(market);

      // Store price and decimals
      setPrice(marketAccount.price.toNumber());
      setDecimalsA(marketAccount.decimalsA);
      setDecimalsB(marketAccount.decimalsB);

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
    }
  };

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !wallet) {
      setSwapStatus('Please connect your wallet first');
      return;
    }

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
      const tx = await program.methods
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

      // Refresh balances
      setTimeout(fetchBalances, 1000);
      setInputAmount('');

    } catch (error: any) {
      console.error('Swap error:', error);
      setSwapStatus(`❌ Error: ${error.message || JSON.stringify(error)}`);
    }
  };

  const toggleSwapDirection = () => {
    setSwapAToB(!swapAToB);
    setInputAmount(''); // Clear input when direction changes
  };

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

        {/* Swap Form */}
        <form onSubmit={handleSwap}>
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

          {/* Swap Direction Toggle */}
          <button
            type="button"
            onClick={toggleSwapDirection}
            style={{ marginBottom: '1rem', backgroundColor: '#007bff' }}
          >
            🔄 Switch Direction ({swapAToB ? 'A→B' : 'B→A'})
          </button>

          {/* Execute Swap */}
          <button type="submit" disabled={!wallet}>
            Execute Swap
          </button>

          {swapStatus && (
            <div className={`status ${swapStatus.includes('Error') ? 'error' : swapStatus.includes('successfully') ? 'success' : 'info'}`}>
              {swapStatus}
            </div>
          )}
        </form>

        {/* Expected Output Display */}
        {inputAmount && expectedOutput && (
          <div className="output">
            <strong>Expected Output:</strong> ~{expectedOutput} {swapAToB ? 'Token B' : 'Token A'}
            <br />
            <small>Price: {(price / 1_000_000).toFixed(6)} Token B per Token A</small>
          </div>
        )}
      </section>

      {/* Wallet Balances Section */}
      <section className="section">
        <h2>Your Balances</h2>
        <div className="balance-info">
          <span>Token A:</span>
          <span>{balanceA}</span>
        </div>
        <div className="balance-info">
          <span>Token B:</span>
          <span>{balanceB}</span>
        </div>
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
