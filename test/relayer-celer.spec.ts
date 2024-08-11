import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ZeroAddress, ZeroHash, parseEther } from 'ethers';
import { deployments, ethers, getNamedAccounts, network } from 'hardhat';
import { deployFacet } from '../scripts/helpers/deploy-diamond';
import { addFacets, addOrReplaceFacets } from '../scripts/helpers/diamond';
import {
  CelerFeeHubFacetMock,
  ERC20Mock,
  MessageBusMock,
  RelayerCeler,
  RelayerCelerTargetMock,
} from '../typechain-types';
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

const deployFixture = async () => {
  let erc20: ERC20Mock;
  let messageBus: MessageBusMock;
  let celerFeeHubFacetMock: CelerFeeHubFacetMock;
  let relayerHome: RelayerCeler;
  let relayerTarget: RelayerCelerTargetMock;
  let relayerHomeFakeMessageBus: RelayerCeler;
  let relayerTargetFakeMessageBus: RelayerCelerTargetMock;
  let messageBusAddress: string;

  const { diamond, diamondAddress } = await deployDiamondFixture();
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const deployerSigner = await ethers.getSigner(deployer);

  {
    const { facetContract } = await deployFacet('FeeStoreFacet');
    await addFacets([facetContract], diamondAddress, undefined, undefined, deployer);
  }

  {
    const { facetContract } = await deployFacet('AccessControlEnumerableFacet');
    await addFacets([facetContract], diamondAddress, undefined, undefined, deployer);
  }

  {
    const { address } = await deploy('ERC20Mock', { from: deployer });
    erc20 = await ethers.getContractAt('ERC20Mock', address, deployerSigner);
  }

  {
    const { address } = await deploy('CelerFeeHubFacetMock', { from: deployer });
    celerFeeHubFacetMock = await ethers.getContractAt('CelerFeeHubFacetMock', address, deployerSigner);
  }

  {
    ({ address: messageBusAddress } = await deploy('MessageBusMock', { from: deployer }));
    messageBus = await ethers.getContractAt('MessageBusMock', messageBusAddress, deployerSigner);
  }

  {
    const { address } = await deploy('RelayerCeler', {
      from: deployer,
      args: [diamondAddress, deployer, deployer, messageBusAddress, 43113, true],
    });
    relayerHome = await ethers.getContractAt('RelayerCeler', address, deployerSigner);
  }

  {
    const { address } = await deploy('RelayerCelerTargetMock', {
      from: deployer,
      args: [diamondAddress, deployer, deployer, messageBusAddress, 43113, false],
    });
    relayerTarget = await ethers.getContractAt('RelayerCelerTargetMock', address, deployerSigner);
  }

  {
    const { address } = await deploy('RelayerCeler', {
      from: deployer,
      args: [diamondAddress, deployer, deployer, deployer, 43113, true],
    });
    relayerHomeFakeMessageBus = await ethers.getContractAt('RelayerCeler', address, deployerSigner);
  }

  {
    const { address } = await deploy('RelayerCelerTargetMock', {
      from: deployer,
      args: [diamondAddress, deployer, deployer, deployer, 43113, false],
    });
    relayerTargetFakeMessageBus = await ethers.getContractAt('RelayerCelerTargetMock', address, deployerSigner);
  }

  return {
    diamond,
    diamondAddress,
    deployer,
    deployerSigner,
    erc20,
    erc20Address: await erc20.getAddress(),
    messageBus,
    messageBusAddress,
    celerFeeHubFacetMock,
    celerFeeHubFacetMockAddress: await celerFeeHubFacetMock.getAddress(),
    relayerHome,
    relayerHomeAddress: await relayerHome.getAddress(),
    relayerTarget,
    relayerTargetAddress: await relayerTarget.getAddress(),
    relayerHomeFakeMessageBus,
    relayerHomeFakeMessageBusAddress: await relayerHomeFakeMessageBus.getAddress(),
    relayerTargetFakeMessageBus,
    relayerTargetFakeMessageBusAddress: await relayerTargetFakeMessageBus.getAddress(),
  };
};

describe('RelayerCeler', () => {
  let diamond;
  let diamondAddress: string;
  let deployer: string;
  let deployerSigner: SignerWithAddress;
  let erc20: ERC20Mock;
  let erc20Address: string;
  let relayerHome: RelayerCeler;
  let relayerHomeAddress: string;
  let relayerTarget: RelayerCelerTargetMock;
  let relayerTargetAddress: string;
  let relayerHomeFakeMessageBus: RelayerCeler;
  let relayerHomeFakeMessageBusAddress: string;
  let relayerTargetFakeMessageBus: RelayerCelerTargetMock;
  let relayerTargetFakeMessageBusAddress: string;
  let messageBus: MessageBusMock;
  let messageBusAddress: string;
  let celerFeeHubFacetMock: CelerFeeHubFacetMock;
  let celerFeeHubFacetMockAddress: string;
  let snapshotId: any;

  beforeEach(async () => {
    ({
      erc20,
      erc20Address,
      celerFeeHubFacetMock,
      celerFeeHubFacetMockAddress,
      relayerHome,
      relayerHomeAddress,
      relayerTarget,
      relayerTargetAddress,
      relayerHomeFakeMessageBus,
      relayerHomeFakeMessageBusAddress,
      relayerTargetFakeMessageBus,
      relayerTargetFakeMessageBusAddress,
      messageBus,
      messageBusAddress,
      diamond,
      diamondAddress,
      deployer,
      deployerSigner,
    } = await deployFixture());
    snapshotId = await network.provider.send('evm_snapshot');
  });

  afterEach(async function () {
    await network.provider.send('evm_revert', [snapshotId]);
  });

  it('should deploy successfully', async function () {
    expect(await relayerHome.messageBus()).to.eq(messageBusAddress);
    expect(await relayerTarget.messageBus()).to.eq(messageBusAddress);
  });

  describe('Actor Management', () => {
    it('should add an actor', async () => {
      await expect(relayerHome.addActor(0, ZeroAddress)).to.be.revertedWithCustomError(
        relayerHome,
        'ZeroValueNotAllowed'
      );
      await expect(relayerHome.addActor(5, ZeroAddress)).to.be.revertedWithCustomError(relayerHome, 'AddressZero');
      await expect(relayerHome.addActor(5, deployer)).to.emit(relayerHome, 'ActorAdded').withArgs(5, deployer);
      expect(await relayerHome.isActor(5, deployer)).to.be.true;
      expect(await relayerHome.isActor(5, ZeroAddress)).to.be.false;
      expect(await relayerHome.isActor(0, deployer)).to.be.false;
      expect(await relayerHome.isActor(0, ZeroAddress)).to.be.false;
    });

    it('should remove an actor', async () => {
      await expect(relayerHome.removeActor(0)).to.be.revertedWithCustomError(relayerHome, 'ZeroValueNotAllowed');
      await relayerHome.addActor(5, deployer);
      await expect(relayerHome.removeActor(1)).to.be.revertedWithCustomError(relayerHome, 'ActorNotExisting');
      await expect(relayerHome.removeActor(5)).to.emit(relayerHome, 'ActorRemoved').withArgs(5);
      expect(await relayerHome.isActor(5, deployer)).to.be.false;
    });
  });

  describe('deployFees', () => {
    it('should send message to the messagebus of celer', async () => {
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [diamondAddress],
      });

      const signer = await ethers.getSigner(diamondAddress);
      await setBalance(diamondAddress, parseEther('100'));

      const _gasfee = await relayerHome.connect(signer).deployFeesFeeCalc(chainTargetContract, feeDeployerMessageAdd);
      expect(_gasfee).to.eq(385);

      const _message = deployFeesMessageRelayer();
      await expect(
        relayerHome.connect(signer).deployFees(relayerAddress, chainTargetContract, feeChainId, feeDeployerMessageAdd, {
          value: 385,
        })
      )
        .to.emit(messageBus, 'sendMessageEvent')
        .withArgs(chainTargetContract, feeChainId, _message, _message.length / 2);
    });

    it('should fail when not on target chain', async () => {
      await expect(
        relayerTarget.deployFees(relayerAddress, chainTargetContract, feeChainId, feeDeployerMessageAdd, {
          value: parseEther('1'),
        })
      ).to.be.revertedWithCustomError(relayerTarget, 'NotAllowed');
    });

    it('should fail when not diamond', async () => {
      const [, , otherSigner] = await ethers.getSigners();
      await expect(
        relayerTarget
          .connect(otherSigner)
          .deployFees(relayerAddress, chainTargetContract, feeChainId, feeDeployerMessageAdd)
      ).to.be.revertedWithCustomError(relayerTarget, 'NotAllowed');
    });

    it('should execute the message received from messagebus of celer (needs funds for confirm message gas)', async () => {
      const feeStoreFacet = await ethers.getContractAt('FeeStoreFacet', diamondAddress, deployerSigner);
      const accessControlEnumerableFacet = await ethers.getContractAt(
        'AccessControlEnumerableFacet',
        diamondAddress,
        deployerSigner
      );
      await accessControlEnumerableFacet.grantRole(FEE_STORE_MANAGER_ROLE, relayerTargetAddress);
      const _message = deployFeesMessageRelayer(diamondAddress);
      const _messageConfirm = deployFeesConfirmMessageRelayer(diamondAddress);
      await expect(
        messageBus.relayerCall_executeMessage(relayerTargetAddress, deployer, feeChainId, _message)
      ).to.be.revertedWithCustomError(relayerTarget, 'NotAllowed');

      await relayerTarget.addActor(feeChainId, deployer);
      await expect(
        messageBus.relayerCall_executeMessage(relayerTargetAddress, deployer, feeChainId, _message)
      ).to.be.revertedWithoutReason();

      await deployerSigner.sendTransaction({ value: parseEther('1'), to: relayerTargetAddress });
      await expect(
        messageBus.relayerCall_executeMessage(relayerTargetAddress, deployer, feeChainId, _message, {
          value: 1n,
        })
      ).to.be.revertedWithCustomError(relayerTarget, 'MissingGasFees');

      const tx = await messageBus.relayerCall_executeMessage(relayerTargetAddress, deployer, feeChainId, _message, {
        value: 1000, // confirm message gas (more than needed)
      });

      await expect(tx)
        .to.emit(relayerTarget, 'MessageReceived')
        .withArgs(deployer, feeChainId, _message, true)
        .to.emit(feeStoreFacet, 'FeesSynced')
        .to.emit(messageBus, 'sendMessageEvent')
        .withArgs(deployer, feeChainId, _messageConfirm, 385);

      await expect(tx).to.changeEtherBalance(deployer, -385);
    });
  });

  describe('deployFees Confirmation', () => {
    it('should execute deployFeesWithCelerConfirm on the CelerFeeHubFacet to confirm', async () => {
      const _messageConfirm = deployFeesConfirmMessageRelayer(diamondAddress);
      const { address: relayerCelerAddress } = await deployments.deploy('RelayerCeler', {
        from: deployer,
        args: [celerFeeHubFacetMockAddress, deployer, deployer, messageBusAddress, 43113, true],
      });
      const relayerCeler = await ethers.getContractAt('RelayerCeler', relayerCelerAddress, deployerSigner);
      await relayerCeler.addActor(feeChainId, deployer);
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
      await erc20.connect(deployerSigner).transfer(relayerTargetAddress, parseEther('1'));
      expect(await relayerTarget.nonce()).to.eq(0);

      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [diamondAddress],
      });

      const signer = await ethers.getSigner(diamondAddress);
      await setBalance(diamondAddress, parseEther('100'));

      const messageRelayer = sendFeesMessageRelayer(feeId, parseEther('1'), deployer, ZeroAddress);
      const message = sendFeesMessage(feeId, parseEther('1'), deployer);
      const fee = await relayerTarget.connect(signer).sendFeesFeeCalc(message);

      expect(fee).to.eq(385);

      await expect(relayerTarget.connect(signer).sendFees(erc20, parseEther('1'), 12345, message))
        .to.emit(relayerTarget, 'sendMessageWithTransferEvent')
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

      expect(await relayerTarget.nonce()).to.eq(1);
    });

    it('should fail when on home chain', async () => {
      await expect(relayerHome.sendFees(ZeroAddress, 0, 0, ZeroHash)).to.be.revertedWithCustomError(
        relayerHome,
        'NotAllowed'
      );
    });

    it('should fail when not diamond', async () => {
      const [, , otherSigner] = await ethers.getSigners();
      await expect(
        relayerHome.connect(otherSigner).sendFees(ZeroAddress, 0, 0, ZeroHash)
      ).to.be.revertedWithCustomError(relayerHome, 'NotAllowed');
    });

    it('should execute the message received from messagebus of celer with funds', async () => {
      const [, , otherSigner] = await ethers.getSigners();

      await expect(
        relayerHomeFakeMessageBus
          .connect(otherSigner)
          .executeMessageWithTransfer(ZeroAddress, ZeroAddress, 0, 0, ZeroHash, ZeroAddress)
      ).to.be.revertedWith('caller is not message bus');

      const { facetContract } = await deployFacet('FeeDistributorFacetMock');
      await addFacets([facetContract], diamondAddress, undefined, undefined, deployer);
      const feeDistributorFacet = await ethers.getContractAt('FeeDistributorFacetMock', diamondAddress, deployerSigner);

      const _message = sendFeesMessageRelayer(feeId, parseEther('1'), deployer, diamondAddress);

      await expect(
        relayerHomeFakeMessageBus.executeMessageWithTransfer(
          deployer,
          erc20Address,
          parseEther('1'),
          feeChainId,
          _message,
          deployer
        )
      ).to.be.revertedWithCustomError(relayerHomeFakeMessageBus, 'NotAllowed');

      await relayerHomeFakeMessageBus.addActor(feeChainId, deployer);

      await expect(
        relayerHomeFakeMessageBus.executeMessageWithTransfer(
          deployer,
          erc20Address,
          parseEther('1'),
          feeChainId,
          _message,
          deployer
        )
      ).to.be.revertedWith(erc20TransferError);

      await erc20.transfer(relayerHomeFakeMessageBusAddress, parseEther('1'));

      expect(await erc20.balanceOf(relayerHomeFakeMessageBusAddress)).to.eq(parseEther('1'));
      expect(await erc20.balanceOf(diamondAddress)).to.eq(parseEther('0'));

      await expect(
        relayerHomeFakeMessageBus.executeMessageWithTransfer(
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
        .to.emit(relayerHomeFakeMessageBus, 'MessageReceived')
        .withArgs(deployer, feeChainId, _message, true);

      expect(await erc20.balanceOf(relayerHomeFakeMessageBusAddress)).to.eq(parseEther('0'));
      expect(await erc20.balanceOf(diamondAddress)).to.eq(parseEther('1'));
      expect(await ethers.provider.getBalance(relayerHomeFakeMessageBusAddress)).to.eq(parseEther('0'));
      expect(await ethers.provider.getBalance(diamondAddress)).to.eq(parseEther('1'));
    });

    it('should execute the message received from messagebus of celer without funds', async () => {
      const { deploy } = deployments;
      const _message = sendFeesMessageRelayer(feeId, parseEther('1'), deployer, diamondAddress);

      await deploy('FeeDistributorFacetMock', { from: deployer });
      const { facetContract } = await deployFacet('FeeDistributorFacetMock');
      await addFacets([facetContract], diamondAddress, undefined, undefined, deployer);
      const feeDistributorFacet = await ethers.getContractAt('FeeDistributorFacetMock', diamondAddress, deployerSigner);

      await relayerHomeFakeMessageBus.addActor(feeChainId, deployer);
      await erc20.transfer(relayerHomeFakeMessageBusAddress, parseEther('1'));

      expect(
        await relayerHomeFakeMessageBus.executeMessageWithTransfer.staticCall(
          deployer,
          erc20Address,
          parseEther('1'),
          feeChainId,
          _message,
          deployer
        )
      ).to.eq(1);

      await expect(
        relayerHomeFakeMessageBus.executeMessageWithTransfer(
          deployer,
          erc20Address,
          parseEther('1'),
          feeChainId,
          _message,
          deployer
        )
      )
        .to.emit(feeDistributorFacet, 'pushFeesEvent')
        .to.emit(relayerHomeFakeMessageBus, 'MessageReceived')
        .withArgs(deployer, feeChainId, _message, true);

      expect(await ethers.provider.getBalance(relayerHomeFakeMessageBusAddress)).to.eq(parseEther('0'));
      expect(await ethers.provider.getBalance(diamondAddress)).to.eq(parseEther('0'));
    });
  });

  describe('message execution', () => {
    it('should fail when wrong message received on executeMessage', async () => {
      await relayerHomeFakeMessageBus.addActor(feeChainId, deployer);
      expect(
        await relayerHomeFakeMessageBus['executeMessage(address,uint64,bytes,address)'].staticCall(
          deployer,
          feeChainId,
          executeMessageNotExistingFunctionSelector(),
          deployer
        )
      ).to.eq(0);
    });

    it('should fail when wrong "what" received on executeMessageWithTransfer', async () => {
      await relayerHomeFakeMessageBus.addActor(feeChainId, deployer);
      await erc20.transfer(relayerHomeFakeMessageBusAddress, parseEther('1'));
      expect(
        await relayerHomeFakeMessageBus.executeMessageWithTransfer.staticCall(
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
      await erc20.transfer(relayerHomeAddress, parseEther('1'));
      await deployerSigner.sendTransaction({ value: parseEther('1'), to: relayerHomeAddress });

      const tx1 = relayerHome.forwardRefund(erc20Address, deployer, parseEther('1'));
      await expect(tx1).to.emit(relayerHome, 'RefundForwarded').withArgs(erc20Address, deployer, parseEther('1'));
      await expect(tx1).to.changeTokenBalance(erc20, deployer, parseEther('1'));

      const tx2 = relayerHome.forwardRefund(nativeAddress, deployer, parseEther('1'));
      await expect(tx2).to.emit(relayerHome, 'RefundForwarded').withArgs(nativeAddress, deployer, parseEther('1'));
      await expect(tx2).to.changeEtherBalance(deployer, parseEther('1'));

      await expect(relayerHome.forwardRefund(nativeAddress, deployer, parseEther('1'))).to.be.revertedWith(
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
        const relayerCeler = await ethers.getContractAt('RelayerCeler', address, deployerSigner);

        const { facetContract } = await deployFacet('FeeStoreFacetMock');
        await addOrReplaceFacets([facetContract], diamondAddress, undefined, undefined, deployer);

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
      const relayerCeler = await ethers.getContractAt('RelayerCeler', address, deployerSigner);
      await relayerCeler.addActor(1337, deployer);
      await erc20.transfer(address, parseEther('0.1'));

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
