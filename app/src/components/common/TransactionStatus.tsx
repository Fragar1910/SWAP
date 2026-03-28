import React from 'react';

export enum TransactionStatus {
  Idle = 'idle',
  Building = 'building',
  Signing = 'signing',
  Pending = 'pending',
  Confirming = 'confirming',
  Confirmed = 'confirmed',
  Failed = 'failed',
}

interface TransactionStatusProps {
  status: TransactionStatus;
  signature?: string | null;
  onClose?: () => void;
}

export const TransactionStatusDisplay: React.FC<TransactionStatusProps> = ({
  status,
  signature,
  onClose,
}) => {
  if (status === TransactionStatus.Idle) return null;

  const getStatusConfig = () => {
    switch (status) {
      case TransactionStatus.Building:
        return {
          icon: '🔨',
          title: 'Building Transaction',
          description: 'Preparing your transaction...',
          color: 'blue',
        };
      case TransactionStatus.Signing:
        return {
          icon: '✍️',
          title: 'Awaiting Signature',
          description: 'Please sign the transaction in your wallet',
          color: 'yellow',
        };
      case TransactionStatus.Pending:
        return {
          icon: '⏳',
          title: 'Transaction Pending',
          description: 'Waiting for blockchain confirmation...',
          color: 'blue',
        };
      case TransactionStatus.Confirming:
        return {
          icon: '🔄',
          title: 'Confirming',
          description: 'Transaction is being confirmed...',
          color: 'blue',
        };
      case TransactionStatus.Confirmed:
        return {
          icon: '✅',
          title: 'Transaction Confirmed',
          description: 'Your transaction was successful!',
          color: 'green',
        };
      case TransactionStatus.Failed:
        return {
          icon: '❌',
          title: 'Transaction Failed',
          description: 'Your transaction could not be completed',
          color: 'red',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900',
  };

  return (
    <div className={`${colorClasses[config.color] || colorClasses.blue} border rounded-lg p-4 animate-fade-in`}>
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <h4 className="font-medium mb-1">{config.title}</h4>
            <p className="text-sm opacity-80">{config.description}</p>
            {signature && (
              <a
                href={`https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=http://127.0.0.1:8899`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline mt-2 inline-block hover:opacity-70"
              >
                View on Explorer
              </a>
            )}
          </div>
        </div>
        {onClose && (status === TransactionStatus.Confirmed || status === TransactionStatus.Failed) && (
          <button
            onClick={onClose}
            className="text-xl leading-none hover:opacity-70"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};
