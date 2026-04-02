# Solana SWAP - Fixed-Price DEX

A simple, educational decentralized exchange (DEX) for Solana with administrator-controlled fixed pricing.

## Features

- **Initialize Markets**: Create trading pairs for any two SPL tokens
- **Set Exchange Rates**: Administrator manually sets fixed prices
- **Add Liquidity**: Provide tokens to enable swaps
- **Execute Swaps**: Users swap tokens at current exchange rates
- **Event Emission**: All operations emit auditable on-chain events

## Architecture

- **Program**: Rust + Anchor 0.31.0 (Solana smart contract)
- **Frontend**: React + TypeScript + Solana Wallet Adapter
- **Testing**: Mocha + Chai integration tests

## Quick Start

### Prerequisites

- Rust 1.75+
- Solana CLI 1.18+
- Anchor CLI 0.31.0
- Node.js 18+
- Phantom or Solflare wallet

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/solana-swap.git
cd solana-swap

# Install dependencies
yarn install

# Build program
anchor build

# Run tests
anchor test
```

### Deploy to Devnet

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Run Frontend

```bash
cd app
yarn install
yarn start

# Open http://localhost:3000
```

## Usage

### As Administrator

1. Connect Phantom wallet
2. Navigate to **Admin Dashboard**
3. **Initialize Market**: Enter Token A and Token B mint addresses
4. **Set Price**: Enter exchange rate (e.g., 1 USDC = 0.05 SOL)
5. **Add Liquidity**: Provide tokens to both vaults

### As User

1. Connect wallet
2. Navigate to **Swap Interface**
3. Enter market address
4. Select swap direction (A→B or B→A)
5. Enter input amount
6. Preview output amount
7. Click "Execute Swap"

## Testing

```bash
# Unit tests (Rust)
cargo test

# Integration tests (TypeScript)
anchor test

# Full test suite
anchor test --skip-deploy
```

## Test Coverage

- **BDD Scenarios**: 13/13 (100%)
- **Unit Tests**: 8 modules
- **Integration Tests**: 6 end-to-end flows
- **Overall Coverage**: ~85%

## Performance

- **Swap A→B**: ~11,500 CU (with events)
- **Swap B→A**: ~11,500 CU (with events)
- **Initialize Market**: ~8,000 CU
- **Set Price**: ~2,000 CU
- **Add Liquidity**: ~6,000 CU

## Security

- ✅ Checked arithmetic (overflow protection)
- ✅ PDA-based vaults (no private keys)
- ✅ Authority constraints (Anchor `has_one`)
- ✅ Same-token market rejection
- ✅ Price validation (prevents division by zero)
- ✅ Sufficient liquidity checks

**⚠️ Educational Project:** Not audited for production use.

## Documentation

- [Technical Specifications](spec/README.md)
- [ADRs (Architecture Decision Records)](spec/adr/)
- [API Documentation](spec/contracts/API-solana-program.md)
- [Use Cases](spec/use-cases/)

## License

MIT

## Contributors

- Development Team: Francisco Hipolito Garcia Martinez

## Acknowledgments

- [Anchor Framework](https://www.anchor-lang.com/)
- [Solana Program Library](https://spl.solana.com/)
- SWEBOK v4 (requirements engineering methodology)
