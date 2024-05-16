import { ethers } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { RelayerCeler } from '../typechain-types';
import { diamondContractName } from '../utils/diamond';

const main: DeployFunction = async ({ network, diamond, deployments }: HardhatRuntimeEnvironment) => {
  const { log } = deployments;
  const { chainId } = network.config;
  const { targetChains } = await diamond.getConfig();

  const diamondContract = await ethers.getContract(diamondContractName());
  const diamonAddress = await diamondContract.getAddress();

  log(`---------------------------------------------------------------------`);
  log(`Setup chain id ${chainId}`);
  log(`---------------------------------------------------------------------`);

  ///
  /// configure fees
  ///
  const relayerCeler: RelayerCeler = await ethers.getContract('RelayerCeler');
  const celerFeeHub = await ethers.getContractAt('CelerFeeHubFacet', diamonAddress);

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
      if (message.includes(`ChainExisting(${chainId})`) || message.includes('0x67ba2f65')) {
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
        if (message.includes(`RelayerExists("${relayerAddress}")`) || message.includes('0x308e6242')) {
          log('✅ already added relayer to fee hub');
        } else {
          log(`❌ There was an unexpected error: ${message}`);
        }
      }
    }
  }

  log(`---------------------------------------------------------------------`);
  log(`Finished Finalize DegenX`);
};

export default main;

main.id = 'finalize_degenx';
main.tags = ['FinalizeDegenX'];
main.skip = async ({ network, diamond }) => {
  const { chainIdHome } = await diamond.getConfig();
  return network.config.chainId !== chainIdHome;
};
main.dependencies = ['ConfigureDegenX'];
