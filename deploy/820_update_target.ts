import { Contract } from 'ethers';
import { ethers, network } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { addOrReplaceFacets } from '../scripts/helpers/diamond';
import { diamondContractName, getContractAddress, updateDeploymentLogs } from './9999_utils';

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

  const diamondAddress = await (await ethers.getContract(diamondContractName)).getAddress();

  ///
  /// Facets
  ///

  const feeStoreFacetDeployResult = await deploy('FeeStoreFacet', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: false,
  });
  await updateDeploymentLogs('FeeStoreFacet', feeStoreFacetDeployResult, false);

  const celerFeeHubFacetDeployResult = await deploy('CelerFeeHubFacet', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: false,
    args: [relayerAddress],
  });
  await updateDeploymentLogs('CelerFeeHubFacet', celerFeeHubFacetDeployResult, false);

  const erc20FacetDeployResult = await deploy('ERC20Facet', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: false,
  });
  await updateDeploymentLogs('ERC20Facet', erc20FacetDeployResult, false);

  ///
  /// add facets
  ///

  const feeStoreFacetContract = (await ethers.getContract('FeeStoreFacet')) as Contract;
  const celerFeeHubFacetContract = (await ethers.getContract('CelerFeeHubFacet')) as Contract;
  const erc20FacetContract = (await ethers.getContract('ERC20Facet')) as Contract;

  await addOrReplaceFacets([feeStoreFacetContract, celerFeeHubFacetContract, erc20FacetContract], diamondAddress);

  console.log(`---------------------------------------------------------------------`);
  console.log(``);
  console.log(`Finished after ${((Date.now() - startTime) / 1000).toPrecision(2)} seconds`);
};

export default main;

main.id = 'update_target';
main.tags = ['UpdateTarget'];
