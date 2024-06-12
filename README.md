# DegenX Expansion Protocol

## CELER

Mainnet: https://cbridge-prod2.celer.app  
Testnet: https://cbridge-v2-test.celer.network

### API Documentation

### curl commands of use

#### Get Transfer Status

```bash
curl -d '{"transfer_id":"0000000000000000000000000000000000000000000000000000000000000000"}' -H "Content-Type: application/json" -X POST https://cbridge-prod2.celer.app/v2/getTransferStatus
```

#### Estimate Receiving Amount

```bash
curl https://cbridge-prod2.celer.app/v2/estimateAmt?src_chain_id=1&dst_chain_id=43114&token_symbol=USDT&amt=1337000000&usr_addr=0x0000000000000000000000000000000000000000&slippage_tolerance=5000
```

#### Get Transfer Configs

```bash
curl https://cbridge-prod2.celer.app/v2/getTransferConfigs
```

## Important Information

Funds that will get transferred in intermediate token:

- Bounties
- Non-FeeDistributor Receiver (the ones that are configured in the Fee itself)

## Operators

This can be a multisig or an EOA which receives any funds that can't be processed anymore in order to process them manually.

## Deployment

### Mainnet

#### Deploy diamond on the home chain (Avalanche)

```bash
yarn deploy:diamond:avax
```

#### Deploy diamond on the target chain (eg. Ethereum, BNB Smart Chain,...)

```bash
yarn deploy:diamond:eth
# or
yarn deploy:diamond:bnb
```

#### Finalize diamond on the home chain

This is necessary to apply configurations and contract information that are deployed on target chains

```bash
yarn deploy:diamond:avax:finalize
```

#### Deploy the launch protocol on the target chain

```bash
npx hardhat deploy --network mainnet-eth --tags DeployLaunchProtocol
```

#### Deploy the liquidity gathering protocol (DegenATM) on the target chain

```bash
npx hardhat deploy --network mainnet-eth --tags DeployDegenATM
```

### Locally

Deploy the diamonds locally, you need to start the local nodes. This starts the current defined mainnet forks

```bash
yarn node:all
```

You can either prepend all commands with

```bash
USE_LOCALFORK_INSTEAD=true
```

You can also set up your `.env` file with an environment variable

```
...
USE_LOCALFORK_INSTEAD=true
PRODUCTION=true 
USE_DEF_DIAMOND=false 
USE_REAL_ACCOUNTS=true 
...
```

#### Deploy diamond on the home chain (Avalanche)

```bash
PRODUCTION=true USE_DEF_DIAMOND=false USE_LOCALFORK_INSTEAD=true USE_REAL_ACCOUNTS=true yarn deploy:diamond:avax
```

#### Deploy diamond on the target chain (eg. Ethereum, BNB Smart Chain,...)

```bash
PRODUCTION=true USE_DEF_DIAMOND=false USE_LOCALFORK_INSTEAD=true USE_REAL_ACCOUNTS=true yarn deploy:diamond:eth
# or
PRODUCTION=true USE_DEF_DIAMOND=false USE_LOCALFORK_INSTEAD=true USE_REAL_ACCOUNTS=true yarn deploy:diamond:bnb
```

#### Finalize diamond on the home chain

This is necessary to apply configurations and contract information that are deployed on target chains

```bash
PRODUCTION=true USE_DEF_DIAMOND=false USE_LOCALFORK_INSTEAD=true USE_REAL_ACCOUNTS=true yarn deploy:diamond:avax:finalize
```

#### Deploy the launch protocol on the target chain

```bash
PRODUCTION=true USE_DEF_DIAMOND=false USE_LOCALFORK_INSTEAD=true USE_REAL_ACCOUNTS=true npx hardhat deploy --network mainnet-eth --tags DeployLaunchProtocol
```

#### Deploy the liquidity gathering protocol (DegenATM) on the target chain

```bash
PRODUCTION=true USE_DEF_DIAMOND=false USE_LOCALFORK_INSTEAD=true USE_REAL_ACCOUNTS=true npx hardhat deploy --network mainnet-eth --tags DeployDegenATM
```

## Development

### Testing

```bash
yarn test
```

### Testing with DEBUG namespace

This will give you more insights about the deployment process while executing a hardhat task that makes use of hardhat deploy scripts

```bash
DEBUG=hardhat:wighawag:hardhat-deploy yarn test
```

### Test Coverage Report

Create a report for all files

```bash
yarn coverage
```

Create a report for a specific file

```bash
yarn coverage --testfiles ./test/fee-distributor-facet.spec.ts
# or
yarn coverage --testfiles ./test/fee-store-facet.spec.ts
```

After creating the report, you can look it up in detail in your browser by using following command and opening up the proposed host

```bash
yarn show-coverage
```

### Avalanche Fuji Testnet

Test Token: `0x6ef48fAE861010F369883d3614bCa91E2F720772`  
Test Token Owner: `0x2fcb9d07eD31874f5fe6da6de315B3b28Dd0aD10`

### Celer Bridge Integration

CELER supports Goerlie ETH (chain 5) to BNB Chain Testnet (chain 97) pegged token bridge.

Therefore our integration testing is done with custom tokens to bridge from ETH to BNB.

#### BNB Chain Testnet

Pair: `0xbe6056777601F9124bE432D96B40Ee96DBDb9201`  
pegUSDT: `0xb5c4Dc15DAb293E0Dc796a0Ba5DAC85207d2339C`  
WBNB: `0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd`

#### Goerlie Ethereum

pegUSDT: `0x7416F4870F1Cd9e60707D850606c969D9dCf7DAe`

### Static Code Analaysis

Use slither from Trail Of Bits

```bash
docker run -it -v $(pwd):/share --workdir="/share/contracts/diamond" trailofbits/eth-security-toolbox
```

Execute Slither per file

```bash
slither ./filename.sol --config-file ./../../slither.config.json
```

#### Install other solidity compilers

If you need to install a different `solc` you can do this by following command:

```bash
# for solidity version 0.8.19
solc-select install 0.8.19 && solc-select use 0.8.19

#  or for solidity version 0.8.17
solc-select install 0.8.17 && solc-select use 0.8.17
```
