import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { Contract, MaxUint256, ZeroAddress, ZeroHash, keccak256, parseEther, toUtf8Bytes } from 'ethers';
import { deployments, ethers, getNamedAccounts } from 'hardhat';
import { deployFacet } from '../scripts/helpers/deploy-diamond';
import { addFacets } from '../scripts/helpers/diamond';
import { ERC20Facet, ERC20Mock } from '../typechain-types';
import { FeeConfigSyncDTOStruct, FeeStoreFacet } from '../typechain-types/contracts/diamond/facets/FeeStoreFacet';
import { FeeSyncAction } from './utils/enums';
import { accessControlError, deployFixture as deployDiamondFixture } from './utils/helper';
import { BURNER_ROLE, MINTER_ROLE } from './utils/mocks';

const deployFixture = async () => {
  const { diamond, diamondAddress } = await deployDiamondFixture();
  const { facetContract: facetAContract } = await deployFacet('AccessControlEnumerableFacet');
  const { facetContract: facetBContract } = await deployFacet('ERC20Facet');
  await addFacets([facetAContract, facetBContract], diamondAddress);
  return { diamond, diamondAddress };
};

describe('DegenX (DGNX ERC20)', function () {
  let diamond: Contract;
  let deployer: SignerWithAddress;
  let diamondAddress: string, deployerAddress: string;
  let ERC20Facet: ERC20Facet;

  beforeEach(async () => {
    const { diamond: _diamond, diamondAddress: _diamondAddress } = await deployFixture();
    const { deployer: _deployerAddress } = await getNamedAccounts();
    [deployer] = await ethers.getSigners();
    diamond = _diamond;
    diamondAddress = _diamondAddress;
    deployerAddress = _deployerAddress;
    ERC20Facet = await ethers.getContractAt('ERC20Facet', _diamondAddress);
  });

  it('should deploy successfully', async function () {
    await (await ERC20Facet.initERC20Facet('DegenX', 'DGNX', 18)).wait();
    expect(await diamond.waitForDeployment()).to.be.instanceOf(Contract);
    expect(await ERC20Facet.name()).to.eq('DegenX');
    expect(await ERC20Facet.symbol()).to.eq('DGNX');
    expect(await ERC20Facet.decimals()).to.eq(18);
    await expect(ERC20Facet.initERC20Facet('DegenX', 'DGNX', 18)).to.be.revertedWith('initialized');
  });

  it('can release tokens when MINTER_ROLE', async () => {
    const [, minter, tokenReceiver] = await ethers.getSigners();
    setBalance(minter.address, parseEther('1'));
    const accessControlEnumerableFacet = await ethers.getContractAt('AccessControlEnumerableFacet', diamondAddress);
    await expect(ERC20Facet.connect(minter).mint(tokenReceiver.address, parseEther('1'))).to.revertedWith(
      accessControlError(minter.address, MINTER_ROLE)
    );
    await (await accessControlEnumerableFacet.connect(deployer).grantRole(MINTER_ROLE, minter.address)).wait();
    await expect(ERC20Facet.connect(minter).mint(tokenReceiver.address, parseEther('1')))
      .to.emit(ERC20Facet, 'Transfer')
      .withArgs(ZeroAddress, tokenReceiver.address, parseEther('1'));
    expect(await ERC20Facet.balanceOf(tokenReceiver.address)).to.eq(parseEther('1'));
  });

  it('can burn tokens when BURNER_ROLE', async () => {
    const [, minter, tokenReceiver] = await ethers.getSigners();
    setBalance(minter.address, parseEther('1'));
    setBalance(tokenReceiver.address, parseEther('1'));
    const accessControlEnumerableFacet = await ethers.getContractAt('AccessControlEnumerableFacet', diamondAddress);
    expect(await ERC20Facet.totalSupply()).to.eq(0);
    await (await accessControlEnumerableFacet.connect(deployer).grantRole(MINTER_ROLE, minter.address)).wait();
    await (await ERC20Facet.connect(minter).mint(tokenReceiver.address, parseEther('1'))).wait();
    expect(await ERC20Facet.balanceOf(tokenReceiver.address)).to.eq(parseEther('1'));
    expect(await ERC20Facet.totalSupply()).to.eq(parseEther('1'));
    await (await ERC20Facet.connect(tokenReceiver).approve(await ERC20Facet.getAddress(), parseEther('1'))).wait();
    await (await accessControlEnumerableFacet.connect(deployer).revokeRole(BURNER_ROLE, minter.address)).wait();
    await expect(ERC20Facet.connect(minter).burn(tokenReceiver.address, parseEther('1'))).to.revertedWith(
      accessControlError(minter.address, BURNER_ROLE)
    );
    await (await accessControlEnumerableFacet.connect(deployer).grantRole(BURNER_ROLE, minter.address)).wait();
    await expect(ERC20Facet.connect(minter).burn(tokenReceiver.address, parseEther('1')))
      .to.emit(ERC20Facet, 'Transfer')
      .withArgs(tokenReceiver.address, ZeroAddress, parseEther('1'));
    expect(await ERC20Facet.totalSupply()).to.eq(0);
  });

  it('should not be able to burn 0x0000 and 0xdead', async () => {
    const [, minter] = await ethers.getSigners();
    setBalance(minter.address, parseEther('1'));
    const accessControlEnumerableFacet = await ethers.getContractAt('AccessControlEnumerableFacet', diamondAddress);
    await (await accessControlEnumerableFacet.connect(deployer).grantRole(MINTER_ROLE, minter.address)).wait();
    await (await ERC20Facet.connect(minter).mint(deployer.address, parseEther('1'))).wait();
    await (await ERC20Facet.connect(minter).mint(minter.address, parseEther('1'))).wait();
    await expect(ERC20Facet.transfer(`0x${''.padEnd(36, '0')}dEaD`, parseEther('1'))).to.be.revertedWithCustomError(
      ERC20Facet,
      'NoBurnPossible'
    );
    await expect(
      ERC20Facet.connect(minter).transfer(`0x${''.padEnd(36, '0')}dEaD`, parseEther('1'))
    ).to.be.revertedWithCustomError(ERC20Facet, 'NoBurnPossible');
    await expect(ERC20Facet.transfer(ZeroAddress, parseEther('1'))).to.be.revertedWithCustomError(
      ERC20Facet,
      'ERC20Base__TransferToZeroAddress'
    );
    await expect(ERC20Facet.connect(minter).transfer(ZeroAddress, parseEther('1'))).to.be.revertedWithCustomError(
      ERC20Facet,
      'ERC20Base__TransferToZeroAddress'
    );
  });

  describe('Post Initialize', () => {
    describe('Settings', () => {
      beforeEach(async () => {
        await (await ERC20Facet.initERC20Facet('DegenX', 'DGNX', 18)).wait();
      });

      describe('pausing', () => {
        it('should be paused on start', async () => {
          // has initial state false
          expect(await ERC20Facet.paused()).to.be.true;
        });

        it('should be able to get unpaused', async () => {
          await expect(ERC20Facet.enable()).to.emit(ERC20Facet, 'Unpaused').withArgs(deployerAddress);
          expect(await ERC20Facet.paused()).to.be.false;
        });

        it('should be able to get paused', async () => {
          await (await ERC20Facet.enable()).wait();
          await expect(ERC20Facet.disable()).to.emit(ERC20Facet, 'Paused').withArgs(deployerAddress);
          expect(await ERC20Facet.paused()).to.be.true;
        });
      });

      describe('Liquidity Pool', () => {
        it('should be able to set an LP address', async () => {
          const _lp = ethers.Wallet.createRandom().address;
          await expect(ERC20Facet.setLP(_lp)).to.emit(ERC20Facet, 'SetLP').withArgs(_lp);
        });
      });

      describe('Exlucde and Include Accounts', () => {
        const accountA = ethers.Wallet.createRandom().address;
        it('should be able to add an account to excluding list', async () => {
          await expect(ERC20Facet.excludeAccountFromTax(accountA))
            .to.emit(ERC20Facet, 'ExcludeAccountFromTax')
            .withArgs(accountA);
          expect(await ERC20Facet.isExcluded(accountA)).to.be.true;
        });
        it('should be able to remove an account from excluding list', async () => {
          await (await ERC20Facet.excludeAccountFromTax(accountA)).wait();
          await expect(ERC20Facet.includeAccountForTax(accountA))
            .to.emit(ERC20Facet, 'IncludeAccountToTax')
            .withArgs(accountA);
          expect(await ERC20Facet.isExcluded(accountA)).to.be.false;
        });
      });

      describe('Fees', () => {
        const feeA = keccak256(toUtf8Bytes('feeA'));
        const feeB = keccak256(toUtf8Bytes('feeB'));
        const feeC = keccak256(toUtf8Bytes('feeC'));

        beforeEach(async () => {
          const { facetContract } = await deployFacet('FeeStoreFacet');
          await addFacets([facetContract], diamondAddress);
          const feeStoreFacet = await ethers.getContractAt('FeeStoreFacet', diamondAddress);
          await (
            await feeStoreFacet.syncFees([
              { id: feeA, action: 1, fee: 10000, target: ZeroAddress },
              { id: feeB, action: 1, fee: 10000, target: ZeroAddress },
            ])
          ).wait();
        });

        it('should be able to add buy fees', async () => {
          await expect(ERC20Facet.addBuyFee(ZeroHash)).to.be.revertedWithCustomError(ERC20Facet, 'FeeIdMissing');
          await expect(ERC20Facet.addBuyFee(feeC))
            .to.be.revertedWithCustomError(ERC20Facet, 'InvalidFeeId')
            .withArgs(feeC);
          await expect(ERC20Facet.addBuyFee(feeA)).to.emit(ERC20Facet, 'FeeAdded').withArgs(feeA, true);
          expect(await ERC20Facet.isBuyFee(feeA)).to.be.true;
          await expect(ERC20Facet.addBuyFee(feeA))
            .to.be.revertedWithCustomError(ERC20Facet, 'FeeIdAlreadySet')
            .withArgs(feeA);
        });

        it('should be able to remove buy fees', async () => {
          await expect(ERC20Facet.removeBuyFee(feeA))
            .to.be.revertedWithCustomError(ERC20Facet, 'FeeIdNotSet')
            .withArgs(feeA);
          await (await ERC20Facet.addBuyFee(feeA)).wait();
          await (await ERC20Facet.addBuyFee(feeB)).wait();
          await expect(ERC20Facet.removeBuyFee(feeA)).to.emit(ERC20Facet, 'FeeRemoved').withArgs(feeA, true);
          expect(await ERC20Facet.isBuyFee(feeA)).to.be.false;
          expect(await ERC20Facet.isBuyFee(feeB)).to.be.true;
        });

        it('should be able to add sell fees', async () => {
          await expect(ERC20Facet.addSellFee(feeA)).to.emit(ERC20Facet, 'FeeAdded').withArgs(feeA, false);
          expect(await ERC20Facet.isSellFee(feeA)).to.be.true;
        });

        it('should be able to remove sell fees', async () => {
          await expect(ERC20Facet.removeSellFee(feeA))
            .to.be.revertedWithCustomError(ERC20Facet, 'FeeIdNotSet')
            .withArgs(feeA);
          await (await ERC20Facet.addSellFee(feeA)).wait();
          await expect(ERC20Facet.removeSellFee(feeA)).to.emit(ERC20Facet, 'FeeRemoved').withArgs(feeA, false);
          expect(await ERC20Facet.isSellFee(feeA)).to.be.false;
        });
      });
    });

    describe('Tokenomics', () => {
      let lp: SignerWithAddress;
      let feeAId: string, feeBId: string, feeCId: string, feeDId: string, erc20Address: string;
      let feeStoreFacet: FeeStoreFacet;

      beforeEach(async () => {
        // fake lp
        lp = (await ethers.getSigners())[1];

        // add feestore
        const { facetContract } = await deployFacet('FeeStoreFacet');
        await addFacets([facetContract], diamondAddress);
        feeStoreFacet = await ethers.getContractAt('FeeStoreFacet', diamondAddress);

        // initilize token with the desired swap path to the fee token
        await (await ERC20Facet.initERC20Facet('DegenX', 'DGNX', 18)).wait();
        await (await ERC20Facet.setLP(lp.address)).wait();
        await (await ERC20Facet.enable()).wait();

        // mint tokens and send to actors
        await (await ERC20Facet.mint(deployerAddress, parseEther('100'))).wait();
        await (await ERC20Facet.mint(lp.address, parseEther('100'))).wait();

        erc20Address = await ERC20Facet.getAddress();

        // feestore configs
        feeAId = keccak256(toUtf8Bytes('feeA'));
        feeBId = keccak256(toUtf8Bytes('feeB'));
        feeCId = keccak256(toUtf8Bytes('feeC'));
        feeDId = keccak256(toUtf8Bytes('feeD'));
        const configA: FeeConfigSyncDTOStruct = {
          id: feeAId,
          fee: 1000,
          target: ZeroAddress,
          action: FeeSyncAction.Add,
        };
        const configB: FeeConfigSyncDTOStruct = {
          id: feeBId,
          fee: 2000,
          target: ZeroAddress,
          action: FeeSyncAction.Add,
        };
        const configC: FeeConfigSyncDTOStruct = {
          id: feeCId,
          fee: 2000,
          target: ZeroAddress,
          action: FeeSyncAction.Add,
        };
        const configD: FeeConfigSyncDTOStruct = {
          id: feeDId,
          fee: 4000,
          target: ZeroAddress,
          action: FeeSyncAction.Add,
        };
        await (await feeStoreFacet.syncFees([configA, configB, configC, configD])).wait();

        // add fees to ERC20
        await (await ERC20Facet.addBuyFee(feeAId)).wait();
        await (await ERC20Facet.addBuyFee(feeBId)).wait();
        await (await ERC20Facet.addSellFee(feeCId)).wait();
        await (await ERC20Facet.addSellFee(feeDId)).wait();
      });

      it('should charge no fees', async () => {
        // remove fees
        await (await ERC20Facet.removeBuyFee(feeAId)).wait();
        await (await ERC20Facet.removeBuyFee(feeBId)).wait();
        await (await ERC20Facet.removeSellFee(feeCId)).wait();
        await (await ERC20Facet.removeSellFee(feeDId)).wait();
        await expect(ERC20Facet.connect(lp).transfer(deployerAddress, parseEther('1'))).to.changeTokenBalances(
          ERC20Facet,
          [lp.address, deployerAddress, erc20Address],
          [parseEther('-1'), parseEther('1'), parseEther('0')]
        );
      });

      it('should charge fees on buys', async () => {
        await expect(ERC20Facet.connect(lp).transfer(deployerAddress, parseEther('1'))).to.changeTokenBalances(
          ERC20Facet,
          [lp.address, deployerAddress, erc20Address],
          [parseEther('-1'), parseEther('0.97'), parseEther('0.03')]
        );
      });

      it('should charge fees on sells and deposit charged fees to FeeStore', async () => {
        const tx = await ERC20Facet.transfer(lp.address, parseEther('1'));
        await expect(tx).to.changeTokenBalances(
          ERC20Facet,
          [deployerAddress, lp.address, erc20Address],
          [parseEther('-1'), parseEther('0.94'), parseEther('0.06')]
        );
        expect(await feeStoreFacet.getCollectedFeesByConfigId(feeCId)).to.eq(parseEther('0.02'));
        expect(await feeStoreFacet.getCollectedFeesByConfigId(feeDId)).to.eq(parseEther('0.04'));
        expect(await feeStoreFacet.getCollectedFeesTotal()).to.eq(parseEther('0.06'));
      });

      it('should charge fees on buys and deposit charged fees to FeeStore', async () => {
        const tx = await ERC20Facet.connect(lp).transfer(deployerAddress, parseEther('1'));
        await expect(tx).to.changeTokenBalances(
          ERC20Facet,
          [lp.address, deployerAddress, erc20Address],
          [parseEther('-1'), parseEther('0.97'), parseEther('0.03')]
        );
        expect(await feeStoreFacet.getCollectedFeesByConfigId(feeAId)).to.eq(parseEther('0.01'));
        expect(await feeStoreFacet.getCollectedFeesByConfigId(feeBId)).to.eq(parseEther('0.02'));
        expect(await feeStoreFacet.getCollectedFeesTotal()).to.eq(parseEther('0.03'));
      });

      it('should exclude accounts from getting charged', async () => {
        await (await ERC20Facet.excludeAccountFromTax(deployerAddress)).wait();
        await expect(ERC20Facet.connect(lp).transfer(deployerAddress, parseEther('1'))).to.changeTokenBalances(
          ERC20Facet,
          [lp.address, deployerAddress, await ERC20Facet.getAddress()],
          [parseEther('-1'), parseEther('1'), parseEther('0')]
        );
        const tx = await ERC20Facet.transfer(lp.address, parseEther('1'));
        await expect(tx).to.changeTokenBalances(
          ERC20Facet,
          [lp.address, deployerAddress, await ERC20Facet.getAddress(), await feeStoreFacet.getAddress()],
          [parseEther('1'), parseEther('-1'), parseEther('0'), parseEther('0')]
        );
      });

      it('should have getters to reflect the store', async () => {
        expect(await ERC20Facet.getLP()).to.eq(lp.address);
        expect(await ERC20Facet.getBuyFees()).to.deep.eq([feeAId, feeBId]);
        expect(await ERC20Facet.getSellFees()).to.deep.eq([feeCId, feeDId]);
      });
    });
  });
});
