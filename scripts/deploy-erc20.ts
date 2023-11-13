import * as helpers from '@nomicfoundation/hardhat-network-helpers';
import { ethers, network, upgrades } from 'hardhat';
import { DegenX } from '../typechain-types';
import { parseEther } from 'ethers/lib/utils';
import { deployDiamond } from './helpers/deploy-diamond';
import fetch from 'node-fetch';
import { readFileSync } from 'fs';

async function main() {
  const [deployer] = await ethers.getSigners();

  if (network.name.includes('localfork')) {
    helpers.setBalance(deployer.address, parseEther('10'));
  }

  const { diamond, diamondCutFacet, diamondInit } = await deployDiamond(
    deployer,
    'Diamond',
    'DiamondCutFacet',
    'DiamondInit',
    ['DiamondLoupeFacet', 'AccessControlEnumerableFacet', 'ERC20Facet'],
    true
  );

  // fetch('https://api.etherscan.io/api', {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     apikey: 'PWA6FQ8SACXRCC4Y88ZH2XYUNSG71NIAXX',
  //     module: 'contract',
  //     action: 'verifysourcecode',
  //     sourceCode: readFileSync('./../contracts/diamond/Diamond.sol'),
  //     contractaddress: diamond.address,
  //     contractname: 'Diamond',
  //     runs: 99999,
  //   }),
  // });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
