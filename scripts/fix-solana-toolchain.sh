#!/bin/bash
set -e

echo "======================================================================"
echo "Solana Toolchain Fix - Elegant & Permanent Solution"
echo "======================================================================"
echo ""
echo "This script will:"
echo "1. Remove conflicting Homebrew installations"
echo "2. Install Solana CLI from official source"
echo "3. Configure rustup correctly for Solana development"
echo "4. Verify the installation"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Step 1: Remove Homebrew Solana if installed
echo ""
echo "[1/6] Checking for Homebrew Solana installation..."
if brew list solana &>/dev/null; then
    echo "⚠️  Removing Homebrew Solana (causes conflicts)..."
    brew uninstall solana
    echo "✅ Homebrew Solana removed"
else
    echo "✅ No Homebrew Solana found (good)"
fi

# Step 2: Check if Rust from Homebrew is installed
echo ""
echo "[2/6] Checking Rust installation source..."
RUST_PATH=$(which rustc 2>/dev/null || echo "")
if [[ $RUST_PATH == *"Cellar"* ]]; then
    echo "⚠️  Rust from Homebrew detected at: $RUST_PATH"
    echo "    This can cause conflicts with rustup."
    echo "    Recommendation: Keep rustup-managed Rust, remove Homebrew Rust"
    read -p "Remove Homebrew Rust? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        brew uninstall rust
        echo "✅ Homebrew Rust removed"
    fi
fi

# Step 3: Install/Update rustup (official Rust installer)
echo ""
echo "[3/6] Ensuring rustup is installed..."
if ! command -v rustup &> /dev/null; then
    echo "Installing rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    echo "✅ rustup installed"
else
    echo "✅ rustup already installed"
    rustup update
fi

# Step 4: Install Solana CLI from official source
echo ""
echo "[4/6] Installing Solana CLI from official source..."

# Remove old Solana installation if exists
if [ -d "$HOME/.local/share/solana" ]; then
    echo "Removing old Solana installation..."
    rm -rf "$HOME/.local/share/solana"
fi

# Install Solana CLI
echo "Downloading and installing Solana CLI..."
echo "This may take a few minutes..."

# Try with curl first
if ! sh -c "$(curl -sSfL https://release.solana.com/stable/install)" 2>/dev/null; then
    echo "⚠️  curl failed, trying with --insecure flag..."
    if ! sh -c "$(curl -sSfLk https://release.solana.com/stable/install)" 2>/dev/null; then
        echo "❌ ERROR: Failed to download Solana installer"
        echo ""
        echo "Possible causes:"
        echo "1. Network/SSL issues"
        echo "2. Firewall blocking the connection"
        echo "3. release.solana.com is temporarily unavailable"
        echo ""
        echo "Solutions:"
        echo "A) Try installing manually later:"
        echo "   sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
        echo ""
        echo "B) Use a different network (try your phone's hotspot)"
        echo ""
        echo "C) For now, continue with localhost testing:"
        echo "   - Use solana-test-validator for local testing"
        echo "   - Skip devnet deployment until network is fixed"
        exit 1
    fi
fi

# Wait for installation to complete
sleep 3

# Add to PATH for current session
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Verify installation directory exists
if [ ! -d "$HOME/.local/share/solana/install/active_release/bin" ]; then
    echo "❌ ERROR: Solana installation failed!"
    echo "   Directory not found: $HOME/.local/share/solana/install/active_release/bin"
    echo ""
    echo "Please try installing manually:"
    echo "   sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
fi

# Verify solana binary exists
if [ ! -f "$HOME/.local/share/solana/install/active_release/bin/solana" ]; then
    echo "❌ ERROR: Solana binary not found!"
    exit 1
fi

echo "✅ Solana CLI installed"

# Step 5: Verify installations
echo ""
echo "[5/6] Verifying installations..."
echo ""
echo "Solana version:"
"$HOME/.local/share/solana/install/active_release/bin/solana" --version || {
    echo "❌ ERROR: Solana command failed"
    echo "   Trying to add to PATH and retry..."
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
    solana --version || {
        echo "❌ Still failing. Please check installation."
        exit 1
    }
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

# Step 6: Configure shell profile
echo ""
echo "[6/6] Configuring shell profile..."

SHELL_PROFILE=""
if [ -f "$HOME/.zshrc" ]; then
    SHELL_PROFILE="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
    SHELL_PROFILE="$HOME/.bashrc"
elif [ -f "$HOME/.bash_profile" ]; then
    SHELL_PROFILE="$HOME/.bash_profile"
fi

if [ -n "$SHELL_PROFILE" ]; then
    # Remove old Solana PATH entries
    sed -i.bak '/solana/d' "$SHELL_PROFILE"

    # Add correct Solana PATH
    echo "" >> "$SHELL_PROFILE"
    echo "# Solana CLI" >> "$SHELL_PROFILE"
    echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> "$SHELL_PROFILE"

    # Add cargo PATH if not present
    if ! grep -q 'cargo/env' "$SHELL_PROFILE"; then
        echo "" >> "$SHELL_PROFILE"
        echo "# Rust cargo" >> "$SHELL_PROFILE"
        echo '. "$HOME/.cargo/env"' >> "$SHELL_PROFILE"
    fi

    echo "✅ Shell profile updated: $SHELL_PROFILE"
    echo "   Backup saved as: ${SHELL_PROFILE}.bak"
else
    echo "⚠️  Could not detect shell profile (manually add Solana to PATH)"
fi

# Final instructions
echo ""
echo "======================================================================"
echo "✅ Installation Complete!"
echo "======================================================================"
echo ""
echo "Next steps:"
echo "1. Restart your terminal OR run:"
echo "   source $SHELL_PROFILE"
echo ""
echo "2. Verify toolchain:"
echo "   solana --version"
echo "   rustc --version"
echo "   cargo-build-sbf --version"
echo ""
echo "3. Test compilation:"
echo "   cd /Users/paco/Documents/CodeCrypto/Trabajos/RUST/Practice/SWAP"
echo "   anchor build"
echo ""
echo "4. Deploy to devnet:"
echo "   solana config set --url https://api.devnet.solana.com"
echo "   solana airdrop 2"
echo "   anchor deploy --provider.cluster devnet"
echo ""
echo "======================================================================"
