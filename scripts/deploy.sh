#!/bin/bash
set -e

# Change to project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "🚀 Deploying Solana SWAP Program to Devnet"
echo "============================================"

# Build the program using Solana toolchain directly via PATH
echo "📦 Building program..."

# Set PATH to use Solana's rust toolchain directly
export PATH="/Users/paco/.cache/solana/v1.53/platform-tools/rust/bin:$PATH"

cd programs/swap_program

# Build using the Solana toolchain's cargo directly
cargo build-sbf

cd ../..

# Copy the compiled .so file to target/deploy/ if needed
mkdir -p target/deploy
if [ -f "programs/swap_program/target/deploy/swap_program.so" ]; then
    cp programs/swap_program/target/deploy/swap_program.so target/deploy/swap_program.so
    echo "✅ Program binary copied to target/deploy/"
fi

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
