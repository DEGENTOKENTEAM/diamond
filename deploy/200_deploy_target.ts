import { Contract, ZeroAddress, keccak256, toUtf8Bytes } from 'ethers';
import { ethers } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { result } from 'lodash';
import { addFacets } from '../scripts/helpers/diamond';
import { diamondContractName, getConfig, getContractAddress, updateDeploymentLogs } from './9999_utils';

// load env config
import * as dotenv from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';
const dotEnvConfig = dotenv.config();
dotenvExpand(dotEnvConfig);

const main: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const startTime = Date.now();
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;
  const chainId = await getChainId();
  const deployerSigner = await ethers.getSigner(deployer);

  const contractConfig = getConfig('contracts');
  const celerConfig = getConfig('celer');
  const accountsConfig = getConfig('accounts');
  const relayerAddressHome = getContractAddress('RelayerCeler', process.env.DEPLOY_HOME_NETWORK);
  const chainIdHome = parseInt(process.env.DEPLOY_HOME_CHAIN_ID!);
  const operator = result(accountsConfig, `${chainId}.operator`, ZeroAddress);
  const messageBus = result(celerConfig, `contracts.${chainId}.messagebus`, ZeroAddress);
  const baseTokenAddress = result(contractConfig, `${chainId}.baseToken`, null);

  const diamondAddress = await (await ethers.getContract(diamondContractName)).getAddress();
  const diamondInit = await ethers.getContract('DiamondInit');
  const accessControlEnumerableFacet = await ethers.getContractAt('AccessControlEnumerableFacet', diamondAddress);

  console.log(`---------------------------------------------------------------------`);
  console.log(`Deploy Network Specific Contracts for Chain ID: ${chainId}`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  ///
  /// Relayer
  ///

  const celerRelayerDeployResult = await deploy('RelayerCeler', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: false,
    args: [diamondAddress, relayerAddressHome, operator, messageBus, chainId, false],
  });
  await updateDeploymentLogs('RelayerCeler', celerRelayerDeployResult, false);
  const celerRelayerContract = await ethers.getContractAt('RelayerCeler', celerRelayerDeployResult.address);

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
    args: [celerRelayerDeployResult.address],
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

  await addFacets(
    [feeStoreFacetContract, celerFeeHubFacetContract, erc20FacetContract],
    diamondAddress,
    await diamondInit.getAddress(),
    diamondInit.interface.encodeFunctionData('init'),
    deployer
  );

  ///
  /// Configure
  ///
  console.log(``);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  console.log(`Configuration`);
  console.log(``);

  const erc20Facet = await ethers.getContractAt('ERC20Facet', diamondAddress);
  const feeStoreFacet = await ethers.getContractAt('FeeStoreFacet', diamondAddress);

  console.log(`Grant Relayer FEE_STORE_MANAGER_ROLE`);
  await (
    await accessControlEnumerableFacet
      .connect(deployerSigner)
      .grantRole(keccak256(toUtf8Bytes('FEE_STORE_MANAGER_ROLE')), celerRelayerDeployResult.address)
  ).wait();
  console.log(``);

  console.log(`Add actor ${relayerAddressHome} for chain id ${chainIdHome}`);
  await (await celerRelayerContract.connect(deployerSigner).addActor(chainIdHome, relayerAddressHome)).wait();
  console.log(``);

  console.log(`Initialize FeeStoreFacet`);
  await (
    await feeStoreFacet.connect(deployerSigner).initFeeStoreFacet(operator, baseTokenAddress || diamondAddress)
  ).wait();
  console.log(``);

  console.log(`Initialize ERC20Facet`);
  await (await erc20Facet.connect(deployerSigner).initERC20Facet('JUST DO IT', 'NIKE', 18)).wait();

  console.log(``);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);
  console.log(`Finished after ${((Date.now() - startTime) / 1000).toPrecision(2)} seconds`);
};

export default main;

main.id = 'deploy_target';
main.tags = ['DeployTarget'];
main.dependencies = ['InitialDeploy'];
