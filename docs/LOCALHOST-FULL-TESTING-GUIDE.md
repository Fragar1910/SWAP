# SWAP DEX - Guía Completa de Testing en Localhost

> **Guía paso a paso**: Desde cero hasta swap funcional en localhost
> **Fecha**: Marzo 29, 2026
> **Tiempo estimado**: 30-45 minutos

---

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [PARTE 1: Tests en Consola](#parte-1-tests-en-consola)
3. [PARTE 2: Deployment en Localhost](#parte-2-deployment-en-localhost)
4. [PARTE 3: Configuración de Phantom Wallet](#parte-3-configuración-de-phantom-wallet)
5. [PARTE 4: Testing con Web App](#parte-4-testing-con-web-app)
6. [Troubleshooting](#troubleshooting)

---

## Requisitos Previos

### Software Instalado

```bash
# Verificar instalaciones
solana --version          # Solana CLI
anchor --version          # Anchor Framework
node --version            # Node.js
yarn --version            # Yarn package manager
```

### Phantom Wallet

- Extensión de Chrome instalada
- Cuenta creada (guardar seed phrase)
- Configurado para **Localhost** (lo haremos más adelante)

### Proyecto Clonado

```bash
cd /Users/paco/Documents/CodeCrypto/Trabajos/RUST/Practice/SWAP
```

---

## PARTE 1: Tests en Consola

**Objetivo**: Verificar que el smart contract funciona correctamente antes de deployar.

### Paso 1.1: Iniciar Test Validator

```bash
# Terminal 1 (mantener abierta)
solana-test-validator --reset
```

**Salida esperada**:
```
Ledger location: test-ledger
Log: test-ledger/validator.log
Identity: 2ZeevqhcxzWaVSxPYzC1gSruiG15zZdb4Lx8HyQWqntN
Genesis Hash: 9PDBjqyoZkvvBLabUHVLa6dzYeFncJwCDZ8KoZUR9se9
Version: 3.1.11
Shred Version: 21674
Gossip Address: 127.0.0.1:8000
TPU Address: 127.0.0.1:8003
JSON RPC URL: http://127.0.0.1:8899
WebSocket PubSub URL: ws://127.0.0.1:8900
```

✅ **Validator corriendo** - Mantén esta terminal abierta.

---

### Paso 1.2: Ejecutar Tests de Integración

Abre una **nueva terminal** (Terminal 2):

```bash
# Terminal 2
cd /Users/paco/Documents/CodeCrypto/Trabajos/RUST/Practice/SWAP

# Configurar para localhost
solana config set --url http://127.0.0.1:8899

# Verificar configuración
solana config get

# Ejecutar tests
anchor test --skip-local-validator
```

**¿Qué hace este comando?**
- `anchor test`: Ejecuta tests TypeScript
- `--skip-local-validator`: No inicia nuevo validator (ya tenemos uno corriendo)

**Salida esperada**:
```
  Administrative Instructions
Program ID: AGMg3zTXw2DNy2RzBtvxTTt3DCM2EY2LPYXssdanWjV7
Authority: 4DnJLcuBuBBCKAKDodMayVGzkBikRQqYv8CaJ36bCNF4
Setting up test environment...
Mint A created: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
Mint B created: EjmyN6qEC1Tf1JxiG1ae7UTJhUxSwk1TCWNWqxWV4J6o
    ✔ Initialize market (1234ms)
    ✔ Set price (567ms)
    ✔ Add liquidity (891ms)

  Swap Instructions
    ✔ Swap A to B (1012ms)
    ✔ Swap B to A (987ms)
    ✔ Fails with insufficient liquidity (456ms)

  6 passing (8s)
```

✅ **Si todos los tests pasan**: Smart contract funciona correctamente.

❌ **Si hay errores**: Ver [Troubleshooting](#troubleshooting)

---

### Paso 1.3: Entender los Tests

#### Test File 1: `tests/swap-program.ts`

**Qué hace**:
1. Crea 2 tokens de prueba (Token A y Token B)
2. Inicializa un market
3. Establece precio
4. Añade liquidez
5. Ejecuta swaps A→B y B→A

**Ejemplo de ejecución**:
```typescript
// Token A: 6 decimals (como USDC)
// Token B: 9 decimals (como SOL)
// Price: 2.5 (1 Token A = 2.5 Token B)

// Swap 100 Token A → 250 Token B
```

#### Test File 2: `tests/full-integration.ts`

**Qué hace**:
- Test end-to-end completo
- Simula flujo de usuario real
- Verifica balances antes/después

---

### Paso 1.4: Ver Logs del Validator

Si quieres ver qué está pasando en el validator:

```bash
# Terminal 3
tail -f test-ledger/validator.log
```

Verás transacciones, errores, eventos, etc.

---

## PARTE 2: Deployment en Localhost

**Objetivo**: Deployar el programa para que la web app pueda usarlo.

### Paso 2.1: Usar el Script de Deployment Automático

```bash
# Terminal 2 (donde corrimos los tests)
bash scripts/deploy-localhost.sh
```

**El script hará**:
1. Verificar que validator esté corriendo
2. Configurar Solana CLI para localhost
3. Verificar balance de wallet
4. Build del programa con `anchor build`
5. Deploy con `anchor deploy`
6. Mostrar Program ID

**Salida esperada**:
```
======================================================================
🚀 SWAP DEX - Localhost Deployment Script
======================================================================

This script will:
1. Start solana-test-validator (if not running)
2. Configure Solana CLI for localhost
3. Build the program with Anchor
4. Deploy to localhost
5. Show deployment info

Continue? (y/n) y

======================================================================
Step 1/5: Check solana-test-validator
======================================================================

✅ solana-test-validator is already running

======================================================================
Step 2/5: Configure Solana CLI for localhost
======================================================================

Config File: /Users/paco/.config/solana/cli/config.yml
RPC URL: http://127.0.0.1:8899
WebSocket URL: ws://127.0.0.1:8900/ (computed)
Keypair Path: /Users/paco/.config/solana/id.json
Commitment: confirmed

======================================================================
Step 3/5: Check wallet balance
======================================================================

💰 Current balance: 500.0 SOL

======================================================================
Step 4/5: Build and deploy program
======================================================================

📦 Building program with Anchor...
    Finished release [optimized] target(s) in 45.67s
✅ Program built successfully

📋 Program binary size: 324K

🚀 Deploying to localhost...
Program Id: AGMg3zTXw2DNy2RzBtvxTTt3DCM2EY2LPYXssdanWjV7
✅ Deployment successful!

======================================================================
Step 5/5: Deployment Summary
======================================================================

📋 Program ID: AGMg3zTXw2DNy2RzBtvxTTt3DCM2EY2LPYXssdanWjV7
📁 IDL: target/idl/swap_program.json

✅ Localhost deployment complete!
```

✅ **Program deployado** - Anota el Program ID.

---

### Paso 2.2: Verificar Deployment

```bash
# Verificar que el programa está deployado
solana program show AGMg3zTXw2DNy2RzBtvxTTt3DCM2EY2LPYXssdanWjV7
```

**Salida esperada**:
```
Program Id: AGMg3zTXw2DNy2RzBtvxTTt3DCM2EY2LPYXssdanWjV7
Owner: BPFLoaderUpgradeab1e11111111111111111111111
ProgramData Address: 84Ho48CBcCbTdGP6WuWsGKMK25rSBqfvB7tV91fhSBKP
Authority: 4DnJLcuBuBBCKAKDodMayVGzkBikRQqYv8CaJ36bCNF4
Last Deployed In Slot: 55
Data Length: 331288 (0x50e18) bytes
Balance: 2.30696856 SOL
```

✅ **Programa verificado** - Listo para usar.

---

### Paso 2.3: Crear Tokens de Prueba (SPL Tokens)

Para usar la app necesitamos tokens SPL reales en localhost:

```bash
# Token A (USDC simulado - 6 decimals)
spl-token create-token --decimals 6
# Guarda el output: Token: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

# Token B (SOL wrapped simulado - 9 decimals)
spl-token create-token --decimals 9
# Guarda el output: Token: EjmyN6qEC1Tf1JxiG1ae7UTJhUxSwk1TCWNWqxWV4J6o
```

**Guardar estos addresses** - Los necesitarás para el admin dashboard.

---

## PARTE 3: Configuración de Phantom Wallet

**Objetivo**: Configurar Phantom para conectarse a localhost.

### Paso 3.1: Abrir Phantom Wallet

1. Click en el icono de Phantom en Chrome
2. Desbloquea con tu contraseña

---

### Paso 3.2: Cambiar a Localhost

1. Click en **Settings** (⚙️ arriba a la derecha)
2. Scroll down → **Change Network**
3. Select **Localhost**
4. Si no aparece, añadir manualmente:
   - Click **Custom RPC URL**
   - URL: `http://127.0.0.1:8899`
   - Cluster: `localhost`
   - Save

✅ **Phantom configurado para localhost**.

---

### Paso 3.3: Solicitar SOL para tu Wallet

```bash
# Copiar tu address de Phantom (click en el nombre para copiar)
# Ejemplo: 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin

# Enviar SOL a tu Phantom
solana airdrop 10 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin
```

**Verificar en Phantom**:
- Deberías ver ~10 SOL en tu balance

✅ **Phantom tiene fondos**.

---

### Paso 3.4: Crear Cuentas de Token en Phantom

Para poder recibir Token A y Token B necesitas crear cuentas:

```bash
# Token A account
spl-token create-account 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

# Token B account
spl-token create-account EjmyN6qEC1Tf1JxiG1ae7UTJhUxSwk1TCWNWqxWV4J6o
```

**Mintear tokens a tu wallet** (para testing):

```bash
# Mintear 1000 Token A (6 decimals = 1000000000)
spl-token mint 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 1000

# Mintear 1000 Token B (9 decimals = 1000000000000)
spl-token mint EjmyN6qEC1Tf1JxiG1ae7UTJhUxSwk1TCWNWqxWV4J6o 1000
```

**Verificar en Phantom**:
- Deberías ver ambos tokens listados

✅ **Tokens listos para usar**.

---

## PARTE 4: Testing con Web App

**Objetivo**: Usar la interfaz web para crear market y hacer swaps.

### Paso 4.1: Iniciar Frontend

```bash
# Terminal 4 (nueva terminal)
cd /Users/paco/Documents/CodeCrypto/Trabajos/RUST/Practice/SWAP/app
yarn start
```

**Salida esperada**:
```
Compiled successfully!

You can now view swap-dex-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.1.100:3000

webpack compiled successfully
```

Abre navegador en: **http://localhost:3000**

✅ **Frontend corriendo**.

---

### Paso 4.2: Conectar Phantom Wallet

1. En la web app, click **Connect Wallet**
2. Popup de Phantom aparece
3. Click **Connect**
4. Autorizar la conexión

✅ **Wallet conectado** - Verás tu address en la esquina.

---

### Paso 4.3: Admin Dashboard - Initialize Market

**URL**: http://localhost:3000/admin

#### Campos del Formulario:

| Campo | Valor | Ejemplo | Explicación |
|-------|-------|---------|-------------|
| **Token Mint A** | Address del Token A | `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU` | Token que se swapeará (input) |
| **Token Mint B** | Address del Token B | `EjmyN6qEC1Tf1JxiG1ae7UTJhUxSwk1TCWNWqxWV4J6o` | Token que se recibirá (output) |

#### Pasos:

1. Navegar a http://localhost:3000/admin
2. Pegar address de **Token A** en campo "Token Mint A"
3. Pegar address de **Token B** en campo "Token Mint B"
4. Click **Create Market**
5. Phantom popup → Click **Approve**
6. Esperar confirmación (~2 segundos)

**Salida esperada**:
```
✅ Market initialized successfully!
Market PDA: BzK8mP4PVx9qE8XyU2L3R7nW5T6...
```

✅ **Market creado**.

---

### Paso 4.4: Admin Dashboard - Set Price

**Objetivo**: Establecer tasa de cambio.

#### Ejemplo de Price:

| Decimals | Interpretación | Ejemplo Input |
|----------|----------------|---------------|
| **1.0** | 1 Token A = 1 Token B | `1000000` |
| **2.5** | 1 Token A = 2.5 Token B | `2500000` |
| **0.5** | 1 Token A = 0.5 Token B | `500000` |

**Fórmula**: `price_input = desired_rate * 1,000,000`

#### Pasos:

1. En Admin Dashboard, sección **Set Price**
2. Input: `2500000` (significa 1 A = 2.5 B)
3. Click **Set Price**
4. Phantom popup → Click **Approve**
5. Esperar confirmación

**Salida esperada**:
```
✅ Price updated successfully!
New price: 2.5 (2,500,000)
```

✅ **Precio configurado**.

---

### Paso 4.5: Admin Dashboard - Add Liquidity

**Objetivo**: Añadir tokens al pool para que los swaps funcionen.

#### Pasos:

1. En Admin Dashboard, sección **Add Liquidity**
2. **Amount Token A**: `100` (100 tokens)
3. **Amount Token B**: `250` (250 tokens)
4. Click **Add Liquidity**
5. Phantom popup → Click **Approve**
6. Esperar confirmación

**¿Qué pasa?**:
- Se transfieren 100 Token A de tu wallet al vault A
- Se transfieren 250 Token B de tu wallet al vault B
- Los vaults ahora tienen liquidez para swaps

**Salida esperada**:
```
✅ Liquidity added successfully!
Vault A balance: 100.0
Vault B balance: 250.0
```

✅ **Liquidez añadida**.

---

### Paso 4.6: Swap Interface - Realizar Swap

**URL**: http://localhost:3000

#### Swap A → B Example:

| Campo | Valor | Explicación |
|-------|-------|-------------|
| **Direction** | A to B | Swapear Token A por Token B |
| **Amount** | `10` | 10 Token A |
| **Expected Output** | `25` | Recibirás ~25 Token B (10 * 2.5) |

#### Pasos:

1. Navegar a http://localhost:3000
2. Select **A to B**
3. Input Amount: `10`
4. Verificar "You will receive approximately: 25.0 Token B"
5. Click **Execute Swap**
6. Phantom popup → Click **Approve**
7. Esperar confirmación

**¿Qué pasa?**:
- 10 Token A se transfieren de tu wallet → vault A
- ~25 Token B se transfieren de vault B → tu wallet
- Tus balances se actualizan

**Salida esperada**:
```
✅ Swap executed successfully!
Input: 10.0 Token A
Output: 25.0 Token B
Transaction: 5tiQcSVYUhuZ6PPdbSX5pxMEGPc53hEzS3yg1RKgrsrzuCXXjGT5S19isQayE5sUN9AJngTNSdxNMqCQMocjZDBT
```

✅ **Swap completado**.

---

#### Swap B → A Example:

| Campo | Valor | Explicación |
|-------|-------|-------------|
| **Direction** | B to A | Swapear Token B por Token A |
| **Amount** | `50` | 50 Token B |
| **Expected Output** | `20` | Recibirás ~20 Token A (50 / 2.5) |

Mismo proceso, pero en dirección opuesta.

---

### Paso 4.7: Verificar Transacciones

#### En Solana Explorer (Localhost):

**NO HAY EXPLORER PARA LOCALHOST**, pero puedes ver las transacciones en:

1. **Phantom Wallet**:
   - Click en **Activity**
   - Verás historial de transacciones

2. **Validator Logs**:
   ```bash
   tail -f test-ledger/validator.log | grep -E "(success|failed)"
   ```

3. **CLI**:
   ```bash
   # Ver balance de vault A
   spl-token balance 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU --owner <VAULT_A_PDA>
   ```

---

## Ejemplos de Uso Completo

### Ejemplo 1: USDC/SOL Market (Stablecoin ↔ Native)

```bash
# Step 1: Crear tokens
TOKEN_USDC=$(spl-token create-token --decimals 6 | grep "Creating token" | awk '{print $3}')
TOKEN_SOL=$(spl-token create-token --decimals 9 | grep "Creating token" | awk '{print $3}')

echo "USDC: $TOKEN_USDC"
echo "SOL: $TOKEN_SOL"

# Step 2: Crear cuentas y mintear
spl-token create-account $TOKEN_USDC
spl-token create-account $TOKEN_SOL
spl-token mint $TOKEN_USDC 10000  # 10,000 USDC
spl-token mint $TOKEN_SOL 1000    # 1,000 SOL

# Step 3: En la web app
# - Initialize Market: TOKEN_USDC, TOKEN_SOL
# - Set Price: 50000000 (1 USDC = 0.05 SOL, o 1 SOL = 20 USDC)
# - Add Liquidity: 1000 USDC, 50 SOL
# - Swap: 100 USDC → 5 SOL
```

---

### Ejemplo 2: Token Pair Custom

```bash
# Crear tu propio par de tokens
TOKEN_GOLD=$(spl-token create-token --decimals 8 | grep "Creating token" | awk '{print $3}')
TOKEN_SILVER=$(spl-token create-token --decimals 8 | grep "Creating token" | awk '{print $3}')

# Ratio: 1 GOLD = 80 SILVER
# Price input: 80 * 1,000,000 = 80,000,000

# En web app:
# - Initialize: TOKEN_GOLD, TOKEN_SILVER
# - Set Price: 80000000
# - Add Liquidity: 10 GOLD, 800 SILVER
# - Swap: 1 GOLD → 80 SILVER
```

---

## Datos de Ejemplo Para Testing

### Token Addresses (Después de Crear)

| Token | Decimals | Example Address | Uso |
|-------|----------|-----------------|-----|
| Token A (USDC-like) | 6 | `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU` | Stablecoin simulado |
| Token B (SOL-like) | 9 | `EjmyN6qEC1Tf1JxiG1ae7UTJhUxSwk1TCWNWqxWV4J6o` | Native token simulado |

### Tokens Wrapped Reales (Mainnet - Para Referencia)

**⚠️ IMPORTANTE**: Estas direcciones son de **mainnet**. Para localhost debes crear tus propios tokens con `spl-token create-token`.

| Token | Mint Address (Mainnet) | Decimals | Descripción |
|-------|------------------------|----------|-------------|
| **USDC** | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 6 | USD Coin (Circle) |
| **USDT** | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` | 6 | Tether USD |
| **SOL (Wrapped)** | `So11111111111111111111111111111111111111112` | 9 | Wrapped SOL |
| **ETH (Wormhole)** | `7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs` | 8 | Ethereum (Wormhole Bridge) |
| **wETH (Portal)** | `FeGn77dhg1KXRRFeSwwMiykZnZPw5JXW6naf2aQgZDQf` | 8 | Wrapped Ethereum (Portal) |
| **BTC (Portal)** | `3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh` | 8 | Wrapped Bitcoin (Portal) |
| **SUI (Wormhole)** | `G1vJEgzepqhnVu35SnapDFUvqt73aqEa9wcZLkDzVwmZ` | 9 | Sui (Wormhole Bridge) |
| **BONK** | `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263` | 5 | BONK meme token |

**Nota sobre Wrapped Tokens**:
- **Mainnet**: Estas direcciones funcionan en Solana mainnet-beta
- **Devnet**: Existen versiones de testnet de algunos tokens (USDC, SOL)
- **Localhost**: DEBES crear tus propios tokens, mainnet addresses NO funcionan en localhost

### Cómo Usar Estos Tokens en Localhost

**NO puedes usar las direcciones de mainnet directamente**. En su lugar:

#### Opción 1: Crear Tokens Personalizados (Recomendado)

```bash
# Simular USDC (6 decimals)
TOKEN_USDC=$(spl-token create-token --decimals 6 | grep "Creating token" | awk '{print $3}')
echo "USDC simulado: $TOKEN_USDC"

# Simular SOL wrapped (9 decimals)
TOKEN_SOL=$(spl-token create-token --decimals 9 | grep "Creating token" | awk '{print $3}')
echo "SOL simulado: $TOKEN_SOL"

# Simular ETH (8 decimals)
TOKEN_ETH=$(spl-token create-token --decimals 8 | grep "Creating token" | awk '{print $3}')
echo "ETH simulado: $TOKEN_ETH"

# Simular SUI (9 decimals)
TOKEN_SUI=$(spl-token create-token --decimals 9 | grep "Creating token" | awk '{print $3}')
echo "SUI simulado: $TOKEN_SUI"
```

#### Opción 2: Script Automático de Setup

```bash
# Crear script de setup de tokens
cat > setup-tokens.sh << 'EOF'
#!/bin/bash
set -e

echo "Creating test tokens for localhost..."
echo ""

# USDC (6 decimals)
echo "Creating USDC..."
USDC=$(spl-token create-token --decimals 6 2>&1 | grep "Creating token" | awk '{print $3}')
spl-token create-account $USDC
spl-token mint $USDC 1000000
echo "✅ USDC: $USDC (1,000,000 minted)"

# SOL (9 decimals)
echo "Creating SOL..."
SOL=$(spl-token create-token --decimals 9 2>&1 | grep "Creating token" | awk '{print $3}')
spl-token create-account $SOL
spl-token mint $SOL 10000
echo "✅ SOL: $SOL (10,000 minted)"

# ETH (8 decimals)
echo "Creating ETH..."
ETH=$(spl-token create-token --decimals 8 2>&1 | grep "Creating token" | awk '{print $3}')
spl-token create-account $ETH
spl-token mint $ETH 100
echo "✅ ETH: $ETH (100 minted)"

# SUI (9 decimals)
echo "Creating SUI..."
SUI=$(spl-token create-token --decimals 9 2>&1 | grep "Creating token" | awk '{print $3}')
spl-token create-account $SUI
spl-token mint $SUI 50000
echo "✅ SUI: $SUI (50,000 minted)"

echo ""
echo "======================================================================"
echo "✅ All tokens created and minted!"
echo "======================================================================"
echo ""
echo "Use these addresses in the web app:"
echo "USDC: $USDC"
echo "SOL:  $SOL"
echo "ETH:  $ETH"
echo "SUI:  $SUI"
echo ""
echo "Save these for your testing session!"
EOF

chmod +x setup-tokens.sh
bash setup-tokens.sh
```

### Ejemplo de Market Setup con Tokens Simulados

#### Market 1: USDC/SOL (Stablecoin ↔ Native)

```bash
# Después de ejecutar setup-tokens.sh, usar los addresses generados:

# En Admin Dashboard:
Token Mint A: <TU_USDC_ADDRESS>
Token Mint B: <TU_SOL_ADDRESS>

# Set Price: 50,000,000 (1 USDC = 0.05 SOL, o 1 SOL = 20 USDC)
# Add Liquidity: 10,000 USDC, 500 SOL
# Swap Example: 100 USDC → 5 SOL
```

#### Market 2: ETH/USDC (Crypto ↔ Stablecoin)

```bash
# En Admin Dashboard:
Token Mint A: <TU_ETH_ADDRESS>
Token Mint B: <TU_USDC_ADDRESS>

# Set Price: 2000,000,000 (1 ETH = 2000 USDC)
# Add Liquidity: 10 ETH, 20,000 USDC
# Swap Example: 1 ETH → 2000 USDC
```

#### Market 3: SUI/SOL (Alt L1 ↔ Native)

```bash
# En Admin Dashboard:
Token Mint A: <TU_SUI_ADDRESS>
Token Mint B: <TU_SOL_ADDRESS>

# Set Price: 500,000 (1 SUI = 0.5 SOL, o 1 SOL = 2 SUI)
# Add Liquidity: 1,000 SUI, 500 SOL
# Swap Example: 100 SUI → 50 SOL
```

### Price Examples

| Ratio | Significa | Price Input |
|-------|-----------|-------------|
| 1:1 | 1 A = 1 B | 1000000 |
| 1:2 | 1 A = 2 B | 2000000 |
| 1:10 | 1 A = 10 B | 10000000 |
| 1:0.5 | 1 A = 0.5 B | 500000 |
| 1:100 | 1 A = 100 B | 100000000 |

### Liquidity Examples

| Token A Amount | Token B Amount | Price Ratio | Total Value (en A) |
|----------------|----------------|-------------|-------------------|
| 100 | 250 | 2.5 | 200 A |
| 1000 | 1000 | 1.0 | 2000 A |
| 50 | 5000 | 100.0 | 100 A |

### Swap Examples

| Direction | Input | Price | Expected Output |
|-----------|-------|-------|-----------------|
| A → B | 10 A | 2.5 | 25 B |
| B → A | 25 B | 2.5 | 10 A |
| A → B | 100 A | 1.0 | 100 B |
| B → A | 50 B | 0.5 | 100 A |

---

## Troubleshooting

### Error: "solana-test-validator not found"

**Solución**:
```bash
# Instalar Solana CLI
brew install solana
# O
bash scripts/fix-solana-toolchain.sh
```

---

### Error: "anchor: command not found"

**Solución**:
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

---

### Error: "Transaction simulation failed: Error processing Instruction 0"

**Causas comunes**:
1. **Price no está configurado** → Set price en admin dashboard
2. **Liquidez insuficiente** → Add liquidity
3. **Wrong token accounts** → Verificar que tienes cuentas de ambos tokens

**Solución**:
```bash
# Ver logs detallados
tail -f test-ledger/validator.log
```

---

### Error: "Phantom no conecta"

**Verificar**:
1. Phantom está en red **Localhost**
2. URL es `http://127.0.0.1:8899`
3. Validator está corriendo: `ps aux | grep solana-test-validator`

**Reset Phantom**:
1. Settings → Reset Transaction History
2. Settings → Reset Account

---

### Error: "Insufficient funds"

**Solución**:
```bash
# Solicitar más SOL
solana airdrop 10

# Verificar balance
solana balance
```

---

### Error: "Market not found"

**Causas**:
- Validator fue reiniciado (borra el state)
- Market no fue inicializado

**Solución**:
1. Redeployar: `bash scripts/deploy-localhost.sh`
2. Re-initialize market en admin dashboard

---

### Frontend no carga

**Verificar**:
```bash
# Puerto 3000 está libre?
lsof -ti:3000

# Matar proceso si necesario
kill $(lsof -ti:3000)

# Reiniciar frontend
cd app && yarn start
```

---

## Comandos de Referencia Rápida

### Validator

```bash
# Iniciar
solana-test-validator --reset

# Ver logs
tail -f test-ledger/validator.log

# Detener
pkill -f solana-test-validator
```

### Deployment

```bash
# Deploy completo (automático)
bash scripts/deploy-localhost.sh

# Deploy manual
anchor build
anchor deploy
```

### Tokens

```bash
# Crear token
spl-token create-token --decimals 6

# Crear cuenta
spl-token create-account <TOKEN_ADDRESS>

# Mintear
spl-token mint <TOKEN_ADDRESS> <AMOUNT>

# Ver balance
spl-token balance <TOKEN_ADDRESS>
```

### Solana CLI

```bash
# Config
solana config set --url http://127.0.0.1:8899
solana config get

# Balance
solana balance
solana airdrop 10

# Program
solana program show <PROGRAM_ID>
```

### Testing

```bash
# Tests Anchor
anchor test --skip-local-validator

# Tests específicos
anchor test --skip-local-validator -- --grep "Initialize market"
```

---

## Checklist de Testing Completo

- [ ] Validator iniciado
- [ ] Tests en consola pasaron
- [ ] Programa deployado
- [ ] Tokens A y B creados
- [ ] Cuentas de tokens creadas
- [ ] Tokens minteados a wallet
- [ ] Phantom configurado para localhost
- [ ] Phantom tiene SOL
- [ ] Frontend iniciado
- [ ] Wallet conectado en web app
- [ ] Market inicializado
- [ ] Precio configurado
- [ ] Liquidez añadida
- [ ] Swap A→B ejecutado exitosamente
- [ ] Swap B→A ejecutado exitosamente
- [ ] Balances verificados en Phantom

✅ **Si completaste todo**: ¡Felicidades! SWAP DEX funciona perfectamente en localhost.

---

## Próximos Pasos

1. **Explorar más funcionalidades**:
   - Crear múltiples markets
   - Probar diferentes ratios de precio
   - Test con usuarios múltiples

2. **Deploy a Devnet** (cuando red esté disponible):
   ```bash
   bash scripts/deploy.sh
   ```

3. **Implementar mejoras de seguridad**:
   - Ver `docs/SECURITY-AUDIT-REPORT.md`
   - Implementar slippage protection
   - Añadir circuit breaker

4. **Frontend improvements**:
   - Network selector
   - Transaction history
   - Better error messages

---

**Documento generado**: Marzo 29, 2026
**Versión**: 1.0
**Autor**: FASE-5 Documentation
**Soporte**: Ver `docs/MANUAL-TESTING-GUIDE.md` para más detalles
