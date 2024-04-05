import * as dotenv from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { addOrReplaceFacets, executeInit } from '../scripts/helpers/diamond';
import { diamondContractName } from '../utils/diamond';
import { updateDeploymentLogs } from './9999_utils';
const dotEnvConfig = dotenv.config();
dotenvExpand(dotEnvConfig);

const main: DeployFunction = async ({ network, deployments, getNamedAccounts }: HardhatRuntimeEnvironment) => {
  const { deploy, log } = deployments;
  const { diamondDeployer, deployer } = await getNamedAccounts();
  const { chainId } = network.config;

  log(`---------------------------------------------------------------------`);
  log(`Deploy ${diamondContractName()} Diamond on Chain ID: ${chainId}`);
  log(`---------------------------------------------------------------------`);

  // initial facets
  const diamondCutFacet = await deploy('DiamondCutFacet', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
  if (diamondCutFacet.newlyDeployed) await updateDeploymentLogs('DiamondCutFacet', diamondCutFacet, false);

  const diamond = await deploy(diamondContractName(), {
    from: diamondDeployer,
    args: [deployer, diamondCutFacet.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });
  if (diamond.newlyDeployed) await updateDeploymentLogs(diamondContractName(), diamond, false);

  const diamondLoupeFacet = await deploy('DiamondLoupeFacet', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
  if (diamondLoupeFacet.newlyDeployed) {
    await updateDeploymentLogs('DiamondLoupeFacet', diamondLoupeFacet, false);
    await addOrReplaceFacets([(await ethers.getContract('DiamondLoupeFacet')) as Contract], diamond.address);
  }

  const accessControlEnumerableFacet = await deploy('AccessControlEnumerableFacet', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
  if (accessControlEnumerableFacet.newlyDeployed) {
    await updateDeploymentLogs('AccessControlEnumerableFacet', accessControlEnumerableFacet, false);
    await addOrReplaceFacets([(await ethers.getContract('AccessControlEnumerableFacet')) as Contract], diamond.address);
  }

  const diamondInit = await deploy('DiamondInit', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
  if (diamondInit.newlyDeployed) {
    await updateDeploymentLogs('DiamondInit', diamondInit, false);
    await executeInit(
      diamond.address,
      diamondInit.address,
      (await ethers.getContract('DiamondInit')).interface.encodeFunctionData('init'),
      deployer
    );
  }

  log(`---------------------------------------------------------------------`);
  log(`Finished deploying Diamond`);
};

export default main;

main.id = 'deployDiamond';
main.tags = ['InitialDeploy'];
