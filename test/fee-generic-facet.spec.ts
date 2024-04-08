import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { impersonateAccount, stopImpersonatingAccount } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ZeroAddress, parseEther } from 'ethers';
import hre, { ethers, network } from 'hardhat';
import { addOrReplaceFacets } from '../scripts/helpers/diamond';
import { ERC20, ERC20Mock, FeeDistributorFacet, FeeGenericFacet, IRouter02 } from '../typechain-types';
import { ERC20_PLATFORM_FEE, ERC20_REWARD_FEE } from '../utils/feeConfigs';
import { deployFixtures } from '../utils/fixtures';
import { FeeSyncAction } from './utils/enums';
import { addReceiverParams } from './utils/mocks';

describe('FeeGenericFacet', function () {
  let snapshotId: any;
  let feeGeneric$: FeeGenericFacet;
  let feeDistributor$: FeeDistributorFacet;
  let router$: IRouter02;
  let wallet: SignerWithAddress;
  let user0: SignerWithAddress;
  let btcbAddress: string;
  let routerAddress: string;
  let diamondAddress: string;
  let platformAddress: string;
  let nativeWrapperAddress: string;
  let liquidityBackingAddress: string;
  let liquidityBackingVaultAddress: string;
  let liquidityBackingDeployerAddress: string;
  let chainIdHome: number;

  beforeEach(async function () {
    const fixtures = await deployFixtures({ fixtures: ['InitialDeploy', 'DeployDegenX'] });

    ({
      diamondAddress,
      chainIdHome,
      nativeWrapperAddress,
      routerAddress,
      platformAddress,
      liquidityBackingAddress,
      liquidityBackingVaultAddress,
      liquidityBackingDeployerAddress,
      btcbAddress,
    } = fixtures);
    ({ feeGeneric$, feeDistributor$, router$ } = fixtures.contracts);
    ({ wallet, user0 } = fixtures.accounts);

    snapshotId = await network.provider.send('evm_snapshot');
  });

  afterEach(async function () {
    await network.provider.send('evm_revert', [snapshotId]);
  });

  describe('Pre init', function () {
    describe('Deployment', function () {
      it('should deploy successfully', async function () {
        expect(await feeGeneric$.getAddress()).to.be.eq(diamondAddress);
      });
    });

    describe('Initialization', function () {
      it('should initialize the contract', async function () {
        expect(await feeGeneric$.feeGenericIsInitialized()).to.be.false;
        await feeGeneric$.initFeeGenericFacet(chainIdHome, nativeWrapperAddress, routerAddress, true);
        expect(await feeGeneric$.feeGenericIsInitialized()).to.be.true;
      });

      it('should not initialize twice', async function () {
        await feeGeneric$.initFeeGenericFacet(chainIdHome, nativeWrapperAddress, routerAddress, true);
        await expect(
          feeGeneric$.initFeeGenericFacet(chainIdHome, nativeWrapperAddress, routerAddress, true)
        ).to.be.revertedWithCustomError(feeGeneric$, 'AlreadyInitialized');
      });
    });
  });

  describe('Post init', function () {
    const depositAmount = parseEther('1');

    describe('on home chain', function () {
      beforeEach(async function () {
        await deployFixtures({ fixtures: ['ConfigureDegenX'] });
        await feeDistributor$.removeFeeDistributionReceiver(liquidityBackingAddress);
        await feeDistributor$.addFeeDistributionReceiver(
          addReceiverParams(liquidityBackingAddress, 'Liquidity Backing', 10000, [nativeWrapperAddress, btcbAddress])
        );
        await feeDistributor$.startFeeDistribution();

        {
          // liquidity backing impersonating
          await impersonateAccount(liquidityBackingDeployerAddress);
          const lbdeployersigner = await ethers.getSigner(liquidityBackingDeployerAddress);
          const lbDepositerRole = '0x4809bcd78a33b02a95d4da92739427a3362048f8bbbb8f994360dc450575db24';
          const accessControlLB = await ethers.getContractAt(
            'IAccessControl',
            liquidityBackingAddress,
            lbdeployersigner
          );
          await accessControlLB.grantRole(lbDepositerRole, diamondAddress);
          await stopImpersonatingAccount(liquidityBackingDeployerAddress);
        }
      });

      it(`should check configures home chain id and return true if it is home chain`, async function () {
        expect(await feeGeneric$.feeGenericIsHomeChain()).to.be.true;
        expect(await feeGeneric$.feeGenericGetHomeChainId()).to.eq(chainIdHome);
      });

      it(`should deposit a single fee in native currency to a regular receiver`, async function () {
        const tx = await feeGeneric$.feeGenericDepositSingleFeeNative(ERC20_PLATFORM_FEE, ZeroAddress, 0, {
          value: depositAmount,
        });
        await expect(tx).to.emit(feeGeneric$, 'Distributed').withArgs(platformAddress, depositAmount);
        await expect(tx).to.changeEtherBalances([wallet.address, platformAddress], [parseEther('-1'), parseEther('1')]);
      });

      it(`should deposit a single fee in native currency as reward`, async function () {
        const tx = await feeGeneric$.feeGenericDepositSingleFeeNative(ERC20_REWARD_FEE, ZeroAddress, 0, {
          value: depositAmount,
        });
        await expect(tx).to.emit(feeGeneric$, 'Distributed').withArgs(liquidityBackingAddress, 69929n);
        await expect(tx).to.changeEtherBalances(
          [wallet.address, nativeWrapperAddress],
          [parseEther('-1'), parseEther('1')]
        );
        await expect(tx).to.changeTokenBalance(
          await ethers.getContractAt('ERC20', btcbAddress),
          liquidityBackingVaultAddress,
          69929n
        );
      });

      it(`should deposit a single fee in native currency receiving a bounty reward`, async function () {
        await feeDistributor$.enableFeeDistributorBounty();

        const tx = await feeGeneric$.feeGenericDepositSingleFeeNative(ERC20_REWARD_FEE, user0.address, 100, {
          value: depositAmount,
        });
        await expect(tx).to.emit(feeGeneric$, 'Distributed').withArgs(liquidityBackingAddress, 69230n);
        await expect(tx).to.changeEtherBalances(
          [wallet.address, user0.address, nativeWrapperAddress],
          [parseEther('-1'), parseEther('0.01'), parseEther('0.99')]
        );
        await expect(tx).to.changeTokenBalance(
          await ethers.getContractAt('ERC20', btcbAddress),
          liquidityBackingVaultAddress,
          69230n
        );
      });
    });

    describe('not on home chain', function () {
      let erc20Mock: ERC20Mock;
      let nativeWrapper: ERC20;
      beforeEach(async function () {
        // create erc20 mock for fee store
        const token = await ethers.getContractAt('ERC20Mock', ZeroAddress);
        const { deploy } = hre.deployments;
        const { address: erc20MockAddress } = await deploy('ERC20Mock', { from: wallet.address });
        const { address: feeStoreFacetAddress } = await deploy('FeeStoreFacetHomeChain', {
          contract: 'FeeStoreFacet',
          from: wallet.address,
        });

        // prepare diamond to have fee store in it to receive fees
        const feeStoreDiamond = await ethers.getContractAt('FeeStoreFacet', diamondAddress);
        const feeStoreContract = await ethers.getContractAt('FeeStoreFacet', feeStoreFacetAddress);

        await addOrReplaceFacets([feeStoreContract], diamondAddress);

        await feeStoreDiamond.initFeeStoreFacet(wallet.address, erc20MockAddress);
        await feeStoreDiamond.syncFees([
          { id: ERC20_PLATFORM_FEE, action: FeeSyncAction.Add, fee: 40, target: ZeroAddress },
        ]);

        // prepare LP
        await (await ethers.getContractAt('INativeWrapper', nativeWrapperAddress)).deposit({ value: parseEther('10') });

        erc20Mock = token.attach(erc20MockAddress) as ERC20Mock;
        await erc20Mock.approve(routerAddress, parseEther('10'));

        nativeWrapper = token.attach(nativeWrapperAddress) as ERC20;
        await nativeWrapper.approve(routerAddress, parseEther('10'));

        await router$.addLiquidity(
          erc20MockAddress,
          nativeWrapperAddress,
          parseEther('10'),
          parseEther('10'),
          0,
          0,
          wallet.address,
          9999999999
        );

        await feeGeneric$.initFeeGenericFacet(chainIdHome, nativeWrapperAddress, routerAddress, false);
      });

      it(`should return false`, async function () {
        expect(await feeGeneric$.feeGenericIsHomeChain()).to.be.false;
        expect(await feeGeneric$.feeGenericGetHomeChainId()).to.eq(chainIdHome);
      });

      it(`should deposit a single fee in native currency to a regular receiver`, async function () {
        await expect(
          feeGeneric$.feeGenericDepositSingleFeeNative(ERC20_PLATFORM_FEE, ZeroAddress, 0)
        ).to.be.revertedWithCustomError(feeGeneric$, 'ZeroValueNotAllowed');

        const tx = await feeGeneric$.feeGenericDepositSingleFeeNative(ERC20_PLATFORM_FEE, ZeroAddress, 0, {
          value: depositAmount,
        });
        await expect(tx).to.emit(feeGeneric$, 'Collected').withArgs(ERC20_PLATFORM_FEE, 906610893880149131n);
        await expect(tx).to.changeEtherBalances(
          [wallet.address, nativeWrapperAddress],
          [parseEther('-1'), parseEther('1')]
        );
      });

      it(`should deposit a single fee in native currency receiving a bounty reward`, async function () {
        const tx = await feeGeneric$.feeGenericDepositSingleFeeNative(ERC20_PLATFORM_FEE, user0.address, 100, {
          value: depositAmount,
        });
        await expect(tx).to.emit(feeGeneric$, 'Collected').withArgs(ERC20_PLATFORM_FEE, 898359247221496619n);
        await expect(tx).to.changeEtherBalances(
          [user0.address, nativeWrapperAddress],
          [parseEther('0.01'), parseEther('0.99')]
        );
      });
    });
  });
});
