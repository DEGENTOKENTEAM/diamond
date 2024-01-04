# DegenX Expansion Protocol

## Static Code Analaysis

Start Slither: `docker run -it -v $(pwd):/share --workdir="/share/contracts/diamond" trailofbits/eth-security-toolbox`  
Execute Slither per file: `slither ./filename.sol --config-file ./../../slither.config.json`

### Install different solidity compilers

`0.8.19` >> `solc-select install 0.8.19 && solc-select use 0.8.19`  
`0.8.17` >> `solc-select install 0.8.17 && solc-select use 0.8.17`

## CELER

Mainnet: https://cbridge-prod2.celer.app
Testnet: https://cbridge-v2-test.celer.network

### API Documentation

### curl commands of use

#### Get Transfer Status

`curl -d '{"transfer_id":"0000000000000000000000000000000000000000000000000000000000000000"}' -H "Content-Type: application/json" -X POST https://cbridge-prod2.celer.app/v2/getTransferStatus`

#### Estimate Receiving Amount

`curl https://cbridge-prod2.celer.app/v2/estimateAmt?src_chain_id=1&dst_chain_id=43114&token_symbol=USDT&amt=1337000000&usr_addr=0x0000000000000000000000000000000000000000&slippage_tolerance=5000`

#### Get Transfer Configs

`curl https://cbridge-prod2.celer.app/v2/getTransferConfigs`

## Important Information

Funds that will get transferred in intermediate token:

- Bounties
- Non-FeeDistributor Receiver (the ones that are configured in the Fee itself)

## Operators

This can be a multisig or an EOA which receives any funds that can't be processed anymore in order to process them manually.

## Deployment

### Mainnet

Deploy Home Diamond: `npx hardhat --network mainnet-avax deploy --tags DeployHome`  
Deploy Target Diamond: `npx hardhat --network mainnet-eth deploy --tags DeployTarget`  
Setup Home Diamond: `npx hardhat deploy --network mainnet-avax --tags SetupHome`  
Setup Target Diamond: `npx hardhat deploy --network mainnet-eth --tags SetupTarget`

Deploy Launch Protocol: `npx hardhat deploy --network mainnet-eth --tags DeployLaunchProtocol`  
Deploy Degen ATM: `npx hardhat deploy --network mainnet-eth --tags DeployDegenATM`

### Testnet

Deploy Home Diamond: `npx hardhat deploy --network testnet-avax --tags DeployHome`  
Deploy Target Diamond: `npx hardhat deploy --network testnet-eth --tags DeployTarget`  
Setup Home Diamond: `npx hardhat deploy --network testnet-avax --tags SetupHome`  
Setup Target Diamond: `npx hardhat deploy --network testnet-eth --tags SetupTarget`

Deploy Launch Protocol: `npx hardhat deploy --network testnet-eth --tags DeployLaunchProtocol`  
Deploy Degen ATM: `npx hardhat deploy --network testnet-eth --tags DeployDegenATM`

## Development

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
