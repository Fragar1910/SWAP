import React from 'react';
import { PublicKey } from '@solana/web3.js';

interface MarketDetailsProps {
  marketAddress: string;
  tokenMintA?: PublicKey;
  tokenMintB?: PublicKey;
  price: number;
  vaultABalance?: string;
  vaultBBalance?: string;
  authority?: PublicKey;
}

export const MarketDetails: React.FC<MarketDetailsProps> = ({
  marketAddress,
  tokenMintA,
  tokenMintB,
  price,
  vaultABalance,
  vaultBBalance,
  authority,
}) => {
  const formatAddress = (address: string) => {
    if (address.length < 12) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Market Information
      </h3>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600 block mb-1">Market Address</label>
            <p className="text-sm font-mono text-gray-900" title={marketAddress}>
              {formatAddress(marketAddress)}
            </p>
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">Exchange Rate</label>
            <p className="text-sm font-semibold text-blue-600">
              1 A = {price.toFixed(6)} B
            </p>
          </div>
        </div>

        {(vaultABalance || vaultBBalance) && (
          <div className="pt-3 border-t border-gray-300">
            <label className="text-xs text-gray-600 block mb-2">Liquidity</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded p-2">
                <span className="text-xs text-gray-600 block">Vault A</span>
                <span className="text-sm font-semibold text-gray-900">
                  {vaultABalance || '0'} tokens
                </span>
              </div>
              <div className="bg-white rounded p-2">
                <span className="text-xs text-gray-600 block">Vault B</span>
                <span className="text-sm font-semibold text-gray-900">
                  {vaultBBalance || '0'} tokens
                </span>
              </div>
            </div>
          </div>
        )}

        {(tokenMintA || tokenMintB) && (
          <div className="pt-3 border-t border-gray-300 text-xs space-y-1">
            {tokenMintA && (
              <div className="flex justify-between">
                <span className="text-gray-600">Token A Mint:</span>
                <span className="font-mono text-gray-900" title={tokenMintA.toBase58()}>
                  {formatAddress(tokenMintA.toBase58())}
                </span>
              </div>
            )}
            {tokenMintB && (
              <div className="flex justify-between">
                <span className="text-gray-600">Token B Mint:</span>
                <span className="font-mono text-gray-900" title={tokenMintB.toBase58()}>
                  {formatAddress(tokenMintB.toBase58())}
                </span>
              </div>
            )}
            {authority && (
              <div className="flex justify-between">
                <span className="text-gray-600">Authority:</span>
                <span className="font-mono text-gray-900" title={authority.toBase58()}>
                  {formatAddress(authority.toBase58())}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
