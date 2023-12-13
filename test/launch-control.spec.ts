import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ZeroAddress, parseEther } from 'ethers';
import { deployments, ethers, getNamedAccounts, network } from 'hardhat';
import { deployFacet } from '../scripts/helpers/deploy-diamond';
import { addFacets } from '../scripts/helpers/diamond';
import { AccessControlEnumerableFacet, ERC20Facet, LaunchControl } from '../typechain-types';
import { deployFixture as deployDiamondFixture } from './utils/helper';
import { ADMIN_ROLE, MINTER_ROLE } from './utils/mocks';

// load env config
import * as dotenv from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';
const dotEnvConfig = dotenv.config();
dotenvExpand(dotEnvConfig);

switch (network.name) {
}
let router = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

const deployFixture = async () => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // deploy diamond
  const { diamondAddress } = await deployDiamondFixture();

  const [, msig] = await ethers.getSigners();

  // deploy launcher
  const { address } = await deploy('LaunchControl', { from: deployer, skipIfAlreadyDeployed: false });
  const launch = await ethers.getContractAt('LaunchControl', address);

  const { facetContract: token } = await deployFacet('ERC20Facet');
  const { facetContract: access } = await deployFacet('AccessControlEnumerableFacet');
  await addFacets([token, access], diamondAddress);

  const erc20Facet = await ethers.getContractAt('ERC20Facet', diamondAddress);
  const accessControl = await ethers.getContractAt('AccessControlEnumerableFacet', diamondAddress);
  const launchAddress = await launch.getAddress();

  // init & configure
  await (await erc20Facet.initERC20Facet('A', 'B', 18)).wait();
  await (await accessControl.grantRole(MINTER_ROLE, launchAddress)).wait();
  await (await accessControl.grantRole(ADMIN_ROLE, launchAddress)).wait();

  return { deployer, diamondAddress, launchAddress, msig, launch, erc20Facet, accessControl };
};

describe('LaunchControl', function () {
  let deployer: string, diamondAddress: string, launchAddress: string;
  let msig: SignerWithAddress;
  let launch: LaunchControl;
  let erc20Facet: ERC20Facet;
  let accessControl: AccessControlEnumerableFacet;

  beforeEach(async function () {
    const data = await deployFixture();
    deployer = data.deployer;
    diamondAddress = data.diamondAddress;
    launchAddress = data.launchAddress;
    msig = data.msig;
    launch = data.launch;
    erc20Facet = data.erc20Facet;
    accessControl = data.accessControl;
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
      await (await launch.setRouter(router)).wait();
      expect(await launch.router()).to.eq(router);
    });

    it('should set a token', async function () {
      await expect(launch.setToken(diamondAddress)).to.be.revertedWith('missing router');
      await (await launch.setRouter(router)).wait();
      await (await launch.setToken(diamondAddress)).wait();
      expect(await launch.token()).to.eq(diamondAddress);
      const lp = await launch.lp();
      expect(lp).to.not.eq(ZeroAddress);
      expect(await erc20Facet.getLP()).to.eq(lp);
    });

    it('should set an amount of tokens used for start', async function () {
      await (await launch.setStartPoolWithToken(123)).wait();
      expect(await launch.startPoolWithToken()).to.eq(123);
    });

    it('should set an amount of native used for start', async function () {
      await (await launch.setStartPoolWithNative(123)).wait();
      expect(await launch.startPoolWithNative()).to.eq(123);
    });
  });
  describe('Launch', function () {
    beforeEach(async function () {
      await (await launch.setRouter(router)).wait();
    });

    it('should add liquidity to a pair', async function () {
      await (await erc20Facet.enable()).wait();
      await (await erc20Facet.mint(deployer, parseEther('100'))).wait();
      await expect(launch.addLiquidity()).to.be.revertedWith('set token first');
      await (await launch.setToken(diamondAddress)).wait();
      await expect(launch.addLiquidity()).to.be.revertedWith('lp token receiver not set');
      await (await launch.setLpTokenReceiver(msig.address)).wait();
      await expect(launch.addLiquidity()).to.be.revertedWith('not enough native');
      const [deployerSigner] = await ethers.getSigners();
      await (
        await deployerSigner.sendTransaction({
          to: launchAddress,
          value: parseEther('1'),
        })
      ).wait();
      await expect(launch.addLiquidity()).to.be.revertedWith('not enough native');
      await (await launch.setStartPoolWithNative(parseEther('1.01'))).wait();
      await expect(launch.addLiquidity()).to.be.revertedWith('not enough native');
      await (await launch.setStartPoolWithNative(parseEther('1'))).wait();
      await expect(launch.addLiquidity()).to.be.revertedWith('not enough token');
      await (await erc20Facet.transfer(launchAddress, parseEther('2'))).wait();
      await expect(launch.addLiquidity()).to.be.revertedWith('not enough token');
      await (await launch.setStartPoolWithToken(parseEther('2.01'))).wait();
      await expect(launch.addLiquidity()).to.be.revertedWith('not enough token');
      await (await launch.setStartPoolWithToken(parseEther('2'))).wait();
      const tx = await launch.addLiquidity();
      await expect(tx).to.changeTokenBalances(
        erc20Facet,
        [launchAddress, await launch.lp()],
        [parseEther('-2'), parseEther('2')]
      );
      await expect(tx).to.changeEtherBalance(launchAddress, parseEther('-1'));
    });

    it('should enable trading', async function () {
      await (await erc20Facet.enable()).wait();
      await expect(launch.startTrading()).to.be.revertedWith('no token');
      await (await launch.setToken(diamondAddress)).wait();
      await expect(launch.startTrading()).to.be.revertedWith('no liquidity');
      const [deployerSigner] = await ethers.getSigners();
      await (
        await deployerSigner.sendTransaction({
          to: launchAddress,
          value: parseEther('1'),
        })
      ).wait();
      await (await erc20Facet.mint(launchAddress, parseEther('2'))).wait();
      await (await launch.setStartPoolWithNative(parseEther('1'))).wait();
      await (await launch.setStartPoolWithToken(parseEther('2'))).wait();
      await (await launch.setLpTokenReceiver(deployer)).wait();
      await (await launch.addLiquidity()).wait();
      await (await launch.startTrading()).wait();
      expect(await launch.launched()).to.be.true;
      expect(await erc20Facet.paused()).to.be.false;
    });
  });

  describe('Additional Admin Actions', function () {
    it('should recover all tokens and native', async function () {
      // prepare
      const [deployerSigner] = await ethers.getSigners();
      const launchAddress = await launch.getAddress();
      const tokenAddress = await erc20Facet.getAddress();
      await (await erc20Facet.enable()).wait();
      await (await erc20Facet.mint(launchAddress, parseEther('10'))).wait();
      await (await deployerSigner.sendTransaction({ to: launchAddress, value: parseEther('10') })).wait();

      const recoverTx = await launch.recover(tokenAddress);

      await expect(recoverTx).to.changeEtherBalances([launchAddress, deployer], [parseEther('-10'), parseEther('10')]);
      await expect(recoverTx).to.changeTokenBalances(
        erc20Facet,
        [launchAddress, deployer],
        [parseEther('-10'), parseEther('10')]
      );

      await (await erc20Facet.mint(launchAddress, parseEther('1'))).wait();
      await (await launch.recover(tokenAddress)).wait();

      await (await deployerSigner.sendTransaction({ to: launchAddress, value: parseEther('1') })).wait();
      await (await launch.recover(tokenAddress)).wait();
    });
  });

  describe('Full circle setup', function () {
    it('should launch successfully', async function () {
      await (await erc20Facet.enable()).wait();
      await (await erc20Facet.mint(launchAddress, parseEther('11'))).wait();
      await (await launch.setLpTokenReceiver(deployer)).wait();
      await (await launch.setRouter(router)).wait();
      await (await launch.setToken(diamondAddress)).wait();
      await (await launch.setStartPoolWithToken(parseEther('10'))).wait();
      await (await launch.setStartPoolWithNative(parseEther('10'))).wait();
      const [deployerSigner] = await ethers.getSigners();
      await (
        await deployerSigner.sendTransaction({
          to: launchAddress,
          value: parseEther('11'),
        })
      ).wait();
      await (await launch.addLiquidity()).wait();
      await (await launch.startTrading()).wait();
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
