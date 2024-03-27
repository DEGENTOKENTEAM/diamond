import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { BaseContract, Contract, MaxInt256, ZeroAddress, parseEther } from 'ethers';
import { deployments, ethers, getNamedAccounts, network } from 'hardhat';
import { isEqual } from 'lodash';
import { deployFacet } from '../scripts/helpers/deploy-diamond';
import { addFacets } from '../scripts/helpers/diamond';
import {
  DepositableMock,
  DiamondLoupeFacet,
  ERC20Mock,
  FeeDistributorFacet,
  FeeManagerFacet,
  NativeWrapperMock,
  SwapRouterMock,
} from '../typechain-types';
import { FeeConfigSyncHomeDTOStruct } from '../typechain-types/contracts/__mocks__/FeeDistributorFacetMock';
import { FeeCurrency, FeeType } from './utils/enums';
import { accessControlError, deployFixture as deployDiamondFixture } from './utils/helper';
import {
  DEAD_ADDRESS,
  FEE_DISTRIBUTOR_MANAGER,
  FEE_DISTRIBUTOR_PUSH_ROLE,
  addReceiverParams,
  feeId,
  feeIdOther,
  receiverName1,
  receiverName2,
  receiverName3,
} from './utils/mocks';

const deployFixture = async () => {
  const { diamond, diamondAddress } = await deployDiamondFixture();
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const deployerSigner = await ethers.getSigner(deployer);
  const [, , lp] = await ethers.getSigners();

  const { address: erc20Address } = await deploy('ERC20MockA', { from: deployer, contract: 'ERC20Mock' });
  const { address: baseTokenAddress } = await deploy('ERC20MockB', { from: deployer, contract: 'ERC20Mock' });
  const { address: nativeWrapperAddress } = await deploy('NativeWrapperMock', { from: deployer });
  const { address: routerAddress } = await deploy('SwapRouterMock', {
    from: deployer,
    args: [lp.address, nativeWrapperAddress],
  });

  {
    const { address, newlyDeployed } = await deploy('FeeDistributorFacet', { from: deployer });
    const facet = await ethers.getContractAt('FeeDistributorFacet', address, deployerSigner);
    newlyDeployed && addFacets([facet as unknown as Contract], diamondAddress, undefined, undefined, deployer);
  }
  {
    const { address, newlyDeployed } = await deploy('FeeManagerFacet', { from: deployer });
    const facet = await ethers.getContractAt('FeeManagerFacet', address, deployerSigner);
    newlyDeployed && addFacets([facet as unknown as Contract], diamondAddress, undefined, undefined, deployer);
  }

  return {
    deployer,
    deployerSigner,
    diamond,
    diamondAddress,
    erc20: (await ethers.getContractAt('ERC20Mock', erc20Address, deployerSigner)) as ERC20Mock,
    erc20Address,
    baseToken: (await ethers.getContractAt('ERC20Mock', baseTokenAddress, deployerSigner)) as ERC20Mock,
    baseTokenAddress,
    nativeWrapper: (await ethers.getContractAt(
      'NativeWrapperMock',
      nativeWrapperAddress,
      deployerSigner
    )) as NativeWrapperMock,
    nativeWrapperAddress,
    router: (await ethers.getContractAt('SwapRouterMock', routerAddress, deployerSigner)) as SwapRouterMock,
    routerAddress,
    lp,
  };
};

describe('FeeDistributorFacet', () => {
  let diamond: Contract;
  let diamondAddress: string;
  let erc20: ERC20Mock;
  let erc20Address: string;
  let baseToken: ERC20Mock;
  let baseTokenAddress: string;
  let nativeWrapper: NativeWrapperMock;
  let nativeWrapperAddress: string;
  let router: SwapRouterMock;
  let routerAddress: string;
  let lp: SignerWithAddress;
  let deployer: string;
  let deployerSigner: SignerWithAddress;
  let diamondLoupeFacet: DiamondLoupeFacet;
  let feeDistributorFacet: FeeDistributorFacet;
  let snapshotId: any;

  const BOUNTY_SHARE = 10000;

  beforeEach(async () => {
    ({
      deployer,
      deployerSigner,
      diamond,
      diamondAddress,
      erc20,
      erc20Address,
      baseToken,
      baseTokenAddress,
      nativeWrapper,
      nativeWrapperAddress,
      router,
      routerAddress,
      lp,
    } = await deployFixture());

    diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress, deployerSigner);
    feeDistributorFacet = await ethers.getContractAt('FeeDistributorFacet', diamondAddress, deployerSigner);
    snapshotId = await network.provider.send('evm_snapshot');
  });

  afterEach(async function () {
    await network.provider.send('evm_revert', [snapshotId]);
  });

  it('should be deployed successfully', async () => {
    await feeDistributorFacet.initFeeDistributorFacet(
      baseTokenAddress,
      nativeWrapperAddress,
      routerAddress,
      BOUNTY_SHARE
    );
    expect(await diamond.waitForDeployment()).to.be.instanceOf(Contract);
    expect((await diamondLoupeFacet.facets()).length).to.eq(4);
    expect(await feeDistributorFacet.isFeeDistributorRunning()).to.be.false;
    expect(await feeDistributorFacet.isFeeDistributorBountyActive()).to.be.false;
    await expect(
      feeDistributorFacet.initFeeDistributorFacet(baseTokenAddress, nativeWrapperAddress, routerAddress, BOUNTY_SHARE)
    ).to.revertedWithCustomError(feeDistributorFacet, 'AlreadyInitialized');
    expect(await feeDistributorFacet.getFeeDistributorBountyShare()).to.eq(BOUNTY_SHARE);
  });

  describe('Post Initialization', () => {
    beforeEach(async () => {
      await feeDistributorFacet.initFeeDistributorFacet(
        baseTokenAddress,
        nativeWrapperAddress,
        routerAddress,
        BOUNTY_SHARE
      );
    });

    describe('Admin', () => {
      it('should be able to start the distribution', async () => {
        const [, , otherSigner] = await ethers.getSigners();
        await expect(feeDistributorFacet.connect(otherSigner).startFeeDistribution()).to.be.revertedWith(
          accessControlError(await otherSigner.getAddress(), FEE_DISTRIBUTOR_MANAGER)
        );
        await expect(feeDistributorFacet.startFeeDistribution()).to.be.revertedWithCustomError(
          feeDistributorFacet,
          'FailedStartMissingShares'
        );
        await feeDistributorFacet.addFeeDistributionReceiver(addReceiverParams(ZeroAddress));
        expect(await feeDistributorFacet.isFeeDistributorRunning()).to.be.false;
        await expect(feeDistributorFacet.startFeeDistribution()).to.emit(feeDistributorFacet, 'DistributionStarted');
        expect(await feeDistributorFacet.isFeeDistributorRunning()).to.be.true;
      });

      it('should be able to stop the distribution', async () => {
        const [, , otherSigner] = await ethers.getSigners();
        await expect(feeDistributorFacet.connect(otherSigner).startFeeDistribution()).to.be.revertedWith(
          accessControlError(await otherSigner.getAddress(), FEE_DISTRIBUTOR_MANAGER)
        );
        await feeDistributorFacet.addFeeDistributionReceiver(addReceiverParams(ZeroAddress));
        await feeDistributorFacet.startFeeDistribution();
        expect(await feeDistributorFacet.isFeeDistributorRunning()).to.be.true;
        await expect(feeDistributorFacet.stopFeeDistribution()).to.emit(feeDistributorFacet, 'DistributionStopped');
        expect(await feeDistributorFacet.isFeeDistributorRunning()).to.be.false;
      });
    });

    describe('Fee Receiver Management', () => {
      let receiver1Address: string;
      let receiver2Address: string;
      let receiver3Address: string;
      let otherSigner: SignerWithAddress;

      beforeEach(async () => {
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        const { address: a1 } = await deploy('DepositableMockA', { from: deployer, contract: 'DepositableMock' });
        const { address: a2 } = await deploy('DepositableMockB', { from: deployer, contract: 'DepositableMock' });
        const { address: a3 } = await deploy('DepositableMockC', { from: deployer, contract: 'DepositableMock' });
        receiver1Address = a1;
        receiver2Address = a2;
        receiver3Address = a3;
        [, , otherSigner] = await ethers.getSigners();
      });

      it('should add a named receiver', async () => {
        await expect(
          feeDistributorFacet.connect(otherSigner).addFeeDistributionReceiver(addReceiverParams(receiver1Address))
        ).to.be.revertedWith(accessControlError(await otherSigner.getAddress(), FEE_DISTRIBUTOR_MANAGER));

        await router.setGetAmountsOutSuccess(false);

        await expect(
          feeDistributorFacet.addFeeDistributionReceiver(
            addReceiverParams(receiver1Address, '', 10000, [ZeroAddress, ZeroAddress])
          )
        ).to.be.reverted;

        await router.setGetAmountsOutSuccess(true);

        await expect(
          feeDistributorFacet.addFeeDistributionReceiver(
            addReceiverParams(receiver1Address, '', 10000, [ZeroAddress, ZeroAddress])
          )
        ).to.emit(feeDistributorFacet, 'ReceiverAdded');

        await feeDistributorFacet.addFeeDistributionReceiver(
          addReceiverParams(receiver1Address, '', 22222, [ZeroAddress, ZeroAddress])
        );

        expect(await feeDistributorFacet.getFeeDistributorTotalPoints()).to.eq(32222);
      });

      it('should remove a named receiver based on address', async () => {
        await expect(
          feeDistributorFacet.connect(otherSigner).removeFeeDistributionReceiver(receiver1Address)
        ).to.be.revertedWith(accessControlError(await otherSigner.getAddress(), FEE_DISTRIBUTOR_MANAGER));

        await expect(feeDistributorFacet.removeFeeDistributionReceiver(receiver1Address))
          .to.be.revertedWithCustomError(feeDistributorFacet, 'ReceiverNotExisting')
          .withArgs(receiver1Address);

        expect(await feeDistributorFacet.isFeeDistributorRunning()).to.be.false;

        await feeDistributorFacet.addFeeDistributionReceiver(addReceiverParams(receiver1Address));
        await feeDistributorFacet.startFeeDistribution();

        await expect(feeDistributorFacet.removeFeeDistributionReceiver(receiver1Address))
          .to.emit(feeDistributorFacet, 'ReceiverRemoved')
          .withArgs(receiver1Address);

        expect(await feeDistributorFacet.getFeeDistributorTotalPoints()).to.eq(0);
        expect(await feeDistributorFacet.isFeeDistributorRunning()).to.be.false;

        await feeDistributorFacet.addFeeDistributionReceiver(addReceiverParams(receiver1Address));
        await feeDistributorFacet.addFeeDistributionReceiver(addReceiverParams(receiver2Address));

        expect(await feeDistributorFacet.getFeeDistributorTotalPoints()).to.eq(20000);
        expect(await feeDistributorFacet.isFeeDistributorRunning()).to.be.false;
      });

      it('should update the shares of receivers', async () => {
        await expect(feeDistributorFacet.connect(otherSigner).updateFeeDistributionShares([], [])).to.be.revertedWith(
          accessControlError(await otherSigner.getAddress(), FEE_DISTRIBUTOR_MANAGER)
        );
        await expect(feeDistributorFacet.updateFeeDistributionShares([], [])).to.be.revertedWithCustomError(
          feeDistributorFacet,
          'WrongData'
        );
        await expect(
          feeDistributorFacet.updateFeeDistributionShares([receiver1Address], [])
        ).to.be.revertedWithCustomError(feeDistributorFacet, 'WrongData');
        await expect(
          feeDistributorFacet.updateFeeDistributionShares([receiver1Address, receiver2Address], [40000])
        ).to.be.revertedWithCustomError(feeDistributorFacet, 'WrongData');

        await expect(
          feeDistributorFacet.updateFeeDistributionShares([receiver1Address], [40000])
        ).to.be.revertedWithCustomError(feeDistributorFacet, 'MissingData');

        await feeDistributorFacet.addFeeDistributionReceiver(addReceiverParams(receiver1Address, receiverName1, 10000));

        await expect(feeDistributorFacet.updateFeeDistributionShares([receiver2Address], [40000]))
          .to.be.revertedWithCustomError(feeDistributorFacet, 'ReceiverNotExisting')
          .withArgs(receiver2Address);

        await feeDistributorFacet.addFeeDistributionReceiver(addReceiverParams(receiver2Address, receiverName2, 40000));

        await feeDistributorFacet.addFeeDistributionReceiver(addReceiverParams(receiver3Address, receiverName3, 70000));

        expect(await feeDistributorFacet.getFeeDistributorTotalPoints()).to.eq(120000);

        await expect(feeDistributorFacet.updateFeeDistributionShares([receiver1Address], [40000n]))
          .to.emit(feeDistributorFacet, 'UpdatedDistributionShares')
          .withArgs(
            (_receivers: any) => isEqual(_receivers, [receiver1Address]),
            (_shares: any) => isEqual(_shares, [40000n])
          );

        expect(await feeDistributorFacet.getFeeDistributorTotalPoints()).to.eq(150000);

        await expect(
          feeDistributorFacet.updateFeeDistributionShares(
            [receiver1Address, receiver2Address, receiver3Address],
            [10000n, 10000n, 10000n]
          )
        )
          .to.emit(feeDistributorFacet, 'UpdatedDistributionShares')
          .withArgs(
            (_receivers: any) => isEqual(_receivers, [receiver1Address, receiver2Address, receiver3Address]),
            (_shares: any) => isEqual(_shares, [10000n, 10000n, 10000n])
          );

        expect(await feeDistributorFacet.getFeeDistributorTotalPoints()).to.eq(30000);

        await feeDistributorFacet.removeFeeDistributionReceiver(receiver2Address);

        expect(await feeDistributorFacet.getFeeDistributorTotalPoints()).to.eq(20000);

        await feeDistributorFacet.updateFeeDistributionShares([receiver1Address, receiver3Address], [20000n, 100000n]);

        expect(await feeDistributorFacet.getFeeDistributorTotalPoints()).to.eq(120000);
      });

      it('should provide a list of named receivers', async () => {
        const path1 = ethers.Wallet.createRandom().address;
        const path2 = ethers.Wallet.createRandom().address;

        await feeDistributorFacet.addFeeDistributionReceiver(
          addReceiverParams(receiver1Address, receiverName1, 10000, [path1, path2])
        );

        await feeDistributorFacet.addFeeDistributionReceiver(
          addReceiverParams(receiver2Address, receiverName2, 20000, [path2, path1])
        );

        await feeDistributorFacet.addFeeDistributionReceiver(
          addReceiverParams(receiver3Address, receiverName3, 30000, [])
        );

        expect(await feeDistributorFacet.getFeeDistributorReceivers()).to.deep.eq([
          [receiverName1, 10000n, receiver1Address, [path1, path2]],
          [receiverName2, 20000n, receiver2Address, [path2, path1]],
          [receiverName3, 30000n, receiver3Address, []],
        ]);
      });
    });

    describe('Bounty Management', () => {
      it('should enable the bounty', async () => {
        expect(await feeDistributorFacet.isFeeDistributorBountyActive()).to.be.false;
        await expect(feeDistributorFacet.enableFeeDistributorBounty()).to.emit(feeDistributorFacet, 'BountyEnabled');
        expect(await feeDistributorFacet.isFeeDistributorBountyActive()).to.be.true;
      });

      it('should disable the bounty', async () => {
        await feeDistributorFacet.enableFeeDistributorBounty();
        await expect(feeDistributorFacet.disableFeeDistributorBounty()).to.emit(feeDistributorFacet, 'BountyDisabled');
        expect(await feeDistributorFacet.isFeeDistributorBountyActive()).to.be.false;
      });

      it('should update the bounty share', async () => {
        expect(await feeDistributorFacet.getFeeDistributorBountyShare()).to.eq(BOUNTY_SHARE);
        await expect(feeDistributorFacet.setFeeDistributorBountyShare(BOUNTY_SHARE * 2)).to.emit(
          feeDistributorFacet,
          'BountyShareUpdated'
        );
        expect(await feeDistributorFacet.getFeeDistributorBountyShare()).to.eq(BOUNTY_SHARE * 2);
      });

      it('should enable bounty payment in token or not', async () => {
        expect(await feeDistributorFacet.isFeeDistributorBountyInToken()).to.be.false;
        await expect(feeDistributorFacet.enableBountyInToken(true)).to.emit(feeDistributorFacet, 'EnableBountyInToken');
        expect(await feeDistributorFacet.isFeeDistributorBountyInToken()).to.be.true;
        await expect(feeDistributorFacet.enableBountyInToken(false)).to.emit(
          feeDistributorFacet,
          'DisableBountyInToken'
        );
        expect(await feeDistributorFacet.isFeeDistributorBountyInToken()).to.be.false;
      });
    });

    describe('Distribution', () => {
      let feeManagerFacet: FeeManagerFacet;
      let otherSigner: SignerWithAddress;
      let eoaReceiver: SignerWithAddress;
      let receiver1: DepositableMock;
      let receiver1Address: string;
      let receiver2: DepositableMock;
      let receiver2Address: string;

      beforeEach(async () => {
        [, , otherSigner, eoaReceiver] = await ethers.getSigners();
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        const deployerSigner = await ethers.getSigner(deployer);

        ({ address: receiver1Address } = await deploy('DepositableMockA', {
          from: deployer,
          contract: 'DepositableMock',
        }));

        ({ address: receiver2Address } = await deploy('DepositableMockB', {
          from: deployer,
          contract: 'DepositableMock',
        }));

        receiver1 = await ethers.getContractAt('DepositableMock', receiver1Address, deployerSigner);
        receiver2 = await ethers.getContractAt('DepositableMock', receiver2Address, deployerSigner);
        feeManagerFacet = await ethers.getContractAt('FeeManagerFacet', diamondAddress, deployerSigner);

        await feeManagerFacet.addFeeConfig({
          id: feeId,
          fee: 100,
          receiver: ZeroAddress,
          ftype: FeeType.Default,
          currency: FeeCurrency.Native,
        });

        await feeManagerFacet.addFeeConfig({
          id: feeIdOther,
          fee: 100,
          receiver: DEAD_ADDRESS,
          ftype: FeeType.Default,
          currency: FeeCurrency.Native,
        });

        await feeDistributorFacet.addFeeDistributionReceiver(addReceiverParams(receiver1Address, receiverName1, 40000));
        await feeDistributorFacet.addFeeDistributionReceiver(addReceiverParams(receiver2Address, receiverName2, 40000));
        await feeDistributorFacet.addFeeDistributionReceiver(
          addReceiverParams(eoaReceiver.address, receiverName3, 20000)
        );

        // prepare LP
        await nativeWrapper.deposit({ value: parseEther('10') });
        await nativeWrapper.connect(lp).approve(routerAddress, MaxInt256);
        await baseToken.connect(lp).approve(routerAddress, MaxInt256);
        await baseToken.transfer(diamondAddress, parseEther('4'));
        await nativeWrapper.transfer(lp.address, parseEther('10'));
        await baseToken.transfer(lp.address, parseEther('10'));
      });

      it('should be done when fees are getting pushed', async () => {
        const { deployer } = await getNamedAccounts();
        const dtoMock: FeeConfigSyncHomeDTOStruct = { fees: [], bountyReceiver: ZeroAddress, totalFees: 0 };

        await expect(
          feeDistributorFacet.connect(otherSigner).setPushFeesGasCompensationForCaller(500000)
        ).to.be.revertedWith(accessControlError(await otherSigner.getAddress(), FEE_DISTRIBUTOR_MANAGER));

        await expect(feeDistributorFacet.setPushFeesGasCompensationForCaller(500000))
          .to.emit(feeDistributorFacet, 'PushFeesGasCompensationForCallerUpdate')
          .withArgs(500000);

        await expect(feeDistributorFacet.connect(otherSigner).pushFees(erc20Address, 0, dtoMock)).to.be.revertedWith(
          accessControlError(await otherSigner.getAddress(), FEE_DISTRIBUTOR_PUSH_ROLE)
        );
        await expect(feeDistributorFacet.pushFees(erc20Address, 0, dtoMock)).to.be.revertedWithCustomError(
          feeDistributorFacet,
          'WrongToken'
        );
        await expect(feeDistributorFacet.pushFees(baseTokenAddress, 0, dtoMock)).to.be.revertedWithCustomError(
          feeDistributorFacet,
          'ZeroValueNotAllowed'
        );
        await expect(
          feeDistributorFacet.pushFees(baseTokenAddress, parseEther('2'), dtoMock)
        ).to.be.revertedWithCustomError(feeDistributorFacet, 'MissingData');

        await baseToken.transfer(diamondAddress, parseEther('2'));
        await feeDistributorFacet.startFeeDistribution();

        const tx = await feeDistributorFacet.pushFees(baseTokenAddress, parseEther('2'), {
          fees: [
            {
              id: feeId,
              amount: parseEther('1'),
            },
            {
              id: feeIdOther,
              amount: parseEther('1'),
            },
          ],
          bountyReceiver: ZeroAddress,
          totalFees: parseEther('2'),
        });
        await expect(tx)
          .to.emit(feeDistributorFacet, 'Distributed')
          .withArgs(receiver1Address, 399999999999900000n)
          .to.emit(feeDistributorFacet, 'Distributed')
          .withArgs(receiver2Address, 399999999999900000n)
          .to.emit(feeDistributorFacet, 'Distributed')
          .withArgs(eoaReceiver.address, 199999999999950000n)
          .to.emit(feeDistributorFacet, 'Distributed')
          .withArgs(DEAD_ADDRESS, 999999999999750000n)
          .to.emit(receiver1, 'depositEvent')
          .withArgs(nativeWrapperAddress, 399999999999900000n)
          .to.emit(receiver2, 'depositEvent')
          .withArgs(nativeWrapperAddress, 399999999999900000n);

        await expect(tx).to.changeTokenBalances(
          nativeWrapper,
          [receiver1Address, receiver2Address],
          [399999999999900000n, 399999999999900000n]
        );

        await expect(tx).to.changeEtherBalances(
          [eoaReceiver.address, DEAD_ADDRESS, deployer],
          [199999999999950000n, 999999999999750000n, 500000n]
        );
      });

      it('should pay bounties in native when fees are getting pushed and distributed', async () => {
        await baseToken.transfer(diamondAddress, parseEther('2'));
        await feeDistributorFacet.enableFeeDistributorBounty();
        await feeDistributorFacet.startFeeDistribution();

        const bountyWallet = ethers.Wallet.createRandom();
        const tx = feeDistributorFacet.pushFees(baseTokenAddress, parseEther('2'), {
          fees: [
            {
              id: feeId,
              amount: parseEther('2'),
            },
            {
              id: feeIdOther,
              amount: parseEther('2'),
            },
          ],
          bountyReceiver: bountyWallet.address,
          totalFees: parseEther('4'),
        });

        await expect(tx)
          .to.emit(feeDistributorFacet, 'Distributed')
          .withArgs(receiver1Address, parseEther('0.396'))
          .and.to.emit(feeDistributorFacet, 'Distributed')
          .withArgs(receiver2Address, parseEther('0.396'))
          .and.to.emit(feeDistributorFacet, 'Distributed')
          .withArgs(eoaReceiver.address, parseEther('0.198'))
          .and.to.emit(feeDistributorFacet, 'Distributed')
          .withArgs(DEAD_ADDRESS, parseEther('0.99'))
          .and.to.emit(receiver1, 'depositEvent')
          .withArgs(nativeWrapperAddress, parseEther('0.396'))
          .and.to.emit(receiver2, 'depositEvent')
          .withArgs(nativeWrapperAddress, parseEther('0.396'));

        await expect(tx).to.changeTokenBalances(
          nativeWrapper,
          [receiver1Address, receiver2Address],
          [parseEther('0.396'), parseEther('0.396')]
        );

        await expect(tx).to.changeEtherBalances(
          [eoaReceiver.address, DEAD_ADDRESS, bountyWallet.address],
          [parseEther('0.198'), parseEther('0.99'), parseEther('0.02')]
        );

        expect(await feeDistributorFacet.getFeeDistributorLastBounty()).to.deep.eq([
          bountyWallet.address,
          parseEther('0.02'),
        ]);
      });

      it('should pay bounties in token when fees are getting pushed and distributed', async () => {
        await baseToken.transfer(diamondAddress, parseEther('2'));
        await feeDistributorFacet.enableFeeDistributorBounty();
        await feeDistributorFacet.enableBountyInToken(true);
        await feeDistributorFacet.startFeeDistribution();

        const bountyWallet = ethers.Wallet.createRandom();
        await expect(
          feeDistributorFacet.pushFees(baseTokenAddress, parseEther('2'), {
            fees: [
              {
                id: feeId,
                amount: parseEther('2'),
              },
              {
                id: feeIdOther,
                amount: parseEther('2'),
              },
            ],
            bountyReceiver: bountyWallet.address,
            totalFees: parseEther('4'),
          })
        ).to.changeTokenBalance(baseToken, bountyWallet.address, parseEther('0.02'));
      });

      it('should not pay bounties when share is set to 0', async () => {
        const bountyWallet = ethers.Wallet.createRandom();
        await feeDistributorFacet.enableFeeDistributorBounty();
        await feeDistributorFacet.startFeeDistribution();

        await baseToken.transfer(diamondAddress, parseEther('2'));

        await feeDistributorFacet.pushFees(baseTokenAddress, parseEther('2'), {
          fees: [
            {
              id: feeId,
              amount: parseEther('2'),
            },
            {
              id: feeIdOther,
              amount: parseEther('2'),
            },
          ],
          bountyReceiver: bountyWallet.address,
          totalFees: parseEther('4'),
        });

        await feeDistributorFacet.setFeeDistributorBountyShare(0);

        await baseToken.transfer(diamondAddress, parseEther('2'));
        const tx = await feeDistributorFacet.pushFees(baseTokenAddress, parseEther('2'), {
          fees: [
            {
              id: feeId,
              amount: parseEther('2'),
            },
            {
              id: feeIdOther,
              amount: parseEther('2'),
            },
          ],
          bountyReceiver: bountyWallet.address,
          totalFees: parseEther('4'),
        });

        await expect(tx)
          .to.emit(feeDistributorFacet, 'Distributed')
          .withArgs(receiver1Address, parseEther('0.4'))
          .and.to.emit(feeDistributorFacet, 'Distributed')
          .withArgs(receiver2Address, parseEther('0.4'))
          .and.to.emit(feeDistributorFacet, 'Distributed')
          .withArgs(eoaReceiver.address, parseEther('0.2'))
          .and.to.emit(feeDistributorFacet, 'Distributed')
          .withArgs(DEAD_ADDRESS, parseEther('1'))
          .and.to.emit(receiver1, 'depositEvent')
          .withArgs(nativeWrapperAddress, parseEther('0.4'))
          .and.to.emit(receiver2, 'depositEvent')
          .withArgs(nativeWrapperAddress, parseEther('0.4'));

        await expect(tx).to.changeTokenBalances(
          nativeWrapper,
          [receiver1Address, receiver2Address],
          [parseEther('0.4'), parseEther('0.4')]
        );

        await expect(tx).to.changeEtherBalances(
          [eoaReceiver.address, DEAD_ADDRESS, bountyWallet.address],
          [parseEther('0.2'), parseEther('1'), parseEther('0')]
        );

        expect(await feeDistributorFacet.getFeeDistributorLastBounty()).to.deep.eq([
          bountyWallet.address,
          parseEther('0.02'),
        ]);

        expect(await feeDistributorFacet.getFeeDistributorTotalBounties()).to.eq(parseEther('0.02'));
      });

      it('should be initiated after distribution was stopped', async () => {
        await baseToken.transfer(diamondAddress, parseEther('3'));
        await expect(
          feeDistributorFacet.pushFees(baseTokenAddress, parseEther('2'), {
            fees: [
              {
                id: feeId,
                amount: parseEther('2'),
              },
              {
                id: feeIdOther,
                amount: parseEther('2'),
              },
            ],
            bountyReceiver: ZeroAddress,
            totalFees: parseEther('4'),
          })
        )
          .to.emit(feeDistributorFacet, 'TriggerDistributionWhileNotRunning')
          .to.emit(feeDistributorFacet, 'TriggerDistributionWhileNotRunning')
          .to.emit(feeDistributorFacet, 'TriggerDistributionWhileNotRunning');

        await feeDistributorFacet.pushFees(baseTokenAddress, parseEther('1'), {
          fees: [
            {
              id: feeId,
              amount: parseEther('2'),
            },
          ],
          bountyReceiver: ZeroAddress,
          totalFees: parseEther('2'),
        });

        expect(await feeDistributorFacet.getFeeDistributorQueue()).to.have.a.lengthOf(2);

        const tx = await feeDistributorFacet.startFeeDistribution();

        await expect(tx)
          .to.emit(feeDistributorFacet, 'Distributed')
          .withArgs(receiver1Address, parseEther('0.4'))
          .to.emit(feeDistributorFacet, 'Distributed')
          .withArgs(receiver2Address, parseEther('0.4'))
          .to.emit(feeDistributorFacet, 'Distributed')
          .withArgs(eoaReceiver.address, parseEther('0.2'))
          .to.emit(feeDistributorFacet, 'Distributed')
          .withArgs(DEAD_ADDRESS, parseEther('1'))
          .to.emit(receiver2, 'depositEvent')
          .withArgs(nativeWrapperAddress, parseEther('0.4'))
          .to.emit(receiver2, 'depositEvent')
          .withArgs(nativeWrapperAddress, parseEther('0.4'));

        await expect(tx).to.changeTokenBalances(
          nativeWrapper,
          [receiver1Address, receiver2Address],
          [parseEther('0.8'), parseEther('0.8')]
        );

        await expect(tx).to.changeEtherBalances(
          [eoaReceiver.address, DEAD_ADDRESS],
          [parseEther('0.4'), parseEther('1')]
        );

        expect(await feeDistributorFacet.getFeeDistributorQueue()).to.have.a.lengthOf(0);
      });

      it("should not distribute when there are no shares available, instead start queue'ing", async () => {
        await feeDistributorFacet.removeFeeDistributionReceiver(receiver1Address);
        await feeDistributorFacet.removeFeeDistributionReceiver(receiver2Address);
        await expect(
          feeDistributorFacet.pushFees(baseTokenAddress, parseEther('2'), {
            fees: [
              {
                id: feeId,
                amount: parseEther('1'),
              },
              {
                id: feeIdOther,
                amount: parseEther('1'),
              },
            ],
            bountyReceiver: ZeroAddress,
            totalFees: parseEther('2'),
          })
        ).to.emit(feeDistributorFacet, 'TriggerDistributionWhileNotRunning');
        expect(await feeDistributorFacet.getFeeDistributorQueue()).to.have.a.lengthOf(1);
      });

      it('should swap to a different token if a receiver expects this', async () => {
        await feeDistributorFacet.removeFeeDistributionReceiver(receiver2Address);

        await feeDistributorFacet.addFeeDistributionReceiver(
          addReceiverParams(receiver2Address, receiverName2, 120000, [nativeWrapperAddress, erc20Address])
        );

        // prepare LP
        await erc20.transfer(lp.address, parseEther('10'));
        await erc20.connect(lp).approve(routerAddress, MaxInt256);

        await feeDistributorFacet.startFeeDistribution();

        await baseToken.transfer(diamondAddress, parseEther('4'));
        const tx = await feeDistributorFacet.pushFees(baseTokenAddress, parseEther('4'), {
          fees: [
            {
              id: feeId,
              amount: parseEther('2'),
            },
          ],
          bountyReceiver: ZeroAddress,
          totalFees: parseEther('2'),
        });
        await expect(tx).to.emit(router, 'swapExactAVAXForTokensEvent');
        await expect(tx).to.changeTokenBalances(baseToken, [diamondAddress, lp], [parseEther('-4'), parseEther('4')]);
        await expect(tx).to.changeTokenBalances(
          erc20,
          [receiver2Address, lp],
          [parseEther('2.666666666666666668'), parseEther('-2.666666666666666668')]
        );
      });
    });
  });
});
