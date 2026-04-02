# Solución al Error de Toolchain en Anchor

## Problema

Al ejecutar `anchor test` o `anchor build`, obtenías el siguiente error:

```bash
error: no such command: `+1.89.0-sbpf-solana-v1.53`
help: invoke `cargo` through `rustup` to handle `+toolchain` directives
```

## Causa

El problema era que el `cargo` de **Homebrew** (`/opt/homebrew/bin/cargo`) estaba siendo usado en lugar del `cargo` de **rustup** (`~/.cargo/bin/cargo`).

El cargo de Homebrew no entiende la sintaxis `+toolchain` que Anchor usa para compilar programas de Solana.

## Solución Aplicada

### 1. Configuración Permanente del PATH

Se creó el archivo `~/.zshrc` con la siguiente configuración:

```bash
# 1. Cargar Homebrew primero
if [ -f /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# 2. Cargar cargo environment
if [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env"
fi

# 3. Forzar que cargo de rustup esté AL PRINCIPIO
export PATH="$HOME/.cargo/bin:$PATH"
```

Esto asegura que `~/.cargo/bin/cargo` (rustup) se use antes que `/opt/homebrew/bin/cargo` (Homebrew).

### 2. Scripts Actualizados

Se crearon/actualizaron los siguientes scripts:

#### `scripts/anchor-wrapper.sh`
Wrapper para ejecutar Anchor con el PATH correcto:

```bash
./scripts/anchor-wrapper.sh build
./scripts/anchor-wrapper.sh test --skip-local-validator
```

#### `scripts/deploy-localhost.sh`
Actualizado para usar el PATH correcto automáticamente.

#### `scripts/fix-path.sh`
Script helper para verificar/actualizar la configuración del PATH.

## Uso

### Para sesiones nuevas de terminal:

1. Abre una **nueva terminal** o ejecuta:
   ```bash
   source ~/.zshrc
   ```

2. Verifica que el PATH esté correcto:
   ```bash
   which cargo
   # Debería mostrar: /Users/paco/.cargo/bin/cargo

   cargo --version
   # Debería mostrar: cargo 1.89.0 (o similar, NO "Homebrew")
   ```

3. Ahora puedes ejecutar normalmente:
   ```bash
   anchor build
   anchor test --skip-local-validator
   anchor deploy
   ```

### Para la sesión actual (temporal):

Si no quieres reiniciar la terminal, puedes usar:

```bash
export PATH="$HOME/.cargo/bin:$PATH"
anchor test --skip-local-validator
```

O usar el wrapper:

```bash
./scripts/anchor-wrapper.sh test --skip-local-validator
```

## Verificación

Para verificar que todo está configurado correctamente:

```bash
# 1. Verificar cargo
which cargo
# Output esperado: /Users/paco/.cargo/bin/cargo

# 2. Verificar versión
cargo --version
# Output esperado: cargo 1.89.0 (NO debe decir "Homebrew")

# 3. Verificar toolchain
rustup toolchain list
# Debe incluir: 1.89.0-sbpf-solana-v1.53

# 4. Probar build
anchor build
# Debería compilar sin errores
```

## Notas Técnicas

- **Toolchain de Solana**: `1.89.0-sbpf-solana-v1.53` es el toolchain específico de Solana para compilar programas BPF
- **rustup vs Homebrew**: rustup gestiona múltiples toolchains de Rust, Homebrew solo tiene uno
- **Orden del PATH**: Es crucial que `~/.cargo/bin` esté ANTES de `/opt/homebrew/bin`

## Archivos Relacionados

- `~/.zshrc` - Configuración permanente del shell
- `scripts/anchor-wrapper.sh` - Wrapper para Anchor
- `scripts/deploy-localhost.sh` - Script de deployment actualizado
- `scripts/fix-path.sh` - Helper para configuración del PATH
