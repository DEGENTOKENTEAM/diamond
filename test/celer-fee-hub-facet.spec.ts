import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { BaseContract, ZeroAddress, parseEther } from 'ethers';
import { deployments, ethers, getNamedAccounts } from 'hardhat';
import { deployFacet } from '../scripts/helpers/deploy-diamond';
import { addFacets } from '../scripts/helpers/diamond';
import { RelayerCelerMock } from '../typechain-types';
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
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;
  await setBalance(deployer, parseEther('2'));
  const messageBusMock = await deploy('MessageBusMock', { from: deployer });
  const messageBus = await ethers.getContract('MessageBusMock');
  const { diamond, diamondAddress } = await deployDiamondFixture();
  const { facetContract } = await deployFacet('FeeManagerFacet');
  await addFacets([facetContract], diamondAddress);
  return {
    diamond,
    diamondAddress,
    messageBus,
    messageBusAddress: messageBusMock.address,
  };
};

describe('CelerFeeHubFacet', () => {
  it('should deploy successfully', async function () {
    const { diamondAddress } = await deployFixture();
    const { deployer } = await getNamedAccounts();
    const { deploy } = deployments;
    const diamond = await ethers.getContract('DegenX');
    const diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress);
    expect(await diamond.waitForDeployment()).to.be.instanceOf(BaseContract);
    expect((await diamondLoupeFacet.facets()).length).to.eq(3);
    const relayerCelerMock = await deploy('RelayerCelerMock', { from: deployer });
    const { facetContract: celerFeeHubFacet } = await deployFacet('CelerFeeHubFacet', [relayerCelerMock.address]);
    await addFacets([celerFeeHubFacet], diamondAddress);
    expect((await diamondLoupeFacet.facets()).length).to.eq(4);
  });

  describe('post-deployment', () => {
    let diamondAddress: string;
    beforeEach(async () => {
      const { diamondAddress: _diamondAddress } = await deployFixture();
      diamondAddress = _diamondAddress;
      const { deployer } = await getNamedAccounts();
      const { deploy } = deployments;
      const relayerCelerMock = await deploy('RelayerCelerMock', { from: deployer, skipIfAlreadyDeployed: true });
      const { facetContract } = await deployFacet('CelerFeeHubFacet', [relayerCelerMock.address]);
      await addFacets([facetContract], diamondAddress);
    });

    describe('Relayer For Chain Management', () => {
      it('should add relayer for chain', async () => {
        const celerFeeHubFacet = await ethers.getContractAt('CelerFeeHubFacet', diamondAddress);
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
        const celerFeeHubFacet = await ethers.getContractAt('CelerFeeHubFacet', diamondAddress);
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
        await (await celerFeeHubFacet.addRelayerForChain(relayerAddress, feeChainId)).wait();
        await expect(celerFeeHubFacet.updateRelayerOnChain(relayerAddress, feeChainId))
          .to.be.revertedWithCustomError(celerFeeHubFacet, 'RelayerExists')
          .withArgs(relayerAddress);
        await expect(celerFeeHubFacet.updateRelayerOnChain(relayerAddressUpdate, feeChainId))
          .to.emit(celerFeeHubFacet, 'RelayerForChainUpdated')
          .withArgs(relayerAddressUpdate, feeChainId);
      });

      it('should remove chain and its relayer', async () => {
        const celerFeeHubFacet = await ethers.getContractAt('CelerFeeHubFacet', diamondAddress);
        await expect(celerFeeHubFacet.removeRelayerOnChain(ZeroAddress))
          .to.be.revertedWithCustomError(celerFeeHubFacet, 'ChainNotExisting')
          .withArgs(ZeroAddress);
        await (await celerFeeHubFacet.addRelayerForChain(relayerAddress, feeChainId)).wait();
        await expect(celerFeeHubFacet.removeRelayerOnChain(feeChainId))
          .to.emit(celerFeeHubFacet, 'RelayerForChainRemoved')
          .withArgs(feeChainId);
      });
    });

    describe('Hub Functions', () => {
      describe('deployFeesWithCeler', () => {
        it('should execute deployFees on the Celer Relayer', async () => {
          const relayerCelerMock = (await ethers.getContract('RelayerCelerMock')) as RelayerCelerMock;
          const celerFeeHubFacet = await ethers.getContractAt('CelerFeeHubFacet', diamondAddress);

          await (await relayerCelerMock.setDeployFeesFeeCalcReturnValue(100)).wait();

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

          await (await celerFeeHubFacet.updateDeployFeesWei(parseEther('1'))).wait();

          await expect(celerFeeHubFacet.deployFeesWithCeler({ value: parseEther('1') })).to.be.revertedWithCustomError(
            celerFeeHubFacet,
            'NoChainsConfigured'
          );

          // >>> prepare fee manager
          const feeManagerFacet = await ethers.getContractAt('FeeManagerFacet', diamondAddress);
          await (await feeManagerFacet.addChain({ chainId: feeChainId, target: chainTargetContract })).wait();
          await (await feeManagerFacet.addChain({ chainId: feeChainIdOther, target: chainTargetContract })).wait();
          await (
            await feeManagerFacet.addFeeConfig({
              id: feeId,
              fee: feeValue,
              currency: FeeCurrency.Token,
              ftype: FeeType.Default,
              receiver: feeReceiver,
            })
          ).wait();
          // <<< prepare fee manager

          await expect(celerFeeHubFacet.deployFeesWithCeler({ value: parseEther('1') })).to.be.revertedWithCustomError(
            celerFeeHubFacet,
            'QueueEmpty'
          );

          // >>> prepare fee manager
          await (await feeManagerFacet.assignFeeConfigToChain({ chainId: feeChainId, id: feeId })).wait();
          await (await feeManagerFacet.assignFeeConfigToChain({ chainId: feeChainIdOther, id: feeId })).wait();
          // <<< prepare fee manager

          await expect(celerFeeHubFacet.deployFeesWithCeler({ value: parseEther('1') })).to.be.revertedWithCustomError(
            celerFeeHubFacet,
            'AddressZero'
          );

          // >>> prepare chain to relayer
          await (await celerFeeHubFacet.addRelayerForChain(relayerAddress, feeChainId)).wait();
          await (await celerFeeHubFacet.addRelayerForChain(relayerAddressOther, feeChainIdOther)).wait();
          // <<< prepare chain to relayer

          await (await celerFeeHubFacet.updateDeployFeesWei(0)).wait();

          await expect(celerFeeHubFacet.deployFeesWithCeler({ value: 1 })).to.be.revertedWithCustomError(
            celerFeeHubFacet,
            'InsufficientFundsForGas'
          );

          const tx = await celerFeeHubFacet.deployFeesWithCeler({ value: parseEther('1') });

          const [deployerSigner] = await ethers.getSigners();
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
          const relayerCelerMock = (await ethers.getContract('RelayerCelerMock')) as RelayerCelerMock;
          await (await relayerCelerMock.setDeployFeesFeeCalcReturnValue(100)).wait();
          // <<< prepare relayer

          // >>> prepare fee manager
          const feeManagerFacet = await ethers.getContractAt('FeeManagerFacet', diamondAddress);
          await (await feeManagerFacet.addChain({ chainId: feeChainId, target: chainTargetContract })).wait();
          await (await feeManagerFacet.addChain({ chainId: feeChainIdOther, target: chainTargetContract })).wait();
          await (
            await feeManagerFacet.addFeeConfig({
              id: feeId,
              fee: feeValue,
              currency: FeeCurrency.Token,
              ftype: FeeType.Default,
              receiver: feeReceiver,
            })
          ).wait();
          await (await feeManagerFacet.assignFeeConfigToChain({ chainId: feeChainId, id: feeId })).wait();
          await (await feeManagerFacet.assignFeeConfigToChain({ chainId: feeChainIdOther, id: feeId })).wait();
          // <<< prepare fee manager

          // >>> prepare fee hub
          const celerFeeHubFacet = await ethers.getContractAt('CelerFeeHubFacet', diamondAddress);
          await (await celerFeeHubFacet.addRelayerForChain(relayerAddress, feeChainId)).wait();
          await (await celerFeeHubFacet.addRelayerForChain(relayerAddressOther, feeChainIdOther)).wait();
          // <<< prepare fee hub

          expect(await feeManagerFacet.getFeeConfigDeployState(feeChainId, feeId)).to.eq(1);
          expect(await feeManagerFacet.getFeeConfigDeployState(feeChainIdOther, feeId)).to.eq(1);
          await (await celerFeeHubFacet.deployFeesWithCeler({ value: 200 })).wait();
          expect(await feeManagerFacet.getFeeConfigDeployState(feeChainId, feeId)).to.eq(2);
          expect(await feeManagerFacet.getFeeConfigDeployState(feeChainIdOther, feeId)).to.eq(2);

          await expect(
            celerFeeHubFacet.deployFeesWithCelerConfirm(feeChainId, feeDeployerMessageAdd)
          ).to.be.revertedWithCustomError(celerFeeHubFacet, 'NotAllowed');

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

      describe('sendFeesWithCeler', () => {
        it('should execute deployFees on the Celer Relayer', async () => {
          const [{ address: deployerAddress }, { address: bountyReceiver }] = await ethers.getSigners();

          const relayerCelerMock = (await ethers.getContract('RelayerCelerMock')) as RelayerCelerMock;
          const { facetContract: erc20FacetBaseContract } = await deployFacet('ERC20Facet');
          const { facetContract: feeStoreFacetBaseContract } = await deployFacet('FeeStoreFacetMock');
          await addFacets([erc20FacetBaseContract, feeStoreFacetBaseContract], diamondAddress);
          const feeStoreFacet = await ethers.getContractAt('FeeStoreFacetMock', diamondAddress);
          const erc20Facet = await ethers.getContractAt('ERC20Facet', diamondAddress);

          await (await feeStoreFacet.setIntermediateAsset(diamondAddress)).wait();

          await (await erc20Facet.initERC20Facet('Test', 'Test', 18)).wait();
          await (await erc20Facet.enable()).wait();

          const celerFeeHubFacet = await ethers.getContractAt('CelerFeeHubFacet', diamondAddress);
          await expect(celerFeeHubFacet.updateSendFeesThreshold(parseEther('1000')))
            .to.emit(celerFeeHubFacet, 'UpdateThreshold')
            .withArgs(parseEther('1000'));

          // prepare mock
          await (await erc20Facet.mint(diamondAddress, parseEther('6'))).wait();
          await (
            await feeStoreFacet.prepareToSendFeesSETUP(
              [parseEther('2'), parseEther('4')],
              [
                { id: feeId, fee: 10000, target: ZeroAddress, deleted: false },
                { id: feeIdOther, fee: 10000, target: ZeroAddress, deleted: false },
              ]
            )
          ).wait();

          await expect(celerFeeHubFacet.sendFeesWithCeler(12345, bountyReceiver)).to.be.revertedWithCustomError(
            celerFeeHubFacet,
            'ThresholdNotMet'
          );

          await (await celerFeeHubFacet.updateSendFeesThreshold(parseEther('0'))).wait();

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

          await (await celerFeeHubFacet.updateSendFeesWei(parseEther('1'))).wait();

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

          await expect(tx).to.changeEtherBalance(deployerAddress, -100);
        });

        it('should execute deployFees on the Celer Relayer with exact fees', async () => {
          const [{ address: deployerAddress }, { address: bountyReceiver }] = await ethers.getSigners();
          const { facetContract: erc20FacetBaseContract } = await deployFacet('ERC20Facet');
          const { facetContract: feeStoreFacetBaseContract } = await deployFacet('FeeStoreFacetMock');
          await addFacets([erc20FacetBaseContract, feeStoreFacetBaseContract], diamondAddress);
          const feeStoreFacet = await ethers.getContractAt('FeeStoreFacetMock', diamondAddress);
          const erc20Facet = await ethers.getContractAt('ERC20Facet', diamondAddress);

          await (await feeStoreFacet.setIntermediateAsset(diamondAddress)).wait();

          await (await erc20Facet.initERC20Facet('Test', 'Test', 18)).wait();
          await (await erc20Facet.enable()).wait();

          const celerFeeHubFacet = await ethers.getContractAt('CelerFeeHubFacet', diamondAddress);

          // prepare mock
          await (await erc20Facet.mint(diamondAddress, parseEther('6'))).wait();
          await (
            await feeStoreFacet.prepareToSendFeesSETUP(
              [parseEther('2'), parseEther('4')],
              [
                { id: feeId, fee: 10000, target: ZeroAddress, deleted: false },
                { id: feeIdOther, fee: 10000, target: ZeroAddress, deleted: false },
              ]
            )
          ).wait();

          await expect(
            await celerFeeHubFacet.sendFeesWithCeler(12345, bountyReceiver, { value: 100 })
          ).to.changeEtherBalance(deployerAddress, -100);
        });
      });
    });
  });
});
