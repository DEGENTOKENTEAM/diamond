import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { Contract, parseEther } from 'ethers';
import { ethers, network } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { addOrReplaceFacets } from '../scripts/helpers/diamond';
import { getContractAddress, updateDeploymentLogs } from './9999_utils';

// load env config
import * as dotenv from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';
const dotEnvConfig = dotenv.config();
dotenvExpand(dotEnvConfig);

const main: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const startTime = Date.now();
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const relayerAddress = getContractAddress('RelayerCeler', network.name);

  if (network.name === 'localfork' || network.name === 'hardhat') setBalance(deployer, parseEther('100'));

  const diamondAddress = await (await ethers.getContract('Diamond')).getAddress();

  ///
  /// Facets
  ///

  const celerFeeHubFacetDeployResult = await deploy('CelerFeeHubFacet', {
    from: deployer,
    log: true,
    args: [relayerAddress],
  });
  await updateDeploymentLogs('CelerFeeHubFacet', celerFeeHubFacetDeployResult, false);

  const feeDistributorFacetDeployResult = await deploy('FeeDistributorFacet', {
    from: deployer,
    log: true,
  });
  await updateDeploymentLogs('FeeDistributorFacet', feeDistributorFacetDeployResult, false);

  const feeManagerFacetDeployResult = await deploy('FeeManagerFacet', {
    from: deployer,
    log: true,
  });
  await updateDeploymentLogs('FeeManagerFacet', feeManagerFacetDeployResult, false);

  ///
  /// updates facets
  ///

  const celerFeeHubFacetContract = (await ethers.getContract('CelerFeeHubFacet')) as Contract;
  const feeDistributorFacetContract = (await ethers.getContract('FeeDistributorFacet')) as Contract;
  const feeManagerFacetContract = (await ethers.getContract('FeeManagerFacet')) as Contract;

  await addOrReplaceFacets(
    [celerFeeHubFacetContract, feeDistributorFacetContract, feeManagerFacetContract],
    diamondAddress
  );

  console.log(`---------------------------------------------------------------------`);
  console.log(``);
  console.log(`Finished after ${((Date.now() - startTime) / 1000).toPrecision(2)} seconds`);
};

export default main;

main.id = 'update_home';
main.tags = ['UpdateHome'];
