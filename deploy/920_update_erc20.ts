import { Contract, ZeroAddress } from 'ethers';
import { ethers, getChainId } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { addOrReplaceFacets, removeFacet } from '../scripts/helpers/diamond';
import { diamondContractName, updateDeploymentLogs, verifyContract } from './9999_utils';

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
  const deployerSigner = await ethers.getSigner(deployer);

  console.log(`---------------------------------------------------------------------`);
  console.log(`Update ERC20 Facet On Chain ID: ${chainId}`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  const diamondAddress = await (await ethers.getContract(diamondContractName)).getAddress();

  ///
  /// Facets
  ///
  console.log(`Deploy facet...`);
  const erc20FacetDeployResult = await deploy('ERC20Facet', {
    from: deployer,
    log: true,
  });
  await updateDeploymentLogs('ERC20Facet', erc20FacetDeployResult, false);
  console.log(`...done`);

  console.log(``);
  console.log(`Verify ERC20Facet...`);
  const verified = await verifyContract(hre, 'ERC20Facet');
  if (!verified) console.log(`...error`);
  else console.log(`...done`);

  console.log(``);
  console.log(`Update Facet...`);
  const erc20FacetContract = (await ethers.getContract('ERC20Facet')) as Contract;
  await addOrReplaceFacets([erc20FacetContract], diamondAddress, ZeroAddress, '0x', deployer);
  console.log(`...done`);

  console.log(``);
  console.log(`Remove outdated selectors...`);
  const outdatedSelectors = [
    '0x82c428f9', // getLP
    '0x2f34d282', // setLP
  ];
  await removeFacet(outdatedSelectors, diamondAddress, deployer);
  console.log(`...done`);

  console.log(``);
  console.log(`Initialize ERC20Facet...`);
  const erc20Facet = await ethers.getContractAt('ERC20Facet', diamondAddress);
  await (await erc20Facet.connect(deployerSigner).initERC20Facet('DegenX', 'DGNX', 18)).wait();
  console.log(`...done`);

  console.log(``);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);
  console.log(`Finished after ${Math.floor((Date.now() - startTime) / 1000)} seconds`);
};

export default main;

main.id = 'update_erc20';
main.tags = ['UpdateERC20'];
