#!/bin/bash

# Wrapper para Anchor que configura el PATH correctamente
# Uso: ./scripts/anchor-wrapper.sh build
#      ./scripts/anchor-wrapper.sh test --skip-local-validator

# Configurar PATH para que cargo de rustup se use antes que el de Homebrew
export PATH="$HOME/.cargo/bin:/usr/bin:$PATH"

# Ejecutar anchor con todos los argumentos pasados
~/.cargo/bin/anchor "$@"
