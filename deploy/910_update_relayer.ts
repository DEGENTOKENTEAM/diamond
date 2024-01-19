import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

// load env config
import * as dotenv from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';
import { Contract, ZeroAddress, keccak256, toUtf8Bytes } from 'ethers';
import { ethers, network } from 'hardhat';
import { result } from 'lodash';
import { addOrReplaceFacets, replaceFacet } from '../scripts/helpers/diamond';
import { diamondContractName, getConfig, getContractAddress, updateDeploymentLogs } from './9999_utils';
const dotEnvConfig = dotenv.config();
dotenvExpand(dotEnvConfig);

const main: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const startTime = Date.now();
  const chainId = network.config.chainId;

  console.log(`---------------------------------------------------------------------`);
  console.log(`Deploy Relayer on Chain ID: ${chainId}`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const deployerSigner = await ethers.getSigner(deployer);

  const celerConfig = getConfig('celer');
  const accountsConfig = getConfig('accounts');
  const isHomeChain = chainId === +process.env.DEPLOY_HOME_CHAIN_ID!;
  const relayerAddressHome = getContractAddress('RelayerCeler', process.env.DEPLOY_HOME_NETWORK);

  const chainIdHome = parseInt(process.env.DEPLOY_HOME_CHAIN_ID!);
  const operator = result(accountsConfig, `${chainId}.operator`, ZeroAddress);
  const messageBus = result(celerConfig, `contracts.${chainId}.messagebus`, ZeroAddress);

  const diamondAddress = await (await ethers.getContract(diamondContractName)).getAddress();
  const accessControlEnumerableFacet = await ethers.getContractAt('AccessControlEnumerableFacet', diamondAddress);
  const previousRelayerAddress = isHomeChain
    ? relayerAddressHome
    : getContractAddress('RelayerCeler', process.env.DEPLOY_TARGET_NETWORK);

  ///
  /// Relayer
  ///

  const celerRelayerDeployResult = await deploy('RelayerCeler', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: false,
    args: [
      diamondAddress,
      isHomeChain ? ZeroAddress : relayerAddressHome,
      operator,
      messageBus,
      chainIdHome,
      isHomeChain,
    ],
  });
  await updateDeploymentLogs('RelayerCeler', celerRelayerDeployResult, false);
  const celerRelayerContract = await ethers.getContractAt('RelayerCeler', celerRelayerDeployResult.address);

  ///
  /// Facets
  ///

  const celerFeeHubFacetDeployResult = await deploy('CelerFeeHubFacet', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: false,
    args: [celerRelayerDeployResult.address],
  });
  await updateDeploymentLogs('CelerFeeHubFacet', celerFeeHubFacetDeployResult, false);
  const celerFeeHubFacetContract = (await ethers.getContract('CelerFeeHubFacet')) as Contract;
  console.log(``);
  console.log(`Update facet...`);
  await replaceFacet(celerFeeHubFacetContract, diamondAddress, ZeroAddress, '0x', deployer);
  console.log(`...done`);

  ///
  /// Configure
  ///

  console.log(``);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  console.log(`Configuration`);
  console.log(``);

  if (isHomeChain) {
    console.log(`Revoke FEE_DISTRIBUTOR_PUSH_ROLE for previous Relayer ${previousRelayerAddress}`);
    await (
      await accessControlEnumerableFacet
        .connect(deployerSigner)
        .revokeRole(keccak256(toUtf8Bytes('FEE_DISTRIBUTOR_PUSH_ROLE')), previousRelayerAddress)
    ).wait();
    console.log(`...done`);
    console.log(``);

    console.log(`IMPORTANT: update the relayer with the actors from the target chains`);
    console.log(``);

    console.log(`Grant FEE_DISTRIBUTOR_PUSH_ROLE for Relayer ${celerRelayerDeployResult.address}`);
    await (
      await accessControlEnumerableFacet
        .connect(deployerSigner)
        .grantRole(keccak256(toUtf8Bytes('FEE_DISTRIBUTOR_PUSH_ROLE')), celerRelayerDeployResult.address)
    ).wait();
    console.log(`...done`);
    console.log(``);
  } else {
    console.log(`Revoke FEE_STORE_MANAGER_ROLE for previous Relayer ${previousRelayerAddress}`);
    await (
      await accessControlEnumerableFacet
        .connect(deployerSigner)
        .revokeRole(keccak256(toUtf8Bytes('FEE_STORE_MANAGER_ROLE')), previousRelayerAddress)
    ).wait();
    console.log(`...done`);
    console.log(``);

    console.log(`Grant Relayer FEE_STORE_MANAGER_ROLE`);
    await (
      await accessControlEnumerableFacet
        .connect(deployerSigner)
        .grantRole(keccak256(toUtf8Bytes('FEE_STORE_MANAGER_ROLE')), celerRelayerDeployResult.address)
    ).wait();
    console.log(`...done`);
    console.log(``);

    console.log(`Add actor ${relayerAddressHome} for chain id ${chainIdHome}`);
    await (await celerRelayerContract.connect(deployerSigner).addActor(chainIdHome, relayerAddressHome)).wait();
    console.log(``);
    console.log(`IMPORTANT: update the home relayer with this new relayer as an actor`);
    console.log(`IMPORTANT: update the relayer in the home celer fee hub`);
  }

  console.log(`IMPORTANT: update the relayer address in the executor`);
  console.log(``);

  console.log(`---------------------------------------------------------------------`);
  console.log(``);
  console.log(`Finished after ${((Date.now() - startTime) / 1000).toPrecision(2)} seconds`);
};

export default main;

main.id = 'update_relayer';
main.tags = ['UpdateRelayer'];
