import { expect } from 'chai';
import { ZeroAddress, ZeroHash, parseEther } from 'ethers';
import { deployments, ethers, getNamedAccounts, network } from 'hardhat';
import { deployFacet } from '../scripts/helpers/deploy-diamond';
import { addFacets, addOrReplaceFacets } from '../scripts/helpers/diamond';
import { CelerFeeHubFacetMock, ERC20Mock, MessageBusMock } from '../typechain-types';
import { deployFixture as deployDiamondFixture } from './utils/helper';
import {
  FEE_STORE_MANAGER_ROLE,
  chainTargetContract,
  deployFeesConfirmMessageRelayer,
  deployFeesMessageRelayer,
  erc20TransferError,
  executeMessageNotExistingFunctionSelector,
  feeChainId,
  feeDeployerMessageAdd,
  feeId,
  nativeAddress,
  relayerAddress,
  sendFeesMessage,
  sendFeesMessageRelayer,
} from './utils/mocks';
import { ZERO_ADDR } from '../providers/celer-contracts/test/lib/constants';
import { setBalance } from '@nomicfoundation/hardhat-network-helpers';

const deployFixture = async () => {
  const { diamond, diamondAddress } = await deployDiamondFixture();
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;

  const { facetContract: facetAContract } = await deployFacet('FeeStoreFacet');
  const { facetContract: facetBContract } = await deployFacet('AccessControlEnumerableFacet');
  await addFacets([facetAContract, facetBContract], diamondAddress);

  const messageBusMock = await deploy('MessageBusMock', { from: deployer });
  const celerFeeHubFacetMock = await deploy('CelerFeeHubFacetMock', { from: deployer });
  const erc20Mock = await deploy('ERC20Mock', { from: deployer });

  const relayerCelerHome = await deploy('RelayerCeler', {
    from: deployer,
    args: [diamondAddress, deployer, deployer, messageBusMock.address, 43113, true],
  });
  const relayerCelerTarget = await deploy('RelayerCelerTargetMock', {
    from: deployer,
    args: [diamondAddress, deployer, deployer, messageBusMock.address, 43113, false],
  });
  const relayerCelerHomeFakeMessageBus = await deploy('RelayerCeler', {
    from: deployer,
    args: [diamondAddress, deployer, deployer, deployer, 43113, true],
  });
  const relayerCelerTargetFakeMessageBus = await deploy('RelayerCelerTargetMock', {
    from: deployer,
    args: [diamondAddress, deployer, deployer, deployer, 43113, false],
  });

  return {
    diamond,
    diamondAddress,
    erc20: (await ethers.getContract('ERC20Mock')) as ERC20Mock,
    erc20Address: erc20Mock.address,
    messageBus: (await ethers.getContract('MessageBusMock')) as MessageBusMock,
    messageBusAddress: messageBusMock.address,
    celerFeeHubFacetMock: (await ethers.getContract('CelerFeeHubFacetMock')) as CelerFeeHubFacetMock,
    celerFeeHubFacetMockAddress: celerFeeHubFacetMock.address,
    relayerCelerHome: await ethers.getContractAt('RelayerCeler', relayerCelerHome.address),
    relayerCelerHomeAddress: relayerCelerHome.address,
    relayerCelerTarget: await ethers.getContractAt('RelayerCelerTargetMock', relayerCelerTarget.address),
    relayerCelerTargetAddress: relayerCelerTarget.address,
    relayerCelerHomeFakeMessageBus: await ethers.getContractAt('RelayerCeler', relayerCelerHomeFakeMessageBus.address),
    relayerCelerHomeFakeMessageBusAddress: relayerCelerHomeFakeMessageBus.address,
    relayerCelerTargetFakeMessageBus: await ethers.getContractAt(
      'RelayerCelerTargetMock',
      relayerCelerTargetFakeMessageBus.address
    ),
    relayerCelerTargetFakeMessageBusAddress: relayerCelerTargetFakeMessageBus.address,
  };
};

describe('RelayerCeler', () => {
  it('should deploy successfully', async function () {
    const { relayerCelerHome, relayerCelerTarget, messageBusAddress } = await deployFixture();
    expect(await relayerCelerHome.messageBus()).to.eq(messageBusAddress);
    expect(await relayerCelerTarget.messageBus()).to.eq(messageBusAddress);
  });

  describe('Actor Management', () => {
    it('should add an actor', async () => {
      const { relayerCelerHome: relayerCeler } = await deployFixture();
      const { deployer } = await getNamedAccounts();
      await expect(relayerCeler.addActor(0, ZeroAddress)).to.be.revertedWithCustomError(
        relayerCeler,
        'ZeroValueNotAllowed'
      );
      await expect(relayerCeler.addActor(5, ZeroAddress)).to.be.revertedWithCustomError(relayerCeler, 'AddressZero');
      await expect(relayerCeler.addActor(5, deployer)).to.emit(relayerCeler, 'ActorAdded').withArgs(5, deployer);

      expect(await relayerCeler.isActor(5, deployer)).to.be.true;
      expect(await relayerCeler.isActor(5, ZeroAddress)).to.be.false;
      expect(await relayerCeler.isActor(0, deployer)).to.be.false;
      expect(await relayerCeler.isActor(0, ZeroAddress)).to.be.false;
    });

    it('should remove an actor', async () => {
      const { relayerCelerHome: relayerCeler } = await deployFixture();
      const { deployer } = await getNamedAccounts();
      const [, otherSigner] = await ethers.getSigners();
      // await expect(relayerCeler.connect(otherSigner).removeActor(0)).to.be.revertedWith(onlyOwnerModifierError);
      await expect(relayerCeler.removeActor(0)).to.be.revertedWithCustomError(relayerCeler, 'ZeroValueNotAllowed');
      await (await relayerCeler.addActor(5, deployer)).wait();
      await expect(relayerCeler.removeActor(1)).to.be.revertedWithCustomError(relayerCeler, 'ActorNotExisting');
      await expect(relayerCeler.removeActor(5)).to.emit(relayerCeler, 'ActorRemoved').withArgs(5);
      expect(await relayerCeler.isActor(5, deployer)).to.be.false;
    });
  });

  describe('deployFees', () => {
    it('should send message to the messagebus of celer', async () => {
      const { relayerCelerHome, messageBus, diamondAddress } = await deployFixture();
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [diamondAddress],
      });

      const signer = await ethers.getSigner(diamondAddress);
      await setBalance(diamondAddress, parseEther('100'));

      const _gasfee = await relayerCelerHome
        .connect(signer)
        .deployFeesFeeCalc(chainTargetContract, feeDeployerMessageAdd);
      expect(_gasfee).to.eq(385);

      const _message = deployFeesMessageRelayer();
      await expect(
        relayerCelerHome
          .connect(signer)
          .deployFees(relayerAddress, chainTargetContract, feeChainId, feeDeployerMessageAdd, {
            value: 385,
          })
      )
        .to.emit(messageBus, 'sendMessageEvent')
        .withArgs(chainTargetContract, feeChainId, _message, _message.length / 2);
    });

    it('should fail when not on target chain', async () => {
      const { relayerCelerTarget: relayerCeler } = await deployFixture();
      await expect(
        relayerCeler.deployFees(relayerAddress, chainTargetContract, feeChainId, feeDeployerMessageAdd, {
          value: parseEther('1'),
        })
      ).to.be.revertedWithCustomError(relayerCeler, 'NotAllowed');
    });

    it('should fail when not diamond', async () => {
      const { relayerCelerTarget: relayerCeler } = await deployFixture();
      const [, otherSigner] = await ethers.getSigners();
      await expect(
        relayerCeler
          .connect(otherSigner)
          .deployFees(relayerAddress, chainTargetContract, feeChainId, feeDeployerMessageAdd)
      ).to.be.revertedWithCustomError(relayerCeler, 'NotAllowed');
    });

    it('should execute the message received from messagebus of celer (needs funds for confirm message gas)', async () => {
      const { relayerCelerTarget, relayerCelerTargetAddress, diamondAddress, messageBus } = await deployFixture();
      const { deployer } = await getNamedAccounts();
      const [deployerSigner] = await ethers.getSigners();

      const feeStoreFacet = await ethers.getContractAt('FeeStoreFacet', diamondAddress);
      const accessControlEnumerableFacet = await ethers.getContractAt('AccessControlEnumerableFacet', diamondAddress);

      await (await accessControlEnumerableFacet.grantRole(FEE_STORE_MANAGER_ROLE, relayerCelerTargetAddress)).wait();

      const _message = deployFeesMessageRelayer(diamondAddress);
      const _messageConfirm = deployFeesConfirmMessageRelayer(diamondAddress);

      await expect(
        messageBus.relayerCall_executeMessage(relayerCelerTargetAddress, deployer, feeChainId, _message)
      ).to.be.revertedWithCustomError(relayerCelerTarget, 'NotAllowed');

      await (await relayerCelerTarget.addActor(feeChainId, deployer)).wait();

      await expect(
        messageBus.relayerCall_executeMessage(relayerCelerTargetAddress, deployer, feeChainId, _message)
      ).to.be.revertedWithoutReason();

      await (await deployerSigner.sendTransaction({ value: parseEther('1'), to: relayerCelerTargetAddress })).wait();

      await expect(
        messageBus.relayerCall_executeMessage(relayerCelerTargetAddress, deployer, feeChainId, _message, {
          value: 1n,
        })
      ).to.be.revertedWithCustomError(relayerCelerTarget, 'MissingGasFees');

      const tx = await messageBus.relayerCall_executeMessage(
        relayerCelerTargetAddress,
        deployer,
        feeChainId,
        _message,
        {
          value: 1000, // confirm message gas (more than needed)
        }
      );

      await expect(tx)
        .to.emit(relayerCelerTarget, 'MessageReceived')
        .withArgs(deployer, feeChainId, _message, true)
        .to.emit(feeStoreFacet, 'FeesSynced')
        .to.emit(messageBus, 'sendMessageEvent')
        .withArgs(deployer, feeChainId, _messageConfirm, 385);

      await expect(tx).to.changeEtherBalance(deployer, -385);
    });
  });

  describe('deployFees Confirmation', () => {
    it('should execute deployFeesWithCelerConfirm on the CelerFeeHubFacet to confirm', async () => {
      const { messageBus, messageBusAddress, celerFeeHubFacetMock, celerFeeHubFacetMockAddress, diamondAddress } =
        await deployFixture();
      const { deployer } = await getNamedAccounts();
      const _messageConfirm = deployFeesConfirmMessageRelayer(diamondAddress);
      const { address: relayerCelerAddress } = await deployments.deploy('RelayerCeler', {
        from: deployer,
        args: [celerFeeHubFacetMockAddress, deployer, deployer, messageBusAddress, 43113, true],
      });
      const relayerCeler = await ethers.getContractAt('RelayerCeler', relayerCelerAddress);
      await (await relayerCeler.addActor(feeChainId, deployer)).wait();

      expect(
        await messageBus.relayerCall_executeMessage.staticCall(
          relayerCelerAddress,
          deployer,
          feeChainId,
          _messageConfirm
        )
      ).to.eq(1);

      await expect(messageBus.relayerCall_executeMessage(relayerCelerAddress, deployer, feeChainId, _messageConfirm))
        .to.emit(celerFeeHubFacetMock, 'deployFeesWithCelerConfirmEvent')
        .withArgs(feeChainId, feeDeployerMessageAdd);
    });
  });

  describe('sendFees', () => {
    it('should send message with transfer', async () => {
      const { diamondAddress, relayerCelerTarget, relayerCelerTargetAddress, erc20, erc20Address, messageBusAddress } =
        await deployFixture();
      const { deployer } = await getNamedAccounts();
      const [deployerSigner] = await ethers.getSigners();
      await (await erc20.connect(deployerSigner).transfer(relayerCelerTargetAddress, parseEther('1'))).wait();

      expect(await relayerCelerTarget.nonce()).to.eq(0);

      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [diamondAddress],
      });

      const signer = await ethers.getSigner(diamondAddress);
      await setBalance(diamondAddress, parseEther('100'));

      const messageRelayer = sendFeesMessageRelayer(feeId, parseEther('1'), deployer, ZERO_ADDR);
      const message = sendFeesMessage(feeId, parseEther('1'), deployer);
      const fee = await relayerCelerTarget.connect(signer).sendFeesFeeCalc(message);

      expect(fee).to.eq(385);

      await expect(relayerCelerTarget.connect(signer).sendFees(erc20Address, parseEther('1'), 12345, message))
        .to.emit(relayerCelerTarget, 'sendMessageWithTransferEvent')
        .withArgs(
          deployer,
          erc20Address,
          parseEther('1'),
          43113,
          0,
          12345,
          messageRelayer,
          // ./providers/celer-contracts/contracts/message/libraries/MsgDataTypes.sol
          // 1, // liquidity/pool based
          5, // peg v2 burn
          // 2, // otv v1 deposit
          messageBusAddress,
          fee
        );

      expect(await relayerCelerTarget.nonce()).to.eq(1);
    });

    it('should fail when on home chain', async () => {
      const { relayerCelerHome: relayerCeler } = await deployFixture();
      await expect(relayerCeler.sendFees(ZeroAddress, 0, 0, ZeroHash)).to.be.revertedWithCustomError(
        relayerCeler,
        'NotAllowed'
      );
    });

    it('should fail when not diamond', async () => {
      const { relayerCelerHome: relayerCeler } = await deployFixture();
      const [, otherSigner] = await ethers.getSigners();
      await expect(
        relayerCeler.connect(otherSigner).sendFees(ZeroAddress, 0, 0, ZeroHash)
      ).to.be.revertedWithCustomError(relayerCeler, 'NotAllowed');
    });

    it('should execute the message received from messagebus of celer with funds', async () => {
      const {
        relayerCelerHomeFakeMessageBus: relayerCeler,
        relayerCelerHomeFakeMessageBusAddress: relayerCelerAddress,
        erc20,
        erc20Address,
        diamondAddress,
      } = await deployFixture();
      const { deploy } = deployments;
      const { deployer } = await getNamedAccounts();
      const [, otherSigner] = await ethers.getSigners();

      await expect(
        relayerCeler
          .connect(otherSigner)
          .executeMessageWithTransfer(ZeroAddress, ZeroAddress, 0, 0, ZeroHash, ZeroAddress)
      ).to.be.revertedWith('caller is not message bus');

      await deploy('FeeDistributorFacetMock', { from: deployer });
      const { facetContract } = await deployFacet('FeeDistributorFacetMock');
      await addFacets([facetContract], diamondAddress);
      const feeDistributorFacet = await ethers.getContractAt('FeeDistributorFacetMock', diamondAddress);

      const _message = sendFeesMessageRelayer(feeId, parseEther('1'), deployer, diamondAddress);

      await expect(
        relayerCeler.executeMessageWithTransfer(deployer, erc20Address, parseEther('1'), feeChainId, _message, deployer)
      ).to.be.revertedWithCustomError(relayerCeler, 'NotAllowed');

      await (await relayerCeler.addActor(feeChainId, deployer)).wait();

      await expect(
        relayerCeler.executeMessageWithTransfer(deployer, erc20Address, parseEther('1'), feeChainId, _message, deployer)
      ).to.be.revertedWith(erc20TransferError);

      await (await erc20.transfer(relayerCelerAddress, parseEther('1'))).wait();

      expect(await erc20.balanceOf(relayerCelerAddress)).to.eq(parseEther('1'));
      expect(await erc20.balanceOf(diamondAddress)).to.eq(parseEther('0'));

      await expect(
        relayerCeler.executeMessageWithTransfer(
          deployer,
          erc20Address,
          parseEther('1'),
          feeChainId,
          _message,
          deployer,
          { value: parseEther('1') }
        )
      )
        .to.emit(feeDistributorFacet, 'pushFeesEvent')
        .to.emit(relayerCeler, 'MessageReceived')
        .withArgs(deployer, feeChainId, _message, true);

      expect(await erc20.balanceOf(relayerCelerAddress)).to.eq(parseEther('0'));
      expect(await erc20.balanceOf(diamondAddress)).to.eq(parseEther('1'));
      expect(await ethers.provider.getBalance(relayerCelerAddress)).to.eq(parseEther('0'));
      expect(await ethers.provider.getBalance(diamondAddress)).to.eq(parseEther('1'));
    });

    it('should execute the message received from messagebus of celer without funds', async () => {
      const {
        relayerCelerHomeFakeMessageBus: relayerCeler,
        relayerCelerHomeFakeMessageBusAddress: relayerCelerAddress,
        diamondAddress,
        erc20,
        erc20Address,
      } = await deployFixture();

      const { deploy } = deployments;
      const { deployer } = await getNamedAccounts();
      const _message = sendFeesMessageRelayer(feeId, parseEther('1'), deployer, diamondAddress);

      await deploy('FeeDistributorFacetMock', { from: deployer });
      const { facetContract } = await deployFacet('FeeDistributorFacetMock');
      await addFacets([facetContract], diamondAddress);
      const feeDistributorFacet = await ethers.getContractAt('FeeDistributorFacetMock', diamondAddress);

      await (await relayerCeler.addActor(feeChainId, deployer)).wait();
      await (await erc20.transfer(relayerCelerAddress, parseEther('1'))).wait();

      expect(
        await relayerCeler.executeMessageWithTransfer.staticCall(
          deployer,
          erc20Address,
          parseEther('1'),
          feeChainId,
          _message,
          deployer
        )
      ).to.eq(1);

      await expect(
        relayerCeler.executeMessageWithTransfer(deployer, erc20Address, parseEther('1'), feeChainId, _message, deployer)
      )
        .to.emit(feeDistributorFacet, 'pushFeesEvent')
        .to.emit(relayerCeler, 'MessageReceived')
        .withArgs(deployer, feeChainId, _message, true);

      expect(await ethers.provider.getBalance(relayerCelerAddress)).to.eq(parseEther('0'));
      expect(await ethers.provider.getBalance(diamondAddress)).to.eq(parseEther('0'));
    });
  });

  describe('message execution', () => {
    it('should fail when wrong message received on executeMessage', async () => {
      const { relayerCelerHomeFakeMessageBus: relayerCeler } = await deployFixture();
      const { deployer } = await getNamedAccounts();
      await (await relayerCeler.addActor(feeChainId, deployer)).wait();
      expect(
        await relayerCeler['executeMessage(address,uint64,bytes,address)'].staticCall(
          deployer,
          feeChainId,
          executeMessageNotExistingFunctionSelector(),
          deployer
        )
      ).to.eq(0);
    });

    it('should fail when wrong "what" received on executeMessageWithTransfer', async () => {
      const {
        relayerCelerHomeFakeMessageBus: relayerCeler,
        relayerCelerHomeFakeMessageBusAddress: relayerCelerAddress,
        erc20,
        erc20Address,
      } = await deployFixture();
      const { deployer } = await getNamedAccounts();
      await (await relayerCeler.addActor(feeChainId, deployer)).wait();
      await (await erc20.transfer(relayerCelerAddress, parseEther('1'))).wait();

      expect(
        await relayerCeler.executeMessageWithTransfer.staticCall(
          deployer,
          erc20Address,
          parseEther('1'),
          feeChainId,
          executeMessageNotExistingFunctionSelector(),
          deployer
        )
      ).to.eq(0);
    });
  });

  describe('forwardRefund', () => {
    it('should transfer assets from the relayer to a desired account', async () => {
      const {
        relayerCelerHome: relayerCeler,
        relayerCelerHomeAddress: relayerCelerAddress,
        erc20,
        erc20Address,
      } = await deployFixture();
      const { deployer } = await getNamedAccounts();
      const [deployerSigner] = await ethers.getSigners();

      await (await erc20.transfer(relayerCelerAddress, parseEther('1'))).wait();
      await (await deployerSigner.sendTransaction({ value: parseEther('1'), to: relayerCelerAddress })).wait();

      const tx1 = relayerCeler.forwardRefund(erc20Address, deployer, parseEther('1'));
      await expect(tx1).to.emit(relayerCeler, 'RefundForwarded').withArgs(erc20Address, deployer, parseEther('1'));
      await expect(tx1).to.changeTokenBalance(erc20, deployer, parseEther('1'));

      const tx2 = relayerCeler.forwardRefund(nativeAddress, deployer, parseEther('1'));
      await expect(tx2).to.emit(relayerCeler, 'RefundForwarded').withArgs(nativeAddress, deployer, parseEther('1'));
      await expect(tx2).to.changeEtherBalance(deployer, parseEther('1'));

      await expect(relayerCeler.forwardRefund(nativeAddress, deployer, parseEther('1'))).to.be.revertedWith(
        'Address: insufficient balance'
      );
    });
  });

  describe('executeMessageWithTransferRefund', () => {
    describe('Action RELAYER_ACTION_SEND_FEES', () => {
      it('should restore fees in the fee store', async () => {
        const { diamondAddress, erc20Address } = await deployFixture();
        const { deployer } = await getNamedAccounts();
        const { deploy } = deployments;
        const { address } = await deploy('RelayerCeler', {
          from: deployer,
          args: [diamondAddress, deployer, deployer, deployer, 43113, true],
        });
        const relayerCeler = await ethers.getContractAt('RelayerCeler', address);

        const { facetContract } = await deployFacet('FeeStoreFacetMock');
        await addOrReplaceFacets([facetContract], diamondAddress);

        expect(
          await relayerCeler.executeMessageWithTransferRefund.staticCall(
            erc20Address,
            parseEther('2'),
            sendFeesMessageRelayer(feeId, parseEther('2')),
            ZeroAddress
          )
        ).to.eq(1);

        expect(
          await relayerCeler.executeMessageWithTransferRefund.staticCall(
            erc20Address,
            parseEther('2'),
            executeMessageNotExistingFunctionSelector(),
            ZeroAddress
          )
        ).to.eq(0);

        await expect(
          relayerCeler.executeMessageWithTransferRefund(erc20Address, parseEther('2'), ZeroHash, ZeroAddress)
        ).to.be.reverted;
      });
    });
  });

  describe('executeMessageWithTransferFallback', () => {
    it('should send the funds to the operator address', async () => {
      const { diamondAddress, erc20, erc20Address } = await deployFixture();
      const { deployer } = await getNamedAccounts();
      const { deploy } = deployments;
      const { address } = await deploy('RelayerCeler', {
        from: deployer,
        args: [diamondAddress, deployer, deployer, deployer, 43113, true],
      });
      const relayerCeler = await ethers.getContractAt('RelayerCeler', address);
      await (await relayerCeler.addActor(1337, deployer)).wait();
      await (await erc20.transfer(address, parseEther('0.1'))).wait();

      expect(
        await relayerCeler.executeMessageWithTransferFallback.staticCall(
          deployer,
          erc20Address,
          parseEther('0.1'),
          1337,
          ZeroHash,
          ZeroAddress
        )
      ).to.eq(1);

      expect(
        await relayerCeler.executeMessageWithTransferFallback.staticCall(
          deployer,
          erc20Address,
          parseEther('0.2'),
          1337,
          ZeroHash,
          ZeroAddress
        )
      ).to.eq(0);

      await expect(
        relayerCeler.executeMessageWithTransferFallback(
          ZeroAddress,
          erc20Address,
          parseEther('0.1'),
          1,
          ZeroHash,
          ZeroAddress
        )
      ).to.be.revertedWithCustomError(relayerCeler, 'NotAllowed');

      await expect(
        relayerCeler.executeMessageWithTransferFallback(
          deployer,
          erc20Address,
          parseEther('0.1'),
          1337,
          ZeroHash,
          ZeroAddress
        )
      ).to.changeTokenBalances(erc20, [address, deployer], [parseEther('-0.1'), parseEther('0.1')]);
    });
  });
});
