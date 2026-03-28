import React from 'react';

interface SwapPreviewProps {
  inputAmount: number;
  outputAmount: number;
  direction: 'AtoB' | 'BtoA';
  exchangeRate: number;
}

export const SwapPreview: React.FC<SwapPreviewProps> = ({
  inputAmount,
  outputAmount,
  direction,
  exchangeRate,
}) => {
  if (!inputAmount || inputAmount <= 0) {
    return null;
  }

  const fromToken = direction === 'AtoB' ? 'Token A' : 'Token B';
  const toToken = direction === 'AtoB' ? 'Token B' : 'Token A';

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 className="text-sm font-medium text-blue-900 mb-3">Swap Preview</h4>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">You send:</span>
          <span className="font-semibold text-gray-900">
            {inputAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {fromToken}
          </span>
        </div>

        <div className="flex justify-center py-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">You receive:</span>
          <span className="font-bold text-blue-900 text-lg">
            ~{outputAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toToken}
          </span>
        </div>

        <div className="pt-3 mt-3 border-t border-blue-200">
          <div className="flex justify-between items-center text-xs text-gray-600">
            <span>Exchange Rate:</span>
            <span>
              1 {fromToken} = {exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toToken}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
