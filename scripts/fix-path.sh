#!/bin/bash

# Script para actualizar el PATH en .zshrc
# Esto asegura que cargo de rustup se use antes que el de Homebrew

ZSHRC="$HOME/.zshrc"

echo "======================================================================"
echo "Configuración del PATH para Solana/Anchor"
echo "======================================================================"
echo ""
echo "Este script actualizará tu ~/.zshrc para que:"
echo "  - ~/.cargo/bin se use ANTES de /opt/homebrew/bin"
echo "  - Solana y Anchor funcionen correctamente"
echo ""

# Backup del archivo actual
cp "$ZSHRC" "$ZSHRC.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup creado: $ZSHRC.backup.$(date +%Y%m%d_%H%M%S)"

# Verificar si ya está configurado correctamente
if grep -q "# Rust cargo - DEBE estar ANTES de Homebrew" "$ZSHRC"; then
    echo "✅ La configuración ya existe en .zshrc"
    exit 0
fi

# Agregar configuración al inicio del PATH
echo "" >> "$ZSHRC"
echo "# =====================================================================" >> "$ZSHRC"
echo "# Rust cargo - DEBE estar ANTES de Homebrew para que Anchor funcione" >> "$ZSHRC"
echo "# =====================================================================" >> "$ZSHRC"
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> "$ZSHRC"
echo "" >> "$ZSHRC"

echo "✅ Configuración agregada a ~/.zshrc"
echo ""
echo "======================================================================"
echo "Siguiente paso:"
echo "======================================================================"
echo ""
echo "1. Recarga tu shell:"
echo "   source ~/.zshrc"
echo ""
echo "2. Verifica que cargo es el correcto:"
echo "   which cargo"
echo "   (Debería mostrar: /Users/paco/.cargo/bin/cargo)"
echo ""
echo "3. Ahora puedes ejecutar:"
echo "   anchor build"
echo "   anchor test --skip-local-validator"
echo ""
