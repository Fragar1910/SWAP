# Contributing to Solana SWAP

Thank you for contributing! This guide explains the development workflow.

## Development Setup

1. Install prerequisites (see README.md)
2. Fork the repository
3. Clone your fork: `git clone https://github.com/YOUR_USERNAME/solana-swap.git`
4. Create a feature branch: `git checkout -b feature/your-feature`

## Project Structure

```
solana-swap/
├── programs/swap_program/    # Rust program (Anchor)
│   ├── src/
│   │   ├── lib.rs            # Entry point with instruction definitions
│   │   ├── state/            # Account structures (MarketAccount)
│   │   ├── utils/            # Helper functions (swap_math)
│   │   ├── error.rs          # Error codes (SwapError enum)
│   │   ├── events.rs         # Event definitions
│   │   ├── types.rs          # Type aliases
│   │   └── constants.rs      # Program constants
│   └── Cargo.toml
├── tests/                     # Integration tests (TypeScript)
│   ├── swap-program.ts        # Original test suite (10 tests)
│   └── full-integration.ts    # BDD scenarios (6 tests)
├── app/                       # React frontend
│   ├── src/
│   │   ├── pages/            # UI pages (AdminDashboard, SwapInterface)
│   │   ├── contexts/         # React contexts (AnchorContext, WalletContext)
│   │   ├── components/       # Reusable UI components
│   │   └── App.tsx
│   └── package.json
├── spec/                      # Technical specifications
│   ├── domain/               # Domain model (glossary, entities, states)
│   ├── use-cases/            # Use case specifications
│   ├── contracts/            # API contracts
│   ├── adr/                  # Architecture Decision Records
│   ├── nfr/                  # Non-functional requirements
│   └── tests/                # BDD test scenarios
├── plan/                      # Implementation plan (FASE files)
├── task/                      # Task breakdown (task-generator output)
└── scripts/                   # Automation scripts (deploy.sh)
```

## Coding Standards

### Rust

- Follow Rust naming conventions (snake_case for functions/variables)
- Add doc comments for all public items:
  ```rust
  /// Calculate Token B output for a given Token A input
  ///
  /// # Arguments
  /// * `amount_a` - Input amount in Token A base units
  /// * `market` - Market account with price and decimals
  ///
  /// # Returns
  /// Token B output amount in base units
  pub fn calculate_a_to_b_output(amount_a: u64, market: &MarketAccount) -> Result<u64>
  ```
- Use `cargo fmt` before committing
- Run `cargo clippy` and fix warnings
- Use checked arithmetic (`.checked_mul()`, `.checked_div()`)
- Add traceability comments:
  ```rust
  // Traceability: ADR-005, INV-SWP-001, REQ-F-006
  ```

### TypeScript

- Use TypeScript strict mode
- Follow Airbnb style guide
- Use ESLint and Prettier
- Avoid `any` types (use proper interfaces)
- Functional components with hooks (React)

**Example:**
```typescript
interface MarketDetailsProps {
  marketAddress: string;
  price: number;
  authority?: PublicKey;
}

export const MarketDetails: React.FC<MarketDetailsProps> = ({
  marketAddress,
  price,
  authority,
}) => {
  // Component logic
};
```

## Testing

### Unit Tests (Rust)

```bash
# Run all unit tests
cargo test

# Run specific module tests
cargo test utils::swap_math

# Run with output
cargo test -- --nocapture
```

**Test Naming Convention:**
- `test_<function>_<scenario>` (e.g., `test_a_to_b_calculation`)
- `test_<scenario>_error` for error cases (e.g., `test_price_not_set_error`)

### Integration Tests (TypeScript)

```bash
# Run all integration tests
anchor test

# Skip local validator deployment (use existing)
anchor test --skip-deploy

# Run specific test file
anchor test tests/full-integration.ts
```

**Test Organization:**
- Use `describe()` blocks for grouping
- Use `before()` for test setup
- Use `it()` for individual test cases
- Add console.log for success messages:
  ```typescript
  console.log("✅ BDD Scenario 1: PASSED (Happy Path)");
  ```

### Frontend Tests

```bash
cd app
npm test
```

## Pull Request Process

1. **Update documentation** for any API changes
2. **Add tests** for new features:
   - Unit tests for pure functions
   - Integration tests for instructions
   - Frontend tests for UI components
3. **Ensure all tests pass**: `anchor test`
4. **Update CHANGELOG.md** with your changes
5. **Submit PR** with clear description:
   - What problem does it solve?
   - How does it work?
   - Breaking changes?
6. **Address review feedback** promptly

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `test`: Adding/updating tests
- `refactor`: Code refactoring
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples:**
```
feat(swap): add bidirectional swap support

Implements A→B and B→A swap directions using swap_a_to_b parameter.

Refs: UC-004, UC-005, ADR-002
```

```
fix: prevent same-token market creation

Adds validation to reject markets where token_mint_a == token_mint_b.

Fixes: CRITICAL-001
```

```
docs(readme): update deployment instructions

test(integration): add BDD scenario for insufficient liquidity

chore(deps): upgrade anchor to 0.31.1
```

## Code Review Checklist

Before requesting review:

### Functionality
- [ ] Feature works as intended
- [ ] All acceptance criteria met
- [ ] Error cases handled gracefully
- [ ] No regressions introduced

### Code Quality
- [ ] Code follows style guide
- [ ] No unnecessary complexity
- [ ] Functions are small and focused
- [ ] Variable names are descriptive
- [ ] No commented-out code
- [ ] No debug logs left in production code

### Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] All tests pass
- [ ] Edge cases covered
- [ ] Error paths tested

### Documentation
- [ ] README.md updated (if needed)
- [ ] API changes documented
- [ ] Inline comments for complex logic
- [ ] CHANGELOG.md updated

### Security
- [ ] No secrets in code
- [ ] Input validation added
- [ ] Checked arithmetic used
- [ ] Authority constraints enforced
- [ ] No PII in logs

## Development Workflow

### Working on a Feature

```bash
# 1. Create feature branch
git checkout -b feature/add-liquidity-withdrawal

# 2. Make changes
# Edit files...

# 3. Build and test
anchor build
anchor test

# 4. Commit changes
git add .
git commit -m "feat(liquidity): add withdrawal instruction"

# 5. Push to your fork
git push origin feature/add-liquidity-withdrawal

# 6. Open PR on GitHub
```

### Local Development

```bash
# Start local validator (terminal 1)
solana-test-validator

# Deploy program (terminal 2)
anchor deploy

# Start frontend (terminal 3)
cd app
npm start

# Run tests (terminal 4)
anchor test --skip-deploy
```

## Debugging Tips

### Rust Program Debugging

- Use `msg!()` macro for logging:
  ```rust
  msg!("Market price: {}", market.price);
  ```
- View logs: `solana logs` or in Anchor test output
- Use `anchor test -- --nocapture` to see all output

### Frontend Debugging

- Open browser DevTools (F12)
- Check Console for errors
- Use React DevTools extension
- Network tab for transaction inspection

### Common Issues

**Issue:** "Error: Account does not exist"
- **Solution:** Run `anchor test` (not `anchor test --skip-deploy`)

**Issue:** "Transaction simulation failed: Insufficient funds"
- **Solution:** Airdrop SOL: `solana airdrop 2`

**Issue:** "Program ID mismatch"
- **Solution:** Rebuild with correct ID: `anchor build && anchor deploy`

## Questions?

Open an issue or contact the maintainers:
- GitHub Issues: https://github.com/your-org/solana-swap/issues
- Discord: [Your Discord Server]
- Email: maintainer@example.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
