import React, { createContext, useContext, useMemo } from 'react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import idl from '../idl/swap_program.json';

// Network configuration
const NETWORK = 'http://127.0.0.1:8899'; // localnet https://api.devnet.solana.com para devnet en Solana. Para localnet se usa http://127.0.0.1:8899
const PROGRAM_ID = new PublicKey(idl.address);

interface AnchorContextType {
  program: any | null; // Using any to avoid strict typing issues with Anchor v0.31
  connection: Connection;
  programId: PublicKey;
}

const AnchorContext = createContext<AnchorContextType>({
  program: null,
  connection: new Connection(NETWORK, 'confirmed'),
  programId: PROGRAM_ID,
});

export const useAnchor = () => useContext(AnchorContext);

export const AnchorProviderComponent: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const wallet = useAnchorWallet();

  const connection = useMemo(() => {
    return new Connection(NETWORK, 'confirmed');
  }, []);

  const program = useMemo(() => {
    if (!wallet) return null;

    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });

    return new Program(idl as any, provider);
  }, [wallet, connection]);

  const value = {
    program,
    connection,
    programId: PROGRAM_ID,
  };

  return (
    <AnchorContext.Provider value={value}>
      {children}
    </AnchorContext.Provider>
  );
};
