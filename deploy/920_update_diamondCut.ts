import { Contract, ZeroAddress } from 'ethers';
import { ethers, getChainId } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { replaceFacet } from '../scripts/helpers/diamond';
import { diamondContractName, updateDeploymentLogs } from './9999_utils';

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
  const chainId = await getChainId();

  console.log(`---------------------------------------------------------------------`);
  console.log(`Update Diamond Cut Facet on Chain ID: ${chainId}`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  const diamondAddress = await (await ethers.getContract(diamondContractName)).getAddress();

  ///
  /// Facets
  ///
  console.log(`Deploy facet...`);
  const diamondCutFacetDeployResult = await deploy('DiamondCutFacet', {
    from: deployer,
    log: true,
  });
  console.log(`...done`);
  await updateDeploymentLogs('DiamondCutFacet', diamondCutFacetDeployResult, false);
  const diamondCutFacetContract = (await ethers.getContract('DiamondCutFacet')) as Contract;

  console.log(``);
  console.log(`Replace Facet...`);
  await replaceFacet(diamondCutFacetContract, diamondAddress, ZeroAddress, '0x', deployer);
  console.log(`...done`);

  console.log(``);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);
  console.log(`Finished after ${Math.floor((Date.now() - startTime) / 1000)} seconds`);
};

export default main;

main.id = 'update_diamondCut';
main.tags = ['UpdateDiamondCut'];
