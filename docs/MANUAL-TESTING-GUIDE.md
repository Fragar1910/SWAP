# Guía de Pruebas Manuales - Solana SWAP

Esta guía proporciona instrucciones paso a paso para probar manualmente la aplicación SWAP en devnet, incluyendo la configuración de Phantom wallet y verificación de transacciones.

---

## Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Configuración de Phantom Wallet](#configuración-de-phantom-wallet)
3. [Obtener SOL de Devnet](#obtener-sol-de-devnet)
4. [Iniciar la Aplicación](#iniciar-la-aplicación)
5. [Conectar Phantom Wallet](#conectar-phantom-wallet)
6. [Crear Tokens de Prueba](#crear-tokens-de-prueba)
7. [Probar Panel de Administración](#probar-panel-de-administración)
8. [Probar Interfaz de Swap](#probar-interfaz-de-swap)
9. [Verificar Transacciones en Explorer](#verificar-transacciones-en-explorer)
10. [Solución de Problemas](#solución-de-problemas)

---

## Requisitos Previos

- ✅ Navegador web moderno (Chrome, Firefox, Brave, Edge)
- ✅ Extensión Phantom Wallet instalada
- ✅ Programa desplegado en devnet
- ✅ Frontend corriendo localmente o desplegado

### Instalar Phantom Wallet

1. Visita: https://phantom.app/download
2. Haz clic en "Add to Chrome" (o tu navegador)
3. Sigue las instrucciones de instalación
4. Crea una nueva wallet o importa una existente

---

## Configuración de Phantom Wallet

### Paso 1: Cambiar a Devnet

1. Abre la extensión Phantom (haz clic en el icono en la barra de herramientas)
2. Haz clic en el **icono de engranaje ⚙️** (arriba a la derecha)
3. Selecciona **"Developer Settings"**
4. En **"Testnet Mode"**, activa el switch
5. Selecciona **"Devnet"** en el menú desplegable
6. Cierra la configuración

**Verificación**:
- En la pantalla principal de Phantom, deberías ver una etiqueta naranja que dice **"DEVNET"** en la parte superior.

### Paso 2: Copiar tu Dirección de Wallet

1. En Phantom, haz clic en tu dirección (parte superior)
2. Se copiará automáticamente al portapapeles
3. Guarda esta dirección en un archivo de texto para usarla más tarde

Ejemplo de dirección:
```
5GXqT7yNZ8mK9vHQq2YmHxFKrKhJZvK1pAYnxCqL8k3W
```

---

## Verificar Configuración de Solana CLI

Antes de solicitar SOL, verifica que tu Solana CLI esté configurado correctamente.

### Verificar Configuración Actual

```bash
solana config get
```

**Salida esperada**:
```
Config File: /Users/tu-usuario/.config/solana/cli/config.yml
RPC URL: https://api.devnet.solana.com
WebSocket URL: wss://api.devnet.solana.com/ (computed)
Keypair Path: /Users/tu-usuario/.config/solana/id.json
Commitment: confirmed
```

### Ajustar si es Necesario

Si la RPC URL no es devnet, configúrala:

```bash
# Cambiar a devnet
solana config set --url https://api.devnet.solana.com

# Verificar el cambio
solana config get
```

**Verificación**:
- ✅ RPC URL debe ser: `https://api.devnet.solana.com`
- ✅ Keypair Path debe existir (si no, se creará al solicitar airdrop)
- ✅ Commitment: `confirmed` o `finalized` (ambos están bien)

---

## Obtener SOL de Devnet

### Opción 1: Faucet Web de Solana

1. Visita: https://faucet.solana.com/
2. Pega tu dirección de wallet
3. Selecciona **"Devnet"**
4. Haz clic en **"Request Airdrop"**
5. Espera 10-15 segundos

Recibirás **1-2 SOL** (tokens de prueba, sin valor real).

### Opción 2: Solana CLI

```bash
# Configurar CLI para devnet
solana config set --url https://api.devnet.solana.com

# Solicitar airdrop (reemplaza con tu dirección)
solana airdrop 2 5GXqT7yNZ8mK9vHQq2YmHxFKrKhJZvK1pAYnxCqL8k3W

# Verificar balance
solana balance 5GXqT7yNZ8mK9vHQq2YmHxFKrKhJZvK1pAYnxCqL8k3W
```

**Verificación en Phantom**:
- Tu balance debería mostrar **~2 SOL** (o lo que solicitaste)

---

## Desplegar el Programa a Devnet

⚠️ **CRÍTICO**: Antes de probar la aplicación con Phantom en devnet, debes desplegar el programa.

### Paso 1: Configurar Solana CLI para Devnet

```bash
# Cambiar a devnet
solana config set --url https://api.devnet.solana.com

# Verificar configuración
solana config get
```

### Paso 2: Asegurar que tienes SOL para el despliegue

```bash
# Verificar balance
solana balance

# Si tienes menos de 3 SOL, solicita airdrop
solana airdrop 2
```

**Nota**: El despliegue consume ~2-3 SOL en devnet.

### Paso 3: Arreglar Toolchain de Solana (Si Es Necesario)

⚠️ **SI ENCUENTRAS ESTE ERROR**: `error: no such command: +1.89.0-sbpf-solana-v1.53`

Este es un conflicto entre Homebrew y Solana. **Solución permanente y elegante**:

```bash
# Ejecutar el script de arreglo automático
bash scripts/fix-solana-toolchain.sh
```

Este script hará:
1. ✅ Eliminar Solana de Homebrew (causa conflictos)
2. ✅ Opcionalmente eliminar Rust de Homebrew
3. ✅ Instalar rustup (gestor oficial de Rust)
4. ✅ Instalar Solana CLI desde fuente oficial
5. ✅ Configurar tu shell profile correctamente
6. ✅ Verificar todas las instalaciones

**Después de ejecutar el script**:
```bash
# 1. Reinicia tu terminal O ejecuta:
source ~/.zshrc  # o ~/.bashrc según tu shell

# 2. Verifica que todo funciona:
solana --version
rustc --version
cargo-build-sbf --version
```

---

### Paso 4: Desplegar el Programa a Devnet

Una vez solucionado el toolchain (si era necesario), despliega a devnet:

```bash
# Desde el directorio raíz del proyecto
cd /Users/paco/Documents/CodeCrypto/Trabajos/RUST/Practice/SWAP

# 1. Compilar el programa
anchor build

# 2. Configurar devnet
solana config set --url https://api.devnet.solana.com

# 3. Verificar balance (necesitas ~3 SOL)
solana balance

# Si tienes menos de 3 SOL:
solana airdrop 2

# 4. Desplegar a devnet
anchor deploy --provider.cluster devnet

# 5. Obtener el Program ID desplegado
solana address -k target/deploy/swap_program-keypair.json
```

**⏱️ Tiempo estimado**: 2-5 minutos (compilación + despliegue)

**Importante**: Guarda el **Program ID** que se muestra al final.

---

### Alternativa: Usar Localhost para Pruebas

Si prefieres probar localmente primero (sin desplegar a devnet):

```bash
# Terminal 1: Iniciar validador local
solana-test-validator

# Terminal 2: Desplegar y probar
cd /Users/paco/Documents/CodeCrypto/Trabajos/RUST/Practice/SWAP
anchor test --skip-local-validator
```

**Nota**: El frontend ya está configurado para localhost por defecto (`app/src/contexts/AnchorContext.tsx`, línea 8).

**Salida esperada**:
```
🚀 Deploying Solana SWAP Program to Devnet
============================================
📦 Building program...
   Compiling swap_program v0.1.0 ...
    Finished release [optimized] target(s) in 45.23s

🔑 Generating new program keypair...
📋 Program ID: dSLp8tkdT8CikFha8oQTEX9qEpxRU5KP9XvGQkQkJxX
✏️  Updating program ID in source code...
🔧 Rebuilding with updated program ID...
🌐 Configuring Solana CLI for devnet...
💰 Wallet balance: 5.0 SOL
🚀 Deploying to devnet...
✅ Deployment complete!
📋 Program ID: dSLp8tkdT8CikFha8oQTEX9qEpxRU5KP9XvGQkQkJxX
🔗 Explorer: https://explorer.solana.com/address/dSLp8tkdT8CikFha8oQTEX9qEpxRU5KP9XvGQkQkJxX?cluster=devnet
```

### Paso 5: Guardar el Program ID

**IMPORTANTE**: Copia y guarda el **Program ID** mostrado al final. Lo necesitarás para:
1. Actualizar el frontend (siguiente paso)
2. Verificar el programa en Solana Explorer

Ejemplo de Program ID:
```
dSLp8tkdT8CikFha8oQTEX9qEpxRU5KP9XvGQkQkJxX
```

### Paso 6: Actualizar el Frontend con el Program ID de Devnet

Después del despliegue, debes actualizar dos archivos en el frontend:

**Archivo 1: `app/src/contexts/AnchorContext.tsx`**

```typescript
// Línea 8: Cambiar de localhost a devnet
const NETWORK = 'https://api.devnet.solana.com'; // devnet

// Línea 9: Actualizar con tu Program ID
const PROGRAM_ID = new PublicKey('dSLp8tkdT8CikFha8oQTEX9qEpxRU5KP9XvGQkQkJxX');
```

**Archivo 2: `app/src/idl/swap_program.json`**

```json
{
  "address": "dSLp8tkdT8CikFha8oQTEX9qEpxRU5KP9XvGQkQkJxX",
  ...resto del JSON
}
```

### Paso 7: Verificar el Despliegue en Explorer

1. Abre el link del Explorer mostrado en la salida
2. O ve a: https://explorer.solana.com/?cluster=devnet
3. Busca tu Program ID
4. Verifica que el estado sea **"Executable"**

---

## Iniciar la Aplicación

### Opción A: Desarrollo Local

```bash
# Terminal 1: Asegúrate que el programa esté desplegado en devnet
cd /Users/paco/Documents/CodeCrypto/Trabajos/RUST/Practice/SWAP

# Terminal 2: Inicia el frontend
cd app
npm start
# O
yarn start
```

La aplicación se abrirá en: http://localhost:3000

### Opción B: Aplicación Desplegada

Si el frontend está desplegado en un servidor web, simplemente visita la URL proporcionada.

---

## Conectar Phantom Wallet

### Paso 1: Abrir la Aplicación

1. Abre http://localhost:3000 en tu navegador
2. Verás el botón **"Connect Wallet"** en la esquina superior derecha

### Paso 2: Conectar

1. Haz clic en **"Connect Wallet"**
2. Aparecerá un modal con opciones de wallets
3. Selecciona **"Phantom"**
4. Se abrirá una ventana emergente de Phantom pidiendo permiso
5. Haz clic en **"Connect"**
6. (Opcional) Marca "Only this time" o "Always allow" según tu preferencia

**Verificación**:
- El botón **"Connect Wallet"** cambia a mostrar tu dirección acortada
- Ejemplo: `5GXq...8k3W`

### Paso 3: Configurar Red en el Frontend

⚠️ **IMPORTANTE**: La red está hardcodeada en el código fuente del frontend.

1. Abre el archivo: `app/src/contexts/AnchorContext.tsx`
2. En la línea 8, verás:
   ```typescript
   const NETWORK = 'http://127.0.0.1:8899'; // localnet
   ```
3. **Para usar devnet**, cámbiala a:
   ```typescript
   const NETWORK = 'https://api.devnet.solana.com'; // devnet
   ```
4. Guarda el archivo
5. Si el frontend está corriendo, se recargará automáticamente
6. Si no, reinicia el servidor:
   ```bash
   cd app
   npm start
   ```

**Nota**: Actualmente el frontend NO muestra un indicador visual de la red conectada. Puedes verificar la red revisando el archivo `AnchorContext.tsx` o abriendo la consola del navegador (F12) y ejecutando:
```javascript
console.log(window.solana.connection._rpcEndpoint)
```

---

## Crear Tokens de Prueba

Antes de poder usar el DEX, necesitas dos tokens SPL para crear un mercado.

### Instalar spl-token CLI (si no está instalado)

Si el comando `spl-token` no existe, instálalo primero:

```bash
# Verificar si está instalado
spl-token --version

# Si no está instalado, instalarlo con cargo
cargo install spl-token-cli

# Verificar instalación
spl-token --version
```

**Salida esperada**:
```
spl-token-cli 3.x.x
```

### Opción 1: Usar spl-token CLI

```bash
# Asegúrate de estar en devnet
solana config set --url https://api.devnet.solana.com

# Configurar wallet (usa la clave privada de Phantom si es necesario)
solana config set --keypair ~/.config/solana/id.json

# Crear Token A (simula USDC con 6 decimales)
spl-token create-token --decimals 6
# Guarda el Token Mint Address: Ejemplo: 7xLk17...9qW

# Crear Token B (simula SOL-wrapped con 9 decimales)
spl-token create-token --decimals 9
# Guarda el Token Mint Address: Ejemplo: 3kPq8M...5tR

# Crear cuentas de tokens para tu wallet
spl-token create-account 7xLk17...9qW  # Token A
spl-token create-account 3kPq8M...5tR  # Token B

# Mint tokens a tu cuenta
spl-token mint 7xLk17...9qW 10000 --owner ~/.config/solana/id.json
spl-token mint 3kPq8M...5tR 50000 --owner ~/.config/solana/id.json

# Verificar balance
spl-token accounts
```

### Opción 2: Usar Tokens Existentes de Devnet

**USDC Devnet**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (6 decimals)

Puedes crear tu propia cuenta asociada:
```bash
spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

---

## Probar Panel de Administración

El panel de administración solo es accesible para la autoridad del mercado (la wallet que inicializa el mercado).

### Paso 1: Ir al Panel de Administración

1. En la aplicación, haz clic en **"Admin Dashboard"** en la navegación
2. O visita directamente: http://localhost:3000/admin

### Paso 2: Inicializar Mercado

1. En el formulario **"Initialize Market"**:
   - **Token Mint A**: Pega la dirección del primer token (ej. USDC)
     ```
     7xLk17...9qW
     ```
   - **Token Mint B**: Pega la dirección del segundo token (ej. wSOL)
     ```
     3kPq8M...5tR
     ```
2. Haz clic en **"Initialize Market"**
3. Phantom abrirá una ventana pidiendo confirmación
4. Revisa la transacción:
   - **Estimated Fee**: ~0.00001 SOL
   - **Accounts**: Market PDA, Vault A, Vault B, Token Program, etc.
5. Haz clic en **"Approve"** en Phantom
6. Espera la confirmación (~1-2 segundos en devnet)

**Verificación**:
- Deberías ver un mensaje de éxito: ✅ "Market initialized successfully"
- La dirección del mercado se mostrará (ejemplo: `9zPm4...K7w`)

### Paso 3: Establecer Precio

1. En el formulario **"Set Price"**:
   - **Market Address**: La dirección del mercado que acabas de crear
   - **Price**: Ingresa el tipo de cambio (ej. `0.05` = 1 Token A = 0.05 Token B)
     - Si Token A es USDC y Token B es SOL-wrapped: `0.05` significa 1 USDC = 0.05 SOL
2. Haz clic en **"Set Price"**
3. Confirma en Phantom
4. Espera la confirmación

**Verificación**:
- Mensaje de éxito: ✅ "Price set successfully"
- El precio actual se mostrará en la UI

### Paso 4: Añadir Liquidez

1. En el formulario **"Add Liquidity"**:
   - **Market Address**: Dirección del mercado
   - **Amount Token A**: Cantidad a depositar (ej. `1000` USDC)
   - **Amount Token B**: Cantidad a depositar (ej. `50` wSOL)
2. Haz clic en **"Add Liquidity"**
3. Confirma en Phantom
   - La transacción transferirá tokens de tu wallet a los vaults del mercado
4. Espera la confirmación

**Verificación**:
- Mensaje de éxito: ✅ "Liquidity added successfully"
- Tus balances de tokens deberían disminuir
- Los vaults del mercado ahora tienen liquidez

---

## Probar Interfaz de Swap

Ahora que el mercado está configurado con precio y liquidez, cualquier usuario puede hacer swaps.

### Paso 1: Ir a la Interfaz de Swap

1. Haz clic en **"Swap"** en la navegación
2. O visita: http://localhost:3000/swap

### Paso 2: Seleccionar Mercado

1. En el desplegable **"Select Market"**, selecciona el mercado que creaste
2. Los detalles del mercado se cargarán:
   - Current Price: 0.05
   - Your Balance Token A: 9000 USDC
   - Your Balance Token B: 49950 wSOL
   - Available Liquidity A: 1000 USDC
   - Available Liquidity B: 50 wSOL

### Paso 3: Ejecutar Swap A → B (USDC → wSOL)

1. Asegúrate que la dirección de swap sea **A → B**
2. En **"Amount to Swap"**, ingresa una cantidad (ej. `10` USDC)
3. El **"Estimated Output"** se calculará automáticamente:
   - Input: 10 USDC
   - Output: ~0.5 wSOL (10 × 0.05)
   - Rate: 1 USDC = 0.05 wSOL
4. Haz clic en **"Execute Swap"**
5. Confirma en Phantom
6. Espera la confirmación

**Verificación**:
- Mensaje de éxito: ✅ "Swap executed successfully"
- Firma de transacción (ejemplo: `4Zk8...3mP`)
- Tus balances se actualizan:
  - Token A: 8990 USDC (perdiste 10)
  - Token B: 49950.5 wSOL (ganaste 0.5)

### Paso 4: Ejecutar Swap B → A (wSOL → USDC)

1. Haz clic en el **botón de intercambio ⇄** para cambiar la dirección
2. Ahora la dirección es **B → A**
3. Ingresa cantidad (ej. `1` wSOL)
4. Estimated Output: ~20 USDC (1 / 0.05)
5. Haz clic en **"Execute Swap"**
6. Confirma en Phantom
7. Espera la confirmación

**Verificación**:
- Balance Token B: 49949.5 wSOL (perdiste 1)
- Balance Token A: 9010 USDC (ganaste 20)

---

## Verificar Transacciones en Explorer

Cada transacción en Solana tiene una firma única que puedes verificar en el Solana Explorer.

### Paso 1: Obtener la Firma de la Transacción

Después de cada transacción exitosa, la aplicación muestra:
- ✅ "Transaction successful: 4Zk8...3mP"
- O un link directo al explorer

Si no ves el link, copia la firma (los primeros y últimos 4 caracteres se muestran).

### Paso 2: Abrir Solana Explorer

1. Visita: https://explorer.solana.com/
2. En la esquina superior derecha, selecciona **"Devnet"**
3. En la barra de búsqueda, pega la firma de la transacción completa:
   ```
   4Zk8aJ1mK5Hq2YmHxFKrKhJZvK1pAYnxCqL8k3W...3mP
   ```
4. Presiona Enter

### Paso 3: Revisar Detalles de la Transacción

**Información General**:
- **Status**: ✅ Success (o ❌ Failed)
- **Block**: Número de bloque (ej. 123456789)
- **Timestamp**: Fecha y hora UTC
- **Fee**: ~0.000005 SOL
- **Compute Units**: ~11,500 CU (para swaps)

**Account Inputs**:
- Tu wallet (firmante)
- Market account (PDA)
- Vault A token account
- Vault B token account
- User token accounts
- Token Program

**Instruction Logs**:
```
Program AGMg3...Wjv7 invoke [1]
Program log: Instruction: Swap
Program log: Swapping 10 Token A for 0.5 Token B
Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]
Program log: Transfer 10 tokens from user to vault A
Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success
Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]
Program log: Transfer 0.5 tokens from vault B to user
Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success
Program AGMg3...Wjv7 success
```

**Token Balance Changes**:
- Tu dirección:
  - Token A: -10
  - Token B: +0.5
- Vault A: +10
- Vault B: -0.5

### Paso 4: Verificar en Phantom

1. Abre Phantom
2. Haz clic en la pestaña **"Activity"**
3. Verás la lista de transacciones recientes
4. Haz clic en una transacción para ver detalles
5. Haz clic en **"View on Explorer"** para abrir Solana Explorer

---

## Solución de Problemas

### Problema 1: Phantom no se conecta

**Síntomas**:
- Al hacer clic en "Connect Wallet", no pasa nada
- O aparece error: "Wallet not found"

**Soluciones**:
1. Verifica que Phantom esté instalado: https://phantom.app/download
2. Actualiza la extensión Phantom a la última versión
3. Refresca la página (F5)
4. Prueba en modo incógnito (sin otras extensiones)
5. Revisa la consola del navegador (F12 → Console) para errores

### Problema 2: Transacción falla con "Insufficient Funds"

**Síntomas**:
- Error: "Transaction simulation failed: 0x1"
- O "Account does not have enough SOL"

**Soluciones**:
1. Solicita más SOL de devnet:
   ```bash
   solana airdrop 2 TU_DIRECCION
   ```
2. Verifica balance en Phantom (debe tener al menos 0.01 SOL)
3. Espera unos segundos y vuelve a intentar

### Problema 3: Error "InsufficientLiquidity" (6002)

**Síntomas**:
- Error: "Custom program error: 0x1772"
- O "InsufficientLiquidity"

**Soluciones**:
1. Verifica que el mercado tenga liquidez:
   - Ve al Admin Dashboard
   - Añade más liquidez con "Add Liquidity"
2. Reduce la cantidad del swap a menos que la liquidez disponible

### Problema 4: Error "Unauthorized" (6007)

**Síntomas**:
- Error: "Custom program error: 0x1777"
- Al intentar "Set Price" o "Add Liquidity"

**Soluciones**:
1. Solo la autoridad del mercado (quien lo inicializó) puede hacer estas operaciones
2. Verifica que estés conectado con la wallet correcta en Phantom
3. Si necesitas cambiar de wallet:
   - Haz clic en tu dirección en Phantom
   - Selecciona otra cuenta
   - Reconecta en la aplicación

### Problema 5: Token Account no existe

**Síntomas**:
- Error: "Account not found"
- O "Invalid account"

**Soluciones**:
1. Crea la cuenta de token asociada:
   ```bash
   spl-token create-account TOKEN_MINT_ADDRESS
   ```
2. O usa el botón "Create Token Account" en la UI (si está implementado)

### Problema 6: Explorer muestra transacción pendiente

**Síntomas**:
- Status: "Processing" por más de 1 minuto
- O no aparece la transacción

**Soluciones**:
1. Espera 30-60 segundos más (devnet puede ser lento)
2. Refresca la página del Explorer
3. Busca por tu wallet address en lugar de la firma
4. Verifica que estés en la red correcta (Devnet)

### Problema 7: Precio no se calcula correctamente

**Síntomas**:
- Estimated Output muestra un valor extraño
- O no se actualiza al cambiar la cantidad

**Soluciones**:
1. Verifica que el precio esté establecido en el mercado
2. Refresca la página
3. Reconecta Phantom
4. Revisa la consola del navegador para errores de JavaScript

---

## Comandos Útiles para Debugging

### Ver logs del programa en tiempo real

```bash
# Reemplaza PROGRAM_ID con tu ID de programa
solana logs AGMg3zTXw2DNy2RzBtvxTTt3DCM2EY2LPYXssdanWjV7 --url devnet
```

### Ver información del mercado

```bash
# Obtener datos de la cuenta del mercado
solana account MARKET_ADDRESS --url devnet --output json
```

### Ver balances de todos los tokens

```bash
spl-token accounts --url devnet
```

### Ver transacciones de tu wallet

```bash
solana transaction-history TU_DIRECCION --url devnet | head -20
```

---

## Checklist de Pruebas Completas

Usa esta lista para asegurar que todas las funcionalidades están probadas:

### Configuración Inicial
- [ ] Phantom instalado y configurado en devnet
- [ ] Balance de SOL > 1 SOL
- [ ] Dos tokens SPL creados
- [ ] Cuentas de tokens creadas para ambos tokens

### Panel de Administración
- [ ] Conectar wallet exitosamente
- [ ] Inicializar mercado con dos tokens diferentes
- [ ] Verificar que no se puede crear mercado con mismo token (CRITICAL-001)
- [ ] Establecer precio > 0
- [ ] Añadir liquidez exitosamente
- [ ] Verificar que solo la autoridad puede usar el panel

### Interfaz de Swap
- [ ] Seleccionar mercado creado
- [ ] Ver detalles del mercado (precio, liquidez, balances)
- [ ] Swap A → B con cantidad válida
- [ ] Swap B → A con cantidad válida
- [ ] Intentar swap con cantidad > liquidez (debe fallar)
- [ ] Intentar swap con cantidad = 0 (debe fallar)
- [ ] Ver transacción exitosa en Phantom
- [ ] Verificar balances actualizados en tiempo real

### Verificación en Explorer
- [ ] Buscar transacción por firma
- [ ] Verificar status = Success
- [ ] Revisar logs del programa
- [ ] Verificar cambios de balance de tokens
- [ ] Ver eventos emitidos (si están visibles)

---

## Recursos Adicionales

### Enlaces Útiles

- **Solana Explorer (Devnet)**: https://explorer.solana.com/?cluster=devnet
- **Solana Faucet**: https://faucet.solana.com/
- **Phantom Wallet**: https://phantom.app/
- **Solana CLI Docs**: https://docs.solana.com/cli
- **SPL Token CLI**: https://spl.solana.com/token

### Videos y Tutoriales

- Phantom Wallet Setup: https://help.phantom.app/hc/en-us/articles/4406388623251
- Solana Devnet Guide: https://docs.solana.com/clusters#devnet

---

## Notas de Seguridad

⚠️ **IMPORTANTE**:

1. **Devnet es solo para pruebas**:
   - Los tokens de devnet NO tienen valor real
   - No uses esta wallet para mainnet
   - No compartas tu frase semilla (seed phrase) con nadie

2. **Claves privadas**:
   - Nunca compartas tu clave privada
   - No subas archivos de claves a GitHub
   - Usa hardware wallets para mainnet

3. **Código no auditado**:
   - Este programa es educativo
   - NO lo uses en mainnet sin auditoría profesional
   - Puede haber vulnerabilidades no descubiertas

---

## Contacto y Soporte

Para reportar problemas o pedir ayuda:

- **GitHub Issues**: [URL del repositorio]
- **Discord**: [Tu servidor de Discord]
- **Email**: [Tu email de contacto]

---

## Changelog de esta Guía

- **2026-03-29**: Creación inicial de la guía de pruebas manuales
