## Home Chain Deployment

### Post Deployment Tasks

#### Operative

- Celer Relayer: Add Actor

#### Configuration

- Fee Manager: Add Fees
- Fee Manager: Assign Target Chain To Fees (needs a target chain)
- ERC20: Set LP
- ERC20: Set Router

## Target Chain Deployment

### Post Deployment Tasks

#### Operative

- Celer Relayer (target): Add Actor Home Chain + Relayer
- Celer Relayer (home): Add Actor Home Chain + Relayer
- Celer Fee Hub (home): Add Relayer For Chain
- Fee Manager (home): Add Target Chain + Diamond

#### Configuration

- Add sell fees (can only be done, after fees were synced)
- Add buy fees (can only be done, after fees were synced)

## Monitoring

- Fee config on home chain compared to target chain, to check wether a config is already deployed

## Executor

- needs to send a small amount to relayer when deploying fees. It's needed as gas for the confirm message
