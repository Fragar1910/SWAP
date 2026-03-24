## Directorio de referencia del proyecto educativo en la academia
-- https://gitlab.codecrypto.academy/codecrypto/rust-ejercicios/swap

## Proyecto Solana SWAP

### 1. Introduccion
Este proyecto implementa un sistema de intercambio de tokens (swap) en la blockchain de Solana utilizando el framework Anchor. El programa permite:


✅ Crear mercados descentralizados entre dos tokens (Token A y Token B)

✅ Establecer precios de intercambio fijos

✅ Agregar liquidez mediante depósitos de tokens

✅ Realizar intercambios unidireccionales (Token A → Token B) y también (Token B → Token A) como indica la guía 
de estudiantes

### 2. Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:
Software Necesario

2.1. Rust (versión 1.70.0 o superior)

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

2.2. Solana CLI (versión 1.18.0 o superior)

sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

2.3. Anchor Framework (versión 0.31.0 o superior)

cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

2.4. Node.js y Yarn

# Node.js (v18 o superior)
# Yarn
npm install -g yarn


2.5. Git


### 3. Conocimientos Recomendados


Conceptos básicos de blockchain
Fundamentos de Rust (tipos, ownership, structs)
Conceptos básicos de Solana (cuentas, PDAs, programas)
TypeScript básico (para los tests)

### 4. Arquitectura del Proyecto

Estructura de Directorios - Solo como referencia


solana-swap-2025/
├── programs/
│   └── solana-swap-2025/
│       └── src/
│           └── lib.rs          # Código principal del programa
├── tests/
│   └── solana-swap-2025.ts     # Tests en TypeScript
├── migrations/
│   └── deploy.ts               # Script de deployment
├── Anchor.toml                 # Configuración de Anchor
├── Cargo.toml                  # Dependencias de Rust
└── package.json                # Dependencias de Node.js


### 6. Componentes Principales



Programa Anchor (lib.rs): Contiene la lógica del smart contract

Tests (solana-swap-2025.ts): Pruebas automatizadas del programa

Configuración (Anchor.toml): Configuración del proyecto


### 7. Conceptos Clave de Solana y Anchor

1. Program Derived Addresses (PDAs)

Los PDAs son direcciones derivadas determinísticamente que permiten que un programa "posea" cuentas. En este proyecto:


Market PDA: Almacena la información del mercado

Vault A PDA: Bóveda para Token A

Vault B PDA: Bóveda para Token B


// Ejemplo: Derivar el PDA del mercado
seeds = [b"market", token_mint_a.key().as_ref(), token_mint_b.key().as_ref()]


2. Cuentas (Accounts)

En Solana, todo se almacena en cuentas:


MarketAccount: Estructura que almacena datos del mercado

TokenAccount: Cuenta de tokens SPL

Mint: Define un token (similar a un ERC20 en Ethereum)

3. Contextos (Contexts)

Los contextos en Anchor definen qué cuentas necesita una instrucción:

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    // Define todas las cuentas necesarias
}


4. Instrucciones (Instructions)

Cada función pública en el módulo #[program] es una instrucción:


initialize_market: Crea un nuevo mercado

set_price: Actualiza el precio de intercambio

add_liquidity: Agrega tokens a las bóvedas

swap: Intercambia tokens

### 8. Análisis del Código

1. Estructura de Datos: MarketAccount


#[account]
#[derive(InitSpace)]
pub struct MarketAccount {
    pub authority: Pubkey,        // Quien puede modificar el mercado
    pub token_mint_a: Pubkey,     // Dirección del Token A
    pub token_mint_b: Pubkey,     // Dirección del Token B
    pub price: u64,               // Precio de intercambio
    pub decimals_a: u8,           // Decimales del Token A
    pub decimals_b: u8,           // Decimales del Token B
    pub bump: u8,                 // Bump seed para el PDA
}


Pregunta para reflexionar: ¿Por qué necesitamos almacenar los decimales de cada token?
2. Inicialización del Mercado

La función initialize_market crea:

Una cuenta MarketAccount (PDA)
Una bóveda para Token A (PDA)
Una bóveda para Token B (PDA)

Conceptos importantes:


init: Crea una nueva cuenta

seeds: Define cómo derivar el PDA

bump: Asegura que el PDA sea válido

3. Agregar Liquidez

La función add_liquidity transfiere tokens desde las cuentas del authority a las bóvedas usando Cross-Program Invocations (CPI).
Flujo:

Verifica que amount_a o amount_b sean > 0
Transfiere Token A del authority a vault_a (si amount_a > 0)
Transfiere Token B del authority a vault_b (si amount_b > 0)

4. Swap (Intercambio)

La función swap implementa el intercambio A → B:
Cálculo del precio:

amount_b = (amount * price * 10^decimals_b) / (10^6 * 10^decimals_a)


Pasos:

Transfiere Token A del usuario a vault_a
Calcula cuántos Token B debe recibir el usuario
Transfiere Token B de vault_b al usuario (usando signer seeds)

Nota: El swap inverso (B → A) tenemos que implementarlo también.


#### 9. Guia paso a paso para estudiantes
Guía Paso a Paso

Paso 1: Entender el Flujo Completo

Antes de escribir código, entiende el flujo:


Setup: Crear dos tokens (Mint A y Mint B)

Inicializar: Crear un mercado entre los dos tokens

Configurar Precio: Establecer el precio de intercambio

Agregar Liquidez: Depositar tokens en las bóvedas

Swap: Intercambiar tokens

Paso 2: Revisar los Tests

Los tests en tests/solana-swap-2025.ts muestran cómo usar el programa:


Setup inicial: Crea tokens, cuentas, y hace airdrop de SOL

Test de inicialización: Verifica que el mercado se crea correctamente

Test de precio: Verifica que se puede actualizar el precio

Test de liquidez: Verifica que se pueden agregar tokens

Test de swap: Verifica que el intercambio funciona

Paso 3: Ejecutar los Tests


# Asegúrate de tener un validador local corriendo
solana-test-validator

# En otra terminal, ejecuta los tests
anchor test


Paso 4: Analizar el Código Rust

Lee lib.rs línea por línea y pregunta:

¿Qué hace cada struct?
¿Por qué se usan PDAs?
¿Cómo funcionan los signer seeds?
¿Qué es un CPI?

Paso 5: Implementar el Swap Inverso

Ejercicio: Implementa el swap B → A siguiendo el mismo patrón que A → B.
Pistas:

El cálculo del precio será diferente
Necesitas verificar que el precio no sea cero
Usa checked_div para evitar overflow

### 10 Extensiones o ejercicios del proyecto
Ejercicios Prácticos

Ejercicio 1: Implementar Swap Inverso

Objetivo: Completar la función swap para permitir intercambios B → A.
Pasos:

En el bloque else de la función swap, implementa la lógica inversa
El cálculo del precio será: amount_a = (amount * 10^6) / (price * 10^decimals_a / 10^decimals_b)

Asegúrate de manejar errores (precio cero, overflow)
Escribe un test para verificar el swap inverso

Ejercicio 2: Agregar Validaciones

Objetivo: Mejorar la seguridad del programa.
Tareas:

Verificar que solo el authority pueda llamar a set_price

Verificar que amount_a y amount_b en add_liquidity no sean ambos cero
Verificar que el vault tenga suficientes tokens antes de hacer swap
Agregar validación para evitar swaps de cantidad cero

Ejercicio 3: Agregar Eventos

Objetivo: Emitir eventos para facilitar el seguimiento.
Tareas:

Define eventos para cada acción (MarketInitialized, PriceSet, LiquidityAdded, SwapExecuted)
Emite eventos en cada función correspondiente
Escribe tests que verifiquen que los eventos se emiten correctamente

Ejercicio 4: Mejorar el Cálculo de Precio

Objetivo: Revisar y corregir la fórmula de cálculo.
Tareas:

Analiza la fórmula actual en swap

Verifica que el cálculo sea correcto matemáticamente
Prueba con diferentes valores de decimales
Documenta la fórmula

Ejercicio 5: Crear un Frontend

Objetivo: Crear una interfaz web para interactuar con el programa.
Tareas:

Usa Next.js y TypeScript
Conecta con Phantom wallet
Permite inicializar mercados, agregar liquidez y hacer swaps
Muestra los balances de las bóvedas

### 11. Recursos adicionales del proyecto
Recursos Adicionales

1. Documentación Oficial


Anchor Documentation
Solana Documentation
SPL Token Program

2. Tutoriales Recomendados


Solana Cookbook
Anchor Book
Solana Development Course

3. Herramientas Útiles


Solana Explorer
Solana Playground
Anchor Client

4. Comunidad


Solana Discord
Anchor Discord
Stack Overflow - Solana

### 12. Objetivos del proyecto educativo
Este proyecto te introduce a:

Desarrollo de programas en Solana
Uso del framework Anchor
Manejo de tokens SPL
Program Derived Addresses (PDAs)
Cross-Program Invocations (CPIs)

### 12. Comentarios sobre y reflexiones
La siguiente seccion son comentarios de una serie de videos educativos para realizar el proyectol. Son mis NOTAS y las tienes que tomar como requisitos. A estos requisitos se puede y debe poner más requisitos no funcionales, de test, de seguridad, auditabilidad, prevencion de vulnerabilidades etc... 
Esta seccion es como una descripción de la aplicacion que sirve de BASE para los REQUIREMENTS y crear las SPECIFICATION a través de un plugin SDD que ejecutaremos con CLAUDE. 

### 000 -GITHUB
Proyecto de Solana con guia con Ancor. 
Proyecto en repositorio de academia : https://github.com/codecrypto-academy/solana-swap-2025

### 200 - SWAP Proyecto
Proyecto : SWAP
Programa Solana que permite a los usuarios intercambiar entre un token A y token B a un precio establecido, que podremos cambiar.
Es una especie de mini-swap donde podemos controlar nosotros los precios. 
Simula un exchange físico de tienda de cambio en un pais, donde podemos cambiar diferentes divisas, por ejemplo nosotros entregamos Euros y nos devulven Dolares en EE.UU.
El ADMINISTRADOR crea el swap, añade liquidez, puede cambiar el precio cuando quiera.

El USUARIO puede hacer swap al precio indicado.

Tenemos distintos agentes:
market : PDA, marketAccount. Es una cuenta PDA. tendrá diferentes seeds, donde tendrá dos tokens, y la key de cada token formará parte de la PDA.

VaultA:  PDA, Token account gestiona por market Token A.
VaultB: PDA , token account gestiona por market Token B.
Son dos bóvedas, y mantiene la liquedez. El propetario del market meterá en las Vaults los tokens A o B. 
Los tokens de Solana en la token accounts. La estructura del token está en Token Mint.

Token Mint A: TokenMint de A
Token Mint B: TokenMint de B
Son de tipo TokentMint

Initializer : KeyPair. Es un wallet que tiene la clave pública y privada. Da la liquidez a las bovedas.
User : KeyPair  . Es el que hace las transacciones.

Ambos initaalizer y user tendran ATA : Associated Token Account. Que tendrán la asociacion con sus tokens. Las cuentas estas no pertenecen al programa. Se necesita por si inicialicer tiene que proveer tokens A o B.

ATA : Initializer + Token A
ATA: User + Token A
ATA : Initializer + Token B
ATA : User + Token B

El software podría servir para n-pares, que tendrían su market correspondiente y su n-bovedas correspondientes. Pero esto es una extensión del programa que de momento no ejecutaramos ni programaremos. 

### 210 - SWAP - PROCESO
Como funciona la logica de usos de las cuentas y las operaciones.
El inicializer que es un wallet (keyPair) Inicializa la cuenta MarketAccount
El initializer (KeyPar) add liquidity to VaultA y VaultB
El initializer (KeyPar) set price por ejemplo 1 Token A = 1.5 Token B
El user (Keypar) hace un swap, aportando o Token A o Token B.
La operacion swap transfiere los token aportados por el user a Vault A o Vault B y transfiere los output segun el price del VaultA, vaultB  la token account del user.

El user va a firmar la transaccion. La firma de la operación del envio de Tokens lo tiene que firmar la PDA que tiene capacidad de firma. 

Ejemplo de instrucciones. Un programa de Solana tiene instrucciones y estas tienen cuentas asociadas.
-Initialize market: Inicializa el market
-Set_exchange_rate : estable el tipo de cambio por el inicializer, nuevo precio al intercambio. se puede hacer cada dia, hora, con robot, en manual, etc...
-add_liquidity: para añadir liquedez a las vault A o B. se puede usar un bool para true : vault A o false : vault B.
-swap: intercambio de tokens de A a B según conversion. 

Este es un ejemplo de entry point para hacer la estructura. Podemos hacer más cosas, si CLAUDE lo sugiere.

TODO este desarrollo tiene que tener las mejores PRACTICAS para SEGURIDAD, AUDITABILIDAD y proteccion frente a VULNERABILIDADES.

### 220-SWAP-INITIALIZE
Este apartado es ver las instrucciones frente al Contexto (Context) correspondiente.
El contexto es una estructura dónde se definen todas las cuentas.
Por ejemplo initialize_market tien el ctx: Context<InitializeMartker> donde el <InitializeMarket> tiene Account (mut) con initializer, token_mint_a, token_mint_b y también tenmos Account con init, payer, space, seeds, bump. El pub market:Account<ìnfo, MarketAccount> con Accoun MarketAccount que es un struct, con authority (clave publica de la autoidad del market), token_mint_a: direccion del mint del token A, token_mint_b: direccion del mint del token B, price, decimals_a, decimals_b y el bump: Bump de la PDA para MarketAccount.
Además tien que tener las dos bóvedas, vault_a y vault_b que son PDAs. La autoridad es el market, que es la PDA del market es la autoridad del Vault. 
Luego tenemos otras cuentas como el system:program, token_program y rent que es un sysvar.

### 225-SWAP-LIB-INITIALIZE
Tenemos que definir la estructura del market y el contexto. Esto lo hemos explicado anteriormente.
La estructura tiene lo siguiente:
-Token mint A
-Token mint B
-Price
-Decimals_a
-Decimals_b
-bum : bump de la PDA para MarketAccount

El initializeMarket tendra:
initializer
token_mint_a : account
token_minb_b : account

la acount tiene un init, un payer que es la autority, un space un 8 para el dicriminador + marketaccount:INIT SPACE que no entre en la curva elipticia. Un seeds que es el market con una parjea de tokens y el bump.
Comenzamos con la estructura, después definimos las accounts y luego la ejecucion dentro del pub mod de Solana.

Hay un program para solana en lib.rs y otro para test en solana-swap.ts. Donde para inicilizar se menten las cuentas y hay que inicializar las cuentas. Todo esto en Typescript.

### 230-SWAP-RESTO DE INSTRUCIONES
set_exchange_rate tiene el contexto del market SetExchangeRate donde la cueneta el mutable. Firma el autority.  Tiene otra cuenta mutable que es una PDA con seeds de claves del token A y token B como market.token_mint_a.key(). Es una cuenta de tipo market account, definida el apartado anterior para inicializarla. 

Describimos add_liquidity, que tiene un contexto AddLiquidity, donde le decimos la cantidad que queremos y a que vault va a A o B.
Tiene cuentas como autorithy, la cuenta del market (source_token_account), donde se pasan tokens a vault a o vault b, las cuentas de los vault A y vault B de tipo TokenAccount. 
Tambien tenemos la operacion swap, donde recibe amount y swap_a_to_b con bool. Ademas que tiene context swap, con usuario (wallet) y tienes account con user token A account y usere token B account, tambien tiene que definir el market. y definir los vaults.

### 240_SWAP-PREPARACION PROYECTO ANCHOR (esta info no es muy relevante para las especificaciones es para la funcionalidad)
Vamos a preparar el proyecto en RUST con ANCHOR y una parte de Typescript para los test, con next.js. 
Vamos a lanzarlo con el validador y no con devnet ni testnet. 
Tenemos que tener un validador en local: 
nohup solana-test-validator -r &
Si está levantado y queremos pararlo (matarlo): kill -9$S
ps aux | grep-solana-test-validator
ps aux | grep solana-test-validator | grep -v grep | awk '{print $2}' (para la negacion en -v , y el campo 2). me devuelve un resulatdo por ejemplo 93890.
Si quiero matarlo direcdtamente lo paso a traves de parametro con $
kill -9 $(ps aux | grep solana-test-validator | grep -v grep | awk '{print $2}') y me dara un output 93890 killes nohup solana-test-validator -r.
Para levantarlo : nohup solana-teset-validator --reset &
podemos usar un tail nohoup.out  (nos da la info) o tail -f nohoup.out nos saca las lineas que van saliendo.

Tenemos que tener la configuracion vien puesta con "solana config get"
tambien con solana config set --url devnet
se puede hacer un solana balance y me da lo que tengo 12 SOL
se puede hacer un solana airdrop 5
Comandos basicos:
solana address
solana balance
solana airdrop (nos devuelve una signature)
podemos ir a explorer.solana.com. Se puede conectar a la mainet o custom RPC donde se pueden ver las transaccioens. 

Otros comandos como:
anchor init solana-swap-2025 ( este es el nombre del programa). Coge la plantilla y nos mete en el programa. hace un yarn.
Despues se hace un cd solana-swap-2025 y hacer code . para entrar en el editor. 
Voy a la terminal y le podemos hacer un "anchor build" la primera vez es mas lento y luego va mas rapido dependiendo de nuestro codigo. Hace un target y contruye el fichero idl.
Luego puedo hacer un "anchor test " donde se hace la salida del programa en el puerto 8899 que es por defecto, donde puede decirte que teine eel anchor validadtor que hay. Luego se toca el lib.rs y el test en solana-swap-2025.ts. 

### 250 - SWAP-INITIALIZE

Esta parte se ve la estructura de la libreria de RUST para ver como inicializar los accounts.
Esta decorada con [account] y con [derive(InitSpace)] las cuentas en solana se paga por el tamaño que tiene.
Hay que definir todas las estructuras de cuentas que tiene initializer market. 
Tiene la cuenta del market account qeu es una PDA. Que tiene unos seeds que están con la palabra market con los token_mint_a.key y token_mint_b.key donde se hace un hash y para que no caiga en la curva eliptica se usa en bump, que va restando desde 255,254, etc...
Ademas va a tener mas cuenta los token_mint_a y b que ya tienen que exister, el programa no las crea. El initalizemarket si que las tenemos que crear, con su init, su payer, space, seeds y bumps.

Luego estan las cuenta de las bovedas, con vault_a y vaoult_b. Son almacenes que almacenan tokens y tienen que ser por tanto TokenAccounts.
Hay una cuenta de authority que es un signer y es el que firma, ademas tiene que estar los sytem_program, token_program y el rent.
Cuando ejecuto una instruccion por una lado tengo los parametros y por otro las cuentas.
luego esta el pub mod solana_swap_2025 con el pub fn initialize_market. 
Hasta aqui el RUST.

Luego hay que mirar la partes del TEST en Typescript.
describe..
Establecemos el providdr con anchor.setProvider.
Luego hay una wallet con const wallet= new anchor.wallet...
Luego viene el program con las variables, initializer, user, mintA, mintB, vaultA, vaultB, maeket , bump, userTokenAAccount, userTokenBAccount,...
Despues una serie de variables que viene en el before (async ()) que se inicializan cada vez que ejecutamos un test.
Despues hay que inicializar los mints de A y be
Luego hacer la PDA, con const [m.b] = publickey.findprogramaddresssynct. luego las PDA de los vaults,... 
Luego se crean cuentas para que tengan tokens, hemos metidos SOL pero no tienen token, en solan es un contexto de token account con getOrCreateAssociatedTokenAccount es el concepto de ATA. Este es el que paga con conection, initilizer, mintA y user.publickey (onwer) tanto A para B. Tambien para el initializerTokkenAAcount y initializaerTokkenBAccount. 
Tenemos que meter tokens con mintTo (mintA , mintB y user)
Todo esto se hace para cada test.

Luego se hace cada test, como should initalize merket. 
Para pasar los test : "anchor test" que ejecuta los test.

### 260-SWAP-SETPRICE
Esta operacion es para poder cambiar el RATE de los tokens.
Es hacer un contesxto que es el SetPrice. 
Se define las cuentas necesarias para hacerlo, el token_mint_a y el b, el market. Que tiene que estar inicializada la cuenta market, se le dice la autoridad, el sytem_program, token_program y rent.. y poco mas.
La instruccion es en el pub fn set_price con el contexto donde le cambiamos el precio.
Tambien se describe como llamar desde el testing con variable globales y accesibles desde todo el program.
En solana como todos los datos son enteros, se usa el anchor.BN que la tiene typescript de serie pero se usa para numeros grandes.

el ambiente en typescript incoprota un fiecheero del target/types/solana... que se importa en typescript.
### 270-SWAP-ADD-LIQUIDITY
Para añadir liquedez tenemos dos bovedas , la A y la B.
Se monta una estructura con los tokens, los vaults A y B, el autority toke a y toke b, que son tokenAccount.
La operacion fn propia mente dicha, hay un market, el vault a y vault b. Si la cantidad de amount_a es mayor que cero se inicia la transferencia.
La transferencia la hace el programa de los tokens. Se utiliza el "cpi" cpi_accounts. El cpi Transfer tine un from, un to y un autority que el la accoun autority.
El cpi_program que es ctx.accounts.token_program.to_account_info , su transfer recibe el contexto CpiContes con new(cpi_program, cpi_accounts), amounts.
Lo mismo para amount_b. 
Tenemos que programar el testing en Typescript. Se coje los balances before y los imprimimos, luego transferimos por ejemplo 100. Se multiplica por el numero de decimales para convertilos en u64. Se llama a la operacion, pasando todas las cuentas como , el marke, tokenmintA, tokenMintB, autorityTokenA, autorityTokenB, vaultA(PDA), vaultB (PDA), autority, systemprogram, tokenprogram, y rent.
luego pues se imprime los distintos balances de despues, etc...
el test se hace con anchor test

### 280 - SWAP-SWAP-1
Habla de la estructura del programa con un diagrama . Me faltan las flechas pero no las puedo poner. Se describe en texto.
USER            userTokenAccountA                               autority                authorityTokenAccountA
                    20TokenA - 10                                                               1000 tokens

                userTokenAccountB
                    0 token B + 20                      change: 1tokenA = 2tokenB       authorityTokenAccountB
                                                                                                1000 tokens    

operacion
swap

Market              20 token B


            10 Token A

        Program         Vault A                                                         add_liquidity
                        100 + 10                                                            100 tokenA
        PDA                                                                                    100 tooken B

                        Vault B
                        100 - 20            

 El autority provee de liquidez a las vault con add_liquidity. En el ejemplo 100 tokens A y 100 Tokens B
 El user hace un swap de 10 tokenA , este se envia por el user de userTokenAccountA a VaultA que lo gestiona el programa a traves de una PDA. Su cuenta de userTokenAccountA se decrementa de 20 a 10 (-10 tokenA)
 El programa a traves de la firma del market que es la autority y teniendo en cuenta el cambio de 1 a 2, a traves del program (PDA) envia desde Vault B 20 tokens a user que se incrementa su cuenta de userAccountB de 0 a 20(TokenB).       
### 290 - SWAP - RUST
Operacion swap. La instruccion de swap tiene las siguentes cuentas, token mint A y B. esturctura mutable que es una PDA con su bump. luego los vault a y b que son mutables y PDA. tienen el market.key.
ademas habra un usuraio que tendra que sacar user_token_a y user_token_b , esto lo hara la firma el usurio y tenndremos el sistem program tambien.

La instruccion pub fn swap tendra el contesxto de Swap y los parametros, que sera la cantidad y desde donde a_to_b : bool.
Tambien hay un cpi_accounts y un cpi_programs. Se coge tambien el program. Que esta definido en la cuentas del usurio. Se untiza un tranfer con el CpiContex :: new (cpi_program, cpi_accounts), amount. La autoridad es el usurio.
En solana hay que definir todas las cuentas afectadas tanto si son progrmas como si son datos. Todo.

Por otro lado esta la cpi_account2 que se transfieren desde el vault_b al user_tokenB (haciendo la conversion) en este caso la autoridad es el market, que es una cuenta que pertenece al programa y es quien va a firmar la transaccion.

el amount hace todas las operaciones y vericficaciones como checked_div,...

Luego se define el cpi_program2 y  se define las signe_seeds, metodo más complejo para que las firme el market. Se hace la transferencia co transfer con new_with_singner y se meten las cpi_account2, signer_seeds que es el mecanismo que tiene que firmar, no es una wallet y no es criptografica. Es una cuenta que pertenece al programa. Esta fuera de la curva eliptica.   El market bump se inicializo en initialize para que no sea necesario hacer el calculo del market.
El signer_seeds tiene el market, market token_mint_a , market.token_mint_b y el market.bump.

Tambien hay que programar el caso contrario , transferir meter tokens b y recibimos tokens a.

### 300 - SWAP - TEST
hacemos el test de SWAP en Typescript con un it.

### 13. UI page con React +next.js
Hacer una interface moderna, intuitiva basada en los requisitos indicados en la primera parte de estos requirements. Basate en paginas web de Crypto exchanges como Binance u otros del sector. Facil de manejar por el usurio. Usa librerias de componentes estandarizadas, y ten en cuenta todas las mejores practicas de evitar vulnerabilidades y seguridad. 


