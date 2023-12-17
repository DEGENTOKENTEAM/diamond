import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { addOrReplaceFacets } from '../scripts/helpers/diamond';
import { diamondContractName, updateDeploymentLogs } from './9999_utils';

// load env config
import * as dotenv from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';
const dotEnvConfig = dotenv.config();
dotenvExpand(dotEnvConfig);

const main: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const diamondAddress = await (await ethers.getContract(diamondContractName)).getAddress();

  ///
  /// Facets
  ///

  const erc20FacetDeployResult = await deploy('ERC20Facet', {
    from: deployer,
    log: true,
  });
  await updateDeploymentLogs('ERC20Facet', erc20FacetDeployResult, false);
  const erc20FacetContract = (await ethers.getContract('ERC20Facet')) as Contract;
  await addOrReplaceFacets([erc20FacetContract], diamondAddress);
};

export default main;

main.id = 'update_erc20';
main.tags = ['UpdateERC20'];
