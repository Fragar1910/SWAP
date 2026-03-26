import React, { useState } from 'react';
import { useAnchor } from '../contexts/AnchorContext';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

const AdminDashboard: React.FC = () => {
  const { program } = useAnchor();
  const wallet = useAnchorWallet();

  // Initialize Market state
  const [tokenMintA, setTokenMintA] = useState('');
  const [tokenMintB, setTokenMintB] = useState('');
  const [initStatus, setInitStatus] = useState('');

  // Set Price state
  const [priceMarket, setPriceMarket] = useState('');
  const [price, setPrice] = useState('');
  const [priceStatus, setPriceStatus] = useState('');

  // Add Liquidity state
  const [liquidityMarket, setLiquidityMarket] = useState('');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [liquidityStatus, setLiquidityStatus] = useState('');

  const handleInitializeMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !wallet) {
      setInitStatus('Please connect your wallet first');
      return;
    }

    try {
      setInitStatus('Initializing market...');
      // TODO: Implement initialize market call (TASK-F4-008)
      setInitStatus('Market initialized successfully!');
    } catch (error: any) {
      setInitStatus(`Error: ${error.message}`);
    }
  };

  const handleSetPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !wallet) {
      setPriceStatus('Please connect your wallet first');
      return;
    }

    try {
      setPriceStatus('Setting price...');
      // TODO: Implement set price call (TASK-F4-009)
      setPriceStatus('Price set successfully!');
    } catch (error: any) {
      setPriceStatus(`Error: ${error.message}`);
    }
  };

  const handleAddLiquidity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !wallet) {
      setLiquidityStatus('Please connect your wallet first');
      return;
    }

    try {
      setLiquidityStatus('Adding liquidity...');
      // TODO: Implement add liquidity call (TASK-F4-010)
      setLiquidityStatus('Liquidity added successfully!');
    } catch (error: any) {
      setLiquidityStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      {/* Initialize Market Section */}
      <section className="section">
        <h2>Initialize Market</h2>
        <form onSubmit={handleInitializeMarket}>
          <div className="form-group">
            <label htmlFor="tokenMintA">Token Mint A Address</label>
            <input
              type="text"
              id="tokenMintA"
              value={tokenMintA}
              onChange={(e) => setTokenMintA(e.target.value)}
              placeholder="Enter Token A mint address"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="tokenMintB">Token Mint B Address</label>
            <input
              type="text"
              id="tokenMintB"
              value={tokenMintB}
              onChange={(e) => setTokenMintB(e.target.value)}
              placeholder="Enter Token B mint address"
              required
            />
          </div>

          <button type="submit" disabled={!wallet}>
            Initialize Market
          </button>

          {initStatus && (
            <div className={`status ${initStatus.includes('Error') ? 'error' : initStatus.includes('successfully') ? 'success' : 'info'}`}>
              {initStatus}
            </div>
          )}
        </form>
      </section>

      {/* Set Price Section */}
      <section className="section">
        <h2>Set Price</h2>
        <form onSubmit={handleSetPrice}>
          <div className="form-group">
            <label htmlFor="priceMarket">Market Address</label>
            <input
              type="text"
              id="priceMarket"
              value={priceMarket}
              onChange={(e) => setPriceMarket(e.target.value)}
              placeholder="Enter market PDA address"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="price">Price (Token B per Token A)</label>
            <input
              type="number"
              id="price"
              step="0.000001"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price (e.g., 2.5)"
              required
            />
          </div>

          <button type="submit" disabled={!wallet}>
            Set Price
          </button>

          {priceStatus && (
            <div className={`status ${priceStatus.includes('Error') ? 'error' : priceStatus.includes('successfully') ? 'success' : 'info'}`}>
              {priceStatus}
            </div>
          )}
        </form>
      </section>

      {/* Add Liquidity Section */}
      <section className="section">
        <h2>Add Liquidity</h2>
        <form onSubmit={handleAddLiquidity}>
          <div className="form-group">
            <label htmlFor="liquidityMarket">Market Address</label>
            <input
              type="text"
              id="liquidityMarket"
              value={liquidityMarket}
              onChange={(e) => setLiquidityMarket(e.target.value)}
              placeholder="Enter market PDA address"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="amountA">Amount Token A</label>
            <input
              type="number"
              id="amountA"
              step="0.000001"
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
              placeholder="Enter amount of Token A"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="amountB">Amount Token B</label>
            <input
              type="number"
              id="amountB"
              step="0.000001"
              value={amountB}
              onChange={(e) => setAmountB(e.target.value)}
              placeholder="Enter amount of Token B"
              required
            />
          </div>

          <button type="submit" disabled={!wallet}>
            Add Liquidity
          </button>

          {liquidityStatus && (
            <div className={`status ${liquidityStatus.includes('Error') ? 'error' : liquidityStatus.includes('successfully') ? 'success' : 'info'}`}>
              {liquidityStatus}
            </div>
          )}
        </form>
      </section>
    </div>
  );
};

export default AdminDashboard;
