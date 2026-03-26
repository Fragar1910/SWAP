import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { AnchorProviderComponent } from './contexts/AnchorContext';
import AdminDashboard from './pages/AdminDashboard';
import SwapInterface from './pages/SwapInterface';
import './App.css';
import '@solana/wallet-adapter-react-ui/styles.css';

const NETWORK = 'http://127.0.0.1:8899'; // localnet

function App() {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={NETWORK}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AnchorProviderComponent>
            <BrowserRouter>
              <div className="App">
                <nav className="navbar">
                  <div className="nav-links">
                    <Link to="/">Swap</Link>
                    <Link to="/admin">Admin</Link>
                  </div>
                  <WalletMultiButton />
                </nav>

                <div className="content">
                  <Routes>
                    <Route path="/" element={<SwapInterface />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                  </Routes>
                </div>
              </div>
            </BrowserRouter>
          </AnchorProviderComponent>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
