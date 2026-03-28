#!/bin/bash
set -e

echo "🚀 Deploying Solana SWAP Program to Devnet"
echo "============================================"

# Build the program
echo "📦 Building program..."
anchor build

# Generate keypair if not exists
if [ ! -f "target/deploy/swap_program-keypair.json" ]; then
    echo "🔑 Generating new program keypair..."
    solana-keygen new --outfile target/deploy/swap_program-keypair.json --no-bip39-passphrase
fi

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/swap_program-keypair.json)
echo "📋 Program ID: $PROGRAM_ID"

# Update declare_id! in lib.rs
echo "✏️  Updating program ID in source code..."
sed -i.bak "s/declare_id!(\".*\")/declare_id!(\"$PROGRAM_ID\")/" programs/swap_program/src/lib.rs
rm programs/swap_program/src/lib.rs.bak

# Rebuild with correct ID
echo "🔧 Rebuilding with updated program ID..."
anchor build

# Configure Solana CLI for devnet
echo "🌐 Configuring Solana CLI for devnet..."
solana config set --url https://api.devnet.solana.com

# Check balance
BALANCE=$(solana balance | awk '{print $1}')
echo "💰 Wallet balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2.0" | bc -l) )); then
    echo "⚠️  Low balance! Requesting airdrop..."
    solana airdrop 2
    sleep 5
fi

# Deploy program
echo "🚀 Deploying to devnet..."
anchor deploy --provider.cluster devnet

echo "✅ Deployment complete!"
echo "📋 Program ID: $PROGRAM_ID"
echo "🔗 Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo ""
echo "Next steps:"
echo "1. Update Anchor.toml with deployed program ID"
echo "2. Update app/src/contexts/AnchorContext.tsx with program ID"
echo "3. Deploy frontend to hosting platform"
