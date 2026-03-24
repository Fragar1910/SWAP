# ADR-002: Fixed Pricing Model vs Automated Market Maker (AMM)

**Status:** Accepted
**Date:** 2026-03-22
**Deciders:** Product Owner, Technical Architect
**Traceability:** REQ-C-009, REQ-F-002, REQ-F-006, REQ-F-007

## Context

The Solana SWAP project needs a pricing mechanism to determine exchange rates between Token A and Token B. The two primary models in decentralized exchanges are:

1. **Fixed Pricing**: Administrator-controlled rates (like traditional currency exchanges)
2. **Automated Market Maker (AMM)**: Algorithmic pricing based on liquidity pool ratios (e.g., Uniswap's constant product formula: x * y = k)

The choice fundamentally impacts system complexity, user experience, capital efficiency, and educational learning objectives.

## Decision

We will implement a **fixed pricing model** where the market administrator sets and updates exchange rates manually through the `set_price` instruction. The price will be stored as a u64 representing "1 Token A = price/10^6 Token B" with 6 decimal precision.

## Rationale

1. **Educational Clarity**: This is an educational project (REQ-C-008). A fixed pricing model allows students to focus on core Solana concepts (PDAs, CPIs, token transfers) without the complexity of AMM mathematics and impermanent loss.

2. **Simplicity**: Fixed pricing requires ~50 lines of swap logic vs ~300+ lines for a constant product AMM (including slippage calculation, liquidity pool math, and LP token minting).

3. **Predictable Behavior**: Users know the exact exchange rate before executing swaps, eliminating the need for complex slippage protection mechanisms (though REQ-NF-007 still recommends this for price changes between transaction submission and confirmation).

4. **Real-World Analogy**: Simulates physical currency exchange bureaus (casas de cambio) where rates are posted and controlled by the operator, making the system intuitive for non-DeFi-native users.

5. **Lower Compute Cost**: Fixed price lookups consume ~500 CU vs ~5,000+ CU for AMM calculations, easily meeting REQ-NF-014's 50,000 CU budget.

6. **Simplified Testing**: Test cases for fixed pricing are straightforward (test rate changes, test calculations), whereas AMM testing requires validating curve integrity, edge cases at extreme ratios, and rounding behavior.

## Alternatives Considered

### Alternative 1: Constant Product AMM (Uniswap v2 Model)
- **Pros:**
  - Fully decentralized pricing (no administrator control)
  - Automatic price discovery based on supply/demand
  - Arbitrage opportunities ensure prices track external markets
  - LP tokens allow multiple liquidity providers and yield generation
  - No need for trusted price oracle or manual updates

- **Cons:**
  - Significant complexity: requires liquidity pool math, LP token minting/burning, fee distribution
  - Impermanent loss risk for liquidity providers (complex to explain to students)
  - Slippage on large trades requires sophisticated frontend calculations
  - ~300+ additional lines of code and testing
  - Higher compute unit consumption (5,000-10,000 CU per swap)
  - Students must understand calculus (derivatives of constant product formula) to implement safely

- **Why Rejected:** Complexity far exceeds educational objectives. The project is already teaching PDAs, CPIs, Anchor constraints, and token operations - adding AMM math would overwhelm students. Better suited for an advanced course.

### Alternative 2: Constant Sum AMM (x + y = k)
- **Pros:**
  - Simpler than constant product (linear pricing)
  - Still provides decentralized pricing
  - No impermanent loss for liquidity providers

- **Cons:**
  - Vulnerable to arbitrage attacks (liquidity can be drained)
  - Not production-viable (no major DEX uses this model)
  - Still requires LP token complexity
  - Doesn't teach practical DeFi patterns

- **Why Rejected:** While simpler than Uniswap-style AMM, it's still more complex than fixed pricing and teaches an impractical pattern (no real-world usage).

### Alternative 3: Oracle-Based Dynamic Pricing
- **Pros:**
  - Tracks real-world market prices automatically
  - No manual administrator intervention needed
  - Teaches oracle integration patterns (Pyth, Chainlink)

- **Cons:**
  - Introduces external dependency (oracle reliability, fees)
  - Oracle updates create staleness risks (require additional checks)
  - More complex error handling (oracle failures, price deviation limits)
  - Oracle integration is an advanced topic better suited for a separate module

- **Why Rejected:** Adds external dependencies and complexity without aligning with the project's core learning objectives (Solana program fundamentals). Oracle integration is better as a follow-up exercise.

### Alternative 4: Hybrid Model (Fixed Base + Spread)
- **Pros:**
  - Administrator sets base rate, program adds automated spread (e.g., 1% buy/sell difference)
  - Teaches both manual and algorithmic pricing
  - Protects liquidity provider from one-sided draining

- **Cons:**
  - More complex than pure fixed pricing
  - Requires additional state (base_rate, spread_percentage)
  - Spread calculation adds compute overhead

- **Why Rejected:** Adds marginal educational value while increasing complexity. Better to master fixed pricing first, then explore dynamic mechanisms in advanced courses.

## Consequences

### Positive:
- **Educational Focus**: Students spend time learning Solana fundamentals, not DeFi math
- **Code Simplicity**: Swap logic reduced to ~50 lines, making code reviews and debugging easier
- **Deterministic Behavior**: Exact output amounts calculable off-chain, simplifying UI development (REQ-F-015)
- **Testing Coverage**: Can achieve 100% code coverage with straightforward test cases (REQ-NF-020)
- **Low Compute Cost**: Swap instructions consume ~8,000-12,000 CU total (well under 50,000 CU target)
- **Predictable Gas Fees**: Fixed compute consumption means consistent transaction costs for users
- **Fast Development**: Reduces implementation time by ~50% compared to AMM alternative

### Negative:
- **Centralization Risk**: Administrator has full control over pricing (REQ-C-010), creating trust requirement
- **Manipulation Potential**: Malicious administrator could set unfavorable rates to extract value
- **Manual Maintenance**: Administrator must monitor market conditions and update prices frequently to stay competitive
- **No Price Discovery**: System doesn't respond to supply/demand dynamics; prices become stale if not updated
- **Capital Efficiency**: Requires more liquidity than AMM to support same trading volume (no automatic rebalancing)
- **Single Point of Failure**: If administrator loses private key or becomes unavailable, rates can't be updated
- **Limited Realism**: Doesn't teach modern DeFi patterns (students won't learn AMM mechanics)

## Implementation Notes

### Technical Details:

1. **Price Representation**:
   ```rust
   pub struct MarketAccount {
       pub price: u64, // 1 Token A = price/10^6 Token B
       // 6 decimals precision allows rates from 0.000001 to 18,446,744,073,709 Token B per Token A
   }
   ```

2. **Price Setting (Admin Only)**:
   ```rust
   pub fn set_price(ctx: Context<SetPrice>, new_price: u64) -> Result<()> {
       require!(new_price > 0, SwapError::InvalidPrice);
       ctx.accounts.market.price = new_price;
       emit!(PriceSet {
           market: ctx.accounts.market.key(),
           old_price: ctx.accounts.market.price,
           new_price,
       });
       Ok(())
   }
   ```

3. **Swap Calculation (A→B)**:
   ```rust
   // amount_b = (amount_a × price × 10^decimals_b) / (10^6 × 10^decimals_a)
   let numerator = amount_a
       .checked_mul(market.price).ok_or(SwapError::Overflow)?
       .checked_mul(10u64.pow(market.decimals_b as u32)).ok_or(SwapError::Overflow)?;
   let denominator = 10u64.pow(6).checked_mul(10u64.pow(market.decimals_a as u32))?;
   let amount_b = numerator.checked_div(denominator).ok_or(SwapError::DivisionByZero)?;
   ```

4. **Swap Calculation (B→A)**:
   ```rust
   // amount_a = (amount_b × 10^6 × 10^decimals_a) / (price × 10^decimals_b)
   require!(market.price > 0, SwapError::PriceNotSet); // Critical for B→A direction
   let numerator = amount_b
       .checked_mul(10u64.pow(6)).ok_or(SwapError::Overflow)?
       .checked_mul(10u64.pow(market.decimals_a as u32)).ok_or(SwapError::Overflow)?;
   let denominator = market.price
       .checked_mul(10u64.pow(market.decimals_b as u32)).ok_or(SwapError::Overflow)?;
   let amount_a = numerator.checked_div(denominator).ok_or(SwapError::DivisionByZero)?;
   ```

### Access Control:
- `set_price` restricted to `market.authority` (enforced by Anchor's `has_one` constraint)
- `swap` is permissionless (REQ-F-009)
- No multi-sig or DAO governance (REQ-C-010)

### Future Migration Path:
If the project expands to production or advanced courses, migration to AMM would require:
1. Add `reserve_a` and `reserve_b` fields to `MarketAccount`
2. Implement `add_liquidity`/`remove_liquidity` with LP token minting
3. Replace fixed price with constant product formula: `amount_out = (amount_in × reserve_out) / (reserve_in + amount_in)`
4. Add fee mechanism (0.3% typical) and fee distribution to LPs
5. Estimated effort: 5-7 days development + 3-5 days testing

### Price Update Recommendations:
- Administrator should implement off-chain monitoring to update prices every 5-15 minutes
- Consider automated price bots pulling from centralized exchanges (Binance API)
- Emit `PriceSet` events (REQ-NF-010) to allow analytics of price history

## References

- [Uniswap v2 Whitepaper](https://uniswap.org/whitepaper.pdf) - Constant product AMM model
- [Balancer Protocol](https://balancer.fi/whitepaper.pdf) - Multi-token weighted AMM
- [Curve Finance StableSwap](https://curve.fi/files/stableswap-paper.pdf) - Low slippage stablecoin AMM
- [Traditional Market Making](https://www.investopedia.com/terms/m/marketmaker.asp) - Fixed spread model inspiration
- [Solana Cookbook - Token Swap](https://solanacookbook.com/references/token.html#how-to-swap-tokens) - SPL Token Swap program analysis
- REQ-C-009: Fixed Price Model Constraint
- REQ-F-002: Set Exchange Rate functional requirement
