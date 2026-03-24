# ADR-003: Single Administrator Authority vs Multi-Signature Governance

**Status:** Accepted
**Date:** 2026-03-22
**Deciders:** Product Owner, Technical Architect
**Traceability:** REQ-C-010, REQ-F-002, REQ-F-008, REQ-NF-006

## Context

The Solana SWAP system requires access control for privileged operations: setting exchange rates (`set_price`) and adding liquidity (`add_liquidity`). We must decide the governance model for these operations:

1. **Single Administrator**: One wallet address has full control (stored as `authority` in `MarketAccount`)
2. **Multi-Signature (M-of-N)**: Multiple signers required (e.g., 2-of-3, 3-of-5)
3. **DAO Governance**: Token-based voting with timelocks
4. **Hybrid Model**: Different permission levels for different operations

This decision impacts security, decentralization, operational complexity, and alignment with educational objectives.

## Decision

We will implement a **single administrator authority model** where each market is controlled by a single Solana wallet address (`Pubkey`) stored in the `MarketAccount.authority` field. This address is set during market initialization and has exclusive permission to invoke `set_price` and `add_liquidity` instructions.

## Rationale

1. **Educational Simplicity**: This is an educational project (REQ-C-008). Single-signer authority allows students to focus on core concepts (PDA ownership, signer verification, Anchor constraints) without the complexity of multi-sig coordination or DAO governance logic.

2. **Implementation Simplicity**: Single authority requires ~5 lines of code (Anchor's `has_one` constraint) vs ~200+ lines for Squads Protocol multi-sig integration or ~500+ lines for DAO governance with SPL Governance.

3. **Testing Simplicity**: Single authority tests are straightforward (valid signer passes, invalid signer fails) vs multi-sig tests requiring coordination of multiple keypairs, transaction serialization, and partial signing workflows.

4. **Operational Simplicity**: No need for off-chain coordination tools (Squads UI, governance forums, voting periods). Administrator can update prices instantly in response to market conditions.

5. **Deterministic Behavior**: Anchor's constraint system guarantees authority checks at compile time:
   ```rust
   #[account(mut, has_one = authority)]
   pub market: Account<'info, MarketAccount>,
   pub authority: Signer<'info>,
   ```

6. **No External Dependencies**: Multi-sig would require integrating Squads Protocol (separate program, additional accounts, external failure modes). Single authority keeps the program self-contained.

7. **Alignment with Constraint REQ-C-010**: The requirements explicitly state "Single Administrator Per Market" as a design constraint, acknowledging the educational scope.

## Alternatives Considered

### Alternative 1: Squads Protocol Multi-Signature (M-of-N)
- **Pros:**
  - Enhanced security: Requires 2+ signers to execute privileged operations (mitigates single key compromise)
  - Decentralization: Distributes control among multiple stakeholders
  - Industry-standard: Squads is widely used in Solana ecosystem (Orca, Marinade, Solend governance)
  - Audit trail: All proposals and executions are recorded on-chain
  - Business continuity: Loss of 1 key doesn't brick the market

- **Cons:**
  - Significant complexity: Requires integrating Squads program, creating multisig account, proposal/approval workflow
  - Coordination overhead: Every price update requires M signatures (slows response to market conditions)
  - Educational burden: Students must learn multi-sig patterns, transaction serialization, partial signing
  - Testing complexity: Tests must simulate multiple signers, proposal creation, approval collection
  - Operational friction: Administrator needs Squads UI or custom tooling for every action
  - External dependency: Adds reliance on Squads program (upgrade risks, potential bugs)
  - Estimated implementation: +3-5 days development, +2-3 days testing

- **Why Rejected:** Complexity far exceeds educational value. Multi-sig governance is an advanced topic better suited for a dedicated module on Solana security patterns. For this scope, it would distract from core learning objectives.

### Alternative 2: SPL Governance (DAO Model)
- **Pros:**
  - Full decentralization: Token holders vote on proposals (price changes, liquidity adjustments)
  - Transparency: All proposals and votes are public and auditable
  - Aligns with DeFi ethos: "Code is law" governance
  - Future-proof: Supports transition to community ownership
  - Composability: Integrates with Realms UI, standard governance tooling

- **Cons:**
  - Extreme complexity: Requires SPL Governance program integration (~500+ lines), governance token minting, proposal/voting mechanics, timelock implementation
  - Operational latency: Every price update requires proposal → voting period (typically 3-7 days) → execution, making the system unresponsive to market volatility
  - Educational overload: Students must learn governance tokens, voting escrow, proposal lifecycle, SPL Governance API
  - Testing burden: Must test voting mechanics, quorum calculations, timelock enforcement, execution authorization
  - Not viable for fixed-price model: REQ-C-009's manual pricing requires fast updates; DAO governance introduces fatal latency
  - Estimated implementation: +10-15 days development, +5-7 days testing

- **Why Rejected:** DAO governance is fundamentally incompatible with the fixed-price model (ADR-002), which requires rapid administrator price updates. A 3-day voting period would render the system unusable as arbitrageurs exploit stale rates.

### Alternative 3: Role-Based Access Control (RBAC)
- **Pros:**
  - Granular permissions: Different roles for price setting (Admin) vs liquidity provision (LP Manager) vs emergency actions (Guardian)
  - Flexibility: Can delegate specific operations without full authority transfer
  - Separation of concerns: Limits blast radius of compromised keys

- **Cons:**
  - Moderate complexity: Requires role storage in `MarketAccount`, role verification in each instruction
  - Operational complexity: Managing multiple roles, key rotation procedures
  - Unclear value for educational project: Adds complexity without teaching fundamentally new Solana concepts
  - Current requirements don't justify: No requirement mentions different permission levels
  - Estimated implementation: +2-3 days development, +1-2 days testing

- **Why Rejected:** RBAC is a good production pattern but adds complexity without corresponding requirements or educational benefit. Current scope treats all admin operations equivalently.

### Alternative 4: Timelock with Single Authority
- **Pros:**
  - Allows users to exit before malicious price changes execute
  - Simple security enhancement: Single `timelock_seconds` field in `MarketAccount`
  - Teaches important DeFi security pattern (used by Compound, Uniswap governance)

- **Cons:**
  - Conflicts with fixed-price model: Delayed price updates allow arbitrage exploitation
  - Additional state: Requires storing pending proposals in accounts or PDA queues
  - Testing complexity: Must test timelock enforcement, cancellation, execution windows
  - Operational friction: Every price update requires two transactions (propose, execute)

- **Why Rejected:** Timelock latency is incompatible with REQ-C-009's requirement for responsive manual pricing. In a real exchange bureau, prices change immediately in response to market conditions.

## Consequences

### Positive:
- **Implementation Speed**: Authority checks implemented in ~5 lines via Anchor constraints
- **Testing Coverage**: Straightforward test cases (REQ-NF-020, REQ-NF-021):
  ```typescript
  it("set_price fails when called by non-authority", async () => {
      await expect(program.methods.setPrice(...).accounts({authority: attacker}).rpc())
          .to.be.rejected;
  });
  ```
- **Operational Efficiency**: Administrator can respond to market conditions in real-time (single transaction)
- **Deterministic Security**: Anchor enforces authority checks at instruction deserialization (REQ-NF-006)
- **No External Dependencies**: Self-contained program with no multi-sig or governance program integrations
- **Clear Mental Model**: Students easily understand "the wallet that created the market controls it"
- **Gas Efficiency**: No multi-sig overhead (saves ~2,000 CU vs Squads integration)

### Negative:
- **Single Point of Failure**: Compromise of administrator private key grants full market control
  - **Attack Scenario**: Attacker steals admin key → sets price to 0.000001 → drains vault via swap
  - **Mitigation**: Educational context (test tokens, no real value at risk)
- **No Key Recovery**: If administrator loses private key, market becomes permanently frozen (no price updates, no new liquidity)
  - **Mitigation**: Administrator must follow key backup best practices (hardware wallet, seed phrase storage)
- **Centralization Risk**: Administrator has unchecked power to manipulate prices for profit or griefing
  - **Impact**: Users must trust administrator is benevolent and competent
  - **Mitigation**: Educational context clarifies this is not production-ready (REQ-C-008)
- **No Decentralization Path**: Upgrading to multi-sig/DAO governance requires protocol migration (can't just "flip a switch")
- **Limited Realism**: Production DeFi protocols rarely use single-admin control; students won't learn real-world governance patterns
- **Business Continuity Risk**: Administrator unavailability (vacation, incident) means no price updates

### Risk Analysis:
| Risk | Likelihood | Impact | Severity | Mitigation |
|------|-----------|--------|----------|------------|
| Private key theft | Medium | Critical | High | Hardware wallet, key rotation (not implemented) |
| Key loss | Low | Critical | Medium | Seed phrase backup procedures |
| Malicious admin | Low (educational) | High | Medium | Code review, educational disclaimers |
| Admin unavailability | Low | Medium | Low | Operational procedures (not implemented) |

## Implementation Notes

### Technical Details:

1. **Authority Storage**:
   ```rust
   #[account]
   pub struct MarketAccount {
       pub authority: Pubkey,  // Set during initialize_market, immutable
       pub token_mint_a: Pubkey,
       pub token_mint_b: Pubkey,
       pub price: u64,
       // ...
   }
   ```

2. **Authority Enforcement (Set Price)**:
   ```rust
   #[derive(Accounts)]
   pub struct SetPrice<'info> {
       #[account(mut, has_one = authority)]  // Anchor verifies market.authority == authority.key()
       pub market: Account<'info, MarketAccount>,
       pub authority: Signer<'info>,  // Anchor verifies authority signed transaction
   }
   ```

3. **Authority Enforcement (Add Liquidity)**:
   ```rust
   #[derive(Accounts)]
   pub struct AddLiquidity<'info> {
       #[account(mut, has_one = authority)]
       pub market: Account<'info, MarketAccount>,
       pub authority: Signer<'info>,
       // ...
   }
   ```

4. **No Authority Required (Swap)**:
   ```rust
   #[derive(Accounts)]
   pub struct Swap<'info> {
       #[account(mut)]
       pub market: Account<'info, MarketAccount>,
       pub user: Signer<'info>,  // User signs, but no authority check on market
       // ...
   }
   ```

### Security Properties:
- **Compile-Time Verification**: `has_one = authority` is checked during account deserialization, before instruction handler executes
- **Fail-Closed**: If authority check fails, transaction aborts with clear error (no state changes)
- **Immutable Authority**: Authority is set during `initialize_market` and cannot be changed (no `transfer_authority` instruction)
  - **Implication**: If admin key is compromised or lost, only option is to create a new market and migrate liquidity

### Testing Strategy:
```typescript
describe("Authority Access Control", () => {
    it("Only authority can set price", async () => {
        // Positive case
        await program.methods.setPrice(new BN(2_000_000))
            .accounts({ market: marketPDA, authority: initializer.publicKey })
            .signers([initializer])
            .rpc();

        // Negative case
        await expect(
            program.methods.setPrice(new BN(3_000_000))
                .accounts({ market: marketPDA, authority: attacker.publicKey })
                .signers([attacker])
                .rpc()
        ).to.be.rejectedWith(/A has one constraint was violated/);
    });
});
```

### Future Enhancement Path:
If the project expands to production, recommended upgrades (in order):
1. **Authority Transfer**: Add `transfer_authority(new_authority: Pubkey)` instruction for admin key rotation
2. **Emergency Pause**: Add `is_paused: bool` flag to halt swaps during security incidents
3. **Timelock (Long-term)**: 24-hour delay for price changes above X% threshold
4. **Multi-sig (Advanced)**: Integrate Squads Protocol for 2-of-3 or 3-of-5 governance
5. **DAO Governance (Production)**: Transition to SPL Governance with governance token distribution

Each step is incremental and backward-compatible (can be added without breaking existing markets).

## References

- [Squads Protocol Documentation](https://docs.squads.so/) - Multi-sig wallet standard on Solana
- [SPL Governance Program](https://github.com/solana-labs/solana-program-library/tree/master/governance) - DAO governance framework
- [Anchor Security: Access Control](https://book.anchor-lang.com/anchor_in_depth/security.html#access-control) - Best practices for signer verification
- [Realms (Governance UI)](https://app.realms.today/) - Interface for SPL Governance
- [Solana Key Management Best Practices](https://docs.solana.com/wallet-guide/security) - Protecting private keys
- REQ-C-010: Single Administrator Per Market constraint
- REQ-F-008: Authority-Only Market Modification requirement
