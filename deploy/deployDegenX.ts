import * as dotenv from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';
import { Contract, ZeroAddress } from 'ethers';
import { ethers } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { addOrReplaceFacets } from '../scripts/helpers/diamond';
import { FEE_DISTRIBUTOR_PUSH_ROLE, FEE_STORE_MANAGER_ROLE } from '../test/utils/mocks';
import { RelayerCeler } from '../typechain-types';
import { getContractAddress } from '../utils/addresses';
import { diamondContractName } from '../utils/diamond';
import { updateDeploymentLogs } from './9999_utils';
const dotEnvConfig = dotenv.config();
dotenvExpand(dotEnvConfig);

const main: DeployFunction = async ({ network, diamond, deployments, getNamedAccounts }: HardhatRuntimeEnvironment) => {
  const { deployer } = await getNamedAccounts();
  const { deploy, log } = deployments;
  const { chainId } = network.config;

  const { chainIdHome, chainNameHome, token } = await diamond.getConfig();
  const { contracts, accounts } = await diamond.getProtocols();

  const isHomeChain = chainId === chainIdHome;
  const diamondAddress = await (await ethers.getContract(diamondContractName())).getAddress();
  const relayerAddressHome = isHomeChain ? ZeroAddress : getContractAddress(chainNameHome, 'RelayerCeler');

  log(`---------------------------------------------------------------------`);
  log(`Deploy network specific protocols for Chain ID: ${chainId}`);
  log(`---------------------------------------------------------------------`);

  ///
  /// Relayer
  ///

  const celerRelayerDeployResult = await deploy('RelayerCeler', {
    from: deployer,
    log: true,
    args: [
      diamondAddress,
      relayerAddressHome,
      accounts.operator.address,
      contracts.celer.messagebus.address,
      chainIdHome,
      isHomeChain,
    ],
  });
  if (celerRelayerDeployResult.newlyDeployed)
    await updateDeploymentLogs('RelayerCeler', celerRelayerDeployResult, false);

  ///
  /// Facets
  ///
  const facets: Contract[] = [];

  const celerFeeHubFacetDeployResult = await deploy('CelerFeeHubFacet', {
    from: deployer,
    log: true,
    args: [celerRelayerDeployResult.address],
  });
  if (celerFeeHubFacetDeployResult.newlyDeployed) {
    await updateDeploymentLogs('CelerFeeHubFacet', celerFeeHubFacetDeployResult, false);
    facets.push(await ethers.getContract('CelerFeeHubFacet'));
  }

  const genericFacetDeployResult = await deploy('FeeGenericFacet', {
    from: deployer,
    log: true,
  });
  if (genericFacetDeployResult.newlyDeployed) {
    await updateDeploymentLogs('FeeGenericFacet', genericFacetDeployResult, false);
    facets.push(await ethers.getContract('FeeGenericFacet'));
  }

  if (isHomeChain) {
    const feeManagerFacetDeployResult = await deploy('FeeManagerFacet', {
      from: deployer,
      log: true,
    });
    if (feeManagerFacetDeployResult.newlyDeployed) {
      await updateDeploymentLogs('FeeManagerFacet', feeManagerFacetDeployResult, false);
      facets.push(await ethers.getContract('FeeManagerFacet'));
    }

    const feeDistributorFacetDeployResult = await deploy('FeeDistributorFacet', {
      from: deployer,
      log: true,
    });
    if (feeDistributorFacetDeployResult.newlyDeployed) {
      await updateDeploymentLogs('FeeDistributorFacet', feeDistributorFacetDeployResult, false);
      facets.push(await ethers.getContract('FeeDistributorFacet'));
    }
  } else {
    const feeStoreFacetDeployResult = await deploy('FeeStoreFacet', {
      from: deployer,
      log: true,
    });
    if (feeStoreFacetDeployResult.newlyDeployed) {
      await updateDeploymentLogs('FeeStoreFacet', feeStoreFacetDeployResult, false);
      facets.push(await ethers.getContract('FeeStoreFacet'));
    }

    const erc20FacetDeployResult = await deploy('ERC20Facet', {
      from: deployer,
      log: true,
      skipIfAlreadyDeployed: false,
    });
    if (erc20FacetDeployResult.newlyDeployed) {
      await updateDeploymentLogs('ERC20Facet', erc20FacetDeployResult, false);
      facets.push(await ethers.getContract('ERC20Facet'));
    }
  }

  if (facets.length > 0) {
    log(`---------------------------------------------------------------------`);
    log(`Add ${facets.length} facet(s)`);
    await addOrReplaceFacets(facets, diamondAddress);
    log(`✅ added`);
  }

  ///
  /// Configure
  ///
  // TODO put this into configureDegenX deployment script
  log(`---------------------------------------------------------------------`);
  log(`Configuration`);
  log(`---------------------------------------------------------------------`);
  const accessControl = await ethers.getContractAt('AccessControlEnumerableFacet', diamondAddress);
  if (isHomeChain) {
    log(`Initialize Fee Distributor`);
    const feeDistributor = await ethers.getContractAt('FeeDistributorFacet', diamondAddress);
    const isInitialized = await feeDistributor.feeDistributorIsInitialized();
    if (isInitialized) {
      log('✅ Fee Distributor already initialized');
    } else {
      await (
        await feeDistributor.initFeeDistributorFacet(
          contracts.degenx.baseToken!.address,
          contracts.degenx.nativeWrapper.address,
          contracts.degenx.router.address,
          10000
        )
      ).wait();
      log(`✅ initialized`);
    }
    log(`---------------------------------------------------------------------`);
    log(`Grant FEE_DISTRIBUTOR_PUSH_ROLE (${FEE_DISTRIBUTOR_PUSH_ROLE}) for Relayer`);
    const relayerHasRole = await accessControl.hasRole(FEE_DISTRIBUTOR_PUSH_ROLE, celerRelayerDeployResult.address);
    if (relayerHasRole) {
      log('✅ Relayer already has access');
    } else {
      await (await accessControl.grantRole(FEE_DISTRIBUTOR_PUSH_ROLE, celerRelayerDeployResult.address)).wait();
      log(`✅ granted`);
    }
  } else {
    log(`Grant FEE_STORE_MANAGER_ROLE (${FEE_STORE_MANAGER_ROLE}) for Relayer`);
    const feeStoreHasRole = await accessControl.hasRole(FEE_STORE_MANAGER_ROLE, celerRelayerDeployResult.address);
    if (feeStoreHasRole) {
      log('✅ Fee Store already has access');
    } else {
      await (await accessControl.grantRole(FEE_STORE_MANAGER_ROLE, celerRelayerDeployResult.address)).wait();
      log(`✅ granted`);
    }

    log(`---------------------------------------------------------------------`);

    log(`Add Relayer Home (${relayerAddressHome}) as an actor for chain id ${chainIdHome}`);
    const celerRelayerContract = (await ethers.getContract('RelayerCeler')) as RelayerCeler;
    const hasActor = await celerRelayerContract.isActor(chainIdHome, relayerAddressHome);
    if (hasActor) {
      log('✅ already configured as an actor');
    } else {
      await (await celerRelayerContract.addActor(chainIdHome, relayerAddressHome)).wait();
      log(`✅ added`);
    }

    log(`---------------------------------------------------------------------`);

    log(`Initialize Fee Store`);
    const feeStoreFacet = await ethers.getContractAt('FeeStoreFacet', diamondAddress);
    try {
      await (await feeStoreFacet.initFeeStoreFacet(accounts.operator.address, diamondAddress)).wait();
      log(`✅ initialized`);
    } catch (e: any) {
      if ((e as Error).message.includes('AlreadyInitialized()')) {
        log('✅ Fee Store already initialized');
      } else {
        log('❌ There was an unexpected error: %s', (e as Error).message);
      }
    }

    log(`---------------------------------------------------------------------`);

    log(`Initialize ERC20`);
    const erc20Facet = await ethers.getContractAt('ERC20Facet', diamondAddress);
    try {
      await (await erc20Facet.initERC20Facet(token.name, token.symbol, token.decimals)).wait();
      log(`✅ initialized`);
    } catch (e: any) {
      if ((e as Error).message.includes('initialized')) {
        log('✅ ERC20 already initialized');
      } else {
        log('❌ There was an unexpected error: %s', (e as Error).message);
      }
    }
  }

  log(`---------------------------------------------------------------------`);
  log(`Finished deploying DegenX`);
};

export default main;

main.id = 'deploy_degenx';
main.tags = ['DeployDegenX'];
main.dependencies = ['InitialDeploy'];
