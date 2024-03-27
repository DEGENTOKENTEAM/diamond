import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { Contract, ZeroAddress, parseEther } from 'ethers';
import { deployments, ethers, getNamedAccounts, network } from 'hardhat';
import { deployFacet } from '../scripts/helpers/deploy-diamond';
import { addFacets } from '../scripts/helpers/diamond';
import {
  CelerFeeHubFacet,
  FeeManagerFacet,
  MessageBusMock,
  MinterBurnerMock,
  RelayerCelerMock,
} from '../typechain-types';
import { FeeCurrency, FeeType } from './utils/enums';
import { deployFixture as deployDiamondFixture } from './utils/helper';
import {
  chainTargetContract,
  feeChainId,
  feeChainIdOther,
  feeDeployerMessageAdd,
  feeId,
  feeIdOther,
  feeReceiver,
  feeValue,
  relayerAddress,
  relayerAddressOther,
  relayerAddressUpdate,
  sendFeesMessageCustom,
} from './utils/mocks';

const deployFixture = async () => {
  const { diamond, diamondAddress } = await deployDiamondFixture();
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const deployerSigner = await ethers.getSigner(deployer);
  await setBalance(deployer, parseEther('2'));

  let messageBus: MessageBusMock;
  let feeManagerFacet: FeeManagerFacet;
  let celerFeeHubFacet: CelerFeeHubFacet;
  let relayerCelerMock: RelayerCelerMock;

  {
    const { address } = await deploy('MessageBusMock', { from: deployer });
    messageBus = await ethers.getContractAt('MessageBusMock', address, deployerSigner);
  }

  {
    const { facetContract } = await deployFacet('FeeManagerFacet');
    await addFacets([facetContract], diamondAddress, undefined, undefined, deployer);
    feeManagerFacet = await ethers.getContractAt('FeeManagerFacet', diamondAddress, deployerSigner);
  }

  {
    const { address } = await deploy('RelayerCelerMock', { from: deployer });
    relayerCelerMock = await ethers.getContractAt('RelayerCelerMock', address, deployerSigner);

    const { facetContract } = await deployFacet('CelerFeeHubFacet', [await relayerCelerMock.getAddress()]);
    await addFacets([facetContract], diamondAddress, undefined, undefined, deployer);
    celerFeeHubFacet = await ethers.getContractAt('CelerFeeHubFacet', diamondAddress, deployerSigner);
  }

  return {
    diamond,
    diamondAddress,
    deployer,
    deployerSigner,
    messageBus,
    messageBusAddress: await messageBus.getAddress(),
    feeManagerFacet,
    feeManagerFacetAddress: await feeManagerFacet.getAddress(),
    celerFeeHubFacet,
    celerFeeHubFacetAddress: await celerFeeHubFacet.getAddress(),
    relayerCelerMock,
    relayerCelerMockAddress: await relayerCelerMock.getAddress(),
  };
};

describe('CelerFeeHubFacet', () => {
  let diamond: Contract;
  let diamondAddress: string;
  let deployer: string;
  let deployerSigner: SignerWithAddress;
  let messageBus: MessageBusMock;
  let messageBusAddress: string;
  let feeManagerFacet: FeeManagerFacet;
  let feeManagerFacetAddress: string;
  let celerFeeHubFacet: CelerFeeHubFacet;
  let celerFeeHubFacetAddress: string;
  let relayerCelerMock: RelayerCelerMock;
  let relayerCelerMockAddress: string;

  let snapshotId: any;

  beforeEach(async () => {
    ({
      diamond,
      diamondAddress,
      deployer,
      deployerSigner,
      messageBus,
      messageBusAddress,
      feeManagerFacet,
      feeManagerFacetAddress,
      celerFeeHubFacet,
      celerFeeHubFacetAddress,
      relayerCelerMock,
      relayerCelerMockAddress,
    } = await deployFixture());

    snapshotId = await network.provider.send('evm_snapshot');
  });

  afterEach(async function () {
    await network.provider.send('evm_revert', [snapshotId]);
  });

  it('should deploy successfully', async function () {
    const diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress, deployerSigner);
    expect((await diamondLoupeFacet.facets()).length).to.eq(4);
  });

  describe('post-deployment', () => {
    describe('Relayer For Chain Management', () => {
      it('should add relayer for chain', async () => {
        await expect(celerFeeHubFacet.addRelayerForChain(ZeroAddress, 0)).to.be.revertedWithCustomError(
          celerFeeHubFacet,
          'AddressZero'
        );
        await expect(celerFeeHubFacet.addRelayerForChain(relayerAddress, 0)).to.be.revertedWithCustomError(
          celerFeeHubFacet,
          'ZeroValueNotAllowed'
        );
        await expect(celerFeeHubFacet.addRelayerForChain(relayerAddress, feeChainId))
          .to.emit(celerFeeHubFacet, 'RelayerForChainAdded')
          .withArgs(relayerAddress, feeChainId);
        await expect(celerFeeHubFacet.addRelayerForChain(relayerAddress, feeChainId))
          .to.be.revertedWithCustomError(celerFeeHubFacet, 'ChainExisting')
          .withArgs(feeChainId);
      });

      it('should update relayer for chain', async () => {
        await expect(celerFeeHubFacet.updateRelayerOnChain(ZeroAddress, 0)).to.be.revertedWithCustomError(
          celerFeeHubFacet,
          'AddressZero'
        );
        await expect(celerFeeHubFacet.updateRelayerOnChain(relayerAddress, 0)).to.be.revertedWithCustomError(
          celerFeeHubFacet,
          'ZeroValueNotAllowed'
        );
        await expect(celerFeeHubFacet.updateRelayerOnChain(relayerAddress, feeChainId))
          .to.be.revertedWithCustomError(celerFeeHubFacet, 'ChainNotExisting')
          .withArgs(feeChainId);

        await celerFeeHubFacet.addRelayerForChain(relayerAddress, feeChainId);
        await expect(celerFeeHubFacet.updateRelayerOnChain(relayerAddress, feeChainId))
          .to.be.revertedWithCustomError(celerFeeHubFacet, 'RelayerExists')
          .withArgs(relayerAddress);
        await expect(celerFeeHubFacet.updateRelayerOnChain(relayerAddressUpdate, feeChainId))
          .to.emit(celerFeeHubFacet, 'RelayerForChainUpdated')
          .withArgs(relayerAddressUpdate, feeChainId);
      });

      it('should remove chain and its relayer', async () => {
        await expect(celerFeeHubFacet.removeRelayerOnChain(ZeroAddress))
          .to.be.revertedWithCustomError(celerFeeHubFacet, 'ChainNotExisting')
          .withArgs(ZeroAddress);
        await celerFeeHubFacet.addRelayerForChain(relayerAddress, feeChainId);
        await expect(celerFeeHubFacet.removeRelayerOnChain(feeChainId))
          .to.emit(celerFeeHubFacet, 'RelayerForChainRemoved')
          .withArgs(feeChainId);
      });
    });

    describe('Hub Functions', () => {
      describe('deployFeesWithCeler', () => {
        it('should execute deployFees on the Celer Relayer', async () => {
          await relayerCelerMock.setDeployFeesFeeCalcReturnValue(100);

          await expect(celerFeeHubFacet.deployFeesWithCeler()).to.be.revertedWithCustomError(
            celerFeeHubFacet,
            'InsufficientFundsSent'
          );

          await expect(celerFeeHubFacet.updateDeployFeesWei(parseEther('2')))
            .to.emit(celerFeeHubFacet, 'UpdateDeployFeesWei')
            .withArgs(parseEther('2'));

          expect(await celerFeeHubFacet.celerFeeHubDeployFeesWei()).to.eq(parseEther('2'));

          await expect(celerFeeHubFacet.deployFeesWithCeler({ value: parseEther('1') })).to.be.revertedWithCustomError(
            celerFeeHubFacet,
            'InsufficientFundsSent'
          );

          await celerFeeHubFacet.updateDeployFeesWei(parseEther('1'));

          await expect(celerFeeHubFacet.deployFeesWithCeler({ value: parseEther('1') })).to.be.revertedWithCustomError(
            celerFeeHubFacet,
            'NoChainsConfigured'
          );

          // >>> prepare fee manager
          await feeManagerFacet.addChain({ chainId: feeChainId, target: chainTargetContract });
          await feeManagerFacet.addChain({ chainId: feeChainIdOther, target: chainTargetContract });
          await feeManagerFacet.addFeeConfig({
            id: feeId,
            fee: feeValue,
            currency: FeeCurrency.Token,
            ftype: FeeType.Default,
            receiver: feeReceiver,
          });
          // <<< prepare fee manager

          await expect(celerFeeHubFacet.deployFeesWithCeler({ value: parseEther('1') })).to.be.revertedWithCustomError(
            celerFeeHubFacet,
            'QueueEmpty'
          );

          // >>> prepare fee manager
          await feeManagerFacet.assignFeeConfigToChain({ chainId: feeChainId, id: feeId });
          await feeManagerFacet.assignFeeConfigToChain({ chainId: feeChainIdOther, id: feeId });
          // <<< prepare fee manager

          await expect(celerFeeHubFacet.deployFeesWithCeler({ value: parseEther('1') })).to.be.revertedWithCustomError(
            celerFeeHubFacet,
            'AddressZero'
          );

          // >>> prepare chain to relayer
          await celerFeeHubFacet.addRelayerForChain(relayerAddress, feeChainId);
          await celerFeeHubFacet.addRelayerForChain(relayerAddressOther, feeChainIdOther);
          // <<< prepare chain to relayer

          await celerFeeHubFacet.updateDeployFeesWei(0);

          await expect(celerFeeHubFacet.deployFeesWithCeler({ value: 1 })).to.be.revertedWithCustomError(
            celerFeeHubFacet,
            'InsufficientFundsForGas'
          );

          const tx = await celerFeeHubFacet.deployFeesWithCeler({ value: parseEther('1') });
          await expect(tx).to.changeEtherBalance(deployerSigner, -200);
          await expect(tx)
            .to.emit(relayerCelerMock, 'deployFeesEvent')
            .withArgs(relayerAddress, chainTargetContract, feeChainId, feeDeployerMessageAdd)
            .to.emit(relayerCelerMock, 'deployFeesEvent')
            .withArgs(relayerAddressOther, chainTargetContract, feeChainIdOther, feeDeployerMessageAdd);
        });
      });

      describe('deployFeesWithCelerConfirm', () => {
        it('should receive an execution from the Celer Relayer to set the deployed state to a chain <> fee config relation', async () => {
          // >>> prepare relayer
          await relayerCelerMock.setDeployFeesFeeCalcReturnValue(100);
          // <<< prepare relayer

          // >>> prepare fee manager
          await feeManagerFacet.addChain({ chainId: feeChainId, target: chainTargetContract });
          await feeManagerFacet.addChain({ chainId: feeChainIdOther, target: chainTargetContract });
          await feeManagerFacet.addFeeConfig({
            id: feeId,
            fee: feeValue,
            currency: FeeCurrency.Token,
            ftype: FeeType.Default,
            receiver: feeReceiver,
          });
          await feeManagerFacet.assignFeeConfigToChain({ chainId: feeChainId, id: feeId });
          await feeManagerFacet.assignFeeConfigToChain({ chainId: feeChainIdOther, id: feeId });
          // <<< prepare fee manager

          // >>> prepare fee hub
          await celerFeeHubFacet.addRelayerForChain(relayerAddress, feeChainId);
          await celerFeeHubFacet.addRelayerForChain(relayerAddressOther, feeChainIdOther);
          // <<< prepare fee hub

          expect(await feeManagerFacet.getFeeConfigDeployState(feeChainId, feeId)).to.eq(1);
          expect(await feeManagerFacet.getFeeConfigDeployState(feeChainIdOther, feeId)).to.eq(1);

          await celerFeeHubFacet.deployFeesWithCeler({ value: 200 });
          expect(await feeManagerFacet.getFeeConfigDeployState(feeChainId, feeId)).to.eq(2);
          expect(await feeManagerFacet.getFeeConfigDeployState(feeChainIdOther, feeId)).to.eq(2);

          await expect(
            celerFeeHubFacet.deployFeesWithCelerConfirm(feeChainId, feeDeployerMessageAdd)
          ).to.be.revertedWithCustomError(celerFeeHubFacet, 'NotAllowed');

          await relayerCelerMock.fakeCelerFeeHubFacetDeployFeesWithCelerConfirm(
            diamondAddress,
            feeChainId,
            feeDeployerMessageAdd
          );

          expect(await feeManagerFacet.getFeeConfigDeployState(feeChainId, feeId)).to.eq(3);
          expect(await feeManagerFacet.getFeeConfigDeployState(feeChainIdOther, feeId)).to.eq(2);
        });
      });

      describe('sendFeesWithCeler', () => {
        let minter: MinterBurnerMock;
        let bountyReceiver: string;

        beforeEach(async () => {
          [, { address: bountyReceiver }] = await ethers.getSigners();
          const { address } = await deployments.deploy('MinterBurnerMock', { from: deployer });
          minter = await ethers.getContractAt('MinterBurnerMock', address, deployerSigner);
        });

        it('should execute deployFees on the Celer Relayer', async () => {
          const { facetContract: erc20FacetBaseContract } = await deployFacet('ERC20Facet');
          const { facetContract: feeStoreFacetBaseContract } = await deployFacet('FeeStoreFacetMock');
          await addFacets(
            [erc20FacetBaseContract, feeStoreFacetBaseContract],
            diamondAddress,
            undefined,
            undefined,
            deployer
          );
          const feeStoreFacet = await ethers.getContractAt('FeeStoreFacetMock', diamondAddress, deployerSigner);
          const erc20Facet = await ethers.getContractAt('ERC20Facet', diamondAddress, deployerSigner);

          await feeStoreFacet.setIntermediateAsset(diamondAddress);

          await erc20Facet.initERC20Facet('Test', 'Test', 18);
          await erc20Facet.enable();

          const celerFeeHubFacet = await ethers.getContractAt('CelerFeeHubFacet', diamondAddress, deployerSigner);
          await expect(celerFeeHubFacet.updateSendFeesThreshold(parseEther('1000')))
            .to.emit(celerFeeHubFacet, 'UpdateThreshold')
            .withArgs(parseEther('1000'));

          // prepare mock
          await erc20Facet.updateBridgeSupplyCap(await minter.getAddress(), parseEther('6'));
          await minter.mint(diamondAddress, diamondAddress, parseEther('6'));

          await feeStoreFacet.prepareToSendFeesSETUP(
            [parseEther('2'), parseEther('4')],
            [
              { id: feeId, fee: 10000, target: ZeroAddress, deleted: false },
              { id: feeIdOther, fee: 10000, target: ZeroAddress, deleted: false },
            ]
          );

          await expect(celerFeeHubFacet.sendFeesWithCeler(12345, bountyReceiver)).to.be.revertedWithCustomError(
            celerFeeHubFacet,
            'ThresholdNotMet'
          );

          await celerFeeHubFacet.updateSendFeesThreshold(parseEther('0'));

          await expect(celerFeeHubFacet.sendFeesWithCeler(12345, bountyReceiver)).to.be.revertedWithCustomError(
            celerFeeHubFacet,
            'InsufficientFundsSent'
          );

          await expect(celerFeeHubFacet.updateSendFeesWei(parseEther('2')))
            .to.emit(celerFeeHubFacet, 'UpdateSendFeesWei')
            .withArgs(parseEther('2'));

          expect(await celerFeeHubFacet.celerFeeHubSendFeesWei()).to.eq(parseEther('2'));

          await expect(celerFeeHubFacet.sendFeesWithCeler(12345, bountyReceiver)).to.be.revertedWithCustomError(
            celerFeeHubFacet,
            'InsufficientFundsSent'
          );

          await celerFeeHubFacet.updateSendFeesWei(parseEther('1'));

          const tx = await celerFeeHubFacet.sendFeesWithCeler(12345, bountyReceiver, { value: parseEther('1') });
          await expect(tx)
            .to.emit(celerFeeHubFacet, 'FeesSent')
            .to.emit(relayerCelerMock, 'sendFeesEvent')
            .withArgs(
              diamondAddress,
              parseEther('6'),
              12345,
              sendFeesMessageCustom(parseEther('6'), bountyReceiver, [
                { id: feeId, amount: parseEther('2') },
                { id: feeIdOther, amount: parseEther('4') },
              ])
            );

          await expect(tx).to.changeEtherBalance(deployer, -100);
        });

        it('should execute deployFees on the Celer Relayer with exact fees', async () => {
          const { facetContract: erc20FacetBaseContract } = await deployFacet('ERC20Facet');
          const { facetContract: feeStoreFacetBaseContract } = await deployFacet('FeeStoreFacetMock');
          await addFacets(
            [erc20FacetBaseContract, feeStoreFacetBaseContract],
            diamondAddress,
            undefined,
            undefined,
            deployer
          );
          const feeStoreFacet = await ethers.getContractAt('FeeStoreFacetMock', diamondAddress, deployerSigner);
          const erc20Facet = await ethers.getContractAt('ERC20Facet', diamondAddress, deployerSigner);

          await feeStoreFacet.setIntermediateAsset(diamondAddress);

          await erc20Facet.initERC20Facet('Test', 'Test', 18);
          await erc20Facet.enable();

          const celerFeeHubFacet = await ethers.getContractAt('CelerFeeHubFacet', diamondAddress, deployerSigner);

          // prepare mock
          await erc20Facet.updateBridgeSupplyCap(await minter.getAddress(), parseEther('6'));
          await minter.mint(diamondAddress, diamondAddress, parseEther('6'));

          await feeStoreFacet.prepareToSendFeesSETUP(
            [parseEther('2'), parseEther('4')],
            [
              { id: feeId, fee: 10000, target: ZeroAddress, deleted: false },
              { id: feeIdOther, fee: 10000, target: ZeroAddress, deleted: false },
            ]
          );

          await expect(
            await celerFeeHubFacet.sendFeesWithCeler(12345, bountyReceiver, { value: 100 })
          ).to.changeEtherBalance(deployer, -100);
        });
      });
    });
  });
});
