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
  Administrative Instructions
Setting up test environment...
Program ID: 9LS4gVshq1ec25NoS5ZGUkoX59K7sm7Tz8woDdNtods9
Authority: 4DnJLcuBuBBCKAKDodMayVGzkBikRQqYv8CaJ36bCNF4
Mint A created: GewHuA9ESWf85A3Mti7PAeQSmwAWRZdBhzjTz3EQnnYL
Mint B created: 8sn75cUaLAoNLcqiveqK4yeP26JmsfyWQspxKDuLBvE6
Market PDA: 3hVhMWfcMaDSjUSvV2z4woPkFir2izegDZHP1a7Yk56J
Vault A: QvcgRNWRhCbqCm5kyPsnPw583nULDQ8LBhpMjoyz6F7
Vault B: 5X5mm52tE5XXUnq8EjpVGx6Rnet3MHnu3DYGbFm8gQGB
Initialize market tx: 2MtbJPLZ8b3N6zy7PaJjxioFAECjDpc3oxNcVMvjRd4zLtnziEQ5oiYPaqAdbRixQnbemo9Loa5cct91rENvJR8t
Market initialized successfully
  Authority: 4DnJLcuBuBBCKAKDodMayVGzkBikRQqYv8CaJ36bCNF4
  Price: 0
    ✔ Initializes market successfully (479ms)
Set price tx: 4DpnaDrB71okvWMS3Se9iuPrS4FnD8Tacz8MN4bBibakEtwYWKaTHv51ZGJ18RHzcS3A9wFLPbrFw7f6DsaobtoU
Price set successfully

Sale este y no el de abajo cooregido

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
Deploying cluster: http://127.0.0.1:8899
Upgrade authority: /Users/paco/.config/solana/id.json
Deploying program "swap_program"...
Program path: /Users/paco/Documents/CodeCrypto/Trabajos/RUST/Practice/SWAP/target/deploy/swap_program.so...
Program Id: 9LS4gVshq1ec25NoS5ZGUkoX59K7sm7Tz8woDdNtods9

Signature: PNkfFda2CTpdnvfMtYWkPk68UpNeWWaTFGonBQ1n2fmdZiQPzrmFd7qbTREH9wSNEW1iXEk2miJeZYvgcUxZedS

Deploy success
✅ Deployment successful!

======================================================================
Step 5/5: Deployment Summary
======================================================================

📋 Program ID: 9LS4gVshq1ec25NoS5ZGUkoX59K7sm7Tz8woDdNtods9
📁 IDL: target/idl/swap_program.json

 target/idl/swap_program.json

✅ Localhost deployment complete!
```

✅ **Program deployado** - Anota el Program ID.

---

### Paso 2.2: Verificar Deployment

```bash
# Verificar que el programa está deployado
solana program show 9LS4gVshq1ec25NoS5ZGUkoX59K7sm7Tz8woDdNtods9
```

**Salida esperada**:
```
Program Id: 9LS4gVshq1ec25NoS5ZGUkoX59K7sm7Tz8woDdNtods9
Owner: BPFLoaderUpgradeab1e11111111111111111111111
ProgramData Address: DzwdRhAX6qvddF6b2MqirbbcFXqNbbzNiCqzARokFenx
Authority: 4DnJLcuBuBBCKAKDodMayVGzkBikRQqYv8CaJ36bCNF4
Last Deployed In Slot: 8462
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

Para crear los tokens en automatico usando el script setup-tokens.sh
prompt SWAP % bash scripts/setup-tokens.sh                                    
======================================================================
🪙 Token Setup Script for Localhost Testing
======================================================================

This script will create test tokens simulating:
  - USDC (6 decimals) - Stablecoin
  - SOL (9 decimals) - Native wrapped
  - ETH (8 decimals) - Ethereum wrapped
  - SUI (9 decimals) - Sui wrapped

Each token will be minted to your default wallet.

Continue? (y/n) y

======================================================================
Creating test tokens...
======================================================================

[1/4] Creating USDC (6 decimals)...
✅ USDC: FirQw8b5DCetNcBec7KL2ydfnitMg8weAWjmp1KsgD2G
   Minted: 1,000,000 USDC

[2/4] Creating SOL wrapped (9 decimals)...
✅ SOL:  8bhJGxNm2xn77RHgxVuJWp6qL9H9camqR544qoPy9kCN
   Minted: 10,000 SOL

[3/4] Creating ETH (8 decimals)...
✅ ETH:  7BXPgwTj6BgDFJ413ZtaoWLRLz7aVCmgg9vyhotGNhiC
   Minted: 100 ETH

[4/4] Creating SUI (9 decimals)...
✅ SUI:  ENvCYDU2esMS4BBL13e81PT4TzRyA9CCgNtzQL3RxMeV
   Minted: 50,000 SUI

======================================================================
✅ All tokens created and minted successfully!
======================================================================

📋 Token Addresses (save these for Admin Dashboard):

USDC: FirQw8b5DCetNcBec7KL2ydfnitMg8weAWjmp1KsgD2G
SOL:  8bhJGxNm2xn77RHgxVuJWp6qL9H9camqR544qoPy9kCN
ETH:  7BXPgwTj6BgDFJ413ZtaoWLRLz7aVCmgg9vyhotGNhiC
SUI:  ENvCYDU2esMS4BBL13e81PT4TzRyA9CCgNtzQL3RxMeV

======================================================================
Next Steps:
======================================================================

1. Copy these addresses for use in the web app

2. Example Market Setup (USDC/SOL):
   Token Mint A: FirQw8b5DCetNcBec7KL2ydfnitMg8weAWjmp1KsgD2G
   Token Mint B: 8bhJGxNm2xn77RHgxVuJWp6qL9H9camqR544qoPy9kCN
   Price: 50,000,000 (1 USDC = 0.05 SOL)
   Liquidity: 10,000 USDC, 500 SOL

3. Example Market Setup (ETH/USDC):
   Token Mint A: 7BXPgwTj6BgDFJ413ZtaoWLRLz7aVCmgg9vyhotGNhiC
   Token Mint B: FirQw8b5DCetNcBec7KL2ydfnitMg8weAWjmp1KsgD2G
   Price: 2,000,000,000 (1 ETH = 2,000 USDC)
   Liquidity: 10 ETH, 20,000 USDC

4. View your token balances:
   spl-token accounts

5. Access Admin Dashboard:
   http://localhost:3000/admin

======================================================================

💾 Addresses saved to: token-addresses.txt

pronmpt SWAP% spl-token accounts
Token                                         Balance
-----------------------------------------------------
2aW8iM6Sx8g1MYyYbaAhWwU7WEmSfXvdiMBtPRnirUEW  5000   
4D1RaTZ3pNk8KPhBDALPjEsmFZ1C7QkkmQrZyqxcqPNR  5000   
79CCRPvpTmZP4MVEJ3WL3ehAuwb7VGEy9YmxSBqZ14Dy  5000   
7BXPgwTj6BgDFJ413ZtaoWLRLz7aVCmgg9vyhotGNhiC  100    
8bhJGxNm2xn77RHgxVuJWp6qL9H9camqR544qoPy9kCN  10000  
8sn75cUaLAoNLcqiveqK4yeP26JmsfyWQspxKDuLBvE6  4750   
93A4HLVEwMa4zcAKkAjswQxc1g1e5ayxkRzWasoLJFEU  12500  
ALt4iEqzUVe61E4Pa9WExcnWAbscTKz2jVQVHqJ8hgWU  900    
AUjZ3gFik4CwHe1YqwPCHUauoj8QW1mZ7b4HXgUUHqnY  900    
DQ67ttgrZzequsCYfxt1mZ9meDj7JttqVuY3KUAdhdb8  900    
DqTUEVPQC5ULVmk2SM1G4PV8qMUC8XHFxicN7c76wTta  1350   
E4gwAqypiPW6eStGoYnqkX7vMbCYj7bh6xMXN1odazFA  12500  
ENvCYDU2esMS4BBL13e81PT4TzRyA9CCgNtzQL3RxMeV  50000  
FirQw8b5DCetNcBec7KL2ydfnitMg8weAWjmp1KsgD2G  1000000
GNUevnSxs7gxDMfkYbe83yJyp19cqsxoGiuTe4FCvNMD  1350   
GewHuA9ESWf85A3Mti7PAeQSmwAWRZdBhzjTz3EQnnYL  900    
GwTiWCVMgAk9FrCBQFBu152CZ5SNyabSC1vTfBtsHjhv  4750   
H92N9cjwAbWDAfKfHvdhtreLwBt6m4w8ctKpmUv3ZrDe  450    
HMvSooovYNBVvBcx2GCnfCkHG2SNbUzahgyQAJBkuLVQ  900    
HkkYokArit8HNFYBpmRoA7Dcim165Csbgs9wGtpZwA92  1000   
Hszdw6Ldgp7pk8ri8vKGHvEfUKtHD7RqEz1sbP9qDodx  450    
J91DWMLzkYxiHnVstP2okNWQXpyKbSMbySUj4nhfHi7Y  900    

---

## PARTE 3: Configuración de Phantom Wallet

**Objetivo**: Configurar Phantom para conectarse a localhost.

### Paso 3.1: Abrir Phantom Wallet

1. Click en el icono de Phantom en Chrome
2. Desbloquea con tu contraseña

---

### Paso 3.2: Cambiar a Localhost

**IMPORTANTE**: Phantom debe configurarse con localhost ANTES de solicitar airdrops.

#### Opción A: Usar la configuración predeterminada de Localhost

1. Click en el **menú hamburguesa** (☰ arriba a la izquierda)
2. Scroll down → **Settings** (⚙️)
3. Click **Change Network** (o **Developer Settings** → **Change Network**)
4. Select **Localhost**

#### Opción B: Añadir Custom RPC (si Localhost no aparece)

1. En **Change Network**, click **+ Add Network** o **Custom RPC**
2. Configurar:
   - **Network Name**: `Localhost`
   - **RPC URL**: `http://127.0.0.1:8899`
   - **Cluster/Environment**: `localhost`
3. Click **Save**
4. Seleccionar **Localhost** como red activa

**Verificación**:
- En la parte superior de Phantom debe aparecer "Localhost" o un indicador de red local
- El balance debe estar en 0 SOL inicialmente

✅ **Phantom configurado para localhost**.

---

### Paso 3.3: Solicitar SOL para tu Wallet

**Pasos**:

1. **Copiar tu address de Phantom**:
   - Click en el nombre de tu wallet en Phantom (parte superior)
   - Aparecerá tu address (ejemplo: `8c5mvf94gLTQhmWB7AhBWR6GyDSA1uhpVbWo36ESKvjw`)
   - Click para copiar al portapapeles

2. **Enviar SOL desde terminal**:

```bash
# Reemplaza TU_PHANTOM_ADDRESS con el address que copiaste
solana airdrop 10 TU_PHANTOM_ADDRESS

# Ejemplo real (tu address):
solana airdrop 10 8c5mvf94gLTQhmWB7AhBWR6GyDSA1uhpVbWo36ESKvjw
```

**Salida esperada**:
```
Requesting airdrop of 10 SOL

Signature: ZZcz651UhrENeguS6XtK5CnQsAPbwSwhMGy4ktgsJXBf...

10 SOL
```

**Verificar en Phantom**:
- Refresca Phantom (puede tardar unos segundos)
- Deberías ver ~10 SOL en tu balance

✅ **Phantom tiene fondos** (SOL nativo para pagar gas fees).

---

### Paso 3.4: Crear Cuentas de Token en Phantom

**IMPORTANTE**: Para recibir tokens SPL en Phantom, primero debes crear cuentas asociadas (Associated Token Accounts) para cada token.

#### Paso 3.4.1: Verificar tus Token Addresses

Ya tienes estos tokens creados (de `scripts/setup-tokens.sh`):

```bash
USDC: FirQw8b5DCetNcBec7KL2ydfnitMg8weAWjmp1KsgD2G  (6 decimals)
SOL:  8bhJGxNm2xn77RHgxVuJWp6qL9H9camqR544qoPy9kCN  (9 decimals)
ETH:  7BXPgwTj6BgDFJ413ZtaoWLRLz7aVCmgg9vyhotGNhiC  (8 decimals)
SUI:  ENvCYDU2esMS4BBL13e81PT4TzRyA9CCgNtzQL3RxMeV  (9 decimals)
```

#### Paso 3.4.2: Crear Cuentas de Token para Phantom

**NOTA**: Usa el flag `--owner` con tu address de Phantom para crear las cuentas en tu wallet:

```bash
# Reemplaza TU_PHANTOM_ADDRESS con tu address real
# Ejemplo: 8c5mvf94gLTQhmWB7AhBWR6GyDSA1uhpVbWo36ESKvjw

# Crear cuenta de USDC en Phantom
spl-token create-account FirQw8b5DCetNcBec7KL2ydfnitMg8weAWjmp1KsgD2G \
  --owner TU_PHANTOM_ADDRESS

# Crear cuenta de SOL wrapped en Phantom
spl-token create-account 8bhJGxNm2xn77RHgxVuJWp6qL9H9camqR544qoPy9kCN \
  --owner TU_PHANTOM_ADDRESS

# Opcional: ETH y SUI si los vas a usar
spl-token create-account 7BXPgwTj6BgDFJ413ZtaoWLRLz7aVCmgg9vyhotGNhiC \
  --owner TU_PHANTOM_ADDRESS

spl-token create-account ENvCYDU2esMS4BBL13e81PT4TzRyA9CCgNtzQL3RxMeV \
  --owner TU_PHANTOM_ADDRESS
```
Hay errores con el fee payer, la solucion es unir y que pague la cuenta de Solana CLI y no la wallet de Phantom.
Además hay que especificar explicitamente en el comando quien lo hace. Tenemos que mejorar las instrucciones anteriores con:
spl-token create-account 8bhJGxNm2xn77RHgxVuJWp6qL9H9camqR544qoPy9kCN --owner
      8c5mvf94gLTQhmWB7AhBWR6GyDSA1uhpVbWo36ESKvjw --fee-payer ~/.config/solana/id.json

# Crear cuenta de USDC en Phantom
spl-token create-account FirQw8b5DCetNcBec7KL2ydfnitMg8weAWjmp1KsgD2G \
  --owner 8c5mvf94gLTQhmWB7AhBWR6GyDSA1uhpVbWo36ESKvjw --fee-payer ~/.config/solana/id.json

# Crear cuenta de SOL wrapped en Phantom
spl-token create-account 8bhJGxNm2xn77RHgxVuJWp6qL9H9camqR544qoPy9kCN \
  --owner 8c5mvf94gLTQhmWB7AhBWR6GyDSA1uhpVbWo36ESKvjw --fee-payer ~/.config/solana/id.json

# Opcional: ETH y SUI si los vas a usar
spl-token create-account 7BXPgwTj6BgDFJ413ZtaoWLRLz7aVCmgg9vyhotGNhiC \
  --owner 8c5mvf94gLTQhmWB7AhBWR6GyDSA1uhpVbWo36ESKvjw --fee-payer ~/.config/solana/id.json

spl-token create-account ENvCYDU2esMS4BBL13e81PT4TzRyA9CCgNtzQL3RxMeV \
  --owner 8c5mvf94gLTQhmWB7AhBWR6GyDSA1uhpVbWo36ESKvjw --fee-payer ~/.config/solana/id.json


**Salida esperada**:
```
Creating account 97hniDwujJULj4QtB8yhGqrMf4g7HprLCNUJYgmHJm71

Signature: 5K9e8... [hash]
```
```` ejemplo de SUI ultimo comando
Creating account 4mG2WsbfciLZpiVrUKpd1pE2bdwu9zSyJWigwfb3tzqj

Signature: 3orXennVF4GN7V6pSir4KJckgwzgxJrogsaNjssxBfN2KwCt4ZxdK8d87rcc9AS4zNRjKaqrjDPv6F7HE6AVsDBZ
````

#### Paso 3.4.3: Mintear Tokens a Phantom (para testing)

**⚠️ IMPORTANTE**: NO puedes mintear directamente a la wallet address de Phantom (`8c5mvf94...`).
**Debes mintear a la Associated Token Account (ATA)** de cada token.

##### 3.4.3.1: Obtener las Direcciones de las ATAs

Primero, obtén las direcciones de las cuentas de token asociadas:

```bash
# USDC ATA
spl-token address --token FirQw8b5DCetNcBec7KL2ydfnitMg8weAWjmp1KsgD2G \
  --owner 8c5mvf94gLTQhmWB7AhBWR6GyDSA1uhpVbWo36ESKvjw --verbose

# SOL wrapped ATA
spl-token address --token 8bhJGxNm2xn77RHgxVuJWp6qL9H9camqR544qoPy9kCN \
  --owner 8c5mvf94gLTQhmWB7AhBWR6GyDSA1uhpVbWo36ESKvjw --verbose

# ETH ATA (opcional)
spl-token address --token 7BXPgwTj6BgDFJ413ZtaoWLRLz7aVCmgg9vyhotGNhiC \
  --owner 8c5mvf94gLTQhmWB7AhBWR6GyDSA1uhpVbWo36ESKvjw --verbose

# SUI ATA (opcional)
spl-token address --token ENvCYDU2esMS4BBL13e81PT4TzRyA9CCgNtzQL3RxMeV \
  --owner 8c5mvf94gLTQhmWB7AhBWR6GyDSA1uhpVbWo36ESKvjw --verbose
```

**Salida esperada** (guarda estas direcciones):
```
Wallet address: 8c5mvf94gLTQhmWB7AhBWR6GyDSA1uhpVbWo36ESKvjw
Associated token address: CWh9pYiucc2JuLFoTgWtf1zfYg14qHUA3C9pKnWCZigg  ← USDC ATA
```

**Tus ATAs reales**:
- USDC ATA: `CWh9pYiucc2JuLFoTgWtf1zfYg14qHUA3C9pKnWCZigg`
- SOL ATA: `6kLd7fzFybfhmHfLneScU9qDzjLomm8xJkXpbghmEfnv`
- ETH ATA: `HHRtK236ATYmMENSbwupGrjAzABNXkHnWMxoaPiAnMzh`
- SUI ATA: `4mG2WsbfciLZpiVrUKpd1pE2bdwu9zSyJWigwfb3tzqj`

##### 3.4.3.2: Mintear a las ATAs

Ahora mintea usando las **direcciones de las ATAs**, NO la wallet address:

```bash
# Mintear 1000 USDC a la ATA de USDC
spl-token mint FirQw8b5DCetNcBec7KL2ydfnitMg8weAWjmp1KsgD2G 1000 \
  CWh9pYiucc2JuLFoTgWtf1zfYg14qHUA3C9pKnWCZigg

# Mintear 100 SOL wrapped a la ATA de SOL
spl-token mint 8bhJGxNm2xn77RHgxVuJWp6qL9H9camqR544qoPy9kCN 100 \
  6kLd7fzFybfhmHfLneScU9qDzjLomm8xJkXpbghmEfnv

# (Opcional) Mintear 10 ETH a la ATA de ETH
spl-token mint 7BXPgwTj6BgDFJ413ZtaoWLRLz7aVCmgg9vyhotGNhiC 10 \
  HHRtK236ATYmMENSbwupGrjAzABNXkHnWMxoaPiAnMzh

# (Opcional) Mintear 500 SUI a la ATA de SUI
spl-token mint ENvCYDU2esMS4BBL13e81PT4TzRyA9CCgNtzQL3RxMeV 500 \
  4mG2WsbfciLZpiVrUKpd1pE2bdwu9zSyJWigwfb3tzqj
```

**Salida esperada**:
```
Minting 1000 tokens
  Token: FirQw8b5DCetNcBec7KL2ydfnitMg8weAWjmp1KsgD2G
  Recipient: CWh9pYiucc2JuLFoTgWtf1zfYg14qHUA3C9pKnWCZigg

Signature: Y2yz5bGUh1EBCK7E5HxAaAB8o9y8rSnJkiPBjf6S12xm...
```

**Verificar en Phantom**:
- Refresca Phantom (puede tardar unos segundos)
- Click en **Tokens** (botón inferior)
- Deberías ver los tokens listados:
  - USDC: 1,000
  - SOL (wrapped): 100
  - ETH: 10 (opcional)
  - SUI: 500 (opcional)

**Nota**: Los tokens pueden aparecer con nombres genéricos (Unknown Token) en Phantom hasta que añadas metadatos. Pero los balances serán correctos.

✅ **Tokens listos para usar en swaps**.

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

#### Tokens Disponibles (de `token-addresses.txt`):

```bash
USDC: FirQw8b5DCetNcBec7KL2ydfnitMg8weAWjmp1KsgD2G  (6 decimals)
SOL:  8bhJGxNm2xn77RHgxVuJWp6qL9H9camqR544qoPy9kCN  (9 decimals)
ETH:  7BXPgwTj6BgDFJ413ZtaoWLRLz7aVCmgg9vyhotGNhiC  (8 decimals)
SUI:  ENvCYDU2esMS4BBL13e81PT4TzRyA9CCgNtzQL3RxMeV  (9 decimals)
```

#### Ejemplo 1: Market USDC/SOL

| Campo | Valor | Explicación |
|-------|-------|-------------|
| **Token Mint A** | `FirQw8b5DCetNcBec7KL2ydfnitMg8weAWjmp1KsgD2G` | USDC (input token) |
| **Token Mint B** | `8bhJGxNm2xn77RHgxVuJWp6qL9H9camqR544qoPy9kCN` | SOL wrapped (output token) |

#### Ejemplo 2: Market ETH/USDC

| Campo | Valor | Explicación |
|-------|-------|-------------|
| **Token Mint A** | `7BXPgwTj6BgDFJ413ZtaoWLRLz7aVCmgg9vyhotGNhiC` | ETH (input token) |
| **Token Mint B** | `FirQw8b5DCetNcBec7KL2ydfnitMg8weAWjmp1KsgD2G` | USDC (output token) |

#### Pasos:

1. Navegar a http://localhost:3000/admin
2. Pegar address de **Token A** en campo "Token Mint A"
   - Ejemplo: `FirQw8b5DCetNcBec7KL2ydfnitMg8weAWjmp1KsgD2G` (USDC)
3. Pegar address de **Token B** en campo "Token Mint B"
   - Ejemplo: `8bhJGxNm2xn77RHgxVuJWp6qL9H9camqR544qoPy9kCN` (SOL)
4. Click **Create Market**
5. Phantom popup → Click **Approve**
6. Esperar confirmación (~2 segundos)

**Salida esperada**:
```
✅ Market initialized successfully!
Market PDA: 5xK2... [hash derivado de USDC+SOL]
```

✅ **Market creado** (USDC/SOL market listo para swaps).

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

## PARTE 5: Lecciones Aprendidas y Troubleshooting

### 5.1: Problemas Comunes y Soluciones

#### 🔧 Error: "no such command: +toolchain"

**Síntoma**:
```bash
error: no such command: `+1.89.0-sbpf-solana-v1.53`
```

**Causa**: Homebrew's cargo está siendo usado en lugar de rustup's cargo.

**Solución**:
1. Configurar PATH correctamente en `~/.zshrc`:
```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

2. Recargar configuración:
```bash
source ~/.zshrc
```

3. Verificar:
```bash
which cargo  # Debe mostrar: /Users/paco/.cargo/bin/cargo
```

**Referencia**: Ver `docs/PATH-FIX.md` para detalles completos.

---

#### 🔧 Error: "fee payer is required"

**Síntoma**:
```bash
Error: "fee payer is required, please specify a valid fee payer..."
```

**Causa**: `spl-token` no encuentra la configuración de Solana CLI.

**Solución**:
```bash
# Configurar Solana CLI
solana config set --url http://127.0.0.1:8899
solana config set --keypair ~/.config/solana/id.json

# Usar flag --fee-payer explícitamente
spl-token create-account TOKEN_MINT --owner PHANTOM_ADDRESS \
  --fee-payer ~/.config/solana/id.json
```

---

#### 🔧 Error: "Account is owned by 11111111..., not TokenProgram"

**Síntoma**:
```bash
Error: "Account 8c5m... is owned by 11111111111111111111111111111111,
not configured program id TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
```

**Causa**: Intentando mintear directamente a la wallet address en lugar de la Associated Token Account (ATA).

**Solución**:
1. Obtener la dirección de la ATA:
```bash
spl-token address --token TOKEN_MINT --owner WALLET_ADDRESS --verbose
```

2. Mintear a la ATA, NO a la wallet:
```bash
# ❌ INCORRECTO
spl-token mint TOKEN_MINT 1000 WALLET_ADDRESS

# ✅ CORRECTO
spl-token mint TOKEN_MINT 1000 ATA_ADDRESS
```

**Ejemplo**:
```bash
# Obtener ATA de USDC para Phantom
spl-token address --token FirQw8b5DCetNcBec7KL2ydfnitMg8weAWjmp1KsgD2G \
  --owner 8c5mvf94gLTQhmWB7AhBWR6GyDSA1uhpVbWo36ESKvjw --verbose
# Output: Associated token address: CWh9pYiucc2JuLFoTgWtf1zfYg14qHUA3C9pKnWCZigg

# Mintear a la ATA
spl-token mint FirQw8b5DCetNcBec7KL2ydfnitMg8weAWjmp1KsgD2G 1000 \
  CWh9pYiucc2JuLFoTgWtf1zfYg14qHUA3C9pKnWCZigg
```

---

#### 🔧 Error: "Attempt to load a program that does not exist"

**Síntoma**:
```
Transaction simulation failed: Attempt to load a program that does not exist
```

**Causa**: El IDL del frontend tiene un Program ID antiguo que no coincide con el programa desplegado.

**Solución**:
1. Verificar Program ID desplegado:
```bash
solana program show 9LS4gVshq1ec25NoS5ZGUkoX59K7sm7Tz8woDdNtods9
```

2. Actualizar IDL del frontend:
```bash
cp target/idl/swap_program.json app/src/idl/swap_program.json
```

3. Reiniciar el servidor frontend:
```bash
# Ctrl+C para detener
yarn start
```

4. Refrescar navegador en http://localhost:3000

---

#### 🔧 Error: "insufficient funds" al agregar liquidez

**Síntoma**:
```
Program log: Error: insufficient funds
custom program error: 0x1
```

**Causa**: Intentando agregar más tokens de los que tienes en tu wallet.

**Solución**:
1. Verificar tus balances:
```bash
spl-token accounts --owner PHANTOM_ADDRESS
```

2. Ajustar cantidades o mintear más tokens:
```bash
# Mintear más tokens a la ATA
spl-token mint TOKEN_MINT CANTIDAD ATA_ADDRESS
```

**Ejemplo**:
```bash
# Si intentas agregar 250 SOL pero solo tienes 100
# Mintear 200 más
spl-token mint 8bhJGxNm2xn77RHgxVuJWp6qL9H9camqR544qoPy9kCN 200 \
  6kLd7fzFybfhmHfLneScU9qDzjLomm8xJkXpbghmEfnv
```

---

#### 🔧 Tokens no aparecen en Phantom

**Síntoma**: Los tokens están en la blockchain pero Phantom no los muestra.

**Causa**: Phantom no muestra automáticamente tokens SPL sin metadata.

**Solución**:

**Opción 1**: Importar manualmente en Phantom
1. Abrir Phantom
2. Click en "Manage Token List"
3. Click en "+ Add Custom Token"
4. Pegar el token mint address

**Opción 2**: Confiar en la blockchain (recomendado para testing)
- Los tokens **están ahí**, verificable con:
```bash
spl-token accounts --owner PHANTOM_ADDRESS
```
- El Admin Dashboard funcionará correctamente aunque no los veas en Phantom

---

#### 🔧 Error: "Invalid public key input"

**Síntoma**: Error al pegar token address en el formulario.

**Causa**: Address incompleto, con espacios, o mal formateado.

**Solución**:
1. Verificar longitud del address (debe ser exactamente 44 caracteres):
```bash
echo -n 'FirQw8b5DCetNcBec7KL2ydfnitMg8weAWjmp1KsgD2G' | wc -c
# Output: 44
```

2. Copiar desde un archivo limpio:
```bash
cat token-addresses-for-admin.txt
```

3. Asegurarse de copiar el address completo sin espacios adicionales

---

### 5.2: Mejores Prácticas Aprendidas

#### ✅ Gestión de PATH

**Problema**: Conflictos entre cargo de Homebrew y rustup.

**Solución**:
- Siempre mantener `~/.cargo/bin` ANTES de `/opt/homebrew/bin` en PATH
- Documentar en `~/.zshrc` con comentarios claros
- Crear wrappers cuando sea necesario (`scripts/anchor-wrapper.sh`)

#### ✅ Creación de Tokens SPL

**Flujo correcto**:
1. Crear token mint (una sola vez por token)
2. Crear Associated Token Account (ATA) para cada wallet
3. Mintear a las ATAs, NO a las wallets
4. Verificar con `spl-token accounts`

**Script recomendado**: `scripts/setup-tokens.sh` automatiza todo esto.

#### ✅ Sincronización de IDLs

**Problema**: Frontend con IDL desactualizado.

**Solución**:
- Después de cada `anchor build`, copiar IDL al frontend:
```bash
cp target/idl/swap_program.json app/src/idl/swap_program.json
```
- Reiniciar el servidor frontend
- Verificar Program ID en ambos archivos

#### ✅ Testing Incremental

**Orden recomendado**:
1. Tests unitarios en Rust (`anchor test --skip-local-validator`)
2. Deployment a localhost
3. Verificación manual con `solana program show`
4. Creación de tokens de prueba
5. Testing con frontend
6. Verificación de transacciones

#### ✅ Debugging de Transacciones

Cuando falla una transacción:
1. Leer los logs completos
2. Identificar el error específico (ej: "insufficient funds", "incorrect program id")
3. Verificar cuentas involucradas con `solana account ADDRESS`
4. Verificar balances con `spl-token accounts`
5. Usar Solana Explorer con custom RPC: `http://127.0.0.1:8899`

---

### 5.3: Checklist de Validación Pre-Testing

Antes de iniciar testing en localhost, verificar:

- [ ] `solana-test-validator` está corriendo
- [ ] No hay procesos antiguos ocupando puertos (3000, 8899, 8900)
- [ ] PATH configurado correctamente (`which cargo` → rustup)
- [ ] Solana CLI apunta a localhost (`solana config get`)
- [ ] Programa compilado y desplegado (`solana program show PROGRAM_ID`)
- [ ] IDL del frontend actualizado con Program ID correcto
- [ ] Tokens creados y balances verificados
- [ ] Phantom configurado en localhost
- [ ] Phantom tiene SOL para gas fees

---

### 5.4: Comandos de Utilidad Rápida

```bash
# Verificar estado del validador
pgrep -f solana-test-validator || echo "No corriendo"

# Matar validator antiguo
pkill -f solana-test-validator

# Verificar puertos en uso
lsof -ti:3000 -ti:8899 -ti:8900

# Limpiar y reiniciar
pkill -f solana-test-validator
pkill -f "yarn start"
sleep 2
solana-test-validator &
cd app && yarn start

# Verificar balances rápidamente
spl-token accounts --owner $(cat ~/.config/solana/phantom-address.txt)

# Copiar IDL al frontend
cp target/idl/swap_program.json app/src/idl/swap_program.json

# Verificar Program ID match
grep address target/idl/swap_program.json
grep address app/src/idl/swap_program.json
```

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
