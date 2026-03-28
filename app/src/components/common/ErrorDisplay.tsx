import React from 'react';

interface ErrorDisplayProps {
  error: string | null;
  onDismiss?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  // Parse common errors to user-friendly messages
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
    if (err.includes('Unauthorized') || err.includes('has_one')) {
      return 'You are not authorized to perform this operation.';
    }
    if (err.includes('User rejected') || err.includes('rejected')) {
      return 'Transaction was rejected in your wallet.';
    }
    if (err.includes('SameTokenSwapDisallowed')) {
      return 'Cannot create a market with the same token for both sides.';
    }
    return err;
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-fade-in">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="text-red-800 font-medium">Error</h4>
          </div>
          <p className="text-red-700 text-sm ml-7">{parseError(error)}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-800 hover:text-red-900 ml-4 text-xl leading-none"
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};
