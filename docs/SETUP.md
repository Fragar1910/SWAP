# SWAP Program - Environment Setup

**FASE-0 Status:** ✅ Complete

This document describes the completed bootstrap and environment setup for the SWAP Solana program.

## Installed Toolchain

### Solana CLI
- **Version:** 3.1.11
- **Installation Path:** System-wide (available in PATH)
- **Verification:** `solana --version`

### Anchor CLI
- **Version:** 0.31.0
- **Installation Path:** `~/.cargo/bin/anchor`
- **Verification:** `anchor --version`

### Rust Toolchain
- **Stable:** aarch64-apple-darwin
- **BPF Toolchain:** 1.89.0-sbpf-solana-v1.53
- **Platform Tools:** v1.53
- **Note:** To build the program, ensure `~/.cargo/bin/cargo` (rustup wrapper) is in PATH before homebrew cargo

## Project Configuration

### Program ID
```
AGMg3zTXw2DNy2RzBtvxTTt3DCM2EY2LPYXssdanWjV7
```

### Solana Configuration
- **Cluster:** localhost (http://localhost:8899)
- **Keypair:** `~/.config/solana/id.json`
- **Commitment:** confirmed

### Dependencies Installed

**Rust (Cargo.toml):**
- `anchor-lang = "0.31.0"`
- `anchor-spl = "0.31.0"`

**TypeScript (package.json):**
- `@coral-xyz/anchor ^0.31.0`
- `@solana/web3.js ^1.95.0`
- `@solana/spl-token ^0.4.8`
- `mocha ^9.0.3`
- `chai ^4.3.4`
- `ts-mocha ^10.0.0`
- `typescript ^5.7.3`

## Test Framework Validation

✅ **Test Suite:** 1 passing
- Program ID logged correctly
- Wallet public key verified
- Environment initialized successfully

**Test Command:**
```bash
PATH="$HOME/.cargo/bin:/opt/homebrew/bin:$PATH" anchor test
```

## Build Artifacts

The following artifacts are generated successfully:

- `target/deploy/swap_program.so` (176KB BPF binary)
- `target/idl/swap_program.json` (Interface Definition Language)
- `target/types/swap_program.ts` (TypeScript type definitions)

**Build Command:**
```bash
PATH="$HOME/.cargo/bin:/opt/homebrew/bin:$PATH" anchor build
```

## Quickstart Commands

### Build the program
```bash
PATH="$HOME/.cargo/bin:/opt/homebrew/bin:$PATH" anchor build
```

### Run tests
```bash
PATH="$HOME/.cargo/bin:/opt/homebrew/bin:$PATH" anchor test
```

### Start local validator
```bash
solana-test-validator
```

### Deploy to localnet (in another terminal)
```bash
anchor deploy
```

### Check Solana config
```bash
solana config get
```

## Prerequisites for New Developers

1. **Rust:** Install via [rustup](https://rustup.rs/)
2. **Node.js:** v16+ recommended
3. **Yarn:** `npm install -g yarn` (project uses yarn as package manager)
4. **Solana CLI:** v1.18.0+
5. **Anchor CLI:** v0.31.0

### Platform-Specific Notes

**macOS (Apple Silicon):**
- Ensure rustup cargo wrapper is in PATH before homebrew cargo
- Add to `~/.zshrc` or `~/.bashrc`:
  ```bash
  export PATH="$HOME/.cargo/bin:/opt/homebrew/bin:$PATH"
  ```

**Troubleshooting:**
- If `anchor build` fails with "no such command: `+toolchain`", verify that `which cargo` points to `~/.cargo/bin/cargo` (rustup wrapper) and not `/opt/homebrew/bin/cargo`

## Verification Checklist

All FASE-0 acceptance criteria have been verified:

- [x] Solana CLI version >= 1.18.0
- [x] Anchor CLI version = 0.31.0
- [x] `anchor build` succeeds
- [x] `anchor test` passes
- [x] `target/deploy/swap_program.so` exists
- [x] `target/idl/swap_program.json` exists
- [x] Program ID in `lib.rs` matches `Anchor.toml`
- [x] No critical Rust compiler errors
- [x] No TypeScript compilation errors
- [x] Test framework functional

## Next Steps

**FASE-0 Complete:** ✅ Ready to proceed to FASE-1 (Core Program Structure)

Proceed to implement the core swap program structure including:
- Account definitions (PoolConfig, LiquidityPool, SwapResult)
- Initialize pool instruction
- Basic program state management

See `task/TASK-FASE-1.md` for implementation tasks.

---

**Last Updated:** 2026-03-25
**Pipeline Stage:** task-implementer (FASE-0)
**Traceability:** REQ-C-001 through REQ-C-008, ADR-001, spec/nfr/TOOLING.md
