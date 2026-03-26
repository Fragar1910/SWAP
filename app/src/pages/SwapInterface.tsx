import React, { useState } from 'react';
import { useAnchor } from '../contexts/AnchorContext';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

const SwapInterface: React.FC = () => {
  const { program } = useAnchor();
  const wallet = useAnchorWallet();

  // Swap state
  const [marketAddress, setMarketAddress] = useState('');
  const [inputAmount, setInputAmount] = useState('');
  const [swapAToB, setSwapAToB] = useState(true); // true = A→B, false = B→A
  const [swapStatus, setSwapStatus] = useState('');

  // Balance display (TODO: fetch from blockchain)
  const [balanceA, setBalanceA] = useState('0.00');
  const [balanceB, setBalanceB] = useState('0.00');

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !wallet) {
      setSwapStatus('Please connect your wallet first');
      return;
    }

    try {
      setSwapStatus('Executing swap...');
      // TODO: Implement swap call (TASK-F4-013, TASK-F4-014, TASK-F4-016)
      setSwapStatus('Swap executed successfully!');
    } catch (error: any) {
      setSwapStatus(`Error: ${error.message}`);
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

        {/* Expected Output Display (TODO: Calculate based on price) */}
        {inputAmount && (
          <div className="output">
            <strong>Expected Output:</strong> Calculating...
            <br />
            <small>(Price data will be fetched from the market account)</small>
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
