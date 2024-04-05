import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { Contract, ZeroAddress, parseEther } from 'ethers';
import { deployments, ethers, getNamedAccounts, network } from 'hardhat';
import { deployFacet } from '../scripts/helpers/deploy-diamond';
import { addFacets, addOrReplaceFacets } from '../scripts/helpers/diamond';
import { CelerFeeHubFacet, Diamond, RelayerCelerMock } from '../typechain-types';
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
  feeId,
  feeIdOther,
  feeReceiver,
  feeReceiverUpdate,
  unassignFeeConfigFromAllChainsParams,
  unassignFeeConfigFromChainParams,
} from './utils/mocks';

const deployFixture = async () => {
  const { diamond, diamondAddress } = await deployDiamondFixture();

  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const deployerSigner = await ethers.getSigner(deployer);
  await setBalance(deployer, parseEther('2'));

  {
    const { address } = await deploy('FeeManagerFacet', { from: deployer });
    const facet = await ethers.getContractAt('FeeManagerFacet', address, deployerSigner);
    await addFacets([facet as unknown as Contract], diamondAddress, undefined, undefined, deployer);
  }

  const feeManagerFacet = await ethers.getContractAt('FeeManagerFacet', diamondAddress, deployerSigner);

  return {
    deployer,
    deployerSigner,
    diamond: diamond as Diamond,
    diamondAddress,
    feeManagerFacet,
  };
};

// @todo add Fee_Manager_Role check everywhere
describe('FeeManagerFacet', function () {
  let deployer: string;
  let deployerSigner: SignerWithAddress;
  let diamond: Diamond;
  let diamondAddress: string;
  let feeManagerFacet: FeeManagerFacet;
  let snapshotId: any;

  beforeEach(async function () {
    ({ deployer, deployerSigner, diamond, diamondAddress, feeManagerFacet } = await deployFixture());
    snapshotId = await network.provider.send('evm_snapshot');
  });

  afterEach(async function () {
    await network.provider.send('evm_revert', [snapshotId]);
  });

  it('should deploy successfully', async function () {
    const diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress);
    expect(await diamond.waitForDeployment()).to.be.instanceOf(Contract);
    expect((await diamondLoupeFacet.facets()).length).to.eq(3);
  });

  describe('FeeConfig', () => {
    it('should add config successfully', async () => {
      await expect(
        feeManagerFacet.addFeeConfig({
          ...feeConfigParamsAddFaulty,
        })
      ).to.revertedWithCustomError(feeManagerFacet, 'FeeZero');
      await feeManagerFacet.addChain(addChainParams);
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
      await expect(feeManagerFacet.updateFeeConfig(feeConfigParamsUpdateFaulty)).to.revertedWithCustomError(
        feeManagerFacet,
        'ConfigNotExisting'
      );
      await feeManagerFacet.addChain(addChainParams);
      await feeManagerFacet.addFeeConfig(feeConfigParamsAdd);
      await feeManagerFacet.addFeeConfig({ ...feeConfigParamsAdd, id: feeIdOther });
      await expect(feeManagerFacet.updateFeeConfig(feeConfigParamsUpdateFaulty)).to.revertedWithCustomError(
        feeManagerFacet,
        'FeeZero'
      );
      await expect(feeManagerFacet.updateFeeConfig(feeConfigParamsUpdate)).to.emit(feeManagerFacet, 'FeeConfigUpdated');
      const feeConfigA = await feeManagerFacet.getFeeConfig(feeId);
      expect(feeConfigA.fee).to.eq(200);
      expect(feeConfigA.receiver).to.eq(feeReceiverUpdate);

      const feeConfigB = await feeManagerFacet.getFeeConfig(feeIdOther);
      expect(feeConfigB.fee).to.eq(100);
      expect(feeConfigB.receiver).to.eq(feeReceiver);
    });

    it('should remove config successfully', async () => {
      const removeFeeConfigParams: RemoveFeeConfigParamsStruct = { id: feeId };
      await expect(feeManagerFacet.removeFeeConfig(removeFeeConfigParams))
        .to.revertedWithCustomError(feeManagerFacet, 'ConfigNotExisting')
        .withArgs(feeId);
      await feeManagerFacet.addChain(addChainParams);
      await feeManagerFacet.addFeeConfig(feeConfigParamsAdd);
      await feeManagerFacet.addFeeConfig({ ...feeConfigParamsAdd, id: feeIdOther });
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
      await expect(feeManagerFacet.removeChain({ chainId: 0 }))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ChainIdNotExisting')
        .withArgs(0);
      await expect(feeManagerFacet.removeChain({ chainId: feeChainId }))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ChainIdNotExisting')
        .withArgs(feeChainId);
      await feeManagerFacet.addChain(addChainParams);
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
      await expect(feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ConfigNotExisting')
        .withArgs(feeId);
      await feeManagerFacet.addFeeConfig(feeConfigParamsAdd);
      await expect(feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ChainIdNotExisting')
        .withArgs(feeChainId);
      await feeManagerFacet.addChain(addChainParams);
      await expect(feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams))
        .to.emit(feeManagerFacet, 'ConfigAssignedToChain')
        .withArgs(feeId, feeChainId);
      await expect(feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ConfigAlreadyAssignedToChain')
        .withArgs(feeId, feeChainId);
    });

    it('unassign config from chain', async () => {
      await expect(feeManagerFacet.unassignFeeConfigFromChain(unassignFeeConfigFromChainParams))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ConfigNotExisting')
        .withArgs(feeId);
      await feeManagerFacet.addFeeConfig(feeConfigParamsAdd);
      await feeManagerFacet.addFeeConfig({ ...feeConfigParamsAdd, id: feeIdOther });
      await expect(feeManagerFacet.unassignFeeConfigFromChain(unassignFeeConfigFromChainParams))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ChainIdNotExisting')
        .withArgs(feeChainId);
      await feeManagerFacet.addChain(addChainParams);
      await expect(feeManagerFacet.unassignFeeConfigFromChain(unassignFeeConfigFromChainParams))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ConfigNotAssignedToChain')
        .withArgs(feeId, feeChainId);
      await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams);
      await feeManagerFacet.assignFeeConfigToChain({ ...assignFeeConfigToChainParams, id: feeIdOther });
      await expect(feeManagerFacet.unassignFeeConfigFromChain(unassignFeeConfigFromChainParams))
        .to.emit(feeManagerFacet, 'ConfigUnassignedFromChain')
        .withArgs(feeId, feeChainId);
    });

    it('unassign config from all chains', async () => {
      await expect(feeManagerFacet.unassignFeeConfigFromAllChains(unassignFeeConfigFromAllChainsParams))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ConfigNotExisting')
        .withArgs(feeId);
      await feeManagerFacet.addFeeConfig(feeConfigParamsAdd);
      await feeManagerFacet.addChain(addChainParams);
      await feeManagerFacet.addChain({ ...addChainParams, chainId: feeChainIdOther });
      await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams);

      await feeManagerFacet.assignFeeConfigToChain({ ...assignFeeConfigToChainParams, chainId: feeChainIdOther });
      expect(await feeManagerFacet.getFeeConfigsByChain(feeChainId)).to.have.lengthOf(1);
      expect(await feeManagerFacet.getFeeConfigsByChain(feeChainIdOther)).to.have.lengthOf(1);
      await expect(feeManagerFacet.unassignFeeConfigFromAllChains(unassignFeeConfigFromAllChainsParams))
        .to.emit(feeManagerFacet, 'ConfigUnassignedFromAllChains')
        .withArgs(feeId);
      expect(await feeManagerFacet.getFeeConfigsByChain(feeChainId)).to.have.lengthOf(0);
      expect(await feeManagerFacet.getFeeConfigsByChain(feeChainIdOther)).to.have.lengthOf(0);
    });

    it('unassign config from all chains and reassign to one chain', async () => {
      await feeManagerFacet.addFeeConfig(feeConfigParamsAdd);
      await feeManagerFacet.addChain(addChainParams);
      await feeManagerFacet.addChain({ ...addChainParams, chainId: feeChainIdOther });
      await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams);

      await feeManagerFacet.assignFeeConfigToChain({ ...assignFeeConfigToChainParams, chainId: feeChainIdOther });
      expect(await feeManagerFacet.getFeeConfigsByChain(assignFeeConfigToChainParams.chainId)).to.have.lengthOf(1);
      expect(await feeManagerFacet.getFeeConfigsByChain(feeChainIdOther)).to.have.lengthOf(1);
      await feeManagerFacet.unassignFeeConfigFromAllChains(unassignFeeConfigFromAllChainsParams);
      expect(await feeManagerFacet.getFeeConfigsByChain(assignFeeConfigToChainParams.chainId)).to.have.lengthOf(0);
      expect(await feeManagerFacet.getFeeConfigsByChain(feeChainIdOther)).to.have.lengthOf(0);
      await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams);
      expect(await feeManagerFacet.getFeeConfigsByChain(assignFeeConfigToChainParams.chainId)).to.have.lengthOf(1);
      expect(await feeManagerFacet.getFeeConfigsByChain(feeChainIdOther)).to.have.lengthOf(0);
      await feeManagerFacet.unassignFeeConfigFromAllChains(unassignFeeConfigFromAllChainsParams);
      expect(await feeManagerFacet.getFeeConfigsByChain(assignFeeConfigToChainParams.chainId)).to.have.lengthOf(0);
      expect(await feeManagerFacet.getFeeConfigsByChain(feeChainIdOther)).to.have.lengthOf(0);
    });
  });

  describe('Queue Management', () => {
    let celerFeeHubFacet: CelerFeeHubFacet;
    let relayerCelerMock: RelayerCelerMock;

    beforeEach(async () => {
      const { address } = await deployments.deploy('RelayerCelerMock', { from: deployer });
      const { facetContract } = await deployFacet('CelerFeeHubFacet', [address]);
      await addOrReplaceFacets([facetContract], diamondAddress, undefined, undefined, deployer);
      celerFeeHubFacet = await ethers.getContractAt('CelerFeeHubFacet', diamondAddress, deployerSigner);
      relayerCelerMock = await ethers.getContract('RelayerCelerMock', deployerSigner);
    });

    it('should be able to clear the queue', async () => {
      await feeManagerFacet.addChain(addChainParams);
      await feeManagerFacet.addChain({ ...addChainParams, chainId: feeChainIdOther });
      await feeManagerFacet.addFeeConfig(feeConfigParamsAdd);
      await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams);

      await feeManagerFacet.assignFeeConfigToChain({ ...assignFeeConfigToChainParams, chainId: feeChainIdOther });
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

      await feeManagerFacet.addFeeConfig(feeConfigParamsAdd);

      await expect(feeManagerFacet.queueUpManually([{ id: feeId, chainId: feeChainId, action: FeeSyncAction.Add }]))
        .to.be.revertedWithCustomError(feeManagerFacet, 'ChainIdNotExisting')
        .withArgs(feeChainId);

      await feeManagerFacet.addChain(addChainParams);
      await feeManagerFacet.addChain({ ...addChainParams, chainId: feeChainIdOther });
      await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams);

      await feeManagerFacet.assignFeeConfigToChain({ ...assignFeeConfigToChainParams, chainId: feeChainIdOther });
      await feeManagerFacet.clearQueue();
      await expect(
        feeManagerFacet.queueUpManually([{ id: feeId, chainId: feeChainId, action: FeeSyncAction.Add }])
      ).to.emit(feeManagerFacet, 'ManuallyQueued');
    });

    it('should be able to queue up multiple fee configs for specific chains with specific actions manually', async () => {
      await feeManagerFacet.addChain(addChainParams);
      await feeManagerFacet.addChain({ ...addChainParams, chainId: feeChainIdOther });
      await feeManagerFacet.addFeeConfig(feeConfigParamsAdd);
      await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams);

      await feeManagerFacet.assignFeeConfigToChain({ ...assignFeeConfigToChainParams, chainId: feeChainIdOther });
      await feeManagerFacet.clearQueue();
      await expect(
        feeManagerFacet.queueUpManually([
          { id: feeId, chainId: feeChainId, action: FeeSyncAction.Add },
          { id: feeId, chainId: feeChainIdOther, action: FeeSyncAction.Add },
        ])
      ).to.emit(feeManagerFacet, 'ManuallyQueued');
    });

    it('should have a sufficient deployment state', async () => {
      await celerFeeHubFacet.addRelayerForChain(ethers.Wallet.createRandom().address, feeChainId);
      await celerFeeHubFacet.addRelayerForChain(ethers.Wallet.createRandom().address, feeChainIdOther);
      await feeManagerFacet.addChain(addChainParams);
      await feeManagerFacet.addChain({ ...addChainParams, chainId: feeChainIdOther });
      await feeManagerFacet.addFeeConfig(feeConfigParamsAdd);
      expect(await feeManagerFacet.getFeeConfigDeployState(feeChainId, feeId)).to.eq(0);
      expect(await feeManagerFacet.getFeeConfigDeployState(feeChainIdOther, feeId)).to.eq(0);
      await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams);

      await feeManagerFacet.assignFeeConfigToChain({ ...assignFeeConfigToChainParams, chainId: feeChainIdOther });
      expect(await feeManagerFacet.getFeeConfigDeployState(feeChainId, feeId)).to.eq(1);
      expect(await feeManagerFacet.getFeeConfigDeployState(feeChainIdOther, feeId)).to.eq(1);
      await celerFeeHubFacet.deployFeesWithCeler({ value: 300 });
      expect(await feeManagerFacet.getFeeConfigDeployState(feeChainId, feeId)).to.eq(2);
      expect(await feeManagerFacet.getFeeConfigDeployState(feeChainIdOther, feeId)).to.eq(2);

      await relayerCelerMock.fakeCelerFeeHubFacetDeployFeesWithCelerConfirm(
        diamondAddress,
        feeChainId,
        feeDeployerMessageAdd
      );
      expect(await feeManagerFacet.getFeeConfigDeployState(feeChainId, feeId)).to.eq(3);
      expect(await feeManagerFacet.getFeeConfigDeployState(feeChainIdOther, feeId)).to.eq(2);
    });
  });

  describe('Use Cases', () => {
    describe('FeeConfig To Chain Assignment ', () => {
      it('add chain, add fee config, assign fee config to chain, fail on chain deletion attempt', async () => {
        await feeManagerFacet.addChain(addChainParams);
        await feeManagerFacet.addFeeConfig(feeConfigParamsAdd);
        await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams);
        await expect(feeManagerFacet.removeChain({ chainId: feeChainId }))
          .to.be.revertedWithCustomError(feeManagerFacet, 'ConfigsAssignedToChain')
          .withArgs(feeChainId);
        await expect(feeManagerFacet.removeFeeConfig({ id: feeId }))
          .to.be.revertedWithCustomError(feeManagerFacet, 'ConfigInUse')
          .withArgs(feeId);
        await feeManagerFacet.unassignFeeConfigFromChain(unassignFeeConfigFromChainParams);
        await expect(feeManagerFacet.removeChain({ chainId: feeChainId }))
          .to.emit(feeManagerFacet, 'ChainRemoved')
          .withArgs(feeChainId);
      });

      it('Queue fee config updates when it is assigne to some chains', async () => {
        expect(await feeManagerFacet.getDeployStatesForChain(feeChainId)).to.deep.eq([]);
        expect(await feeManagerFacet.getDeployStatesForChain(feeChainIdOther)).to.deep.eq([]);
        await feeManagerFacet.addChain(addChainParams);
        await feeManagerFacet.addChain({ ...addChainParams, chainId: feeChainIdOther });
        await feeManagerFacet.addFeeConfig(feeConfigParamsAdd);
        await feeManagerFacet.assignFeeConfigToChain(assignFeeConfigToChainParams);

        await feeManagerFacet.assignFeeConfigToChain({ ...assignFeeConfigToChainParams, chainId: feeChainIdOther });
        await feeManagerFacet.updateFeeConfig(feeConfigParamsUpdate);
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
      await feeManagerFacet.addFeeConfig(feeConfigParamsAdd);
      await feeManagerFacet.updateFeeConfig(feeConfigParamsUpdate);
      expect([...(await feeManagerFacet.getArchivedFeeConfigs(feeConfigParamsAdd.id))]).to.have.deep.members([
        [100n, feeReceiver, 1n, 1n],
      ]);
    });
  });
});
