import { ZeroAddress, keccak256, toUtf8Bytes } from 'ethers';
import { ethers } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { result } from 'lodash';
import { diamondContractName } from '../utils/diamond';
import { FEE_DISTRIBUTOR_PUSH_ROLE } from '../test/utils/mocks';
import { RelayerCeler } from '../typechain-types';
import { getContractAddress } from '../utils/addresses';
// import { diamondContractName, getConfig, getContractAddress } from './9999_utils';

const main: DeployFunction = async ({ network, diamond, deployments }: HardhatRuntimeEnvironment) => {
  const startTime = Date.now();

  const { log } = deployments;
  const { chainId } = network.config;
  const { chainIdHome, chainNameHome, initials, targetChains } = await diamond.getConfig();

  const isHomeChain = chainId === chainIdHome;

  const diamondContract = await ethers.getContract(diamondContractName());
  const diamonAddress = await diamondContract.getAddress();
  // const targetChainId = +process.env.DEPLOY_TARGET_CHAIN_ID!;

  log(`---------------------------------------------------------------------`);
  log(`Setup chain id ${chainId}`);
  log(`---------------------------------------------------------------------`);

  ///
  /// configure fees
  ///
  const relayerCeler: RelayerCeler = await ethers.getContract('RelayerCeler');

  const feeManager = await ethers.getContractAt('FeeManagerFacet', diamonAddress);
  const celerFeeHub = await ethers.getContractAt('CelerFeeHubFacet', diamonAddress);
  const feeDistributor = await ethers.getContractAt('FeeDistributorFacet', diamonAddress);
  const accessControl = await ethers.getContractAt('AccessControlEnumerableFacet', diamonAddress);

  for (const { chainId, relayerAddress } of targetChains) {
    log(`Add relayer ${relayerAddress} as an actor for chain id ${chainId}`);
    const hasActor = await relayerCeler.isActor(chainId, relayerAddress);
    if (hasActor) {
      log('✅ already added as an actor');
    } else {
      await (await relayerCeler.addActor(chainId, relayerAddress)).wait();
      log(`✅ added`);
    }

    log(`Add relayer ${relayerAddress} to the fee hub as a valid relayer for chain id ${chainId}`);
    let relayerForChainExists = false;
    try {
      await (await celerFeeHub.addRelayerForChain(relayerAddress, chainId)).wait();
      log(`✅ added`);
    } catch (e) {
      const { message } = e as Error;
      if (message.includes(`ChainExisting(${chainId})`)) {
        relayerForChainExists = true;
        log(`🤔 Chain already configured. Trying update instead.`);
      } else {
        log(`❌ There was an unexpected error: ${message}`);
      }
    }

    if (relayerForChainExists) {
      try {
        await (await celerFeeHub.updateRelayerOnChain(relayerAddress, chainId)).wait();
        log(`✅ updated`);
      } catch (e) {
        const { message } = e as Error;
        if (message.includes(`RelayerExists("${relayerAddress}")`)) {
          log('✅ already added relayer to fee hub');
        } else {
          log(`❌ There was an unexpected error: ${message}`);
        }
      }
    }
  }

  log(`Finished after ${Math.floor((Date.now() - startTime) / 1000)} seconds`);
};

export default main;

main.id = 'finalize_degenx';
main.tags = ['FinalizeDegenX'];
main.skip = async ({ network, diamond }) => {
  const { chainIdHome } = await diamond.getConfig();
  return network.config.chainId !== chainIdHome;
};
main.dependencies = ['ConfigureDegenX'];
