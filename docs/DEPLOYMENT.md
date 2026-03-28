# Deployment Guide - Solana SWAP

This guide covers deployment procedures for the Solana SWAP DEX program.

---

## Table of Contents

1. [Before Production Deployment](#before-production-deployment)
2. [Environment Setup](#environment-setup)
3. [Devnet Deployment](#devnet-deployment)
4. [Mainnet Deployment](#mainnet-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Rollback Plan](#rollback-plan)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Before Production Deployment

**⚠️ CRITICAL**: Complete this checklist before deploying to mainnet.

### Security Audit Checklist

- [ ] **Professional security audit completed** by reputable firm (e.g., Sec3, OtterSec, Neodyme)
- [ ] **All high/critical findings remediated** and re-audited
- [ ] **Smart contract verified** on Solana Explorer
- [ ] **Authority keys secured** in hardware wallet or multi-sig
- [ ] **No admin private keys** in source code or environment files
- [ ] **PDA vault ownership verified** (no external signers)
- [ ] **Same-token market rejection tested** (CRITICAL-001)
- [ ] **Overflow protection confirmed** (checked arithmetic)
- [ ] **Liquidity validation tested** (insufficient funds scenarios)
- [ ] **Price validation tested** (division by zero prevention)

### Testing Checklist

- [ ] **All unit tests passing** (`cargo test`)
- [ ] **All integration tests passing** (`anchor test`)
- [ ] **E2E tests passing** (Playwright or Cypress)
- [ ] **Code coverage ≥ 80%** (REQ-NF-020 target)
- [ ] **Performance benchmarks met** (< 12,000 CU per swap, REQ-NF-010)
- [ ] **BDD scenarios verified** (all 13 scenarios from spec/tests/)
- [ ] **Error cases tested** (insufficient liquidity, unauthorized access, zero amounts)
- [ ] **Decimal mismatch handling tested** (6-decimal vs 9-decimal tokens)

### Documentation Checklist

- [ ] **API documentation complete** (`docs/API.md`)
- [ ] **README.md updated** with mainnet instructions
- [ ] **CHANGELOG.md updated** with release version
- [ ] **CONTRIBUTING.md reviewed** by external contributor
- [ ] **ADRs up to date** (all architecture decisions documented)
- [ ] **Known limitations documented** (no withdrawal, no slippage protection)

### Configuration Checklist

- [ ] **Program ID updated** in all configs (Anchor.toml, lib.rs, frontend)
- [ ] **RPC endpoints configured** for mainnet
  - [ ] Primary RPC: Helius, QuickNode, or Triton
  - [ ] Fallback RPC: Solana Foundation public RPC
  - [ ] Rate limits configured
- [ ] **Frontend environment variables set**:
  - [ ] `REACT_APP_NETWORK=mainnet-beta`
  - [ ] `REACT_APP_PROGRAM_ID=<mainnet_program_id>`
  - [ ] `REACT_APP_RPC_ENDPOINT=<mainnet_rpc_url>`
- [ ] **Wallet adapters enabled**: Phantom, Solflare, Backpack
- [ ] **Explorer links updated**: https://explorer.solana.com

### Infrastructure Checklist

- [ ] **Monitoring configured**: Datadog, New Relic, or Grafana
- [ ] **Alerting configured**: PagerDuty or Slack webhooks
  - [ ] Transaction failure rate alerts
  - [ ] Vault balance alerts (low liquidity)
  - [ ] CU consumption spikes
  - [ ] RPC endpoint downtime
- [ ] **Logging configured**: CloudWatch or Splunk
- [ ] **Backup wallet keys secured**: Multi-sig or hardware wallet
- [ ] **Disaster recovery plan documented**

### Liquidity Planning

- [ ] **Initial liquidity amounts calculated** (Token A and Token B)
- [ ] **Price discovery strategy defined** (fixed rates or market-based)
- [ ] **Liquidity provision wallet funded** (sufficient SOL for rent + fees)
- [ ] **Withdrawal strategy planned** (liquidity will be locked initially)
- [ ] **Fee mechanism planned** (not implemented in v0.1.0)

---

## Environment Setup

### Prerequisites

- Solana CLI 1.18+
- Anchor CLI 0.31.0
- Rust 1.75+
- Node.js 18+
- Sufficient SOL for deployment fees (~5 SOL recommended)

### Wallet Configuration

```bash
# Generate deployment wallet (PRODUCTION - SECURE THIS!)
solana-keygen new --outfile ~/.config/solana/mainnet-deploy.json

# Set wallet as default
solana config set --keypair ~/.config/solana/mainnet-deploy.json

# Check wallet balance
solana balance

# Airdrop SOL (devnet/testnet only)
solana airdrop 5
```

**⚠️ PRODUCTION WARNING**: Store mainnet wallet keys in a hardware wallet (Ledger) or multi-sig solution, NOT in plain JSON files.

---

## Devnet Deployment

Use this for testing before mainnet deployment.

### Automated Script

```bash
# Run automated devnet deployment
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Manual Deployment

```bash
# 1. Configure cluster
solana config set --url https://api.devnet.solana.com

# 2. Build program
anchor build

# 3. Get program ID
solana address -k target/deploy/swap_program-keypair.json

# 4. Update program ID in source code
PROGRAM_ID=$(solana address -k target/deploy/swap_program-keypair.json)
sed -i.bak "s/declare_id!(\".*\")/declare_id!(\"$PROGRAM_ID\")/" programs/swap_program/src/lib.rs

# 5. Update Anchor.toml
sed -i.bak "s/^swap_program = .*/swap_program = \"$PROGRAM_ID\"/" Anchor.toml

# 6. Rebuild with correct program ID
anchor build

# 7. Deploy
anchor deploy --provider.cluster devnet

# 8. Verify deployment
solana program show $PROGRAM_ID --url devnet
```

### Post-Devnet Deployment

```bash
# Test initialize_market
anchor test --skip-build --provider.cluster devnet

# Check program logs
solana logs $PROGRAM_ID --url devnet

# View on Explorer
echo "https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
```

---

## Mainnet Deployment

**⚠️ PRODUCTION DEPLOYMENT - REQUIRES AUDIT COMPLETION**

### Pre-Deployment Verification

```bash
# 1. Ensure all tests pass
anchor test

# 2. Verify security audit completion
# (Manual verification - check audit report)

# 3. Verify wallet has sufficient SOL
solana config set --url https://api.mainnet-beta.solana.com
solana balance
# (Should have ~5 SOL minimum)
```

### Deployment Steps

```bash
# 1. Configure mainnet cluster
solana config set --url https://api.mainnet-beta.solana.com

# 2. Verify wallet configuration
solana config get
# Confirm:
# - RPC URL: https://api.mainnet-beta.solana.com
# - Keypair Path: Secure location (hardware wallet preferred)

# 3. Build program
anchor build

# 4. Get program ID
PROGRAM_ID=$(solana address -k target/deploy/swap_program-keypair.json)
echo "Program ID: $PROGRAM_ID"

# 5. Update program ID in source code
sed -i.bak "s/declare_id!(\".*\")/declare_id!(\"$PROGRAM_ID\")/" programs/swap_program/src/lib.rs

# 6. Update Anchor.toml
sed -i.bak "s/^swap_program = .*/swap_program = \"$PROGRAM_ID\"/" Anchor.toml

# 7. Rebuild with correct program ID
anchor build

# 8. Verify build artifact
ls -lh target/deploy/swap_program.so
# (Should be ~100-200 KB)

# 9. Deploy to mainnet
anchor deploy --provider.cluster mainnet-beta

# 10. Verify deployment
solana program show $PROGRAM_ID
```

### Program Upgrade Authority

```bash
# RECOMMENDED: Set upgrade authority to multi-sig or revoke
# Option 1: Transfer to multi-sig (e.g., Squads Protocol)
solana program set-upgrade-authority $PROGRAM_ID --new-upgrade-authority <MULTISIG_ADDRESS>

# Option 2: Revoke upgrade authority (IMMUTABLE - CANNOT UNDO)
# solana program set-upgrade-authority $PROGRAM_ID --final

# Verify authority
solana program show $PROGRAM_ID
```

---

## Post-Deployment Verification

### Functional Verification

```bash
# 1. Test program account fetch
anchor run test:mainnet-smoke

# 2. Initialize test market (small amounts)
# (Use frontend or CLI script)

# 3. Set test price (1 USDC = 1 USDC equivalent)
# (Via frontend admin dashboard)

# 4. Add small liquidity (e.g., 10 USDC, 10 USDC-equivalent)
# (Via frontend admin dashboard)

# 5. Execute test swap (e.g., 1 USDC → 1 USDC-equivalent)
# (Via frontend swap interface)

# 6. Verify balances and event logs
solana logs $PROGRAM_ID

# 7. Check transaction on Explorer
echo "https://explorer.solana.com/address/$PROGRAM_ID"
```

### Monitoring Setup

```bash
# 1. Set up program log monitoring
# (Configure Datadog/Grafana to ingest Solana logs)

# 2. Configure alerts for:
# - Transaction failures (> 5% failure rate)
# - Vault balance drops (< 10% of initial liquidity)
# - CU consumption spikes (> 15,000 CU)
# - RPC endpoint errors

# 3. Set up uptime monitoring
# (Ping frontend every 5 minutes, alert on 3 consecutive failures)

# 4. Configure error tracking
# (Sentry for frontend errors)
```

---

## Rollback Plan

### Emergency Rollback Scenarios

**Scenario 1: Critical Bug Discovered**
1. Immediately notify all users (frontend banner, Twitter/Discord)
2. Coordinate with vault authority to pause new liquidity additions
3. Allow existing swaps to complete (cannot pause permissionless swaps)
4. Deploy patched program version (if upgrade authority retained)
5. Test patched program on devnet
6. Re-deploy to mainnet with new program ID

**Scenario 2: Vault Drained (Security Incident)**
1. **IMMEDIATE**: Alert monitoring team
2. Contact security audit firm for incident response
3. Analyze transaction logs to identify attack vector
4. Notify affected users and estimate losses
5. File incident report with Solana Foundation
6. Coordinate with Solana validators for potential rollback (extreme cases only)

**Scenario 3: RPC Endpoint Failure**
1. Switch frontend to fallback RPC endpoint
2. Notify users of potential transaction delays
3. Monitor RPC provider status page
4. Once resolved, resume normal operations

### Upgrade Procedure

If upgrade authority is retained:

```bash
# 1. Build new program version
anchor build

# 2. Test on devnet
anchor deploy --provider.cluster devnet
anchor test --provider.cluster devnet

# 3. Deploy upgrade to mainnet
anchor upgrade target/deploy/swap_program.so --program-id $PROGRAM_ID --provider.cluster mainnet-beta

# 4. Verify upgrade
solana program show $PROGRAM_ID

# 5. Test upgraded functionality
# (Run smoke tests on mainnet)
```

---

## Monitoring & Maintenance

### Key Metrics to Monitor

| Metric | Target | Alert Threshold | Action |
|--------|--------|----------------|--------|
| Transaction Success Rate | > 95% | < 90% | Investigate RPC/program errors |
| Swap CU Consumption | < 12,000 | > 15,000 | Optimize program logic |
| Vault A Balance | > 100 units | < 50 units | Add liquidity |
| Vault B Balance | > 100 units | < 50 units | Add liquidity |
| Frontend Uptime | > 99% | < 95% | Check hosting provider |
| RPC Latency (p95) | < 500ms | > 1000ms | Switch RPC provider |

### Daily Monitoring Tasks

- [ ] Check transaction volume and success rate
- [ ] Review vault balances (Token A and Token B)
- [ ] Verify no critical errors in logs
- [ ] Monitor gas/CU consumption trends
- [ ] Check frontend uptime and performance

### Weekly Maintenance Tasks

- [ ] Review and acknowledge all monitoring alerts
- [ ] Analyze swap patterns and price trends
- [ ] Update documentation if needed
- [ ] Check for Anchor/Solana updates
- [ ] Review security advisories (Solana, Anchor, SPL)

### Monthly Review Tasks

- [ ] Conduct security review (access logs, authority keys)
- [ ] Performance audit (CU consumption trends)
- [ ] User feedback review (Discord, GitHub issues)
- [ ] Disaster recovery drill (test backup wallet access)
- [ ] Update runbooks and documentation

---

## Troubleshooting

### Common Issues

**Issue**: Deployment fails with "Insufficient funds"
**Solution**:
```bash
solana balance
# If balance < 5 SOL, transfer more SOL to deployment wallet
```

**Issue**: Program ID mismatch after rebuild
**Solution**:
```bash
# Re-run program ID update steps
PROGRAM_ID=$(solana address -k target/deploy/swap_program-keypair.json)
sed -i "s/declare_id!(\".*\")/declare_id!(\"$PROGRAM_ID\")/" programs/swap_program/src/lib.rs
anchor build
```

**Issue**: Transaction simulation failed (6002: InsufficientLiquidity)
**Solution**:
```bash
# Check vault balances
solana account $VAULT_A_ADDRESS
solana account $VAULT_B_ADDRESS
# Add more liquidity via admin dashboard
```

**Issue**: RPC rate limit exceeded
**Solution**:
```bash
# Switch to paid RPC provider (Helius, QuickNode, Triton)
# Update frontend .env file with new RPC endpoint
```

---

## Contact & Support

For deployment assistance or security incidents:

- **Security Incidents**: security@example.com (PGP key: 0x1234...)
- **Deployment Support**: deploy@example.com
- **Discord**: https://discord.gg/your-server
- **GitHub Issues**: https://github.com/your-org/solana-swap/issues

---

## Additional Resources

- [Solana Deployment Guide](https://docs.solana.com/deploying)
- [Anchor Deployment](https://www.anchor-lang.com/docs/deployment)
- [Solana Program Security](https://solanasec.dev/)
- [Multi-Sig Wallets (Squads)](https://squads.so/)
- [RPC Providers Comparison](https://solana.com/rpc)

---

## Disclaimer

This is an **educational project** for demonstration purposes. The program has **NOT been audited** for production use. Deploying to mainnet without a professional security audit may result in loss of funds.

**USE AT YOUR OWN RISK.**
