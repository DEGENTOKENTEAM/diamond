import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import * as dotenv from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';
import { ZeroAddress, parseEther } from 'ethers';
import { deployments, diamond, ethers, getNamedAccounts, network } from 'hardhat';
import { deployFacet } from '../scripts/helpers/deploy-diamond';
import { addFacets } from '../scripts/helpers/diamond';
import { ERC20Facet, LaunchControl, MinterBurnerMock } from '../typechain-types';
import { deployFixture as deployDiamondFixture } from './utils/helper';
import { ADMIN_ROLE, MINTER_ROLE } from './utils/mocks';
const dotEnvConfig = dotenv.config();
dotenvExpand(dotEnvConfig);

switch (network.name) {
}
let router = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

const deployFixture = async () => {
  const { diamondAddress } = await deployDiamondFixture();

  const [, , msig] = await ethers.getSigners();
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const deployerSigner = await ethers.getSigner(deployer);

  const { contracts } = await diamond.getProtocols();
  const routerAddress = contracts.degenx.router.address;
  const nativeWrapper = contracts.degenx.nativeWrapper.address;

  // deploy launcher
  const { address: launchAddress } = await deploy('LaunchControl', {
    from: deployer,
    skipIfAlreadyDeployed: false,
    args: [nativeWrapper],
  });
  const launch = await ethers.getContractAt('LaunchControl', launchAddress);

  // deploy minter (needs to be contract)
  const { address: minterAddress } = await deploy('MinterBurnerMock', { from: deployer, skipIfAlreadyDeployed: false });
  const minter = await ethers.getContractAt('MinterBurnerMock', minterAddress);

  {
    const { facetContract } = await deployFacet('ERC20Facet');
    await addFacets([facetContract], diamondAddress);
  }

  {
    const { facetContract } = await deployFacet('AccessControlEnumerableFacet');
    await addFacets([facetContract], diamondAddress);
  }

  const erc20Facet = await ethers.getContractAt('ERC20Facet', diamondAddress);
  const accessControl = await ethers.getContractAt('AccessControlEnumerableFacet', diamondAddress);

  // init & configure
  await erc20Facet.initERC20Facet('A', 'B', 18);
  await accessControl.grantRole(MINTER_ROLE, launchAddress);
  await accessControl.grantRole(ADMIN_ROLE, launchAddress);

  return {
    deployer,
    deployerSigner,
    diamondAddress,
    launchAddress,
    routerAddress,
    msig,
    minter,
    launch,
    erc20Facet,
  };
};

describe('LaunchControl', function () {
  let deployer: string;
  let launchAddress: string;
  let routerAddress: string;
  let diamondAddress: string;
  let msig: SignerWithAddress;
  let deployerSigner: SignerWithAddress;
  let minter: MinterBurnerMock;
  let launch: LaunchControl;
  let erc20Facet: ERC20Facet;
  let snapshotId: any;

  beforeEach(async function () {
    ({ deployer, diamondAddress, launchAddress, msig, launch, erc20Facet, minter, deployerSigner, routerAddress } =
      await deployFixture());
    snapshotId = await network.provider.send('evm_snapshot');
  });

  afterEach(async function () {
    await network.provider.send('evm_revert', [snapshotId]);
  });

  describe('Deployment', function () {
    it('should deploy successfully', async function () {
      expect(await launch.launched()).to.be.false;
      expect(await launch.startPoolWithToken()).to.eq(0);
      expect(await launch.startPoolWithNative()).to.eq(0);
      expect(await launch.router()).to.eq(ZeroAddress);
      expect(await launch.lp()).to.eq(ZeroAddress);
      expect(await launch.lpTokenReceiver()).to.eq(ZeroAddress);
      expect(await launch.token()).to.eq(ZeroAddress);
    });
  });

  describe('Configuration', function () {
    it('should set a router', async function () {
      await launch.setRouter(routerAddress);
      expect(await launch.router()).to.eq(routerAddress);
    });

    it('should set a token', async function () {
      await expect(launch.setToken(diamondAddress)).to.be.revertedWith('missing router');
      await launch.setRouter(routerAddress);
      await launch.setToken(diamondAddress);
      await launch.setToken(diamondAddress); // set twice to check wheter it retrieves the existing pair
      expect(await launch.token()).to.eq(diamondAddress);
      const lp = await launch.lp();
      expect(lp).to.not.eq(ZeroAddress);
      expect(await erc20Facet.hasLP(lp)).to.be.true;
    });

    it('should set an amount of tokens used for start', async function () {
      await launch.setStartPoolWithToken(123);
      expect(await launch.startPoolWithToken()).to.eq(123);
    });

    it('should set an amount of native used for start', async function () {
      await launch.setStartPoolWithNative(123);
      expect(await launch.startPoolWithNative()).to.eq(123);
    });
  });
  describe('Launch', function () {
    beforeEach(async function () {
      await launch.setRouter(routerAddress);
    });

    it('should add liquidity to a pair', async function () {
      await erc20Facet.updateBridgeSupplyCap(await minter.getAddress(), parseEther('100'));
      await erc20Facet.enable();
      await minter.mint(await erc20Facet.getAddress(), deployer, parseEther('100'));
      await expect(launch.addLiquidity()).to.be.revertedWith('set token first');
      await launch.setToken(diamondAddress);
      await expect(launch.addLiquidity()).to.be.revertedWith('lp token receiver not set');
      await launch.setLpTokenReceiver(msig.address);
      await expect(launch.addLiquidity()).to.be.revertedWith('not enough native');
      await deployerSigner.sendTransaction({
        to: launchAddress,
        value: parseEther('1'),
      });
      await expect(launch.addLiquidity()).to.be.revertedWith('not enough native');
      await launch.setStartPoolWithNative(parseEther('1.01'));
      await expect(launch.addLiquidity()).to.be.revertedWith('not enough native');
      await launch.setStartPoolWithNative(parseEther('1'));
      await expect(launch.addLiquidity()).to.be.revertedWith('not enough token');
      await erc20Facet.transfer(launchAddress, parseEther('2'));
      await expect(launch.addLiquidity()).to.be.revertedWith('not enough token');
      await launch.setStartPoolWithToken(parseEther('2.01'));
      await expect(launch.addLiquidity()).to.be.revertedWith('not enough token');
      await launch.setStartPoolWithToken(parseEther('2'));
      const tx = await launch.addLiquidity();
      await expect(tx).to.changeTokenBalances(
        erc20Facet,
        [launchAddress, await launch.lp()],
        [parseEther('-2'), parseEther('2')]
      );
      await expect(tx).to.changeEtherBalance(launchAddress, parseEther('-1'));
    });

    it('should enable trading', async function () {
      await erc20Facet.updateBridgeSupplyCap(await minter.getAddress(), parseEther('100'));
      await erc20Facet.enable();

      await expect(launch.startTrading()).to.be.revertedWith('no token');
      await launch.setToken(diamondAddress);
      await expect(launch.startTrading()).to.be.revertedWith('no liquidity');
      await deployerSigner.sendTransaction({
        to: launchAddress,
        value: parseEther('1'),
      });
      await minter.mint(await erc20Facet.getAddress(), launchAddress, parseEther('2'));
      await launch.setStartPoolWithNative(parseEther('1'));
      await launch.setStartPoolWithToken(parseEther('2'));
      await launch.setLpTokenReceiver(deployer);
      await launch.addLiquidity();
      await launch.startTrading();
      expect(await launch.launched()).to.be.true;
      expect(await erc20Facet.paused()).to.be.false;
    });
  });

  describe('Additional Admin Actions', function () {
    it('should recover all tokens and native', async function () {
      const tokenAddress = await erc20Facet.getAddress();
      // prepare
      await erc20Facet.updateBridgeSupplyCap(await minter.getAddress(), parseEther('11'));
      await erc20Facet.enable();
      await minter.mint(tokenAddress, launchAddress, parseEther('10'));
      await deployerSigner.sendTransaction({ to: launchAddress, value: parseEther('10') });

      const recoverTx = await launch.recover(tokenAddress);
      await expect(recoverTx).to.changeEtherBalances([launchAddress, deployer], [parseEther('-10'), parseEther('10')]);
      await expect(recoverTx).to.changeTokenBalances(
        erc20Facet,
        [launchAddress, deployer],
        [parseEther('-10'), parseEther('10')]
      );

      await minter.mint(tokenAddress, launchAddress, parseEther('1'));
      await launch.recover(tokenAddress);

      await deployerSigner.sendTransaction({ to: launchAddress, value: parseEther('1') });
      await launch.recover(tokenAddress);
    });
  });

  describe('Full circle setup', function () {
    it('should launch successfully', async function () {
      await erc20Facet.updateBridgeSupplyCap(await minter.getAddress(), parseEther('11'));
      await erc20Facet.enable();
      await minter.mint(await erc20Facet.getAddress(), launchAddress, parseEther('11'));

      await launch.setLpTokenReceiver(deployer);
      await launch.setRouter(routerAddress);
      await launch.setStartPoolWithToken(parseEther('10'));
      await launch.setStartPoolWithNative(parseEther('10'));
      await deployerSigner.sendTransaction({
        to: launchAddress,
        value: parseEther('11'),
      });
      await launch.setToken(diamondAddress);
      await launch.addLiquidity();
      await launch.startTrading();
      const tx = await launch.recover(await erc20Facet.getAddress());
      await expect(tx).to.changeEtherBalances([launchAddress, deployer], [parseEther('-1'), parseEther('1')]);
      await expect(tx).to.changeTokenBalances(
        erc20Facet,
        [launchAddress, deployer],
        [parseEther('-1'), parseEther('1')]
      );
    });
  });
});
