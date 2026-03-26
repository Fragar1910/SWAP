import React, { createContext, useContext, useMemo } from 'react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { SwapProgram } from '../types/swap_program';
import idl from '../idl/swap_program.json';

// Network configuration
const NETWORK = 'http://127.0.0.1:8899'; // localnet
const PROGRAM_ID = new PublicKey(idl.address);

interface AnchorContextType {
  program: Program<SwapProgram> | null;
  connection: Connection;
  programId: PublicKey;
}

const AnchorContext = createContext<AnchorContextType>({
  program: null,
  connection: new Connection(NETWORK, 'confirmed'),
  programId: PROGRAM_ID,
} as AnchorContextType);

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

    return new Program(idl as SwapProgram, provider);
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
