import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { mine, setBalance, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ZeroAddress, parseEther, toBeHex } from 'ethers';
import { deployments, ethers, getNamedAccounts, network } from 'hardhat';
import { DegenATM, ERC20Mock } from '../typechain-types';

const deployFixture = async () => {
  let atm: DegenATM;
  let erc20: ERC20Mock;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const deployerSigner = await ethers.getSigner(deployer);

  setBalance(deployer, parseEther('1000'));

  {
    const { address } = await deploy('DegenATM', { from: deployer, skipIfAlreadyDeployed: false });
    atm = await ethers.getContractAt('DegenATM', address, deployerSigner);
  }

  {
    const { address } = await deploy('ERC20Mock', { from: deployer, skipIfAlreadyDeployed: false });
    erc20 = await ethers.getContractAt('ERC20Mock', address, deployerSigner);
  }

  return {
    deployer,
    deployerSigner,
    atm,
    erc20,
  };
};

describe('Degen ATM', function () {
  let atm: DegenATM;
  let erc20: ERC20Mock;
  let deployer: string;
  let deployerSigner: SignerWithAddress;
  let snapshotId: any;

  beforeEach(async function () {
    ({ atm, erc20, deployer, deployerSigner } = await deployFixture());
    snapshotId = await network.provider.send('evm_snapshot');
  });

  afterEach(async function () {
    await network.provider.send('evm_revert', [snapshotId]);
  });

  describe('Deployment', function () {
    it('should deploy successfully', async function () {
      expect(await atm.tokensPerOneNative()).to.eq(0);
      expect(await atm.token()).to.eq(ZeroAddress);
    });
  });

  describe('Configuration', function () {
    it('should set a token', async function () {
      await atm.setToken(deployer);
      expect(await atm.token()).to.eq(deployer);
    });

    it('should set an allocation rate for pre investors to claim', async function () {
      await atm.setAllocationRate(123);
      expect(await atm.tokensPerOneNative()).to.eq(123);
    });

    it('should set an allocation limit for pre investors to deposit', async function () {
      await atm.setAllocationLimit(123);
      expect(await atm.allocationLimit()).to.eq(123);
    });
  });

  describe('Whitelist', function () {
    it('should add an address', async function () {
      await atm.addToWhitelist(deployer);
      expect(await atm.whitelist(deployer)).to.be.true;
    });

    it('should add multiple addresses at once', async function () {
      const addresses = [ethers.Wallet.createRandom().address, ethers.Wallet.createRandom().address];
      await atm.addToWhitelistInBulk(addresses);
      expect(await atm.whitelist(addresses[0])).to.be.true;
      expect(await atm.whitelist(addresses[1])).to.be.true;
      expect(await atm.whitelist(deployer)).to.be.false;
    });

    it('should remove an address', async function () {
      await atm.addToWhitelist(deployer);
      await atm.removeFromWhitelist(deployer);
      expect(await atm.whitelist(deployer)).to.be.false;
    });
  });

  describe('Pre-Launch Actions', function () {
    it('should deposit native tokens', async function () {
      await expect(atm.deposit({ value: parseEther('1') })).to.be.revertedWith('not started');
      await atm.enableCollecting(true);
      await expect(atm.deposit({ value: parseEther('1') })).to.be.revertedWith('not whitelisted');
      await atm.addToWhitelist(deployer);
      await expect(atm.deposit({ value: parseEther('1') })).to.changeEtherBalances(
        [deployer, await atm.getAddress()],
        [parseEther('-1'), parseEther('1')]
      );
      expect(await atm.deposits(deployer)).to.eq(parseEther('1'));
    });

    it('should deposit native tokens doing a transfer', async function () {
      await atm.addToWhitelist(deployer);
      await atm.enableCollecting(true);
      await deployerSigner.sendTransaction({ to: await atm.getAddress(), value: parseEther('1') });
      expect(await atm.deposits(deployer)).to.eq(parseEther('1'));
    });

    it('should deposit too much native tokens and reach max', async function () {
      await atm.addToWhitelist(deployer);
      await atm.enableCollecting(true);
      await expect(atm.deposit({ value: parseEther('3.3') })).to.changeEtherBalances(
        [deployer, await atm.getAddress()],
        [parseEther('-3'), parseEther('3')]
      );
      expect(await atm.deposits(deployer)).to.eq(parseEther('3'));
    });

    it('should return the funds if someone is removed from the whitelist', async () => {
      await atm.addToWhitelist(deployer);
      await atm.enableCollecting(true);
      await atm.deposit({ value: parseEther('1') });
      await expect(atm.removeFromWhitelist(deployer)).to.changeEtherBalances(
        [await atm.getAddress(), deployer],
        [parseEther('-1'), parseEther('1')]
      );
    });
  });

  describe('Post-Launch Actions', function () {
    it('should claim tokens', async function () {
      const [, , wlNoDeposit, noWl] = await ethers.getSigners();
      const atmAddress = await atm.getAddress();

      // prepare
      await atm.setToken(await erc20.getAddress());
      await erc20.mint(atmAddress, parseEther('29'));
      await atm.addToWhitelist(deployer);
      await atm.addToWhitelist(wlNoDeposit.address);
      await atm.enableCollecting(true);
      await atm.deposit({ value: parseEther('1.5') });

      await expect(atm.claimTokens()).to.be.revertedWith('not started');

      await expect(atm.enableClaiming(true)).to.be.rejectedWith('no rate set');

      await atm.setAllocationRate(parseEther('20'));
      await expect(atm.enableClaiming(true)).to.emit(atm, 'ClaimingEnabled');

      await expect(atm.connect(noWl).claimTokens()).to.be.revertedWith('not whitelisted');
      await expect(atm.connect(wlNoDeposit).claimTokens()).to.be.revertedWith('not deposited');
      await expect(atm.claimTokens()).to.be.revertedWith('ERC20: transfer amount exceeds balance');

      await erc20.mint(atmAddress, parseEther('1'));

      const claimTx = await atm.claimTokens();
      await expect(claimTx).to.emit(atm, 'Claimed').withArgs(deployer, parseEther('30')); // 1.5 * 20
      await expect(claimTx).to.changeTokenBalances(
        erc20,
        [atmAddress, deployer],
        [parseEther('-30'), parseEther('30')]
      );

      await expect(atm.setToken(await erc20.getAddress())).to.be.revertedWith('claiming already started');
      await expect(atm.claimTokens()).to.be.revertedWith('already claimed');
      await expect(atm.enableClaiming(false)).to.emit(atm, 'ClaimingDisabled');
      await expect(atm.enableCollecting(false)).to.emit(atm, 'CollectingDisabled');
    });

    it('should join locking', async () => {
      const [, , wlNoDeposit, noWl, wlDepositAndClaim] = await ethers.getSigners();
      const atmAddress = await atm.getAddress();

      // prepare
      await setBalance(wlDepositAndClaim.address, parseEther('100'));
      await atm.setToken(await erc20.getAddress());
      await erc20.mint(atmAddress, parseEther('90'));
      await atm.addToWhitelist(deployer);
      await atm.addToWhitelist(wlNoDeposit.address);
      await atm.addToWhitelist(wlDepositAndClaim.address);
      await atm.enableCollecting(true);
      await atm.deposit({ value: parseEther('1.5') });
      await atm.connect(wlDepositAndClaim).deposit({ value: parseEther('3') });
      await atm.setAllocationRate(parseEther('20'));
      await atm.enableCollecting(false);

      await expect(atm.lockJoin()).to.be.revertedWith('not started');

      await atm.enableClaiming(true);
      await atm.connect(wlDepositAndClaim).claimTokens();

      await expect(atm.connect(noWl).lockJoin()).to.be.revertedWith('not whitelisted');
      await expect(atm.connect(wlNoDeposit).lockJoin()).to.be.revertedWith('not deposited');
      await expect(atm.connect(wlDepositAndClaim).lockJoin()).to.be.revertedWith('already claimed');
      await expect(atm.lockJoin()).to.emit(atm, 'LockJoin').withArgs(deployer, parseEther('30'));

      expect(await atm.locked(deployer)).to.be.true;
      expect(await atm.lockedAmount(deployer)).to.eq(parseEther('30'));
      await expect(atm.lockJoin()).to.be.revertedWith('already locked');
    });

    it('should leave locking before lock period starts', async () => {
      const [, , noLock, wlDepositAndClaim] = await ethers.getSigners();
      const atmAddress = await atm.getAddress();

      // prepare
      await setBalance(wlDepositAndClaim.address, parseEther('10'));
      await atm.setToken(await erc20.getAddress());
      await erc20.mint(atmAddress, parseEther('90'));
      await atm.addToWhitelist(deployer);
      await atm.addToWhitelist(wlDepositAndClaim.address);
      await atm.enableCollecting(true);
      await atm.deposit({ value: parseEther('1.5') });
      await atm.connect(wlDepositAndClaim).deposit({ value: parseEther('1.5') });
      await atm.setAllocationRate(parseEther('20'));
      await atm.enableCollecting(false);
      await atm.enableClaiming(true);
      await atm.connect(wlDepositAndClaim).claimTokens();
      await atm.lockJoin();

      await expect(atm.connect(noLock).lockLeave()).to.be.revertedWith('not locked');
      const tx = atm.lockLeave();
      await expect(tx).to.emit(atm, 'LockLeave').withArgs(deployer, parseEther('30'), 0, 0);
      await expect(tx).to.changeTokenBalances(erc20, [atmAddress, deployer], [parseEther('-30'), parseEther('30')]);
      await expect(atm.lockJoin()).to.be.revertedWith('already claimed');
      await expect(atm.lockLeave()).to.be.revertedWith('not locked');
      await expect(atm.connect(wlDepositAndClaim).lockJoin()).to.be.revertedWith('already claimed');
      expect(await atm.locked(deployer)).to.be.false;
      expect(await atm.claimed(deployer)).to.be.true;
      expect(await atm.lockedAmount(deployer)).to.eq(0);
      expect(await atm.claimedAmount(deployer)).to.eq(parseEther('30'));
    });

    it('should leave locking after lock period starts', async () => {
      const [, , lockerA, lockerB] = await ethers.getSigners();
      const atmAddress = await atm.getAddress();

      const initialStats = [false, false, false, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n];

      expect(await atm.getStatsForQualifier(lockerA.address)).to.deep.eq([...initialStats]);
      expect(await atm.getStatsForQualifier(lockerB.address)).to.deep.eq([...initialStats]);

      // prepare
      await atm.setToken(await erc20.getAddress());
      await erc20.mint(atmAddress, parseEther('8000'));

      await atm.addToWhitelist(lockerA.address);
      await atm.addToWhitelist(lockerB.address);
      initialStats[0] = true;
      expect(await atm.getStatsForQualifier(lockerA.address)).to.deep.eq([...initialStats]);
      expect(await atm.getStatsForQualifier(lockerB.address)).to.deep.eq([...initialStats]);

      await atm.enableCollecting(true);
      await atm.connect(lockerA).deposit({ value: parseEther('3') });
      await atm.connect(lockerB).deposit({ value: parseEther('3') });
      initialStats[6] = 3000000000000000000n;
      expect(await atm.getStatsForQualifier(lockerA.address)).to.deep.eq([...initialStats]);
      expect(await atm.getStatsForQualifier(lockerB.address)).to.deep.eq([...initialStats]);

      await atm.setAllocationRate(parseEther('1000'));
      initialStats[10] = 720000000000000000000n;
      initialStats[11] = 3720000000000000000000n;
      expect(await atm.getStatsForQualifier(lockerA.address)).to.deep.eq([...initialStats]);
      expect(await atm.getStatsForQualifier(lockerB.address)).to.deep.eq([...initialStats]);

      await atm.enableCollecting(false);
      await expect(atm.startLockPeriod()).to.be.revertedWith('not started');
      await atm.enableClaiming(true);
      await atm.connect(lockerA).lockJoin();
      await atm.connect(lockerB).lockJoin();
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
            erc20,
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
        erc20,
        [atmAddress, lockerA.address],
        [parseEther('-3720'), parseEther('3720')]
      );
    });

    it('should be able to claim tokens after the lock period has started', async () => {
      const atmAddress = await atm.getAddress();

      // prepare
      await atm.setToken(await erc20.getAddress());
      await erc20.mint(atmAddress, parseEther('3000'));
      await atm.addToWhitelist(deployer);
      await atm.enableCollecting(true);
      await atm.deposit({ value: parseEther('3') });
      await atm.setAllocationRate(parseEther('1000'));
      await atm.enableCollecting(false);
      await atm.enableClaiming(true);
      await atm.startLockPeriod();

      await expect(atm.lockJoin()).to.be.revertedWith('lock not possible anymore');

      const claimTx = await atm.claimTokens();
      await expect(claimTx).to.emit(atm, 'Claimed').withArgs(deployer, parseEther('3000'));
      await expect(claimTx).to.changeTokenBalances(
        erc20,
        [atmAddress, deployer],
        [parseEther('-3000'), parseEther('3000')]
      );
    });

    it('should return statistics', async () => {
      const atmAddress = await atm.getAddress();
      const [, , nolock] = await ethers.getSigners();
      await setBalance(nolock.address, parseEther('10'));

      const initialData = [
        false,
        false,
        false,
        ZeroAddress,
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
      await atm.setToken(await erc20.getAddress());
      initialData[3] = await erc20.getAddress();
      expect(await atm.getStats()).to.deep.eq([...initialData]);

      await erc20.mint(atmAddress, parseEther('6000'));
      initialData[4] = 6000000000000000000000n;
      expect(await atm.getStats()).to.deep.eq([...initialData]);

      await atm.addToWhitelist(deployer);
      await atm.addToWhitelist(nolock.address);
      await atm.enableCollecting(true);
      initialData[0] = true;
      expect(await atm.getStats()).to.deep.eq([...initialData]);

      await atm.connect(nolock).deposit({ value: parseEther('2') });
      await atm.deposit({ value: parseEther('3') });
      initialData[7] = 5000000000000000000n;
      expect(await atm.getStats()).to.deep.eq([...initialData]);

      await atm.setAllocationRate(parseEther('1000'));
      initialData[6] = 1000000000000000000000n;
      initialData[12] = 5000000000000000000000n;
      expect(await atm.getStats()).to.deep.eq([...initialData]);

      await atm.enableCollecting(false);
      initialData[0] = false;
      expect(await atm.getStats()).to.deep.eq([...initialData]);

      await atm.enableClaiming(true);
      initialData[1] = true;
      expect(await atm.getStats()).to.deep.eq([...initialData]);

      await atm.lockJoin();
      initialData[8] = 3000000000000000000000n;
      initialData[10] = 720000000000000000000n;
      initialData[11] = 3720000000000000000000n;
      initialData[12] = 5720000000000000000000n;
      expect(await atm.getStats()).to.deep.eq([...initialData]);

      await atm.connect(nolock).claimTokens();
      initialData[4] = 4000000000000000000000n;
      initialData[9] = 2000000000000000000000n;
      expect(await atm.getStats()).to.deep.eq([...initialData]);

      await atm.startLockPeriod();
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
      const tokenAddress = await erc20.getAddress();

      await atm.recoverNative();
      await atm.recoverTokens(tokenAddress);

      await atm.setToken(await erc20.getAddress());
      await erc20.mint(atmAddress, parseEther('10'));
      await atm.addToWhitelist(deployer);
      await atm.enableCollecting(true);
      await atm.deposit({ value: parseEther('10') });

      await expect(atm.recoverNative()).to.changeEtherBalances(
        [atmAddress, deployer],
        [parseEther('-3'), parseEther('3')]
      );
      await expect(atm.recoverTokens(tokenAddress)).to.changeTokenBalances(
        erc20,
        [atmAddress, deployer],
        [parseEther('-10'), parseEther('10')]
      );
    });

    it('should remove an address from whitelist and transfer funds back', async function () {
      await atm.addToWhitelist(deployer);
      await atm.enableCollecting(true);
      await atm.deposit({ value: parseEther('1') });
      expect(await atm.totalDeposits()).to.eq(parseEther('1'));
      const tx = await atm.removeFromWhitelist(deployer);
      await expect(tx).to.changeEtherBalances([await atm.getAddress(), deployer], [parseEther('-1'), parseEther('1')]);
      expect(await atm.totalDeposits()).to.eq(0);
      expect(await atm.deposits(deployer)).to.eq(0);
      expect(await atm.whitelist(deployer)).to.be.false;
    });
  });
});
