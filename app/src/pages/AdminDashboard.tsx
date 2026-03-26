import React, { useState } from 'react';
import { useAnchor } from '../contexts/AnchorContext';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';

const AdminDashboard: React.FC = () => {
  const { program } = useAnchor();
  const wallet = useAnchorWallet();

  // Initialize Market state
  const [tokenMintA, setTokenMintA] = useState('');
  const [tokenMintB, setTokenMintB] = useState('');
  const [initStatus, setInitStatus] = useState('');
  const [marketPDA, setMarketPDA] = useState('');

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
      setInitStatus('Validating token mint addresses...');

      // Parse and validate mint addresses
      const mintA = new PublicKey(tokenMintA);
      const mintB = new PublicKey(tokenMintB);

      setInitStatus('Deriving market PDA...');

      // Derive market PDA
      const [marketPDADerived] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('market'),
          mintA.toBuffer(),
          mintB.toBuffer(),
        ],
        program.programId
      );

      // Derive vault PDAs
      const [vaultA] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_a'), marketPDADerived.toBuffer()],
        program.programId
      );

      const [vaultB] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_b'), marketPDADerived.toBuffer()],
        program.programId
      );

      setInitStatus('Sending transaction...');

      // Call initialize_market instruction
      const tx = await program.methods
        .initializeMarket()
        .accounts({
          market: marketPDADerived,
          tokenMintA: mintA,
          tokenMintB: mintB,
          vaultA: vaultA,
          vaultB: vaultB,
          authority: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      setInitStatus(`✅ Market initialized successfully!\n\nMarket PDA: ${marketPDADerived.toBase58()}\nVault A: ${vaultA.toBase58()}\nVault B: ${vaultB.toBase58()}\n\nTransaction: ${tx}`);
      setMarketPDA(marketPDADerived.toBase58());

      // Auto-populate the market address in other forms
      setPriceMarket(marketPDADerived.toBase58());
      setLiquidityMarket(marketPDADerived.toBase58());

    } catch (error: any) {
      console.error('Initialize market error:', error);
      setInitStatus(`❌ Error: ${error.message || JSON.stringify(error)}`);
    }
  };

  const handleSetPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !wallet) {
      setPriceStatus('Please connect your wallet first');
      return;
    }

    try {
      setPriceStatus('Validating inputs...');

      // Parse market address
      const market = new PublicKey(priceMarket);

      // Convert price to fixed-point (multiply by 10^6)
      const priceFloat = parseFloat(price);
      if (isNaN(priceFloat) || priceFloat <= 0) {
        throw new Error('Price must be a positive number');
      }

      const priceScaled = Math.floor(priceFloat * 1_000_000);
      const priceBN = new anchor.BN(priceScaled);

      setPriceStatus('Sending transaction...');

      // Call set_price instruction
      const tx = await program.methods
        .setPrice(priceBN)
        .accounts({
          market: market,
          authority: wallet.publicKey,
        })
        .rpc();

      setPriceStatus(`✅ Price set successfully!\n\nNew Price: ${priceFloat} Token B per Token A\n(Internal: ${priceScaled})\n\nTransaction: ${tx}`);

    } catch (error: any) {
      console.error('Set price error:', error);
      setPriceStatus(`❌ Error: ${error.message || JSON.stringify(error)}`);
    }
  };

  const handleAddLiquidity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !wallet) {
      setLiquidityStatus('Please connect your wallet first');
      return;
    }

    try {
      setLiquidityStatus('Validating inputs...');

      // Parse market address
      const market = new PublicKey(liquidityMarket);

      // Fetch market account to get token mints and decimals
      setLiquidityStatus('Fetching market data...');
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

      // Get user's associated token accounts
      const authorityTokenA = await getAssociatedTokenAddress(
        marketAccount.tokenMintA,
        wallet.publicKey
      );

      const authorityTokenB = await getAssociatedTokenAddress(
        marketAccount.tokenMintB,
        wallet.publicKey
      );

      // Convert amounts to base units
      const amountAFloat = parseFloat(amountA);
      const amountBFloat = parseFloat(amountB);

      if (isNaN(amountAFloat) || amountAFloat <= 0 || isNaN(amountBFloat) || amountBFloat <= 0) {
        throw new Error('Amounts must be positive numbers');
      }

      const amountAScaled = Math.floor(amountAFloat * Math.pow(10, marketAccount.decimalsA));
      const amountBScaled = Math.floor(amountBFloat * Math.pow(10, marketAccount.decimalsB));

      const amountABN = new anchor.BN(amountAScaled);
      const amountBBN = new anchor.BN(amountBScaled);

      setLiquidityStatus('Sending transaction...');

      // Call add_liquidity instruction
      const tx = await program.methods
        .addLiquidity(amountABN, amountBBN)
        .accounts({
          market: market,
          vaultA: vaultA,
          vaultB: vaultB,
          authorityTokenA: authorityTokenA,
          authorityTokenB: authorityTokenB,
          authority: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      setLiquidityStatus(`✅ Liquidity added successfully!\n\nAmount A: ${amountAFloat} (${amountAScaled} base units)\nAmount B: ${amountBFloat} (${amountBScaled} base units)\n\nTransaction: ${tx}`);

    } catch (error: any) {
      console.error('Add liquidity error:', error);
      setLiquidityStatus(`❌ Error: ${error.message || JSON.stringify(error)}`);
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
