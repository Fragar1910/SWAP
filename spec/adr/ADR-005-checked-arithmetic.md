# ADR-005: Checked Arithmetic for Overflow Protection

**Status:** Accepted
**Date:** 2026-03-22
**Deciders:** Technical Architect, Security Lead
**Traceability:** REQ-NF-001, REQ-NF-002, REQ-F-006, REQ-F-007

## Context

The Solana SWAP program performs mathematical operations on token amounts (u64 values) for:
1. **Swap calculations**: Converting input amounts to output amounts based on exchange rates
2. **Price conversions**: Scaling between token decimals (typically 6-9 decimals)
3. **Liquidity accounting**: Tracking vault balances (future feature)

Rust's default arithmetic operators (`+`, `-`, `*`, `/`) panic on overflow in debug mode but **wrap silently in release mode** (e.g., `u64::MAX + 1 = 0`). This creates critical security risks:
- **Overflow attacks**: Malicious users could craft inputs causing wrapped calculations, receiving more tokens than deserved
- **Underflow attacks**: Negative balances wrapping to large positive values
- **Division by zero**: Crashes or undefined behavior

We must choose an arithmetic strategy that guarantees correctness and security.

## Decision

We will use **checked arithmetic methods** (`checked_mul`, `checked_div`, `checked_add`, `checked_sub`) for all token amount calculations. Operations that overflow/underflow will return `None`, which we'll propagate as custom errors (`SwapError::Overflow`, `SwapError::DivisionByZero`).

```rust
// Example: Swap A→B calculation
let numerator = amount_a
    .checked_mul(market.price).ok_or(SwapError::Overflow)?
    .checked_mul(10u64.pow(market.decimals_b as u32)).ok_or(SwapError::Overflow)?;
let denominator = 10u64.pow(6)
    .checked_mul(10u64.pow(market.decimals_a as u32)).ok_or(SwapError::Overflow)?;
let amount_b = numerator
    .checked_div(denominator).ok_or(SwapError::DivisionByZero)?;
```

## Rationale

1. **Explicit Safety**: Checked arithmetic makes overflow handling explicit and visible in code, meeting REQ-NF-001's requirement for 100% checked operations.

2. **Fail-Fast Behavior**: Overflows abort transactions immediately with clear errors, preventing state corruption. Users receive actionable error messages (REQ-NF-024).

3. **Zero Performance Overhead**: Checked methods compile to the same CPU instructions as unchecked arithmetic on modern processors (LLVM optimizes comparison away when overflow is impossible).

4. **Rust Convention**: Checked arithmetic aligns with Rust's safety-first philosophy and is the recommended approach in Solana security audits.

5. **Auditability**: Auditors can verify all arithmetic is checked by searching for `checked_*` methods (REQ-NF-001's 100% metric is verifiable).

6. **Defense in Depth**: Even if upstream validation (e.g., `require!(amount > 0)`) prevents overflow, checked arithmetic provides a safety net against logic errors.

## Alternatives Considered

### Alternative 1: Unchecked Arithmetic with Manual Bounds Checking
- **Pros:**
  - Slightly simpler code (uses `+`, `-`, `*`, `/` operators)
  - No `.ok_or()?` error propagation needed

- **Cons:**
  - **Critical flaw**: Relies on manual bounds checking before every operation:
    ```rust
    require!(amount <= u64::MAX / price, SwapError::Overflow);
    let result = amount * price;  // Unchecked, assumes require! prevents overflow
    ```
  - Easy to miss edge cases (e.g., forgot to check denominator before division)
  - Silent wrapping in release builds if bounds check is wrong
  - Not auditable (auditor must verify all manual checks are correct)
  - Violates fail-fast principle (bug may manifest far from root cause)

- **Why Rejected:** Manual bounds checking is error-prone and not verifiable. A single missed check creates a critical vulnerability. Checked arithmetic provides mechanical guarantee.

### Alternative 2: Saturating Arithmetic (saturating_mul, saturating_add)
- **Pros:**
  - Never panics or returns errors (overflow clamps to u64::MAX)
  - Simple error handling (no `ok_or()?` needed)

- **Cons:**
  - **Incorrect semantics**: Overflow produces wrong results instead of failing
    ```rust
    let amount_out = u64::MAX.saturating_mul(2);  // Returns u64::MAX, not error
    ```
    User expects X tokens but receives u64::MAX tokens (vault drain attack)
  - Silent data corruption (transaction succeeds with incorrect state)
  - Violates financial accuracy requirements (no rounding tolerance for token amounts)

- **Why Rejected:** Saturating arithmetic masks errors instead of preventing them. Financial calculations must fail loudly when results are incorrect.

### Alternative 3: Wrapping Arithmetic with Manual Overflow Detection
- **Pros:**
  - Uses standard operators (`+`, `-`, `*`, `/`)
  - Can detect overflow after-the-fact:
    ```rust
    let (result, overflowed) = amount.overflowing_mul(price);
    require!(!overflowed, SwapError::Overflow);
    ```

- **Cons:**
  - Cluttered code (every operation needs overflow check)
  - Risk of forgetting to check `overflowed` flag
  - Wrapping behavior in interim calculations may cause logic errors

- **Why Rejected:** No advantage over checked arithmetic, but more verbose and error-prone.

### Alternative 4: BigInt (u128 or External Crate)
- **Pros:**
  - Larger range (u128: 0 to 3.4×10^38, vs u64: 0 to 1.8×10^19)
  - Overflow less likely for intermediate calculations

- **Cons:**
  - SPL Token uses u64 for amounts (cannot change on-chain standard)
  - u128 operations cost ~2x compute units vs u64 (impacts REQ-NF-014)
  - External crates (e.g., `num-bigint`) add dependencies and binary size
  - Overflow still possible (just at higher thresholds), so checked arithmetic still needed
  - Conversion between u128 and u64 requires checks, adding complexity

- **Why Rejected:** Doesn't eliminate need for checked arithmetic, and SPL Token's u64 amounts are non-negotiable. Would only push overflow threshold higher, not solve fundamental issue.

### Alternative 5: Fixed-Point Arithmetic Libraries
- **Pros:**
  - Specialized for financial calculations (libraries like `fixed` or `rust_decimal`)
  - Built-in precision handling
  - Commonly used in traditional finance

- **Cons:**
  - Additional dependency (increases binary size, audit surface)
  - Conversion overhead between u64 (token amounts) and fixed-point types
  - Overkill for integer-only swap calculations (we're not doing floating-point math)
  - Still requires overflow checks (fixed-point libraries use checked arithmetic internally)

- **Why Rejected:** Current calculations are pure integer arithmetic (price is u64 with implied 6 decimals). Fixed-point libraries add complexity without solving overflow problem differently.

## Consequences

### Positive:
- **Guaranteed Safety**: Arithmetic errors abort transactions before corrupting state (REQ-NF-001)
- **Auditable**: Grep for `checked_mul|checked_div` verifies 100% coverage
- **Clear Error Messages**: Users see "Overflow" or "DivisionByZero", not silent wrapping
- **Zero Runtime Cost**: Checked methods have same performance as unchecked in release builds (compiler optimizes away redundant checks)
- **Future-Proof**: If token standards change (e.g., u128 amounts), checked arithmetic adapts seamlessly
- **Best Practice**: Aligns with Solana security guidelines and audit recommendations

### Negative:
- **Code Verbosity**: Checked arithmetic requires `.ok_or()?` for error propagation:
  ```rust
  // Checked (verbose)
  let result = a.checked_mul(b).ok_or(SwapError::Overflow)?;

  // Unchecked (concise, unsafe)
  let result = a * b;
  ```
  **Mitigation**: Verbosity is acceptable trade-off for safety. Can be partially mitigated with helper functions.

- **Error Propagation Boilerplate**: Each checked operation needs `ok_or()?`, creating visual noise
  **Mitigation**: Rust's `?` operator keeps boilerplate manageable. Helper functions can consolidate common patterns:
  ```rust
  fn safe_mul(a: u64, b: u64) -> Result<u64> {
      a.checked_mul(b).ok_or(SwapError::Overflow.into())
  }
  ```

- **False Positives (Rare)**: Legitimate large transactions may trigger overflow even though result would fit in u64 after final division
  **Example**: `(u64::MAX / 2) * 2` overflows in numerator but final result fits
  **Mitigation**: Use u128 for intermediate calculations only when needed (not default):
  ```rust
  let amount_b = (amount_a as u128)
      .checked_mul(market.price as u128).ok_or(...)?
      .checked_div(SCALE as u128).ok_or(...)?
      .try_into().map_err(|_| SwapError::Overflow)?;  // Final downcast to u64
  ```

## Implementation Notes

### Technical Details:

1. **Swap Calculation (A→B) with Checked Arithmetic**:
   ```rust
   pub fn swap_a_to_b(amount_a: u64, market: &MarketAccount) -> Result<u64> {
       require!(market.price > 0, SwapError::PriceNotSet);

       // amount_b = (amount_a × price × 10^decimals_b) / (10^6 × 10^decimals_a)
       let numerator = amount_a
           .checked_mul(market.price).ok_or(SwapError::Overflow)?
           .checked_mul(10u64.pow(market.decimals_b as u32)).ok_or(SwapError::Overflow)?;

       let denominator = 10u64.pow(6)
           .checked_mul(10u64.pow(market.decimals_a as u32)).ok_or(SwapError::Overflow)?;

       let amount_b = numerator
           .checked_div(denominator).ok_or(SwapError::DivisionByZero)?;

       require!(amount_b > 0, SwapError::InvalidAmount);  // Sanity check
       Ok(amount_b)
   }
   ```

2. **Swap Calculation (B→A) with Division by Zero Protection**:
   ```rust
   pub fn swap_b_to_a(amount_b: u64, market: &MarketAccount) -> Result<u64> {
       require!(market.price > 0, SwapError::PriceNotSet);  // Critical for B→A

       // amount_a = (amount_b × 10^6 × 10^decimals_a) / (price × 10^decimals_b)
       let numerator = amount_b
           .checked_mul(10u64.pow(6)).ok_or(SwapError::Overflow)?
           .checked_mul(10u64.pow(market.decimals_a as u32)).ok_or(SwapError::Overflow)?;

       let denominator = market.price
           .checked_mul(10u64.pow(market.decimals_b as u32)).ok_or(SwapError::Overflow)?;

       let amount_a = numerator
           .checked_div(denominator).ok_or(SwapError::DivisionByZero)?;

       require!(amount_a > 0, SwapError::InvalidAmount);
       Ok(amount_a)
   }
   ```

3. **Custom Error Definitions**:
   ```rust
   #[error_code]
   pub enum SwapError {
       #[msg("Arithmetic overflow detected")]
       Overflow,
       #[msg("Division by zero (price may not be set)")]
       DivisionByZero,
       #[msg("Invalid amount (must be greater than 0)")]
       InvalidAmount,
       #[msg("Price not set (administrator must call set_price)")]
       PriceNotSet,
   }
   ```

4. **u128 Intermediate Calculations (Advanced Pattern)**:
   For scenarios where intermediate overflow is expected but final result fits:
   ```rust
   fn safe_mul_div(a: u64, b: u64, c: u64) -> Result<u64> {
       let result = (a as u128)
           .checked_mul(b as u128).ok_or(SwapError::Overflow)?
           .checked_div(c as u128).ok_or(SwapError::DivisionByZero)?;

       u64::try_from(result).map_err(|_| SwapError::Overflow.into())
   }

   // Usage
   let amount_b = safe_mul_div(amount_a, market.price, SCALE)?;
   ```

### Validation Strategy:

1. **Pre-Calculation Checks**:
   ```rust
   require!(amount > 0, SwapError::InvalidAmount);
   require!(market.price > 0, SwapError::PriceNotSet);
   ```

2. **Checked Arithmetic**:
   All multiplication, division, addition, subtraction use checked methods

3. **Post-Calculation Sanity Checks**:
   ```rust
   require!(amount_out > 0, SwapError::InvalidAmount);
   require!(vault_balance >= amount_out, SwapError::InsufficientLiquidity);
   ```

### Testing Strategy:

```typescript
describe("Overflow Protection", () => {
    it("Rejects swap causing multiplication overflow", async () => {
        const hugeAmount = new BN("18446744073709551615");  // u64::MAX
        await expect(
            program.methods.swap(hugeAmount, true).accounts({...}).rpc()
        ).to.be.rejectedWith(/Overflow/);
    });

    it("Rejects swap when price = 0 (division by zero)", async () => {
        // Don't set price (defaults to 0)
        await expect(
            program.methods.swap(amount, false).accounts({...}).rpc()
        ).to.be.rejectedWith(/PriceNotSet/);
    });

    it("Handles maximum safe values correctly", async () => {
        // Test boundary: largest amount that won't overflow
        const maxSafeAmount = new BN("1000000000000000");
        const result = await program.methods.swap(maxSafeAmount, true).accounts({...}).rpc();
        // Verify result is correct
    });
});
```

### Audit Checklist:

- [ ] All `*` operations replaced with `checked_mul`
- [ ] All `/` operations replaced with `checked_div`
- [ ] All `+` operations replaced with `checked_add`
- [ ] All `-` operations replaced with `checked_sub`
- [ ] All `.ok_or(SwapError::Overflow)?` error handling present
- [ ] Division by zero explicitly checked via `require!(price > 0)`
- [ ] Custom error messages are clear and actionable
- [ ] Test cases cover overflow scenarios (u64::MAX, u64::MAX - 1)

### Performance Considerations:

- **Compute Unit Cost**: Checked arithmetic adds ~10 CU per operation (negligible)
- **Total Swap Cost**: ~8,000-12,000 CU (well within 50,000 CU target)
- **Optimization**: Compiler eliminates redundant overflow checks when bounds are provable

## References

- [Rust Book - Integer Overflow](https://doc.rust-lang.org/book/ch03-02-data-types.html#integer-overflow)
- [Rust std::u64 Checked Methods](https://doc.rust-lang.org/std/primitive.u64.html#method.checked_mul)
- [Solana Security Best Practices - Arithmetic](https://docs.solana.com/developing/programming-model/accounts#arithmetic-overflow)
- [Coral-XYZ Anchor - Error Handling](https://book.anchor-lang.com/anchor_in_depth/errors.html)
- [OWASP Integer Overflow Guide](https://owasp.org/www-community/vulnerabilities/Integer_Overflow)
- [Solana Program Library - Token Math](https://github.com/solana-labs/solana-program-library/blob/master/token/program/src/processor.rs) - Uses checked arithmetic
- REQ-NF-001: Overflow Protection requirement
- REQ-NF-002: Division by Zero Protection requirement
