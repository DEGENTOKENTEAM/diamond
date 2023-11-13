import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { Contract, ZeroAddress, keccak256, parseEther, toUtf8Bytes } from 'ethers';
import { deployments, ethers, getNamedAccounts } from 'hardhat';
import { deployFacet } from '../scripts/helpers/deploy-diamond';
import { addFacets, addOrReplaceFacets } from '../scripts/helpers/diamond';
import {
  FeeManagerFacet,
  RemoveFeeConfigParamsStruct,
} from '../typechain-types/contracts/diamond/facets/FeeManagerFacet';
import { FeeCurrency, FeeSyncAction, FeeType } from './utils/enums';
import { deployFixture as deployDiamondFixture } from './utils/helper';
import {
  addChainParams,
  assignFeeConfigToChainParams,
  chainTargetContract,
  feeChainId,
  feeChainIdOther,
  feeConfigParamsAdd,
  feeConfigParamsAddFaulty,
  feeConfigParamsUpdate,
  feeConfigParamsUpdateFaulty,
  feeDeployerMessageAdd,
  feeDeployerMessageAddOther,
  feeId,
  feeReceiver,
  feeReceiverUpdate,
  unassignFeeConfigFromAllChainsParams,
  unassignFeeConfigFromChainParams,
} from './utils/mocks';
import { CelerFeeHubFacet, RelayerCelerMock } from '../typechain-types';

const deployFixture = async () => {
  const { deployer } = await getNamedAccounts();
  await setBalance(deployer, parseEther('2'));
  const { diamond, diamondAddress } = await deployDiamondFixture();
  const { facetContract } = await deployFacet('FeeManagerFacet');
  await addFacets([facetContract], diamondAddress);
  return {
    diamond,
    diamondAddress,
  };
};

// @todo add Fee_Manager_Role check everywhere
describe('FeeManagerFacet', function () {
  it('should deploy successfully', async function () {
    const { diamondAddress } = await deployFixture();
    const diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress);
    const diamond = await ethers.getContractAt('DegenX', diamondAddress);
    expect(await diamond.waitForDeployment()).to.be.instanceOf(Contract);
    expect((await diamondLoupeFacet['facets()']()).length).to.eq(3);
  });

  describe('FeeConfig', () => {
    it('should add config successfully', async () => {
      const { diamondAddress } = await deployFixture();
      const feeManagerFacet = await ethers.getContractAt('FeeManagerFacet', diamondAddress);
      await expect(
        feeManagerFacet.addFeeConfig({
          ...feeConfigParamsAddFaulty,
        })
      ).to.revertedWithCustomError(feeManagerFacet, 'FeeZero');
      await (await feeManagerFacet.addChain(addChainParams)).wait();
      await expect(feeManagerFacet.addFeeConfig(feeConfigParamsAdd)).to.emit(feeManagerFacet, 'FeeConfigAdded');
      await expect(feeManagerFacet.addFeeConfig(feeConfigParamsAdd))
        .to.revertedWithCustomError(feeManagerFacet, 'ConfigExists')
        .withArgs(feeId);
      const feeConfig = await feeManagerFacet.getFeeConfig(feeId);
      expect(await feeManagerFacet.getFeeConfigIds()).to.deep.eq([feeId]);
      expect(feeConfig.fee).to.eq(100);
      expect(feeConfig.receiver).to.eq(feeReceiver);
      expect(feeConfig.ftype).to.eq(FeeType.Default);
      expect(feeConfig.currency).to.eq(FeeCurrency.Native);
    });

    it('should update config successfully', async () => {
      const { diamondAddress } = await deployFixture();
      const feeManagerFacet = await ethers.getContractAt('FeeManagerFacet', diamondAddress);
      await expect(feeManagerFacet.updateFeeConfig(feeConfigParamsUpdateFaulty)).to.revertedWithCustomError(
        feeManagerFacet,
        'ConfigNotExisting'
      );
      await (await feeManagerFacet.addChain(addChainParams)).wait();
      await (await feeManagerFacet.addFeeConfig(feeConfigParamsAdd)).wait();
      await expect(feeManagerFacet.updateFeeConfig(feeConfigParamsUpdateFaulty)).to.revertedWithCustomError(
        feeManagerFacet,
        'FeeZero'
      );
      await expect(feeManagerFacet.updateFeeConfig(feeConfigParamsUpdate)).to.emit(feeManagerFacet, 'FeeConfigUpdated');
      const feeConfig = await feeManagerFacet.getFeeConfig(feeId);
      expect(feeConfig.fee).to.eq(200);
      expect(feeConfig.receiver).to.eq(feeReceiverUpdate);
    });

    it('should remove config successfully', async () => {
      const { diamondAddress } = await deployFixture();
      const { deployer } = await getNamedAccounts();
      const feeManagerFacet = await ethers.getContractAt('FeeManagerFacet', diamondAddress);
      const removeFeeConfigParams: RemoveFeeConfigParamsStruct = { id: feeId };
      await expect(feeManagerFacet.removeFeeConfig(removeFeeConfigParams))
        .to.revertedWithCustomError(feeManagerFacet, 'ConfigNotExisting')
        .withArgs(feeId);
      await (await feeManagerFacet.addChain(addChainParams)).wait();
      await (await feeManagerFacet.addFeeConfig(feeConfigParamsAdd)).wait();
      await expect(feeManagerFacet.removeFeeConfig(removeFeeConfigParams))
        .to.emit(feeManagerFacet, 'FeeConfigRemoved')
        .withArgs(feeId, deployer);
      const feeConfig = await feeManagerFacet.getFeeConfig(feeId);
      expect(feeConfig.fee).to.eq(0);
      expect(feeConfig.ftype).to.eq(0);
      expect(feeConfig.currency).to.eq(0);
      expect(feeConfig.receiver).to.eq(ZeroAddress);
    });
  });

  describe('Chain Management', () => {
    it('should add a chain specific chain', async () => {
      const { diamondAddress } = await deployFixture();
      const feeManagerFacet = await ethers.getContractAt('FeeManagerFacet', diamondAddress);
      await expect(feeManagerFacet.addChain({ chainId: 0, target: ZeroAddress })).to.be.revertedWithCustomError(
        feeManagerFacet,
        'ChainIdZero'
      );
      await expect(
        feeManagerFacet.addChain({ chainId: feeChainId, target: ZeroAddress })
      ).to.be.revertedWithCustomError(feeManagerFacet, 'AddressZero');
      await expect(feeManagerFacet.addChain(addChainParams))
        .to.emit(feeManagerFacet, 'ChainAdded')
        .withArgs(feeChainId, chainTargetContract);
      await expect(feeManagerFacet.addChain(addChainParams))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ChainIdExists')
        .withArgs(feeChainId);
    });

    it('should remove an existing chain id', async () => {
      const { diamondAddress } = await deployFixture();
      const feeManagerFacet = await ethers.getContractAt('FeeManagerFacet', diamondAddress);
      await expect(feeManagerFacet.removeChain({ chainId: 0 }))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ChainIdNotExisting')
        .withArgs(0);
      await expect(feeManagerFacet.removeChain({ chainId: feeChainId }))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ChainIdNotExisting')
        .withArgs(feeChainId);
      await (await feeManagerFacet.addChain(addChainParams)).wait();
      await expect(feeManagerFacet.removeChain({ chainId: feeChainId }))
        .to.emit(feeManagerFacet, 'ChainRemoved')
        .withArgs(feeChainId);
      await expect(feeManagerFacet.removeChain({ chainId: 0 }))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ChainIdNotExisting')
        .withArgs(0);
    });
  });

  describe('FeeConfig & Chain Assignment', () => {
    it('assign config to chain', async () => {
      const { diamondAddress } = await deployFixture();
      const feeManagerFacet = await ethers.getContractAt('FeeManagerFacet', diamondAddress);
      await expect(feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ConfigNotExisting')
        .withArgs(feeId);
      await (await feeManagerFacet.addFeeConfig(feeConfigParamsAdd)).wait();
      await expect(feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ChainIdNotExisting')
        .withArgs(feeChainId);
      await (await feeManagerFacet.addChain(addChainParams)).wait();
      await expect(feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams))
        .to.emit(feeManagerFacet, 'ConfigAssignedToChain')
        .withArgs(feeId, feeChainId);
      await expect(feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ConfigAlreadyAssignedToChain')
        .withArgs(feeId, feeChainId);
    });

    it('unassign config from chain', async () => {
      const { diamondAddress } = await deployFixture();
      const feeManagerFacet = await ethers.getContractAt('FeeManagerFacet', diamondAddress);
      await expect(feeManagerFacet.unassignFeeConfigFromChain(unassignFeeConfigFromChainParams))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ConfigNotExisting')
        .withArgs(feeId);
      await (await feeManagerFacet.addFeeConfig(feeConfigParamsAdd)).wait();
      await expect(feeManagerFacet.unassignFeeConfigFromChain(unassignFeeConfigFromChainParams))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ChainIdNotExisting')
        .withArgs(feeChainId);
      await (await feeManagerFacet.addChain(addChainParams)).wait();
      await expect(feeManagerFacet.unassignFeeConfigFromChain(unassignFeeConfigFromChainParams))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ConfigNotAssignedToChain')
        .withArgs(feeId, feeChainId);
      await (await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams)).wait();
      await expect(feeManagerFacet.unassignFeeConfigFromChain(unassignFeeConfigFromChainParams))
        .to.emit(feeManagerFacet, 'ConfigUnassignedFromChain')
        .withArgs(feeId, feeChainId);
    });

    it('unassign config from all chains', async () => {
      const { diamondAddress } = await deployFixture();
      const feeManagerFacet = await ethers.getContractAt('FeeManagerFacet', diamondAddress);
      await expect(feeManagerFacet.unassignFeeConfigFromAllChains(unassignFeeConfigFromAllChainsParams))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ConfigNotExisting')
        .withArgs(feeId);
      await (await feeManagerFacet.addFeeConfig(feeConfigParamsAdd)).wait();
      await (await feeManagerFacet.addChain(addChainParams)).wait();
      await (await feeManagerFacet.addChain({ ...addChainParams, chainId: feeChainIdOther })).wait();
      await (await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams)).wait();
      await (
        await feeManagerFacet.assignFeeConfigToChain({ ...assignFeeConfigToChainParams, chainId: feeChainIdOther })
      ).wait();
      expect(await feeManagerFacet.getFeeConfigsByChain(feeChainId)).to.have.lengthOf(1);
      expect(await feeManagerFacet.getFeeConfigsByChain(feeChainIdOther)).to.have.lengthOf(1);
      await expect(feeManagerFacet.unassignFeeConfigFromAllChains(unassignFeeConfigFromAllChainsParams))
        .to.emit(feeManagerFacet, 'ConfigUnassignedFromAllChains')
        .withArgs(feeId);
      expect(await feeManagerFacet.getFeeConfigsByChain(feeChainId)).to.have.lengthOf(0);
      expect(await feeManagerFacet.getFeeConfigsByChain(feeChainIdOther)).to.have.lengthOf(0);
    });

    it('unassign config from all chains and reassign to one chain', async () => {
      const { diamondAddress } = await deployFixture();
      const feeManagerFacet = await ethers.getContractAt('FeeManagerFacet', diamondAddress);
      await (await feeManagerFacet.addFeeConfig(feeConfigParamsAdd)).wait();
      await (await feeManagerFacet.addChain(addChainParams)).wait();
      await (await feeManagerFacet.addChain({ ...addChainParams, chainId: feeChainIdOther })).wait();
      await (await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams)).wait();
      await (
        await feeManagerFacet.assignFeeConfigToChain({ ...assignFeeConfigToChainParams, chainId: feeChainIdOther })
      ).wait();
      expect(await feeManagerFacet.getFeeConfigsByChain(assignFeeConfigToChainParams.chainId)).to.have.lengthOf(1);
      expect(await feeManagerFacet.getFeeConfigsByChain(feeChainIdOther)).to.have.lengthOf(1);
      await (await feeManagerFacet.unassignFeeConfigFromAllChains(unassignFeeConfigFromAllChainsParams)).wait();
      expect(await feeManagerFacet.getFeeConfigsByChain(assignFeeConfigToChainParams.chainId)).to.have.lengthOf(0);
      expect(await feeManagerFacet.getFeeConfigsByChain(feeChainIdOther)).to.have.lengthOf(0);
      await (await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams)).wait();
      expect(await feeManagerFacet.getFeeConfigsByChain(assignFeeConfigToChainParams.chainId)).to.have.lengthOf(1);
      expect(await feeManagerFacet.getFeeConfigsByChain(feeChainIdOther)).to.have.lengthOf(0);
      await (await feeManagerFacet.unassignFeeConfigFromAllChains(unassignFeeConfigFromAllChainsParams)).wait();
      expect(await feeManagerFacet.getFeeConfigsByChain(assignFeeConfigToChainParams.chainId)).to.have.lengthOf(0);
      expect(await feeManagerFacet.getFeeConfigsByChain(feeChainIdOther)).to.have.lengthOf(0);
    });
  });

  describe('Queue Management', () => {
    let diamondAddress: string;
    let feeManagerFacet: FeeManagerFacet;
    let celerFeeHubFacet: CelerFeeHubFacet;
    let relayerCelerMock: RelayerCelerMock;

    this.beforeEach(async () => {
      const { deployer } = await getNamedAccounts();
      const { deploy } = deployments;
      const { diamondAddress: _diamondAddress } = await deployFixture();
      const { address: relayerCelerMockAddress } = await deploy('RelayerCelerMock', { from: deployer });
      const { facetContract } = await deployFacet('CelerFeeHubFacet', [relayerCelerMockAddress]);
      await addOrReplaceFacets([facetContract], _diamondAddress);
      diamondAddress = _diamondAddress;
      feeManagerFacet = await ethers.getContractAt('FeeManagerFacet', diamondAddress);
      celerFeeHubFacet = await ethers.getContractAt('CelerFeeHubFacet', diamondAddress);
      relayerCelerMock = await ethers.getContract('RelayerCelerMock');
    });

    it('should be able to clear the queue', async () => {
      await (await feeManagerFacet.addChain(addChainParams)).wait();
      await (await feeManagerFacet.addChain({ ...addChainParams, chainId: feeChainIdOther })).wait();
      await (await feeManagerFacet.addFeeConfig(feeConfigParamsAdd)).wait();
      await (await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams)).wait();
      await (
        await feeManagerFacet.assignFeeConfigToChain({ ...assignFeeConfigToChainParams, chainId: feeChainIdOther })
      ).wait();
      expect(await feeManagerFacet.getFeeSyncQueueByChain(feeChainId)).to.deep.eq([[feeId, feeChainId, 1]]);
      expect(await feeManagerFacet.getFeeSyncQueueByChain(feeChainIdOther)).to.deep.eq([[feeId, feeChainIdOther, 1]]);
      await expect(feeManagerFacet.clearQueue()).to.emit(feeManagerFacet, 'ClearQueue');
      expect(await feeManagerFacet.getFeeSyncQueueByChain(feeChainId)).to.deep.eq([]);
      expect(await feeManagerFacet.getFeeSyncQueueByChain(feeChainIdOther)).to.deep.eq([]);
    });

    it('should be able to queue up a fee config for a specific chain with a specific action manually', async () => {
      await expect(feeManagerFacet.queueUpManually([{ id: feeId, chainId: feeChainId, action: FeeSyncAction.Add }]))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ConfigNotExisting')
        .withArgs(feeId);

      await (await feeManagerFacet.addFeeConfig(feeConfigParamsAdd)).wait();

      await expect(feeManagerFacet.queueUpManually([{ id: feeId, chainId: feeChainId, action: FeeSyncAction.Add }]))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ChainIdNotExisting')
        .withArgs(feeChainId);

      await (await feeManagerFacet.addChain(addChainParams)).wait();
      await (await feeManagerFacet.addChain({ ...addChainParams, chainId: feeChainIdOther })).wait();
      await (await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams)).wait();
      await (
        await feeManagerFacet.assignFeeConfigToChain({ ...assignFeeConfigToChainParams, chainId: feeChainIdOther })
      ).wait();
      await (await feeManagerFacet.clearQueue()).wait();
      await expect(
        feeManagerFacet.queueUpManually([{ id: feeId, chainId: feeChainId, action: FeeSyncAction.Add }])
      ).to.emit(feeManagerFacet, 'ManuallyQueued');
    });

    it('should be able to queue up multiple fee configs for specific chains with specific actions manually', async () => {
      await (await feeManagerFacet.addChain(addChainParams)).wait();
      await (await feeManagerFacet.addChain({ ...addChainParams, chainId: feeChainIdOther })).wait();
      await (await feeManagerFacet.addFeeConfig(feeConfigParamsAdd)).wait();
      await (await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams)).wait();
      await (
        await feeManagerFacet.assignFeeConfigToChain({ ...assignFeeConfigToChainParams, chainId: feeChainIdOther })
      ).wait();
      await (await feeManagerFacet.clearQueue()).wait();
      await expect(
        feeManagerFacet.queueUpManually([
          { id: feeId, chainId: feeChainId, action: FeeSyncAction.Add },
          { id: feeId, chainId: feeChainIdOther, action: FeeSyncAction.Add },
        ])
      ).to.emit(feeManagerFacet, 'ManuallyQueued');
    });

    it('should have a sufficient deployment state', async () => {
      await (await celerFeeHubFacet.addRelayerForChain(ethers.Wallet.createRandom().address, feeChainId)).wait();
      await (await celerFeeHubFacet.addRelayerForChain(ethers.Wallet.createRandom().address, feeChainIdOther)).wait();
      await (await feeManagerFacet.addChain(addChainParams)).wait();
      await (await feeManagerFacet.addChain({ ...addChainParams, chainId: feeChainIdOther })).wait();
      await (await feeManagerFacet.addFeeConfig(feeConfigParamsAdd)).wait();
      expect(await feeManagerFacet.getFeeConfigDeployState(feeChainId, feeId)).to.eq(0);
      expect(await feeManagerFacet.getFeeConfigDeployState(feeChainIdOther, feeId)).to.eq(0);
      await (await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams)).wait();
      await (
        await feeManagerFacet.assignFeeConfigToChain({ ...assignFeeConfigToChainParams, chainId: feeChainIdOther })
      ).wait();
      expect(await feeManagerFacet.getFeeConfigDeployState(feeChainId, feeId)).to.eq(1);
      expect(await feeManagerFacet.getFeeConfigDeployState(feeChainIdOther, feeId)).to.eq(1);
      await (await celerFeeHubFacet.deployFeesWithCeler({ value: 300 })).wait();
      expect(await feeManagerFacet.getFeeConfigDeployState(feeChainId, feeId)).to.eq(2);
      expect(await feeManagerFacet.getFeeConfigDeployState(feeChainIdOther, feeId)).to.eq(2);
      await (
        await relayerCelerMock.fakeCelerFeeHubFacetDeployFeesWithCelerConfirm(
          diamondAddress,
          feeChainId,
          feeDeployerMessageAdd
        )
      ).wait();
      expect(await feeManagerFacet.getFeeConfigDeployState(feeChainId, feeId)).to.eq(3);
      expect(await feeManagerFacet.getFeeConfigDeployState(feeChainIdOther, feeId)).to.eq(2);
    });
  });

  describe('Use Cases', () => {
    describe('FeeConfig To Chain Assignment ', () => {
      it('add chain, add fee config, assign fee config to chain, fail on chain deletion attempt', async () => {
        const { diamondAddress } = await deployFixture();
        const feeManagerFacet = await ethers.getContractAt('FeeManagerFacet', diamondAddress);
        await (await feeManagerFacet.addChain(addChainParams)).wait();
        await (await feeManagerFacet.addFeeConfig(feeConfigParamsAdd)).wait();
        await (await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams)).wait();
        await expect(feeManagerFacet.removeChain({ chainId: feeChainId }))
          .to.be.revertedWithCustomError(feeManagerFacet, 'ConfigsAssignedToChain')
          .withArgs(feeChainId);
        await expect(feeManagerFacet.removeFeeConfig({ id: feeId }))
          .to.be.revertedWithCustomError(feeManagerFacet, 'ConfigInUse')
          .withArgs(feeId);
        await (await feeManagerFacet.unassignFeeConfigFromChain(unassignFeeConfigFromChainParams)).wait();
        await expect(feeManagerFacet.removeChain({ chainId: feeChainId }))
          .to.emit(feeManagerFacet, 'ChainRemoved')
          .withArgs(feeChainId);
      });

      it('Queue fee config updates when it is assigne to some chains', async () => {
        const { diamondAddress } = await deployFixture();
        const feeManagerFacet = await ethers.getContractAt('FeeManagerFacet', diamondAddress);
        expect(await feeManagerFacet.getDeployStatesForChain(feeChainId)).to.deep.eq([]);
        expect(await feeManagerFacet.getDeployStatesForChain(feeChainIdOther)).to.deep.eq([]);
        await (await feeManagerFacet.addChain(addChainParams)).wait();
        await (await feeManagerFacet.addChain({ ...addChainParams, chainId: feeChainIdOther })).wait();
        await (await feeManagerFacet.addFeeConfig(feeConfigParamsAdd)).wait();
        await (await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams)).wait();
        await (
          await feeManagerFacet.assignFeeConfigToChain({ ...assignFeeConfigToChainParams, chainId: feeChainIdOther })
        ).wait();
        await (await feeManagerFacet.updateFeeConfig(feeConfigParamsUpdate)).wait();
        expect(await feeManagerFacet.getFeeSyncQueueByChain(feeChainId)).to.deep.equal([
          [feeId, feeChainId, FeeSyncAction.Add],
        ]);
        expect(await feeManagerFacet.getFeeSyncQueueByChain(feeChainIdOther)).to.deep.equal([
          [feeId, feeChainIdOther, FeeSyncAction.Add],
        ]);
        expect(await feeManagerFacet.getFeeConfigDeployState(feeChainId, feeId)).to.eq(1);
        expect(await feeManagerFacet.getFeeConfigDeployState(feeChainIdOther, feeId)).to.eq(1);
        expect(await feeManagerFacet.getDeployStatesForChain(feeChainId)).to.deep.eq([[feeId, 1]]);
        expect(await feeManagerFacet.getDeployStatesForChain(feeChainIdOther)).to.deep.eq([[feeId, 1]]);
      });
    });
  });

  describe('FeeConfig Archive', () => {
    it('should provide an archived config', async () => {
      const { diamondAddress } = await deployFixture();
      const feeManagerFacet = await ethers.getContractAt('FeeManagerFacet', diamondAddress);
      await (await feeManagerFacet.addFeeConfig(feeConfigParamsAdd)).wait();
      await (await feeManagerFacet.updateFeeConfig(feeConfigParamsUpdate)).wait();
      expect([...(await feeManagerFacet.getArchivedFeeConfigs(feeConfigParamsAdd.id))]).to.have.deep.members([
        [100n, feeReceiver, 1n, 1n],
      ]);
    });
  });
});
