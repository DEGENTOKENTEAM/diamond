import { expect } from 'chai';
import { ZeroAddress, parseEther, toBeHex } from 'ethers';
import { deployments, ethers, getNamedAccounts } from 'hardhat';
import { deployFacet } from '../scripts/helpers/deploy-diamond';
import { addFacets } from '../scripts/helpers/diamond';
import { AccessControlEnumerableFacet, DegenATM, ERC20Facet } from '../typechain-types';
import { deployFixture as deployDiamondFixture } from './utils/helper';
import { ADMIN_ROLE, MINTER_ROLE } from './utils/mocks';

// load env config
import { mine, setBalance, time } from '@nomicfoundation/hardhat-network-helpers';
import * as dotenv from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';
import { ZERO_ADDR } from '../providers/celer-contracts/test/lib/constants';
const dotEnvConfig = dotenv.config();
dotenvExpand(dotEnvConfig);

const deployFixture = async () => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // deploy diamond
  const { diamondAddress } = await deployDiamondFixture();

  // deploy launcher
  const { address } = await deploy('DegenATM', { from: deployer, skipIfAlreadyDeployed: false });
  const atm = await ethers.getContractAt('DegenATM', address);

  const { facetContract: token } = await deployFacet('ERC20Facet');
  const { facetContract: access } = await deployFacet('AccessControlEnumerableFacet');
  await addFacets([token, access], diamondAddress);

  const erc20Facet = await ethers.getContractAt('ERC20Facet', diamondAddress);
  const accessControl = await ethers.getContractAt('AccessControlEnumerableFacet', diamondAddress);
  const launchAddress = await atm.getAddress();

  // init & configure
  await (await erc20Facet.initERC20Facet('A', 'B', 18)).wait();
  await (await accessControl.grantRole(MINTER_ROLE, launchAddress)).wait();
  await (await accessControl.grantRole(ADMIN_ROLE, launchAddress)).wait();

  return {
    diamondAddress,
    launchAddress,
    deployer,
    atm,
    erc20Facet,
    accessControl,
  };
};

describe('Degen ATM', function () {
  let deployer: string, diamondAddress: string, launchAddress: string;
  let atm: DegenATM;
  let erc20Facet: ERC20Facet;
  let accessControl: AccessControlEnumerableFacet;

  beforeEach(async function () {
    const data = await deployFixture();
    atm = data.atm;
    deployer = data.deployer;
    erc20Facet = data.erc20Facet;
    accessControl = data.accessControl;
    launchAddress = data.launchAddress;
    diamondAddress = data.diamondAddress;
  });

  describe('Deployment', function () {
    it('should deploy successfully', async function () {
      expect(await atm.tokensPerOneNative()).to.eq(0);
      expect(await atm.token()).to.eq(ZeroAddress);
    });
  });

  describe('Configuration', function () {
    it('should set a token', async function () {
      await (await atm.setToken(deployer)).wait();
      expect(await atm.token()).to.eq(deployer);
    });

    it('should set an allocation rate for pre investors to claim', async function () {
      await (await atm.setAllocationRate(123)).wait();
      expect(await atm.tokensPerOneNative()).to.eq(123);
    });

    it('should set an allocation limit for pre investors to deposit', async function () {
      await (await atm.setAllocationLimit(123)).wait();
      expect(await atm.allocationLimit()).to.eq(123);
    });
  });

  describe('Whitelist', function () {
    it('should add an address', async function () {
      await (await atm.addToWhitelist(deployer)).wait();
      expect(await atm.whitelist(deployer)).to.be.true;
    });

    it('should add multiple addresses at once', async function () {
      const addresses = [ethers.Wallet.createRandom().address, ethers.Wallet.createRandom().address];
      await (await atm.addToWhitelistInBulk(addresses)).wait();
      expect(await atm.whitelist(addresses[0])).to.be.true;
      expect(await atm.whitelist(addresses[1])).to.be.true;
      expect(await atm.whitelist(deployer)).to.be.false;
    });

    it('should remove an address', async function () {
      await (await atm.addToWhitelist(deployer)).wait();
      await (await atm.removeFromWhitelist(deployer)).wait();
      expect(await atm.whitelist(deployer)).to.be.false;
    });
  });

  describe('Pre-Launch Actions', function () {
    it('should deposit native tokens', async function () {
      await expect(atm.deposit({ value: parseEther('1') })).to.be.revertedWith('not started');
      await (await atm.enableCollecting(true)).wait();
      await expect(atm.deposit({ value: parseEther('1') })).to.be.revertedWith('not whitelisted');
      await (await atm.addToWhitelist(deployer)).wait();
      await expect(atm.deposit({ value: parseEther('1') })).to.changeEtherBalances(
        [deployer, await atm.getAddress()],
        [parseEther('-1'), parseEther('1')]
      );
      expect(await atm.deposits(deployer)).to.eq(parseEther('1'));
    });

    it('should deposit native tokens doing a transfer', async function () {
      await (await atm.addToWhitelist(deployer)).wait();
      await (await atm.enableCollecting(true)).wait();
      const [deployerSigner] = await ethers.getSigners();
      await (await deployerSigner.sendTransaction({ to: await atm.getAddress(), value: parseEther('1') })).wait();
      expect(await atm.deposits(deployer)).to.eq(parseEther('1'));
    });

    it('should deposit too much native tokens and reach max', async function () {
      await (await atm.addToWhitelist(deployer)).wait();
      await (await atm.enableCollecting(true)).wait();
      await expect(atm.deposit({ value: parseEther('3.3') })).to.changeEtherBalances(
        [deployer, await atm.getAddress()],
        [parseEther('-3'), parseEther('3')]
      );
      expect(await atm.deposits(deployer)).to.eq(parseEther('3'));
    });

    it('should return the funds if someone is removed from the whitelist', async () => {
      await (await atm.addToWhitelist(deployer)).wait();
      await (await atm.enableCollecting(true)).wait();
      await (await atm.deposit({ value: parseEther('1') })).wait();
      await expect(atm.removeFromWhitelist(deployer)).to.changeEtherBalances(
        [await atm.getAddress(), deployer],
        [parseEther('-1'), parseEther('1')]
      );
    });
  });

  describe('Post-Launch Actions', function () {
    it('should claim tokens', async function () {
      const [, wlNoDeposit, noWl] = await ethers.getSigners();
      const atmAddress = await atm.getAddress();

      // prepare
      await (await atm.setToken(diamondAddress)).wait();
      await (await erc20Facet.enable()).wait();
      await (await erc20Facet.mint(atmAddress, parseEther('29'))).wait();
      await (await atm.addToWhitelist(deployer)).wait();
      await (await atm.addToWhitelist(wlNoDeposit.address)).wait();
      await (await atm.enableCollecting(true)).wait();
      await (await atm.deposit({ value: parseEther('1.5') })).wait();

      await expect(atm.claimTokens()).to.be.revertedWith('not started');

      await expect(atm.enableClaiming(true)).to.be.rejectedWith('no rate set');

      await (await atm.setAllocationRate(parseEther('20'))).wait();
      await expect(atm.enableClaiming(true)).to.emit(atm, 'ClaimingEnabled');

      await expect(atm.connect(noWl).claimTokens()).to.be.revertedWith('not whitelisted');
      await expect(atm.connect(wlNoDeposit).claimTokens()).to.be.revertedWith('not deposited');
      await expect(atm.claimTokens()).to.be.revertedWithCustomError(erc20Facet, 'ERC20Base__TransferExceedsBalance');

      await (await erc20Facet.mint(atmAddress, parseEther('1'))).wait();

      const claimTx = await atm.claimTokens();
      await expect(claimTx).to.emit(atm, 'Claimed').withArgs(deployer, parseEther('30')); // 1.5 * 20
      await expect(claimTx).to.changeTokenBalances(
        erc20Facet,
        [atmAddress, deployer],
        [parseEther('-30'), parseEther('30')]
      );

      await expect(atm.setToken(diamondAddress)).to.be.revertedWith('claiming already started');
      await expect(atm.claimTokens()).to.be.revertedWith('already claimed');
      await expect(atm.enableClaiming(false)).to.emit(atm, 'ClaimingDisabled');
      await expect(atm.enableCollecting(false)).to.emit(atm, 'CollectingDisabled');
    });

    it('should join locking', async () => {
      const [, wlNoDeposit, noWl, wlDepositAndClaim] = await ethers.getSigners();
      const atmAddress = await atm.getAddress();

      // prepare
      await setBalance(wlDepositAndClaim.address, parseEther('100'));
      await (await atm.setToken(diamondAddress)).wait();
      await (await erc20Facet.enable()).wait();
      await (await erc20Facet.mint(atmAddress, parseEther('90'))).wait();
      await (await atm.addToWhitelist(deployer)).wait();
      await (await atm.addToWhitelist(wlNoDeposit.address)).wait();
      await (await atm.addToWhitelist(wlDepositAndClaim.address)).wait();
      await (await atm.enableCollecting(true)).wait();
      await (await atm.deposit({ value: parseEther('1.5') })).wait();
      await (await atm.connect(wlDepositAndClaim).deposit({ value: parseEther('3') })).wait();
      await (await atm.setAllocationRate(parseEther('20'))).wait();
      await (await atm.enableCollecting(false)).wait();

      await expect(atm.lockJoin()).to.be.revertedWith('not started');

      await (await atm.enableClaiming(true)).wait();
      await (await atm.connect(wlDepositAndClaim).claimTokens()).wait();

      await expect(atm.connect(noWl).lockJoin()).to.be.revertedWith('not whitelisted');
      await expect(atm.connect(wlNoDeposit).lockJoin()).to.be.revertedWith('not deposited');
      await expect(atm.connect(wlDepositAndClaim).lockJoin()).to.be.revertedWith('already claimed');
      await expect(atm.lockJoin()).to.emit(atm, 'LockJoin').withArgs(deployer, parseEther('30'));

      expect(await atm.locked(deployer)).to.be.true;
      expect(await atm.lockedAmount(deployer)).to.eq(parseEther('30'));
      await expect(atm.lockJoin()).to.be.revertedWith('already locked');
    });

    it('should leave locking before lock period starts', async () => {
      const [, noLock, wlDepositAndClaim] = await ethers.getSigners();
      const atmAddress = await atm.getAddress();

      // prepare
      await setBalance(wlDepositAndClaim.address, parseEther('10'));
      await (await atm.setToken(diamondAddress)).wait();
      await (await erc20Facet.enable()).wait();
      await (await erc20Facet.mint(atmAddress, parseEther('90'))).wait();
      await (await atm.addToWhitelist(deployer)).wait();
      await (await atm.addToWhitelist(wlDepositAndClaim.address)).wait();
      await (await atm.enableCollecting(true)).wait();
      await (await atm.deposit({ value: parseEther('1.5') })).wait();
      await (await atm.connect(wlDepositAndClaim).deposit({ value: parseEther('1.5') })).wait();
      await (await atm.setAllocationRate(parseEther('20'))).wait();
      await (await atm.enableCollecting(false)).wait();
      await (await atm.enableClaiming(true)).wait();
      await (await atm.connect(wlDepositAndClaim).claimTokens()).wait();
      await (await atm.lockJoin()).wait();

      await expect(atm.connect(noLock).lockLeave()).to.be.revertedWith('not locked');
      const tx = atm.lockLeave();
      await expect(tx).to.emit(atm, 'LockLeave').withArgs(deployer, parseEther('30'), 0, 0);
      await expect(tx).to.changeTokenBalances(
        erc20Facet,
        [atmAddress, deployer],
        [parseEther('-30'), parseEther('30')]
      );
      await expect(atm.lockJoin()).to.be.revertedWith('already claimed');
      await expect(atm.lockLeave()).to.be.revertedWith('not locked');
      await expect(atm.connect(wlDepositAndClaim).lockJoin()).to.be.revertedWith('already claimed');
      expect(await atm.locked(deployer)).to.be.false;
      expect(await atm.claimed(deployer)).to.be.true;
      expect(await atm.lockedAmount(deployer)).to.eq(0);
      expect(await atm.claimedAmount(deployer)).to.eq(parseEther('30'));
    });

    it('should leave locking after lock period starts', async () => {
      const [lockerA, lockerB] = await ethers.getSigners();
      const atmAddress = await atm.getAddress();

      const initialStats = [false, false, false, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n];

      expect(await atm.getStatsForQualifier(lockerA.address)).to.deep.eq([...initialStats]);
      expect(await atm.getStatsForQualifier(lockerB.address)).to.deep.eq([...initialStats]);

      // prepare
      await (await atm.setToken(diamondAddress)).wait();
      await (await erc20Facet.enable()).wait();
      await (await erc20Facet.mint(atmAddress, parseEther('8000'))).wait();

      await (await atm.addToWhitelist(lockerA.address)).wait();
      await (await atm.addToWhitelist(lockerB.address)).wait();
      initialStats[0] = true;
      expect(await atm.getStatsForQualifier(lockerA.address)).to.deep.eq([...initialStats]);
      expect(await atm.getStatsForQualifier(lockerB.address)).to.deep.eq([...initialStats]);

      await (await atm.enableCollecting(true)).wait();
      await (await atm.connect(lockerA).deposit({ value: parseEther('3') })).wait();
      await (await atm.connect(lockerB).deposit({ value: parseEther('3') })).wait();
      initialStats[6] = 3000000000000000000n;
      expect(await atm.getStatsForQualifier(lockerA.address)).to.deep.eq([...initialStats]);
      expect(await atm.getStatsForQualifier(lockerB.address)).to.deep.eq([...initialStats]);

      await (await atm.setAllocationRate(parseEther('1000'))).wait();
      initialStats[10] = 720000000000000000000n;
      initialStats[11] = 3720000000000000000000n;
      expect(await atm.getStatsForQualifier(lockerA.address)).to.deep.eq([...initialStats]);
      expect(await atm.getStatsForQualifier(lockerB.address)).to.deep.eq([...initialStats]);

      await (await atm.enableCollecting(false)).wait();
      await expect(atm.startLockPeriod()).to.be.revertedWith('not started');
      await (await atm.enableClaiming(true)).wait();
      await (await atm.connect(lockerA).lockJoin()).wait();
      await (await atm.connect(lockerB).lockJoin()).wait();
      initialStats[2] = true;
      initialStats[4] = 3000000000000000000000n;
      expect(await atm.getStatsForQualifier(lockerA.address)).to.deep.eq([...initialStats]);
      expect(await atm.getStatsForQualifier(lockerB.address)).to.deep.eq([...initialStats]);

      await expect(atm.startLockPeriod()).to.emit(atm, 'StartLockPeriod');
      expect(await atm.getStatsForQualifier(lockerA.address)).to.deep.eq([...initialStats]);
      expect(await atm.getStatsForQualifier(lockerB.address)).to.deep.eq([...initialStats]);

      await expect(atm.startLockPeriod()).to.be.revertedWith('lock period already started');

      const startTimestamp = await atm.startTimestamp();
      const totalPeriod = await atm.LOCK_PERIOD();

      const rewardStats = [
        [86400n, 1972602739726027397n, 1380821917808219177n, 591780821917808220n],
        [864000n, 19726027397260273972n, 13808219178082191780n, 5917808219178082192n],
        [8640000n, 197260273972602739725n, 138082191780821917807n, 59178082191780821918n], // prettier-ignore
        [totalPeriod - 1n, 719999977168949771689n, 503999984018264840182n, 215999993150684931507n], // prettier-ignore
        [totalPeriod, 720000000000000000000n, 0n, 720000000000000000000n],
        [100000000n, 720000000000000000000n, 0n, 720000000000000000000n],
      ];

      const indexToLockLeave = 2;
      for (let i in rewardStats) {
        const stats = rewardStats[i];
        if (stats[0] > 0) {
          await time.setNextBlockTimestamp(toBeHex(startTimestamp + stats[0]));
          await mine();
        }
        initialStats[7] = stats[1];
        initialStats[8] = stats[2];
        initialStats[9] = stats[3];
        expect(await atm.getStatsForQualifier(lockerA)).to.deep.eq([...initialStats]);

        if (indexToLockLeave === parseInt(i)) {
          // lock leave
          const txB = atm.connect(lockerB).lockLeave();
          await expect(txB)
            .to.emit(atm, 'LockLeave')
            .withArgs(
              lockerB.address,
              parseEther('3059.178089041095890411'),
              parseEther('59.178089041095890411'),
              parseEther('138.082207762557077625')
            );
          await expect(txB).to.changeTokenBalances(
            erc20Facet,
            [atmAddress, lockerB.address],
            [parseEther('-3059.178089041095890411'), parseEther('3059.178089041095890411')]
          );
        } else if (parseInt(i) < indexToLockLeave) {
          expect(await atm.getStatsForQualifier(lockerB)).to.deep.eq([...initialStats]);
        }
      }

      // lock leave
      const txA = atm.connect(lockerA).lockLeave();
      await expect(txA).to.emit(atm, 'LockLeave').withArgs(lockerA.address, parseEther('3720'), parseEther('720'), 0);
      await expect(txA).to.changeTokenBalances(
        erc20Facet,
        [atmAddress, lockerA.address],
        [parseEther('-3720'), parseEther('3720')]
      );
    });

    it('should be able to claim tokens after the lock period has started', async () => {
      const atmAddress = await atm.getAddress();

      // prepare
      await (await atm.setToken(diamondAddress)).wait();
      await (await erc20Facet.enable()).wait();
      await (await erc20Facet.mint(atmAddress, parseEther('3000'))).wait();
      await (await atm.addToWhitelist(deployer)).wait();
      await (await atm.enableCollecting(true)).wait();
      await (await atm.deposit({ value: parseEther('3') })).wait();
      await (await atm.setAllocationRate(parseEther('1000'))).wait();
      await (await atm.enableCollecting(false)).wait();
      await (await atm.enableClaiming(true)).wait();
      await (await atm.startLockPeriod()).wait();

      await expect(atm.lockJoin()).to.be.revertedWith('lock not possible anymore');

      const claimTx = await atm.claimTokens();
      await expect(claimTx).to.emit(atm, 'Claimed').withArgs(deployer, parseEther('3000'));
      await expect(claimTx).to.changeTokenBalances(
        erc20Facet,
        [atmAddress, deployer],
        [parseEther('-3000'), parseEther('3000')]
      );
    });

    it('should return statistics', async () => {
      const atmAddress = await atm.getAddress();
      const [, nolock] = await ethers.getSigners();
      await setBalance(nolock.address, parseEther('10'));

      const initialData = [
        false,
        false,
        false,
        ZERO_ADDR,
        0n,
        3000000000000000000n,
        0n,
        0n,
        0n,
        0n,
        0n,
        0n,
        0n,
        0n,
        0n,
        31536000n,
        7000n,
        2400n,
      ];

      expect(await atm.getStats()).to.deep.eq([...initialData]);

      // prepare
      await (await atm.setToken(diamondAddress)).wait();
      initialData[3] = diamondAddress;
      expect(await atm.getStats()).to.deep.eq([...initialData]);

      await (await erc20Facet.enable()).wait();
      await (await erc20Facet.mint(atmAddress, parseEther('6000'))).wait();
      initialData[4] = 6000000000000000000000n;
      expect(await atm.getStats()).to.deep.eq([...initialData]);

      await (await atm.addToWhitelist(deployer)).wait();
      await (await atm.addToWhitelist(nolock.address)).wait();
      await (await atm.enableCollecting(true)).wait();
      initialData[0] = true;
      expect(await atm.getStats()).to.deep.eq([...initialData]);

      await (await atm.connect(nolock).deposit({ value: parseEther('2') })).wait();
      await (await atm.deposit({ value: parseEther('3') })).wait();
      initialData[7] = 5000000000000000000n;
      expect(await atm.getStats()).to.deep.eq([...initialData]);

      await (await atm.setAllocationRate(parseEther('1000'))).wait();
      initialData[6] = 1000000000000000000000n;
      initialData[12] = 5000000000000000000000n;
      expect(await atm.getStats()).to.deep.eq([...initialData]);

      await (await atm.enableCollecting(false)).wait();
      initialData[0] = false;
      expect(await atm.getStats()).to.deep.eq([...initialData]);

      await (await atm.enableClaiming(true)).wait();
      initialData[1] = true;
      expect(await atm.getStats()).to.deep.eq([...initialData]);

      await (await atm.lockJoin()).wait();
      initialData[8] = 3000000000000000000000n;
      initialData[10] = 720000000000000000000n;
      initialData[11] = 3720000000000000000000n;
      initialData[12] = 5720000000000000000000n;
      expect(await atm.getStats()).to.deep.eq([...initialData]);

      await (await atm.connect(nolock).claimTokens()).wait();
      initialData[4] = 4000000000000000000000n;
      initialData[9] = 2000000000000000000000n;
      expect(await atm.getStats()).to.deep.eq([...initialData]);

      await (await atm.startLockPeriod()).wait();
      const startTimestamp = await atm.startTimestamp();
      const lockPeriod = await atm.LOCK_PERIOD();
      initialData[2] = true;
      initialData[13] = startTimestamp;
      initialData[14] = startTimestamp + lockPeriod;
      expect(await atm.getStats()).to.deep.eq([...initialData]);
    });
  });

  describe('Additional Admin Actions', function () {
    it('should recover all tokens and native', async function () {
      const atmAddress = await atm.getAddress();

      // prepare
      const tokenAddress = await erc20Facet.getAddress();
      await (await atm.setToken(diamondAddress)).wait();
      await (await erc20Facet.enable()).wait();
      await (await erc20Facet.mint(atmAddress, parseEther('10'))).wait();
      await (await atm.addToWhitelist(deployer)).wait();
      await (await atm.enableCollecting(true)).wait();
      await (await atm.deposit({ value: parseEther('10') })).wait();

      await expect(atm.recoverNative()).to.changeEtherBalances(
        [atmAddress, deployer],
        [parseEther('-3'), parseEther('3')]
      );
      await expect(atm.recoverTokens(tokenAddress)).to.changeTokenBalances(
        erc20Facet,
        [atmAddress, deployer],
        [parseEther('-10'), parseEther('10')]
      );
    });

    it('should remove an address from whitelist and transfer funds back', async function () {
      await (await atm.addToWhitelist(deployer)).wait();
      await (await atm.enableCollecting(true)).wait();
      await (await atm.deposit({ value: parseEther('1') })).wait();
      expect(await atm.totalDeposits()).to.eq(parseEther('1'));
      const tx = await atm.removeFromWhitelist(deployer);
      await expect(tx).to.changeEtherBalances([launchAddress, deployer], [parseEther('-1'), parseEther('1')]);
      expect(await atm.totalDeposits()).to.eq(0);
      expect(await atm.deposits(deployer)).to.eq(0);
      expect(await atm.whitelist(deployer)).to.be.false;
    });
  });
});
