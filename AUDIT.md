# Audit Handover

## Introduction

This project represents a collection of smart contracts which are based on the [EIP-2535](https://eips.ethereum.org/EIPS/eip-2535) standard. It consists of an ERC20 token facet and several other facets for cross chain fee management and fee distribution.

It also consists of a smart contract which manages the launching an ERC20 token and a smart contract for vesting DGNX based on a defined rate after depositing native crypto currency.

These smart contracts are only meant to work on EVM based networks.

## Code Complexity Measurement

### Recommended Exclusions

We recommend using these exclusions, since 3rd party contracts are already audited and doesn't need to be part of our smart contract audit. More information, see below.

```
{**/node_modules,**/mock*,**/__mocks__*,**/test*,**/migrations,**/Migrations.sol,**/Diamond.sol,**/LibDiamond.sol,**/LibAccessControlEnumerable.sol,**/AccessControlEnumerableFacet.sol,**/DiamondCutFacet.sol,**/DiamondLoupeFacet.sol,**/IERC165.sol,**/IERC173.sol}
```

## 3rd Party Smart Contracts which are already audited

### Access Control Management

#### Files

- `contracts/diamond/facets/AccessControlEnumerableFacet.sol`
- `contracts/diamond/libraries/LibAccessControlEnumerable.sol`

#### Audits

- https://apollox-finance.gitbook.io/apollox-finance/about-us/audit-reports

### Diamond (EIP-2535)

#### Files

- `contracts/diamond/DegenX.sol`
- `contracts/diamond/Diamond.sol`
- `contracts/diamond/facets/DiamondCutFacet.sol`
- `contracts/diamond/facets/DiamondLoupeFacet.sol`
- `contracts/diamond/libraries/LibDiamond.sol`

#### Audits

- https://github.com/mudgen/awesome-diamonds#security-audits

## 3rd Party Service Providers

### Celer Network

#### Celer Inter-chain Message Framework (IM)

Message exchange to desired contracts will be done through the IM framework. It's documented here: https://im-docs.celer.network/developer/celer-im-overview  
   
We're using parts from their contract framework documented here: https://im-docs.celer.network/developer/development-guide/contract-framework  
  
The audits of this service can be found here: https://im-docs.celer.network/audit-reports  

#### Celer cBridge

Our tokens will be minted by Celers bridge service based on their concept of the [cBridge Canonical Mapping Transfer (xAsset)](https://cbridge-docs.celer.network/developer/cbridge-canonical-mapping-transfer-xasset).  
  
Their newest version of the pegged token and token vault process will be used.  
  
The audits of this service can be found here: https://cbridge-docs.celer.network/reference/audit-reports  

## Documentation

[DegenX Diamond](./docs/DegenATM.md)  
[DegenX Diamond Facet - ERC20](./docs/diamond/facets/ERC20Facet.md)  
[DegenX Diamond Facet - Fee Manager](./docs/diamond/facets/FeeManagerFacet.md)  
[DegenX Diamond Facet - Celer Fee Hub](./docs/diamond/facets/CelerFeeHubFacet.md)  
[DegenX Diamond Facet - Fee Store](./docs/diamond/facets/FeeStoreFacet.md)  
[DegenX Diamond Facet - Fee Distributor](./docs/diamond/facets/FeeDistributorFacet.md)  
[Celer Relayer](./docs/diamond/relayers/RelayerCeler.md)  
[DegenATM](./docs/DegenATM.md)  
[LaunchControl](./docs/LaunchControl.md)  
