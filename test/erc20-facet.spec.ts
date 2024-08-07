import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { Contract, ZeroAddress, ZeroHash, keccak256, parseEther, toUtf8Bytes } from 'ethers';
import { deployments, ethers, getNamedAccounts, network } from 'hardhat';
import { deployFacet } from '../scripts/helpers/deploy-diamond';
import { addFacets } from '../scripts/helpers/diamond';
import { ERC20Facet, MinterBurnerMock } from '../typechain-types';
import { FeeConfigSyncDTOStruct, FeeStoreFacet } from '../typechain-types/contracts/diamond/facets/FeeStoreFacet';
import { FeeSyncAction } from './utils/enums';
import { deployFixture as deployDiamondFixture } from './utils/helper';

const deployFixture = async () => {
  const { diamond, diamondAddress } = await deployDiamondFixture();
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;
  const deployerSigner = await ethers.getSigner(deployer);
  const [, , tokenReceiver] = await ethers.getSigners();

  const { facetContract: facetBContract } = await deployFacet('ERC20Facet');
  await addFacets([facetBContract], diamondAddress, undefined, undefined, deployer);
  const erc20Facet = await ethers.getContractAt('ERC20Facet', diamondAddress, deployerSigner);

  const { address } = await deploy('MinterBurnerMock', { from: deployer });
  const minter = await ethers.getContractAt('MinterBurnerMock', address, deployerSigner);

  return {
    diamond,
    diamondAddress,
    deployer,
    deployerSigner,
    minter,
    minterAddress: await minter.getAddress(),
    tokenReceiver,
    erc20Facet,
  };
};

describe('DegenX (DGNX ERC20)', function () {
  let diamond: Contract;
  let deployerSigner: SignerWithAddress, tokenReceiver: SignerWithAddress;
  let minter: MinterBurnerMock;
  let diamondAddress: string, deployer: string, minterAddress: string;
  let erc20Facet: ERC20Facet;
  let snapshotId: any;

  beforeEach(async () => {
    ({ deployer, deployerSigner, minter, diamond, diamondAddress, erc20Facet, tokenReceiver, minterAddress } =
      await deployFixture());
    snapshotId = await network.provider.send('evm_snapshot');
  });

  afterEach(async function () {
    await network.provider.send('evm_revert', [snapshotId]);
  });

  it('should deploy successfully', async function () {
    await erc20Facet.initERC20Facet('DegenX', 'DGNX', 18);
    expect(await diamond.waitForDeployment()).to.be.instanceOf(Contract);
    expect(await erc20Facet.name()).to.eq('DegenX');
    expect(await erc20Facet.symbol()).to.eq('DGNX');
    expect(await erc20Facet.decimals()).to.eq(18);
    await expect(erc20Facet.initERC20Facet('DegenX', 'DGNX', 18)).to.be.revertedWith('initialized');
  });

  it('address can mint a specific max amount of tokens', async () => {
    await expect(
      minter['mint(address,address,uint256)'](diamondAddress, tokenReceiver.address, parseEther('1'))
    ).to.revertedWithCustomError(erc20Facet, 'NotAllowed');
    await expect(
      erc20Facet.connect(deployerSigner).updateBridgeSupplyCap(deployer, parseEther('1'))
    ).to.be.revertedWithCustomError(erc20Facet, 'AddressNoContract');
    await expect(erc20Facet.connect(deployerSigner).updateBridgeSupplyCap(minterAddress, parseEther('1')))
      .to.emit(erc20Facet, 'BridgeSupplyCapUpdated')
      .withArgs(minterAddress, parseEther('1'));

    expect(await erc20Facet.bridges(minterAddress)).to.deep.eq([1000000000000000000n, 0]);

    const tx = await minter['mint(address,address,uint256)'](diamondAddress, tokenReceiver.address, parseEther('1'));
    await expect(tx).to.emit(erc20Facet, 'Transfer').withArgs(ZeroAddress, tokenReceiver.address, parseEther('1'));
    await expect(tx).to.changeTokenBalance(erc20Facet, tokenReceiver.address, parseEther('1'));

    expect(await erc20Facet.totalSupply()).to.eq(parseEther('1'));
    await expect(minter.mint(diamondAddress, tokenReceiver.address, parseEther('0.1')))
      .to.be.revertedWithCustomError(erc20Facet, 'BridgeSupplyExceeded')
      .withArgs(parseEther('0.1'), parseEther('1'));

    expect(await erc20Facet.bridges(minterAddress)).to.deep.eq([1000000000000000000n, 1000000000000000000n]);
  });

  it('address can burn a specific max amount of tokens', async () => {
    setBalance(tokenReceiver.address, parseEther('10'));
    expect(await erc20Facet.totalSupply()).to.eq(0);
    await erc20Facet.updateBridgeSupplyCap(minterAddress, parseEther('1'));
    await minter['mint(address,address,uint256)'](diamondAddress, tokenReceiver.address, parseEther('1'));

    await expect(minter['burn(address,address,uint256)'](diamondAddress, tokenReceiver.address, parseEther('2')))
      .to.be.revertedWithCustomError(erc20Facet, 'BridgeSupplyExceeded')
      .withArgs(parseEther('2'), parseEther('1'));

    // allowance
    await erc20Facet.connect(tokenReceiver).approve(minterAddress, parseEther('1'));
    await expect(
      minter['burn(address,address,uint256)'](diamondAddress, tokenReceiver.address, parseEther('1'))
    ).to.changeTokenBalance(erc20Facet, tokenReceiver.address, parseEther('-1'));

    expect(await erc20Facet.allowance(tokenReceiver.address, minterAddress)).to.eq(0);
    expect(await erc20Facet.totalSupply()).to.eq(0);

    await expect(minter['burnFrom(address,address,uint256)'](diamondAddress, tokenReceiver.address, parseEther('1')))
      .to.be.revertedWithCustomError(erc20Facet, 'BridgeSupplyExceeded')
      .withArgs(parseEther('1'), parseEther('0'));

    //when cap is set to 0 but there is still tokens left for this address being burnable

    await minter['mint(address,address,uint256)'](diamondAddress, tokenReceiver.address, parseEther('1'));
    await erc20Facet.updateBridgeSupplyCap(minterAddress, parseEther('0'));
    await erc20Facet.connect(tokenReceiver).approve(minterAddress, parseEther('1'));
    await expect(minter.burnFrom(diamondAddress, tokenReceiver.address, parseEther('1'))).to.changeTokenBalance(
      erc20Facet,
      tokenReceiver.address,
      parseEther('-1')
    );

    // simple burn
    await erc20Facet.updateBridgeSupplyCap(minterAddress, parseEther('1'));

    await minter['mint(address,address,uint256)'](diamondAddress, tokenReceiver.address, parseEther('1'));
    await expect(erc20Facet.connect(tokenReceiver)['burn(uint256)'](parseEther('1'))).to.changeTokenBalance(
      erc20Facet,
      tokenReceiver.address,
      parseEther('-1')
    );

    // simple burnFrom
    await erc20Facet.updateBridgeSupplyCap(minterAddress, parseEther('2'));

    await minter['mint(address,address,uint256)'](diamondAddress, tokenReceiver.address, parseEther('1'));
    await erc20Facet.connect(tokenReceiver).approve(deployer, parseEther('1'));
    await expect(erc20Facet['burn(address,uint256)'](tokenReceiver.address, parseEther('1'))).to.changeTokenBalance(
      erc20Facet,
      tokenReceiver.address,
      parseEther('-1')
    );
    expect(await erc20Facet.totalSupply()).to.eq(0);
    expect(await erc20Facet.bridges(minterAddress)).to.deep.eq([2000000000000000000n, 2000000000000000000n]);
  });

  it('should return owner address', async () => {
    expect(await erc20Facet.getOwner()).to.eq(deployer);
  });

  describe('Post Initialize', () => {
    describe('Settings', () => {
      beforeEach(async () => {
        await erc20Facet.initERC20Facet('DegenX', 'DGNX', 18);
      });

      describe('pausing', () => {
        it('should be paused on start', async () => {
          // has initial state false
          expect(await erc20Facet.paused()).to.be.true;
        });

        it('should be able to get unpaused', async () => {
          await expect(erc20Facet.enable()).to.emit(erc20Facet, 'Unpaused').withArgs(deployer);
          expect(await erc20Facet.paused()).to.be.false;
        });

        it('should be able to get paused', async () => {
          await erc20Facet.enable();
          await expect(erc20Facet.disable()).to.emit(erc20Facet, 'Paused').withArgs(deployer);
          expect(await erc20Facet.paused()).to.be.true;
        });
      });

      describe('Liquidity Pool', () => {
        it('should be able to set an LP address', async () => {
          const _lp = ethers.Wallet.createRandom().address;
          expect(await erc20Facet.hasLP(_lp)).to.be.false;
          await expect(erc20Facet.addLP(_lp)).to.emit(erc20Facet, 'AddLP').withArgs(_lp);
          expect(await erc20Facet.hasLP(_lp)).to.be.true;
          await expect(erc20Facet.removeLP(_lp)).to.emit(erc20Facet, 'RemoveLP').withArgs(_lp);
          expect(await erc20Facet.hasLP(_lp)).to.be.false;
        });
      });

      describe('Exlucde and Include Accounts', () => {
        const accountA = ethers.Wallet.createRandom().address;
        it('should be able to add an account to excluding list', async () => {
          await expect(erc20Facet.excludeAccountFromTax(accountA))
            .to.emit(erc20Facet, 'ExcludeAccountFromTax')
            .withArgs(accountA);
          expect(await erc20Facet.isExcluded(accountA)).to.be.true;
        });
        it('should be able to remove an account from excluding list', async () => {
          await erc20Facet.excludeAccountFromTax(accountA);
          await expect(erc20Facet.includeAccountForTax(accountA))
            .to.emit(erc20Facet, 'IncludeAccountToTax')
            .withArgs(accountA);
          expect(await erc20Facet.isExcluded(accountA)).to.be.false;
        });
      });

      describe('Fees', () => {
        const feeA = keccak256(toUtf8Bytes('feeA'));
        const feeB = keccak256(toUtf8Bytes('feeB'));
        const feeC = keccak256(toUtf8Bytes('feeC'));

        beforeEach(async () => {
          const { facetContract } = await deployFacet('FeeStoreFacet');
          await addFacets([facetContract], diamondAddress, undefined, undefined, deployer);
          const feeStoreFacet = await ethers.getContractAt('FeeStoreFacet', diamondAddress, deployerSigner);
          await feeStoreFacet.syncFees([
            { id: feeA, action: 1, fee: 10000, target: ZeroAddress },
            { id: feeB, action: 1, fee: 10000, target: ZeroAddress },
          ]);
        });

        it('should be able to add buy fees', async () => {
          await expect(erc20Facet.addBuyFee(ZeroHash)).to.be.revertedWithCustomError(erc20Facet, 'FeeIdMissing');
          await expect(erc20Facet.addBuyFee(feeC))
            .to.be.revertedWithCustomError(erc20Facet, 'InvalidFeeId')
            .withArgs(feeC);
          await expect(erc20Facet.addBuyFee(feeA)).to.emit(erc20Facet, 'FeeAdded').withArgs(feeA, true);
          expect(await erc20Facet.isBuyFee(feeA)).to.be.true;
          await expect(erc20Facet.addBuyFee(feeA))
            .to.be.revertedWithCustomError(erc20Facet, 'FeeIdAlreadySet')
            .withArgs(feeA);
        });

        it('should be able to remove buy fees', async () => {
          await expect(erc20Facet.removeBuyFee(feeA))
            .to.be.revertedWithCustomError(erc20Facet, 'FeeIdNotSet')
            .withArgs(feeA);
          await erc20Facet.addBuyFee(feeA);
          await erc20Facet.addBuyFee(feeB);
          await expect(erc20Facet.removeBuyFee(feeA)).to.emit(erc20Facet, 'FeeRemoved').withArgs(feeA, true);
          expect(await erc20Facet.isBuyFee(feeA)).to.be.false;
          expect(await erc20Facet.isBuyFee(feeB)).to.be.true;
        });

        it('should be able to add sell fees', async () => {
          await expect(erc20Facet.addSellFee(feeA)).to.emit(erc20Facet, 'FeeAdded').withArgs(feeA, false);
          expect(await erc20Facet.isSellFee(feeA)).to.be.true;
        });

        it('should be able to remove sell fees', async () => {
          await expect(erc20Facet.removeSellFee(feeA))
            .to.be.revertedWithCustomError(erc20Facet, 'FeeIdNotSet')
            .withArgs(feeA);
          await erc20Facet.addSellFee(feeA);
          await expect(erc20Facet.removeSellFee(feeA)).to.emit(erc20Facet, 'FeeRemoved').withArgs(feeA, false);
          expect(await erc20Facet.isSellFee(feeA)).to.be.false;
        });
      });
    });

    describe('Tokenomics', () => {
      let lp: SignerWithAddress;
      let feeAId: string, feeBId: string, feeCId: string, feeDId: string, erc20Address: string;
      let feeStoreFacet: FeeStoreFacet;

      beforeEach(async () => {
        // fake lp
        [, , lp] = await ethers.getSigners();

        // add feestore
        const { facetContract } = await deployFacet('FeeStoreFacet');
        await addFacets([facetContract], diamondAddress, undefined, undefined, deployer);
        feeStoreFacet = await ethers.getContractAt('FeeStoreFacet', diamondAddress, deployerSigner);

        // initilize token with the desired swap path to the fee token
        await erc20Facet.initERC20Facet('DegenX', 'DGNX', 18);
        await erc20Facet.addLP(lp.address);
        await erc20Facet.enable();

        // mint tokens and send to actors
        await erc20Facet.updateBridgeSupplyCap(minterAddress, parseEther('200'));
        await minter['mint(address,address,uint256)'](diamondAddress, deployer, parseEther('100'));
        await minter['mint(address,address,uint256)'](diamondAddress, lp.address, parseEther('100'));

        erc20Address = await erc20Facet.getAddress();

        // feestore configs
        feeAId = keccak256(toUtf8Bytes('feeA'));
        feeBId = keccak256(toUtf8Bytes('feeB'));
        feeCId = keccak256(toUtf8Bytes('feeC'));
        feeDId = keccak256(toUtf8Bytes('feeD'));
        const configA: FeeConfigSyncDTOStruct = {
          id: feeAId,
          fee: 100,
          target: ZeroAddress,
          action: FeeSyncAction.Add,
        };
        const configB: FeeConfigSyncDTOStruct = {
          id: feeBId,
          fee: 200,
          target: ZeroAddress,
          action: FeeSyncAction.Add,
        };
        const configC: FeeConfigSyncDTOStruct = {
          id: feeCId,
          fee: 200,
          target: ZeroAddress,
          action: FeeSyncAction.Add,
        };
        const configD: FeeConfigSyncDTOStruct = {
          id: feeDId,
          fee: 400,
          target: ZeroAddress,
          action: FeeSyncAction.Add,
        };
        await feeStoreFacet.syncFees([configA, configB, configC, configD]);

        // add fees to ERC20
        await erc20Facet.addBuyFee(feeAId);
        await erc20Facet.addBuyFee(feeBId);
        await erc20Facet.addSellFee(feeCId);
        await erc20Facet.addSellFee(feeDId);
      });

      it('should charge no fees', async () => {
        // remove fees
        await erc20Facet.removeBuyFee(feeAId);
        await erc20Facet.removeBuyFee(feeBId);
        await erc20Facet.removeSellFee(feeCId);
        await erc20Facet.removeSellFee(feeDId);
        await expect(erc20Facet.connect(lp).transfer(deployer, parseEther('1'))).to.changeTokenBalances(
          erc20Facet,
          [lp.address, deployer, erc20Address],
          [parseEther('-1'), parseEther('1'), parseEther('0')]
        );
      });

      it('should charge fees on buys', async () => {
        await expect(erc20Facet.connect(lp).transfer(deployer, parseEther('1'))).to.changeTokenBalances(
          erc20Facet,
          [lp.address, deployer, erc20Address],
          [parseEther('-1'), parseEther('0.97'), parseEther('0.03')]
        );
      });

      it('should charge fees on sells and deposit charged fees to FeeStore', async () => {
        const tx = await erc20Facet.transfer(lp.address, parseEther('1'));
        await expect(tx).to.changeTokenBalances(
          erc20Facet,
          [deployer, lp.address, erc20Address],
          [parseEther('-1'), parseEther('0.94'), parseEther('0.06')]
        );
        expect(await feeStoreFacet.getCollectedFeesByConfigId(feeCId)).to.eq(parseEther('0.02'));
        expect(await feeStoreFacet.getCollectedFeesByConfigId(feeDId)).to.eq(parseEther('0.04'));
        expect(await feeStoreFacet.getCollectedFeesTotal()).to.eq(parseEther('0.06'));
      });

      it('should charge fees on buys and deposit charged fees to FeeStore', async () => {
        const tx = await erc20Facet.connect(lp).transfer(deployer, parseEther('1'));
        await expect(tx).to.changeTokenBalances(
          erc20Facet,
          [lp.address, deployer, erc20Address],
          [parseEther('-1'), parseEther('0.97'), parseEther('0.03')]
        );
        expect(await feeStoreFacet.getCollectedFeesByConfigId(feeAId)).to.eq(parseEther('0.01'));
        expect(await feeStoreFacet.getCollectedFeesByConfigId(feeBId)).to.eq(parseEther('0.02'));
        expect(await feeStoreFacet.getCollectedFeesTotal()).to.eq(parseEther('0.03'));
      });

      it('should exclude accounts from getting charged', async () => {
        await erc20Facet.excludeAccountFromTax(deployer);
        await expect(erc20Facet.connect(lp).transfer(deployer, parseEther('1'))).to.changeTokenBalances(
          erc20Facet,
          [lp.address, deployer, await erc20Facet.getAddress()],
          [parseEther('-1'), parseEther('1'), parseEther('0')]
        );
        const tx = await erc20Facet.transfer(lp.address, parseEther('1'));
        await expect(tx).to.changeTokenBalances(
          erc20Facet,
          [lp.address, deployer, await erc20Facet.getAddress(), await feeStoreFacet.getAddress()],
          [parseEther('1'), parseEther('-1'), parseEther('0'), parseEther('0')]
        );
      });

      it('should have getters to reflect the store', async () => {
        expect(await erc20Facet.hasLP(lp.address)).to.be.true;
        expect(await erc20Facet.getBuyFees()).to.deep.eq([feeAId, feeBId]);
        expect(await erc20Facet.getSellFees()).to.deep.eq([feeCId, feeDId]);
      });
    });
  });
});
