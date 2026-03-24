# ADR-001: Anchor Framework for Solana Program Development

**Status:** Accepted
**Date:** 2026-03-22
**Deciders:** Development Team, Technical Architect
**Traceability:** REQ-C-002, REQ-C-003, REQ-NF-005, REQ-NF-006

## Context

The Solana SWAP project requires a smart contract development framework to build the on-chain program. We need to choose between using native Solana program development (raw Rust with solana-program crate) or the Anchor framework, which provides higher-level abstractions and safety guarantees.

Native Solana development requires manual serialization/deserialization, account validation, and explicit security checks, which increases development time and the risk of security vulnerabilities. The project is educational in nature and needs to balance learning objectives with production-quality security patterns.

## Decision

We will use the Anchor framework (version 0.31.0 or higher) for all smart contract development in this project.

## Rationale

1. **Built-in Security**: Anchor provides automatic account validation, ownership checks, and signer verification through its constraint system (e.g., `#[account(mut, has_one = authority)]`), directly addressing REQ-NF-005 and REQ-NF-006.

2. **Reduced Boilerplate**: Anchor eliminates ~70% of manual serialization code through derive macros (`#[account]`, `#[derive(Accounts)]`), allowing developers to focus on business logic.

3. **Type Safety**: Anchor's account validation system prevents entire classes of vulnerabilities (e.g., account confusion attacks, missing ownership checks) at compile time.

4. **Educational Value**: Since this is an educational project (REQ-C-008), Anchor's declarative syntax makes the code more readable and easier to understand for students learning Solana development.

5. **PDA Management**: Anchor's `seeds` and `bump` constraints simplify Program Derived Address (PDA) derivation and signing (REQ-F-011), reducing the likelihood of bugs in critical authentication logic.

6. **Industry Standard**: Anchor is the de facto standard for Solana development, used by major DeFi protocols (Serum, Mango Markets, Marinade Finance), ensuring community support and best practices.

7. **Testing Infrastructure**: Anchor provides an integrated test framework with TypeScript support (REQ-C-005, REQ-NF-020), streamlining test development.

## Alternatives Considered

### Alternative 1: Native Solana (solana-program crate)
- **Pros:**
  - Complete control over program behavior
  - Smaller compiled program size (~5-10KB smaller)
  - Deeper understanding of Solana internals
  - No framework lock-in

- **Cons:**
  - 3-5x more code required for serialization and account validation
  - Higher risk of security vulnerabilities due to manual checks
  - Steeper learning curve for new developers
  - No built-in IDL (Interface Definition Language) generation
  - Manual error handling for all account validations

- **Why Rejected:** The security risks and development overhead outweigh the benefits for an educational project. Students would spend more time on boilerplate than learning core DeFi concepts.

### Alternative 2: Seahorse (Python-based framework)
- **Pros:**
  - Python syntax is more accessible to beginners
  - Even higher-level abstractions than Anchor
  - Faster prototyping

- **Cons:**
  - Less mature ecosystem (launched 2022, limited production use)
  - Smaller community and fewer resources
  - Compiles to Anchor under the hood (adds extra layer)
  - Not industry-standard for professional Solana development
  - Potential performance overhead from Python→Anchor→Rust compilation chain

- **Why Rejected:** While easier for absolute beginners, Seahorse doesn't teach Rust patterns required for professional Solana development and lacks the production-readiness needed for the project's security requirements.

### Alternative 3: Solana Program Library (SPL) Template
- **Pros:**
  - Official Solana templates
  - Well-documented patterns
  - Direct integration with SPL token program

- **Cons:**
  - Still requires extensive manual account validation
  - No automatic IDL generation
  - Limited abstraction over native Solana primitives

- **Why Rejected:** SPL templates address common patterns but don't provide the safety guarantees and developer experience of Anchor.

## Consequences

### Positive:
- **Security**: Automatic enforcement of REQ-NF-005 (PDA ownership) and REQ-NF-006 (signer verification) through Anchor's constraint system
- **Development Speed**: Estimated 40% reduction in development time compared to native Solana
- **Maintainability**: Declarative account validation makes code self-documenting (supports REQ-NF-018)
- **Testing**: Anchor test framework automatically handles program deployment and account setup (REQ-NF-022)
- **IDL Generation**: Automatic generation of JSON interface definition for frontend integration
- **Error Messages**: Anchor provides clear, actionable error messages for constraint violations (supports REQ-NF-024)

### Negative:
- **Binary Size**: Programs compiled with Anchor are ~10-15KB larger (typical swap program: 50KB vs 40KB native), slightly increasing deployment costs (~0.0003 SOL difference)
- **Compute Units**: Anchor's account deserialization adds ~2,000-3,000 CU overhead per instruction (still well within REQ-NF-014's 50,000 CU budget)
- **Learning Curve**: Developers must learn Anchor-specific patterns (macros, constraints) in addition to core Solana concepts
- **Framework Dependency**: Future Anchor breaking changes will require code updates (mitigated by pinning to 0.31.0)
- **Abstraction Leakage**: Advanced use cases may require dropping down to native Solana, creating inconsistency

## Implementation Notes

### Technical Details:
1. **Version Pinning**: Use Anchor 0.31.0 in `Cargo.toml` and `package.json` to ensure reproducible builds:
   ```toml
   [dependencies]
   anchor-lang = "0.31.0"
   anchor-spl = "0.31.0"
   ```

2. **Account Validation Pattern**: Use Anchor's constraint system for all security checks:
   ```rust
   #[derive(Accounts)]
   pub struct SetPrice<'info> {
       #[account(mut, has_one = authority)]
       pub market: Account<'info, MarketAccount>,
       pub authority: Signer<'info>,
   }
   ```

3. **PDA Derivation**: Leverage Anchor's `seeds` and `bump` for all PDAs:
   ```rust
   #[account(
       seeds = [b"market", token_mint_a.key().as_ref(), token_mint_b.key().as_ref()],
       bump = market.bump
   )]
   pub market: Account<'info, MarketAccount>,
   ```

4. **Error Handling**: Define custom errors using Anchor's error macro:
   ```rust
   #[error_code]
   pub enum SwapError {
       #[msg("Price not set")]
       PriceNotSet,
       #[msg("Insufficient liquidity")]
       InsufficientLiquidity,
   }
   ```

5. **Testing**: Use Anchor's test template with TypeScript for all integration tests:
   ```typescript
   import * as anchor from "@coral-xyz/anchor";
   const program = anchor.workspace.SolanaSwap2025;
   ```

### Migration Path:
If future requirements demand native Solana (unlikely for this educational project), the migration strategy would be:
1. Extract business logic into separate Rust functions (already pure, no Anchor dependencies)
2. Rewrite account validation structs using manual `try_from_slice`
3. Replace Anchor macros with manual instruction discriminators
4. Estimated effort: 2-3 days for this project's scope

### Performance Considerations:
- Anchor's overhead is negligible for this application (swap operations are I/O-bound, not CPU-bound)
- The 2,000 CU account deserialization cost is amortized across the entire instruction
- Actual swap calculation (checked arithmetic) dominates compute costs (REQ-NF-001)

## References

- [Anchor Documentation](https://www.anchor-lang.com/docs)
- [Anchor Security Best Practices](https://book.anchor-lang.com/anchor_in_depth/security.html)
- [Solana Program Library (SPL) Token](https://spl.solana.com/token)
- [Anchor Constraint System](https://book.anchor-lang.com/anchor_in_depth/constraints.html)
- [Coral-XYZ/Anchor GitHub Repository](https://github.com/coral-xyz/anchor)
- [Solana Cookbook - Anchor Framework](https://solanacookbook.com/references/anchor.html)
- [Project Neptune Security Audit Report](https://github.com/project-serum/anchor/blob/master/audits/2021-10-28-kudelski.pdf) - Demonstrates Anchor's security posture
