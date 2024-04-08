import { ethers } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { FEE_DISTRIBUTOR_PUSH_ROLE } from '../test/utils/mocks';
import { RelayerCeler } from '../typechain-types';
import { getContractAddress } from '../utils/addresses';
import { diamondContractName } from '../utils/diamond';

const main: DeployFunction = async ({ network, diamond, deployments }: HardhatRuntimeEnvironment) => {
  const { log } = deployments;
  const { chainId } = network.config;
  const { chainIdHome, chainNameHome, initials } = await diamond.getConfig();
  const { contracts } = await diamond.getProtocols();

  const isHomeChain = chainId === chainIdHome;

  const diamondContract = await ethers.getContract(diamondContractName());
  const diamondAddress = await diamondContract.getAddress();

  log(`---------------------------------------------------------------------`);
  log(`Setup chain id ${chainId}`);
  log(`---------------------------------------------------------------------`);

  const relayerCeler: RelayerCeler = await ethers.getContract('RelayerCeler');
  const feeManager = await ethers.getContractAt('FeeManagerFacet', diamondAddress);
  const accessControl = await ethers.getContractAt('AccessControlEnumerableFacet', diamondAddress);
  const feeDistributor = await ethers.getContractAt('FeeDistributorFacet', diamondAddress);

  if (isHomeChain) {
    log(`Configure Fee Manager`);
    log(`---------------------------------------------------------------------`);

    log(`Add ${initials.chains.length} chain(s) with their desired target`);
    for (const { chainId, target } of initials.chains) {
      log(`Add chain id ${chainId} with target ${target}`);
      try {
        await (await feeManager.addChain({ chainId, target })).wait();
        log(`✅ added`);
      } catch (e) {
        if ((e as Error).message.includes('ChainIdExists')) {
          log(`✅ already existing`);
        } else {
          log('❌ There was an unexpected error: %s', (e as Error).message);
        }
      }
    }

    log(`---------------------------------------------------------------------`);

    log(`Add ${initials.feeConfigs.length} inital fee configuration(s) to Fee Manager`);
    const existingFeeConfigIds = await feeManager.getFeeConfigIds();
    for (const feeConfig of initials.feeConfigs) {
      log(`Add fee config (${feeConfig.id})`);
      if (existingFeeConfigIds.includes(feeConfig.id)) {
        log(`✅ already existing`);
        continue;
      }
      await (await feeManager.addFeeConfig(feeConfig)).wait();
      log(`✅ added`);
    }

    log(`---------------------------------------------------------------------`);

    log(`Assign ${initials.feeConfigToChain.length} fee config(s) to target chain(s)`);
    for (const { chainId, ids } of initials.feeConfigToChain) {
      const existingAssignments = await feeManager.getFeeConfigsByChain(chainId);
      for (const id of ids) {
        log(`Assign fee config ${id} to chain id ${chainId}`);
        if (existingAssignments.includes(id)) {
          log(`✅ already assigned`);
          continue;
        }
        await (await feeManager.assignFeeConfigToChain({ chainId, id })).wait();
        log(`✅ assigned`);
      }
    }

    log(`---------------------------------------------------------------------`);
    log(`Configure Distributor`);
    log(`---------------------------------------------------------------------`);
    log(`Add ${initials.feeReceivers.length} fee distribution receiver(s)`);
    const existingReceivers = (await feeDistributor.getFeeDistributorReceivers()).map(({ receiver }) => receiver);
    for (const receiver of initials.feeReceivers) {
      log(`Add receiver ${receiver.name} with address ${receiver.account}`);
      if (existingReceivers.includes(receiver.account)) {
        log(`✅ already existing`);
        continue;
      }
      await (await feeDistributor.addFeeDistributionReceiver(receiver)).wait();
      log(`✅ added`);
    }

    log(`---------------------------------------------------------------------`);
    log(`Configure Relayer`);
    log(`---------------------------------------------------------------------`);
    log(`Grant FEE_DISTRIBUTOR_PUSH_ROLE (${FEE_DISTRIBUTOR_PUSH_ROLE}) for Relayer`);
    const relayerAddress = await relayerCeler.getAddress();
    const relayerHasRole = await accessControl.hasRole(FEE_DISTRIBUTOR_PUSH_ROLE, relayerAddress);
    if (relayerHasRole) {
      log('✅ already has access');
    } else {
      await (await accessControl.grantRole(FEE_DISTRIBUTOR_PUSH_ROLE, relayerAddress)).wait();
      log(`✅ granted`);
    }
    log(`---------------------------------------------------------------------`);
  } else {
    log(`Configure Relayer`);
    log(`---------------------------------------------------------------------`);
    const relayerAddressHome = getContractAddress(chainNameHome, 'RelayerCeler');
    log(`Add Relayer Home (${relayerAddressHome}) as an actor for chain id ${chainIdHome} `);
    const hasActor = await relayerCeler.isActor(chainIdHome, relayerAddressHome);
    if (hasActor) {
      log('✅ already added as an actor');
    } else {
      await (await relayerCeler.addActor(chainIdHome, relayerAddressHome)).wait();
      log(`✅ added`);
    }
    log(`---------------------------------------------------------------------`);
  }

  {
    log(`Configure and Initialize Fee Generic`);
    const facet = await ethers.getContractAt('FeeGenericFacet', diamondAddress);
    const isInitialized = await facet.feeGenericIsInitialized();
    if (isInitialized) {
      log('✅ already initialized');
    } else {
      await (
        await facet.initFeeGenericFacet(
          chainIdHome,
          contracts.degenx.nativeWrapper.address,
          contracts.degenx.router.address,
          isHomeChain
        )
      ).wait();
      log(`✅ initialized`);
    }

    log(`---------------------------------------------------------------------`);
    log(`Finish Configure DegenX`);
  }
};

export default main;

main.id = 'configure_degenx';
main.tags = ['ConfigureDegenX'];
main.dependencies = ['DeployDegenX'];
