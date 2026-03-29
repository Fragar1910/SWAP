#!/bin/bash
set -e

echo "======================================================================"
echo "Solana Toolchain Verification - Homebrew Edition"
echo "======================================================================"
echo ""
echo "This script will VERIFY (not install):"
echo "1. Solana CLI (Homebrew)"
echo "2. Rust toolchain"
echo "3. Anchor dependencies"
echo "4. Shell configuration"
echo ""
echo "⚠️  IMPORTANT: This script does NOT install or modify anything!"
echo "   It only verifies your existing installations."
echo ""
echo "Prerequisites:"
echo "  - brew install solana"
echo "  - Rust installed (rustup or Homebrew)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Step 1: Verify Homebrew Solana is installed
echo ""
echo "[1/4] Verifying Homebrew Solana installation..."
if ! command -v solana &> /dev/null; then
    echo "❌ ERROR: Solana not found!"
    echo "   Please install with: brew install solana"
    exit 1
fi

SOLANA_PATH=$(which solana)
if [[ $SOLANA_PATH == *"homebrew"* ]] || [[ $SOLANA_PATH == *"Cellar"* ]]; then
    echo "✅ Homebrew Solana found at: $SOLANA_PATH"
    solana --version
else
    echo "⚠️  Solana found at: $SOLANA_PATH"
    echo "   This may not be the Homebrew version"
fi

# Step 2: Verify Rust installation
echo ""
echo "[2/4] Verifying Rust installation..."
if ! command -v rustc &> /dev/null; then
    echo "❌ ERROR: Rust not found!"
    echo "   Please install Rust first"
    exit 1
fi

RUST_PATH=$(which rustc)
echo "✅ Rust found at: $RUST_PATH"
rustc --version

# Step 3: Verify installations
echo ""
echo "[3/4] Verifying installations..."
echo ""
echo "Solana version:"
solana --version || {
    echo "❌ ERROR: Solana command failed"
    echo "   Make sure Solana is installed with: brew install solana"
    exit 1
}

echo ""
echo "Rust toolchain:"
rustc --version
cargo --version

echo ""
echo "Anchor version:"
if command -v anchor &> /dev/null; then
    anchor --version
else
    echo "⚠️  Anchor not installed"
    echo "   Install with: cargo install --git https://github.com/coral-xyz/anchor avm --locked --force && avm install latest && avm use latest"
fi

echo ""
echo "cargo-build-sbf:"
if command -v cargo-build-sbf &> /dev/null; then
    cargo-build-sbf --version
else
    echo "⚠️  cargo-build-sbf not found in PATH"
    echo "   This should be provided by Solana CLI. Checking..."
    if [ -f "$HOME/.cargo/bin/cargo-build-sbf" ]; then
        "$HOME/.cargo/bin/cargo-build-sbf" --version
        echo "   ✅ Found at: $HOME/.cargo/bin/cargo-build-sbf"
    else
        echo "   ❌ Not found. May need to reinstall Solana CLI."
    fi
fi

# Step 4: Configure shell profile
echo ""
echo "[4/4] Configuring shell profile..."

SHELL_PROFILE=""
if [ -f "$HOME/.zshrc" ]; then
    SHELL_PROFILE="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
    SHELL_PROFILE="$HOME/.bashrc"
elif [ -f "$HOME/.bash_profile" ]; then
    SHELL_PROFILE="$HOME/.bash_profile"
fi

if [ -n "$SHELL_PROFILE" ]; then
    # Add cargo PATH if not present
    if ! grep -q 'cargo/env' "$SHELL_PROFILE"; then
        echo "" >> "$SHELL_PROFILE"
        echo "# Rust cargo" >> "$SHELL_PROFILE"
        echo '. "$HOME/.cargo/env"' >> "$SHELL_PROFILE"
        echo "✅ Shell profile updated: $SHELL_PROFILE"
        echo "   Added Rust cargo PATH"
    else
        echo "✅ Shell profile already configured"
    fi
else
    echo "⚠️  Could not detect shell profile"
fi

echo ""
echo "ℹ️  NOTE: Homebrew Solana PATH is managed by Homebrew automatically"
echo "   Location: /opt/homebrew/bin/solana"

# Final instructions
echo ""
echo "======================================================================"
echo "✅ Configuration Complete!"
echo "======================================================================"
echo ""
echo "✅ Homebrew Solana: $(which solana)"
echo "✅ Rust: $(which rustc)"
echo "✅ Cargo: $(which cargo)"
echo ""
echo "Next steps:"
echo "1. (Optional) Restart your terminal if you added cargo to PATH"
echo ""
echo "2. Test compilation:"
echo "   cd /Users/paco/Documents/CodeCrypto/Trabajos/RUST/Practice/SWAP"
echo "   anchor build"
echo ""
echo "3. Test on localhost:"
echo "   solana-test-validator --reset"
echo "   anchor deploy"
echo ""
echo "4. Deploy to devnet (when ready):"
echo "   solana config set --url https://api.devnet.solana.com"
echo "   solana airdrop 2"
echo "   anchor deploy --provider.cluster devnet"
echo ""
echo "======================================================================"
