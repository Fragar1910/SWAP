# FASE-0: Bootstrap & Environment Setup

**Status:** Not Started
**Priority:** CRITICAL
**Estimated Effort:** 2 hours
**Dependencies:** None (entry point)

---

## Objective

Initialize the Solana SWAP project structure, development environment, and toolchain. This FASE creates an empty but fully configured skeleton ready for implementation.

**Key Goal:** Developer can run `anchor build`, `anchor test` successfully (with empty program).

---

## Specifications Covered

| Spec File | Coverage | Reason |
|-----------|----------|--------|
| `spec/adr/ADR-001-anchor-framework.md` | 100% | Anchor 0.31.0 setup, project initialization |
| `spec/nfr/TOOLING.md` | 100% | Development environment configuration |
| `requirements/REQUIREMENTS.md` | REQ-C-001 through REQ-C-008 | Environmental constraints |

**No business logic implemented** - pure infrastructure setup.

---

## Deliverables

### 1. Anchor Project Initialization

```bash
# Execute in project root
anchor init swap-program --solana-version 1.18.0
cd swap-program
```

**Creates:**
- `programs/swap-program/` - Rust program skeleton
- `tests/` - TypeScript test skeleton
- `Anchor.toml` - Project configuration
- `Cargo.toml` - Rust workspace configuration

**Configuration:**
- Anchor version: 0.31.0 (per ADR-001)
- Solana version: 1.18.0 (stable)
- Cluster: `localnet` for development

### 2. Rust Program Dependencies

**File:** `programs/swap-program/Cargo.toml`

```toml
[package]
name = "swap-program"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "swap_program"

[dependencies]
anchor-lang = "0.31.0"
anchor-spl = "0.31.0"
```

**Key Dependencies:**
- `anchor-lang`: Core framework (macros, error handling, account validation)
- `anchor-spl`: SPL Token integration (token transfers, PDA management)

### 3. TypeScript Client Dependencies

**File:** `package.json`

```json
{
  "name": "swap-client",
  "version": "0.1.0",
  "scripts": {
    "build": "anchor build",
    "test": "anchor test",
    "deploy": "anchor deploy",
    "clean": "anchor clean"
  },
  "dependencies": {
    "@coral-xyz/anchor": "^0.31.0",
    "@solana/web3.js": "^1.95.0",
    "@solana/spl-token": "^0.4.8"
  },
  "devDependencies": {
    "@types/mocha": "^10.0.0",
    "@types/chai": "^4.3.0",
    "chai": "^4.3.7",
    "mocha": "^10.2.0",
    "ts-mocha": "^10.0.0",
    "typescript": "^5.3.0"
  }
}
```

### 4. Anchor Configuration

**File:** `Anchor.toml`

```toml
[toolchain]
anchor_version = "0.31.0"

[features]
resolution = true
skip-lint = false

[programs.localnet]
swap_program = "SwapProgramXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

[programs.devnet]
swap_program = "SwapProgramXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### 5. Empty Program Skeleton

**File:** `programs/swap-program/src/lib.rs`

```rust
use anchor_lang::prelude::*;

declare_id!("SwapProgramXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

#[program]
pub mod swap_program {
    use super::*;

    // Instructions will be implemented in FASE-2 and FASE-3
}

// Account structures (FASE-1)
// Error codes (FASE-1)
// Constants (FASE-1)
```

### 6. Test Skeleton

**File:** `tests/swap-program.ts`

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SwapProgram } from "../target/types/swap_program";

describe("swap-program", () => {
    // Configure client
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SwapProgram as Program<SwapProgram>;

    it("Initializes test environment", async () => {
        console.log("Program ID:", program.programId.toString());
        console.log("Provider wallet:", provider.wallet.publicKey.toString());
    });

    // FASE-2: initialize_market tests
    // FASE-2: set_price tests
    // FASE-2: add_liquidity tests
    // FASE-3: swap tests
});
```

### 7. TypeScript Configuration

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "types": ["mocha", "chai"],
    "typeRoots": ["./node_modules/@types"],
    "lib": ["es2015"],
    "module": "commonjs",
    "target": "es6",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "skipLibCheck": true
  },
  "exclude": [
    "node_modules",
    "target"
  ]
}
```

### 8. Development Tools Setup

**Install Solana CLI:**
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
solana --version  # Should be >= 1.18.0
```

**Install Anchor CLI:**
```bash
cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.0 anchor-cli --locked
anchor --version  # Should be 0.31.0
```

**Configure Solana for Local Development:**
```bash
solana config set --url localhost
solana-keygen new --outfile ~/.config/solana/id.json  # If no wallet exists
```

---

## Verification Checklist

**After FASE-0 completion, verify:**

- [ ] `anchor build` completes successfully (produces `.so` binary)
- [ ] `anchor test` runs without errors (skeleton test passes)
- [ ] `target/deploy/swap_program.so` exists
- [ ] `target/idl/swap_program.json` exists
- [ ] `target/types/swap_program.ts` generated
- [ ] `solana-test-validator` starts successfully
- [ ] No Rust compilation warnings
- [ ] TypeScript compilation passes (`tsc --noEmit`)

**Success Criteria:**
```bash
$ anchor build
Building swap-program...
✔ Built program successfully

$ anchor test
Running tests...
  swap-program
Program ID: SwapProgramXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Provider wallet: 5Z...xyz
    ✓ Initializes test environment (50ms)
  1 passing (100ms)
```

---

## Downstream Dependencies

**FASE-1** depends on:
- ✅ Anchor project structure exists
- ✅ Dependencies installed (`anchor-lang`, `anchor-spl`)
- ✅ Build system functional

**Blockers if FASE-0 fails:**
- Cannot import `anchor_lang::prelude::*` (FASE-1 blocked)
- Cannot define `#[account]` structures (FASE-1 blocked)
- Cannot write integration tests (FASE-5 blocked)

---

## Traceability

| Requirement | Satisfied By |
|-------------|--------------|
| REQ-C-001 (Anchor framework) | Anchor 0.31.0 installation |
| REQ-C-002 (Solana blockchain) | Solana CLI 1.18.0+ |
| REQ-C-004 (SPL Token) | `anchor-spl` dependency |
| REQ-C-007 (TypeScript client) | `package.json` + `tsconfig.json` |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Anchor version mismatch | Low | High | Pin to 0.31.0 in `Cargo.toml` |
| Solana version incompatibility | Medium | High | Test with Solana 1.18.0, document min version |
| Missing Rust toolchain | Low | Blocker | Add setup instructions, check `rustc --version` |
| Network issues (registry) | Medium | Low | Use offline mode (`cargo build --offline` if needed) |

---

## Time Breakdown

| Task | Estimated Time |
|------|---------------|
| Anchor project init | 15 min |
| Dependency installation | 30 min |
| Configuration files | 20 min |
| Solana CLI setup | 15 min |
| Verification tests | 20 min |
| Documentation | 20 min |
| **Total** | **2 hours** |

---

## Next Steps

After FASE-0 completion:
1. ✅ Commit initial project structure
2. ➡️ Proceed to **FASE-1** (Core Program Structure)
3. Generate program ID: `anchor keys list`
4. Update `declare_id!()` in `lib.rs` and `Anchor.toml`

---

**Generated:** 2026-03-23
**Spec Coverage:** 3 files (ADR-001, TOOLING.md, REQUIREMENTS.md constraints)
**Business Logic:** 0% (infrastructure only)
