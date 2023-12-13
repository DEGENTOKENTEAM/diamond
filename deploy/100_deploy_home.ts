import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { Contract, ZeroAddress, parseEther } from 'ethers';
import { ethers, network } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { result } from 'lodash';
import { addOrReplaceFacets } from '../scripts/helpers/diamond';
import { getConfig, updateDeploymentLogs } from './9999_utils';

// load env config
import * as dotenv from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';
import { FEE_DISTRIBUTOR_PUSH_ROLE } from '../test/utils/mocks';
const dotEnvConfig = dotenv.config();
dotenvExpand(dotEnvConfig);

const main: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const startTime = Date.now();
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;
  const chainId = await getChainId();

  const celerConfig = getConfig('celer');
  const accountsConfig = getConfig('accounts');
  const contractsConfig = getConfig('contracts');
  const router = result(contractsConfig, `${chainId}.router`, ZeroAddress);
  const operator = result(accountsConfig, `${chainId}.operator`, ZeroAddress);
  const baseToken = result(contractsConfig, `${chainId}.baseToken`, ZeroAddress);
  const messageBus = result(celerConfig, `contracts.${chainId}.messagebus`, ZeroAddress);
  const nativeWrapper = result(contractsConfig, `${chainId}.nativeWrapper`, ZeroAddress);

  if (network.name === 'localfork' || network.name === 'hardhat') setBalance(deployer, parseEther('100'));

  const diamondAddress = await (await ethers.getContract('Diamond')).getAddress();
  const diamondInit = await ethers.getContract('DiamondInit');
  const accessControlEnumerableFacet = await ethers.getContractAt('AccessControlEnumerableFacet', diamondAddress);

  console.log(`---------------------------------------------------------------------`);
  console.log(`Deploy Network Specific Contracts for Chain ID: ${network.config.chainId}`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  ///
  /// Relayer
  ///

  const celerRelayerDeployResult = await deploy('RelayerCeler', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [diamondAddress, ZeroAddress, operator, messageBus, chainId, true],
  });
  await updateDeploymentLogs('RelayerCeler', celerRelayerDeployResult, false);

  ///
  /// Facets
  ///

  const celerFeeHubFacetDeployResult = await deploy('CelerFeeHubFacet', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [celerRelayerDeployResult.address],
  });
  await updateDeploymentLogs('CelerFeeHubFacet', celerFeeHubFacetDeployResult, false);

  const feeManagerFacetDeployResult = await deploy('FeeManagerFacet', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
  await updateDeploymentLogs('FeeManagerFacet', feeManagerFacetDeployResult, false);

  const feeDistributorFacetDeployResult = await deploy('FeeDistributorFacet', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
  await updateDeploymentLogs('FeeDistributorFacet', feeDistributorFacetDeployResult, false);

  ///
  /// add facets
  ///

  // @todo skip add facets when contracts already deployed

  console.log(``);
  console.log(`---------------------------------------------------------------------`);
  console.log(`Add facets`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  const celerFeeHubFacetContract = (await ethers.getContract('CelerFeeHubFacet')) as Contract;
  const feeManagerFacetContract = (await ethers.getContract('FeeManagerFacet')) as Contract;
  const feeDistributorFacetContract = (await ethers.getContract('FeeDistributorFacet')) as Contract;

  await addOrReplaceFacets(
    [feeManagerFacetContract, celerFeeHubFacetContract, feeDistributorFacetContract],
    diamondAddress,
    await diamondInit.getAddress(),
    diamondInit.interface.encodeFunctionData('init')
  );
  console.log(`Added`);

  ///
  /// Configure
  ///
  // @todo skip configuration when contracts already deployed

  console.log(``);
  console.log(`---------------------------------------------------------------------`);
  console.log(`Configuration`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  console.log(`Initialize FeeDistributorFacet`);
  const feeDistributorFacet = await ethers.getContractAt('FeeDistributorFacet', diamondAddress);
  console.log(`Fetched FeeDistributorFacet on diamond ${diamondAddress}`);
  await (await feeDistributorFacet.initFeeDistributorFacet(baseToken, nativeWrapper, router, 10000)).wait();
  console.log(`FeeDistributorFacet initialized`);

  console.log(``);

  console.log(`Grant FEE_DISTRIBUTOR_PUSH_ROLE to Relayer`);
  await (
    await accessControlEnumerableFacet.grantRole(FEE_DISTRIBUTOR_PUSH_ROLE, celerRelayerDeployResult.address)
  ).wait();
  console.log(`FEE_DISTRIBUTOR_PUSH_ROLE to Relayer granted`);
  console.log(``);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);
  console.log(`Finished after ${((Date.now() - startTime) / 1000).toPrecision(2)} seconds`);
};

export default main;

main.id = 'deploy_home';
main.tags = ['DeployHome'];
main.dependencies = ['InitialDeploy'];
