#!/bin/bash
set -e

# Asegurar que cargo de rustup se use antes que el de Homebrew
export PATH="$HOME/.cargo/bin:/usr/bin:$PATH"

echo "======================================================================"
echo "🚀 SWAP DEX - Localhost Deployment Script"
echo "======================================================================"
echo ""
echo "This script will:"
echo "1. Start solana-test-validator (if not running)"
echo "2. Configure Solana CLI for localhost"
echo "3. Build the program with Anchor"
echo "4. Deploy to localhost"
echo "5. Show deployment info"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Change to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo ""
echo "======================================================================"
echo "Step 1/5: Check solana-test-validator"
echo "======================================================================"
echo ""

# Check if validator is running
if pgrep -f solana-test-validator > /dev/null; then
    echo "✅ solana-test-validator is already running"
    read -p "Do you want to restart it (reset blockchain state)? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping validator..."
        pkill -f solana-test-validator || true
        sleep 2
        echo "Starting fresh validator..."
        solana-test-validator --reset > test-validator.log 2>&1 &
        echo "✅ Validator restarted (clean state)"
        sleep 5
    fi
else
    echo "Starting solana-test-validator..."
    solana-test-validator --reset > test-validator.log 2>&1 &
    echo "✅ Validator started"
    sleep 5
fi

echo ""
echo "Validator info:"
tail -10 test-validator.log | grep -E "(Identity|RPC URL|WebSocket)" || echo "Validator running on http://127.0.0.1:8899"

echo ""
echo "======================================================================"
echo "Step 2/5: Configure Solana CLI for localhost"
echo "======================================================================"
echo ""

solana config set --url http://127.0.0.1:8899
echo ""
echo "Current config:"
solana config get

echo ""
echo "======================================================================"
echo "Step 3/5: Check wallet balance"
echo "======================================================================"
echo ""

BALANCE=$(solana balance 2>/dev/null | awk '{print $1}')
echo "💰 Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 10.0" | bc -l 2>/dev/null || echo 0) )); then
    echo "Requesting airdrop (10 SOL)..."
    solana airdrop 10
    sleep 2
    BALANCE=$(solana balance | awk '{print $1}')
    echo "💰 New balance: $BALANCE SOL"
fi

echo ""
echo "======================================================================"
echo "Step 4/5: Build and deploy program"
echo "======================================================================"
echo ""

echo "📦 Building program with Anchor..."
anchor build

if [ ! -f "target/deploy/swap_program.so" ]; then
    echo "❌ ERROR: Program binary not found after build!"
    exit 1
fi

echo "✅ Program built successfully"
echo ""
echo "📋 Program binary size: $(ls -lh target/deploy/swap_program.so | awk '{print $5}')"
echo ""

echo "🚀 Deploying to localhost..."
anchor deploy

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
else
    echo "❌ Deployment failed!"
    exit 1
fi

echo ""
echo "======================================================================"
echo "Step 5/5: Deployment Summary"
echo "======================================================================"
echo ""

# Get program ID from Anchor.toml or target/idl
if [ -f "target/idl/swap_program.json" ]; then
    PROGRAM_ID=$(grep -o '"address": "[^"]*"' target/idl/swap_program.json | head -1 | sed 's/"address": "\(.*\)"/\1/')
    echo "📋 Program ID: $PROGRAM_ID"
    echo "📁 IDL: target/idl/swap_program.json"
else
    echo "⚠️  Could not read Program ID from IDL"
fi

echo ""
echo "✅ Localhost deployment complete!"
echo ""
echo "======================================================================"
echo "Next Steps:"
echo "======================================================================"
echo ""
echo "1. Run integration tests:"
echo "   anchor test --skip-local-validator"
echo ""
echo "2. Start frontend:"
echo "   cd app && yarn start"
echo ""
echo "3. Configure Phantom wallet:"
echo "   - Settings → Change Network → Localhost"
echo "   - Custom RPC URL: http://127.0.0.1:8899"
echo ""
echo "4. Request SOL in Phantom:"
echo "   solana airdrop 10 <YOUR_PHANTOM_ADDRESS>"
echo ""
echo "5. Access web app:"
echo "   - Admin Dashboard: http://localhost:3000/admin"
echo "   - Swap Interface: http://localhost:3000"
echo ""
echo "6. View validator logs:"
echo "   tail -f test-validator.log"
echo ""
echo "======================================================================"
