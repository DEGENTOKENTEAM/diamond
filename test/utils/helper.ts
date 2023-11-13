import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { parseEther } from 'ethers';
import { deployments } from 'hardhat';
import { deployDiamond } from '../../scripts/helpers/deploy-diamond';

export const accessControlError = (account: string, role: string) =>
  `AccessControl: account ${account.toLowerCase()} is missing role ${role.toLowerCase()}`;

export const deployFixture = deployments.createFixture(async ({ getNamedAccounts }, _) => {
  const { deployer } = await getNamedAccounts();
  await setBalance(deployer, parseEther('100'));
  // maybe extend and do a different init function;
  return await deployDiamond('DegenX', 'DiamondCutFacet', 'DiamondInit', ['DiamondLoupeFacet']);
});
