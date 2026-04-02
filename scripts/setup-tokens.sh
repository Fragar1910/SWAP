#!/bin/bash
set -e

echo "======================================================================"
echo "🪙 Token Setup Script for Localhost Testing"
echo "======================================================================"
echo ""
echo "This script will create test tokens simulating:"
echo "  - USDC (6 decimals) - Stablecoin"
echo "  - SOL (9 decimals) - Native wrapped"
echo "  - ETH (8 decimals) - Ethereum wrapped"
echo "  - SUI (9 decimals) - Sui wrapped"
echo ""
echo "Each token will be minted to your default wallet."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "======================================================================"
echo "Creating test tokens..."
echo "======================================================================"
echo ""

# USDC (6 decimals)
echo "[1/4] Creating USDC (6 decimals)..."
USDC=$(spl-token create-token --decimals 6 2>&1 | grep "Creating token" | awk '{print $3}')
if [ -z "$USDC" ]; then
    echo "❌ Failed to create USDC token"
    exit 1
fi
spl-token create-account $USDC > /dev/null 2>&1
spl-token mint $USDC 1000000 > /dev/null 2>&1
echo "✅ USDC: $USDC"
echo "   Minted: 1,000,000 USDC"
echo ""

# SOL (9 decimals)
echo "[2/4] Creating SOL wrapped (9 decimals)..."
SOL=$(spl-token create-token --decimals 9 2>&1 | grep "Creating token" | awk '{print $3}')
if [ -z "$SOL" ]; then
    echo "❌ Failed to create SOL token"
    exit 1
fi
spl-token create-account $SOL > /dev/null 2>&1
spl-token mint $SOL 10000 > /dev/null 2>&1
echo "✅ SOL:  $SOL"
echo "   Minted: 10,000 SOL"
echo ""

# ETH (8 decimals)
echo "[3/4] Creating ETH (8 decimals)..."
ETH=$(spl-token create-token --decimals 8 2>&1 | grep "Creating token" | awk '{print $3}')
if [ -z "$ETH" ]; then
    echo "❌ Failed to create ETH token"
    exit 1
fi
spl-token create-account $ETH > /dev/null 2>&1
spl-token mint $ETH 100 > /dev/null 2>&1
echo "✅ ETH:  $ETH"
echo "   Minted: 100 ETH"
echo ""

# SUI (9 decimals)
echo "[4/4] Creating SUI (9 decimals)..."
SUI=$(spl-token create-token --decimals 9 2>&1 | grep "Creating token" | awk '{print $3}')
if [ -z "$SUI" ]; then
    echo "❌ Failed to create SUI token"
    exit 1
fi
spl-token create-account $SUI > /dev/null 2>&1
spl-token mint $SUI 50000 > /dev/null 2>&1
echo "✅ SUI:  $SUI"
echo "   Minted: 50,000 SUI"
echo ""

echo "======================================================================"
echo "✅ All tokens created and minted successfully!"
echo "======================================================================"
echo ""
echo "📋 Token Addresses (save these for Admin Dashboard):"
echo ""
echo "USDC: $USDC"
echo "SOL:  $SOL"
echo "ETH:  $ETH"
echo "SUI:  $SUI"
echo ""
echo "======================================================================"
echo "Next Steps:"
echo "======================================================================"
echo ""
echo "1. Copy these addresses for use in the web app"
echo ""
echo "2. Example Market Setup (USDC/SOL):"
echo "   Token Mint A: $USDC"
echo "   Token Mint B: $SOL"
echo "   Price: 50,000,000 (1 USDC = 0.05 SOL)"
echo "   Liquidity: 10,000 USDC, 500 SOL"
echo ""
echo "3. Example Market Setup (ETH/USDC):"
echo "   Token Mint A: $ETH"
echo "   Token Mint B: $USDC"
echo "   Price: 2,000,000,000 (1 ETH = 2,000 USDC)"
echo "   Liquidity: 10 ETH, 20,000 USDC"
echo ""
echo "4. View your token balances:"
echo "   spl-token accounts"
echo ""
echo "5. Access Admin Dashboard:"
echo "   http://localhost:3000/admin"
echo ""
echo "======================================================================"

# Save to file for reference
cat > token-addresses.txt << EOF
Token Addresses Created: $(date)
====================================

USDC: $USDC
SOL:  $SOL
ETH:  $ETH
SUI:  $SUI

Use these in Admin Dashboard to initialize markets.
EOF

echo ""
echo "💾 Addresses saved to: token-addresses.txt"
echo ""
