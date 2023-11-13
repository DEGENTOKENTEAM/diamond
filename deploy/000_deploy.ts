import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import * as dotenv from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';
import { Contract, parseEther } from 'ethers';
import { ethers, network } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { addFacets } from '../scripts/helpers/diamond';
import { IDiamondLoupe } from '../typechain-types';
import { diamondContractName, updateDeploymentLogs } from './9999_utils';
const dotEnvConfig = dotenv.config();
dotenvExpand(dotEnvConfig);

const main: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  if (network.name === 'localfork' || network.name === 'hardhat') setBalance(deployer, parseEther('100'));

  console.log(`---------------------------------------------------------------------`);
  console.log(`Deploy ${diamondContractName} on Chain ID: ${chainId}`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  // initial facets
  const diamondCutFacet = await deploy('DiamondCutFacet', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
  await updateDeploymentLogs('DiamondCutFacet', diamondCutFacet, false);
  const diamond = await deploy(diamondContractName, {
    from: deployer,
    args: [deployer, diamondCutFacet.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });
  await updateDeploymentLogs(diamondContractName, diamond, false);
  const diamondLoupeFacet = await deploy('DiamondLoupeFacet', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
  await updateDeploymentLogs('DiamondLoupeFacet', diamondLoupeFacet, false);
  const accessControlEnumerableFacet = await deploy('AccessControlEnumerableFacet', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
  await updateDeploymentLogs('AccessControlEnumerableFacet', accessControlEnumerableFacet, false);
  const diamondInit = await deploy('DiamondInit', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
  await updateDeploymentLogs('DiamondInit', diamondInit, false);

  // add facets to diamonds
  const loupe = <IDiamondLoupe>await ethers.getContractAt('IDiamondLoupe', diamond.address);
  const diamondLoupeFacetContract = (await ethers.getContract('DiamondLoupeFacet')) as Contract;
  const accessControlEnumerableFacetContract = (await ethers.getContract('AccessControlEnumerableFacet')) as Contract;
  try {
    await loupe.facets();
  } catch (e) {
    await addFacets([diamondLoupeFacetContract, accessControlEnumerableFacetContract], diamond.address);
  }
  console.log(``);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);
  console.log(`Finished deploying Diamond`);
  console.log(``);
};

export default main;

main.id = 'deploy';
main.tags = ['InitialDeploy'];
