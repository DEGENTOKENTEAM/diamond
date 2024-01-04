import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { AbiCoder, Contract, ZeroAddress, ZeroHash, keccak256, parseEther, toUtf8Bytes } from 'ethers';
import { deployments, ethers, getNamedAccounts } from 'hardhat';
import { deployFacet } from '../scripts/helpers/deploy-diamond';
import { addFacets } from '../scripts/helpers/diamond';
import { ERC20Facet, ERC20Mock, FeeStoreFacet, FeeStoreTestingDummyFacet } from '../typechain-types';
import { FeeStoreConfigStruct } from '../typechain-types/contracts/diamond/facets/FeeStoreFacet';
import { accessControlError, deployFixture as deployDiamondFixture } from './utils/helper';
import {
  DEPLOYER_ROLE,
  FEE_STORE_MANAGER_ROLE,
  feeConfigSyncAddDTORaw,
  feeConfigSyncDeleteDTORaw,
  feeConfigSyncUpdateDTORaw,
  feeDeployerMessageAdd,
  feeDeployerMessageRemove,
  feeId,
  feeIdOther,
} from './utils/mocks';

const deployFixture = async () => {
  const { diamond, diamondAddress } = await deployDiamondFixture();
  const { deployer } = await getNamedAccounts();
  const { facetContract: feeStoreFacetBaseContract } = await deployFacet('FeeStoreFacet');
  const { facetContract: erc20FacetBaseContract } = await deployFacet('ERC20Facet');
  await addFacets([erc20FacetBaseContract, feeStoreFacetBaseContract], diamondAddress);
  const erc20Facet = await ethers.getContractAt('ERC20Facet', diamondAddress);
  await (await erc20Facet.initERC20Facet('A', 'B', 18)).wait();
  await (await erc20Facet.enable()).wait();
  await (await erc20Facet.mint(deployer, parseEther('1000'))).wait();
  return {
    diamond,
    diamondAddress,
    erc20Facet: erc20Facet,
  };
};

describe('FeeStoreFacet', () => {
  describe('Deployment', () => {
    it('should deploy successfully', async () => {
      const { diamondAddress } = await deployFixture();
      const diamond = await ethers.getContractAt('Diamond', diamondAddress);
      const diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress);
      expect(await diamond.waitForDeployment()).to.be.instanceOf(Contract);
      expect((await diamondLoupeFacet.facets()).length).to.eq(4);
    });
  });

  describe('Sync FeeConfig', () => {
    it('should add a config based on a sync data transfer object', async () => {
      const { diamondAddress } = await deployFixture();
      const feeStoreFacet = await ethers.getContractAt('FeeStoreFacet', diamondAddress);
      await expect(feeStoreFacet.syncFees([{ ...feeConfigSyncAddDTORaw, id: ZeroHash }]))
        .to.revertedWithCustomError(feeStoreFacet, 'InvalidFee')
        .withArgs(ZeroHash);
      await expect(feeStoreFacet.syncFees([{ ...feeConfigSyncAddDTORaw, fee: 0 }]))
        .to.revertedWithCustomError(feeStoreFacet, 'InvalidFee')
        .withArgs(feeConfigSyncAddDTORaw.id);
      await expect(feeStoreFacet.syncFees([])).to.revertedWithCustomError(feeStoreFacet, 'DataMissing');
      await expect(feeStoreFacet.syncFees([feeConfigSyncAddDTORaw]))
        .to.emit(feeStoreFacet, 'FeeConfigAdded')
        .withArgs(feeConfigSyncAddDTORaw.id)
        .to.emit(feeStoreFacet, 'FeesSynced');
      await expect(feeStoreFacet.syncFees([feeConfigSyncAddDTORaw]))
        .to.revertedWithCustomError(feeStoreFacet, 'FeeExists')
        .withArgs(feeConfigSyncAddDTORaw.id);
    });

    it('should add a config based on a message', async () => {
      const { diamondAddress } = await deployFixture();
      const [deployer] = await ethers.getSigners();
      const feeStoreFacet = await ethers.getContractAt('FeeStoreFacet', diamondAddress);

      await expect(
        deployer.sendTransaction({
          data: feeDeployerMessageAdd,
          to: diamondAddress,
          from: deployer.address,
        })
      )
        .to.emit(feeStoreFacet, 'FeeConfigAdded')
        .withArgs(feeConfigSyncAddDTORaw.id)
        .to.emit(feeStoreFacet, 'FeesSynced');

      await expect(feeStoreFacet.syncFees([feeConfigSyncAddDTORaw]))
        .to.revertedWithCustomError(feeStoreFacet, 'FeeExists')
        .withArgs(feeConfigSyncAddDTORaw.id);
    });

    it('should update a config based on a sync data transfer object', async () => {
      const { diamondAddress } = await deployFixture();
      const feeStoreFacet = await ethers.getContractAt('FeeStoreFacet', diamondAddress);
      await expect(feeStoreFacet.syncFees([feeConfigSyncUpdateDTORaw]))
        .to.revertedWithCustomError(feeStoreFacet, 'FeeNotExisting')
        .withArgs(feeConfigSyncUpdateDTORaw.id);
      await (await feeStoreFacet.syncFees([feeConfigSyncAddDTORaw])).wait();
      await expect(feeStoreFacet.syncFees([feeConfigSyncUpdateDTORaw]))
        .to.emit(feeStoreFacet, 'FeeConfigUpdated')
        .withArgs(feeConfigSyncUpdateDTORaw.id);
    });

    it('should delete a config based on a sync data transfer object', async () => {
      const { diamondAddress } = await deployFixture();
      const feeStoreFacet = await ethers.getContractAt('FeeStoreFacet', diamondAddress);
      await expect(feeStoreFacet.syncFees([feeConfigSyncDeleteDTORaw]))
        .to.revertedWithCustomError(feeStoreFacet, 'FeeNotExisting')
        .withArgs(feeConfigSyncDeleteDTORaw.id);
      await (
        await feeStoreFacet.syncFees([{ ...feeConfigSyncAddDTORaw, id: keccak256(toUtf8Bytes('otherfee')) }])
      ).wait(); // add another fee first, so else branch gets tested
      await (await feeStoreFacet.syncFees([feeConfigSyncAddDTORaw])).wait();
      await expect(feeStoreFacet.syncFees([feeConfigSyncDeleteDTORaw]))
        .to.emit(feeStoreFacet, 'FeeConfigDeleted')
        .withArgs(feeConfigSyncDeleteDTORaw.id);
    });
  });

  describe('Charge Fees', () => {
    let chargeFeeFacet: FeeStoreTestingDummyFacet;
    let feeStoreFacet: FeeStoreFacet;
    let erc20Facet: ERC20Facet;
    let diamondAddress: string, deployer: string;

    beforeEach(async () => {
      const { diamondAddress: _diamondAddress, erc20Facet: _erc20Facet } = await deployFixture();
      diamondAddress = _diamondAddress;
      erc20Facet = _erc20Facet;

      const { deployer: _deployer } = await getNamedAccounts();
      deployer = _deployer;

      const { deploy } = deployments;

      await deploy('FeeStoreTestingDummyFacet', { from: deployer });
      const facetContract = (await ethers.getContract('FeeStoreTestingDummyFacet')) as Contract;
      await addFacets([facetContract], diamondAddress);

      feeStoreFacet = await ethers.getContractAt('FeeStoreFacet', diamondAddress);
      chargeFeeFacet = await ethers.getContractAt('FeeStoreTestingDummyFacet', diamondAddress);

      // add a config to the fee config store
      const [deployerSigner] = await ethers.getSigners();
      await (
        await deployerSigner.sendTransaction({
          data: feeDeployerMessageAdd,
          to: diamondAddress,
          from: deployer,
        })
      ).wait();
    });

    it('should prepare fees internally so it can be sent through provider specific fee hub', async () => {
      await (await feeStoreFacet.syncFees([{ ...feeConfigSyncAddDTORaw, id: feeIdOther }])).wait(); // add other fee to add some else cases
      await expect(chargeFeeFacet.prepareToSendFeesTest()).to.be.revertedWithCustomError(feeStoreFacet, 'ZeroFees');
      const inputAmount = parseEther('1');
      const [, expectedOutputAmount] = await chargeFeeFacet.calcFeesRelative(
        feeConfigSyncAddDTORaw.id,
        diamondAddress,
        inputAmount
      );
      await (await erc20Facet.mint(await feeStoreFacet.getAddress(), expectedOutputAmount)).wait();
      await (await chargeFeeFacet.putFees(feeConfigSyncAddDTORaw.id, expectedOutputAmount)).wait();
      expect(await feeStoreFacet.getCollectedFeesTotal()).to.eq(expectedOutputAmount);
      expect(await feeStoreFacet.getCollectedFeesByConfigId(feeConfigSyncAddDTORaw.id)).to.eq(expectedOutputAmount);
      const tx = await chargeFeeFacet.prepareToSendFeesTest();
      const txReceipt = await tx.wait();
      await expect(tx).to.emit(feeStoreFacet, 'FeesPrepared');
      const log = txReceipt?.logs[0].data || '';
      expect(new AbiCoder().decode(['uint256', 'tuple(uint256,address,tuple(bytes32,uint256)[])'], log)).to.deep.eq([
        parseEther('0.001'),
        [parseEther('0.001'), ZeroAddress, [[feeConfigSyncAddDTORaw.id, parseEther('0.001')]]],
      ]);
      expect(await feeStoreFacet.getCollectedFeesTotal()).to.eq(0);
    });

    it('should mark a fee config as deleted as long as there are fees not sent home yet', async () => {
      const inputAmount = parseEther('1');
      const [, expectedOutputAmount] = await chargeFeeFacet.calcFeesRelative(
        feeConfigSyncAddDTORaw.id,
        diamondAddress,
        inputAmount
      );
      await (await erc20Facet.mint(diamondAddress, expectedOutputAmount)).wait();
      await (await chargeFeeFacet.putFees(feeConfigSyncAddDTORaw.id, expectedOutputAmount)).wait();

      // remove fee tx
      const [deployerSigner] = await ethers.getSigners();
      await expect(
        deployerSigner.sendTransaction({
          data: feeDeployerMessageRemove,
          to: diamondAddress,
        })
      )
        .to.emit(feeStoreFacet, 'FeeConfigMarkedAsDeleted')
        .withArgs(feeConfigSyncAddDTORaw.id);

      const feeStoreConfig: FeeStoreConfigStruct = await feeStoreFacet.getFeeStoreConfig(feeConfigSyncAddDTORaw.id);
      expect(feeStoreConfig.deleted).to.be.true;
    });

    it('should delete a fee config once the collected amount is prepared for transfer', async () => {
      const inputAmount = parseEther('1');
      const [, expectedOutputAmount] = await chargeFeeFacet.calcFeesRelative(
        feeConfigSyncAddDTORaw.id,
        diamondAddress,
        inputAmount
      );
      await (await erc20Facet.mint(diamondAddress, expectedOutputAmount)).wait();
      await (await chargeFeeFacet.putFees(feeConfigSyncAddDTORaw.id, expectedOutputAmount)).wait();

      const [deployerSigner] = await ethers.getSigners();
      await (
        await deployerSigner.sendTransaction({
          data: feeDeployerMessageRemove,
          to: diamondAddress,
        })
      ).wait();
      await expect(chargeFeeFacet.prepareToSendFeesTest())
        .to.emit(feeStoreFacet, 'FeeConfigDeleted')
        .withArgs(feeConfigSyncAddDTORaw.id);
    });

    it('should be enable the manager to collect the fees', async () => {
      const [, otherSigner] = await ethers.getSigners();
      await expect(feeStoreFacet.connect(otherSigner).collectFeesFromFeeStore()).to.be.revertedWith(
        accessControlError(otherSigner.address, FEE_STORE_MANAGER_ROLE)
      );
      const inputAmount = parseEther('1');
      const [, expectedOutputAmount] = await chargeFeeFacet.calcFeesRelative(
        feeConfigSyncAddDTORaw.id,
        diamondAddress,
        inputAmount
      );
      await (await erc20Facet.mint(diamondAddress, expectedOutputAmount)).wait();
      await (await chargeFeeFacet.putFees(feeConfigSyncAddDTORaw.id, expectedOutputAmount)).wait();
      await expect(feeStoreFacet.collectFeesFromFeeStore()).to.be.revertedWithCustomError(feeStoreFacet, 'AddressZero');
      await (await feeStoreFacet.initFeeStoreFacet(otherSigner.address, diamondAddress)).wait();
      const tx = await feeStoreFacet.collectFeesFromFeeStore();
      await expect(tx).to.emit(feeStoreFacet, 'FeesCollected');
      await expect(tx).to.changeTokenBalances(
        erc20Facet,
        [diamondAddress, otherSigner.address],
        [parseEther('-0.001'), parseEther('0.001')]
      );
    });

    it('should check if absolute calculation is being done properly', async () => {
      const inputAmount = parseEther('1');
      expect(await chargeFeeFacet.calcFeesAbsolute(feeConfigSyncAddDTORaw.id, diamondAddress, inputAmount)).to.deep.eq([
        parseEther('0.99'),
        parseEther('0.01'),
        100n,
      ]);
    });

    it('should fail on certain conditions', async () => {
      await expect(chargeFeeFacet.calcFeesAbsolute(ZeroHash, ZeroAddress, 0)).to.be.revertedWithCustomError(
        chargeFeeFacet,
        'ZeroValueNotAllowed'
      );
      expect(await chargeFeeFacet.calcFeesAbsolute(ZeroHash, ZeroAddress, 1)).to.deep.eq([1n, 0n, 0n]);
      await expect(chargeFeeFacet.putFees(ZeroHash, 0)).to.be.revertedWithCustomError(
        chargeFeeFacet,
        'ZeroValueNotAllowed'
      );
      await expect(chargeFeeFacet.putFees(ZeroHash, 1)).to.be.revertedWithCustomError(chargeFeeFacet, 'NotAllowed');
    });

    it('should return all fee config ids', async () => {
      const fee1 = keccak256(toUtf8Bytes('fee1'));
      const fee2 = keccak256(toUtf8Bytes('fee2'));
      await (
        await feeStoreFacet.syncFees([
          { ...feeConfigSyncAddDTORaw, id: fee1 },
          { ...feeConfigSyncAddDTORaw, id: fee2 },
        ])
      ).wait();
      expect(await feeStoreFacet.getFeeConfigIds()).to.deep.eq([feeId, fee1, fee2]);
    });

    it('should be initialized successfully', async () => {
      await expect(feeStoreFacet.initFeeStoreFacet(deployer, diamondAddress)).to.emit(feeStoreFacet, 'Initialized');
      await expect(feeStoreFacet.initFeeStoreFacet(deployer, diamondAddress)).to.be.revertedWithCustomError(
        feeStoreFacet,
        'AlreadyInitialized'
      );
      expect(await feeStoreFacet.getOperator()).to.eq(deployer);
    });

    it('should change operator', async () => {
      const [, , newOperator] = await ethers.getSigners();
      await (await feeStoreFacet.initFeeStoreFacet(deployer, diamondAddress)).wait();
      await expect(feeStoreFacet.connect(newOperator).setOperator(newOperator.address)).to.be.rejectedWith(
        accessControlError(newOperator.address, DEPLOYER_ROLE)
      );
      await expect(feeStoreFacet.setOperator(ZeroAddress)).to.be.revertedWithCustomError(feeStoreFacet, 'AddressZero');
      await expect(feeStoreFacet.setOperator(newOperator.address)).to.emit(feeStoreFacet, 'UpdatedOperator');
      expect(await feeStoreFacet.getOperator()).to.eq(newOperator.address);
    });

    it('should change intermediate asset', async () => {
      await (await feeStoreFacet.initFeeStoreFacet(deployer, diamondAddress)).wait();
      await expect(feeStoreFacet.setIntermediateAsset(ZeroAddress)).to.be.revertedWithCustomError(
        feeStoreFacet,
        'AddressZero'
      );
      await expect(feeStoreFacet.setIntermediateAsset(deployer)).to.emit(feeStoreFacet, 'UpdatedIntermediateAsset');
      expect(await feeStoreFacet.getIntermediateAsset()).to.eq(deployer);
    });

    it('should deposit a fee based on its fee id manually', async () => {
      const [, otherSigner] = await ethers.getSigners();
      const { deployer } = await getNamedAccounts();
      const { deploy } = deployments;
      const { address } = await deploy('ERC20Mock', { from: deployer });
      await (await feeStoreFacet.initFeeStoreFacet(deployer, address)).wait();

      const erc20 = (await ethers.getContract('ERC20Mock')) as ERC20Mock;
      await expect(feeStoreFacet.connect(otherSigner).feeStoreDepositFeeAmount(ZeroHash, 0)).to.be.revertedWith(
        accessControlError(otherSigner.address, FEE_STORE_MANAGER_ROLE)
      );

      expect(await feeStoreFacet.getCollectedFeesByConfigId(feeId)).to.eq(0);

      const amountToDeposit = parseEther('123');
      const amountToWithdraw = parseEther('-123');

      await (await erc20.approve(diamondAddress, amountToDeposit)).wait();

      const tx = feeStoreFacet.feeStoreDepositFeeAmount(feeId, amountToDeposit);
      await expect(tx).to.emit(feeStoreFacet, 'FeeAmountDeposited').withArgs(address, feeId, amountToDeposit);
      await expect(tx).to.changeTokenBalances(erc20, [diamondAddress, deployer], [amountToDeposit, amountToWithdraw]);

      expect(await feeStoreFacet.getCollectedFeesByConfigId(feeId)).to.eq(amountToDeposit);
    });
  });

  describe('Restore Fees', () => {
    let feeStoreFacet: FeeStoreFacet;
    let erc20Facet: ERC20Facet;
    let diamondAddress: string, deployer: string;
    let operator: SignerWithAddress;

    beforeEach(async () => {
      const { diamondAddress: _diamondAddress, erc20Facet: _erc20Facet } = await deployFixture();
      diamondAddress = _diamondAddress;
      erc20Facet = _erc20Facet;

      const { deployer: _deployer } = await getNamedAccounts();
      deployer = _deployer;

      [, operator] = await ethers.getSigners();

      feeStoreFacet = await ethers.getContractAt('FeeStoreFacet', diamondAddress);
      await (await feeStoreFacet.initFeeStoreFacet(operator.address, diamondAddress)).wait();

      await (
        await feeStoreFacet.syncFees([
          { ...feeConfigSyncAddDTORaw, id: feeId },
          { ...feeConfigSyncAddDTORaw, id: feeIdOther },
        ])
      ).wait();
    });

    it('should restore fees', async () => {
      await (await erc20Facet.approve(diamondAddress, parseEther('3'))).wait();
      await (await erc20Facet.disable()).wait();

      const restoreDto = {
        totalFees: parseEther('3'),
        bountyReceiver: deployer,
        fees: [
          { id: feeId, amount: parseEther('0.8') },
          { id: feeIdOther, amount: parseEther('1.2') },
          { id: ZeroHash, amount: parseEther('1') },
        ],
      };

      await expect(feeStoreFacet.restoreFeesFromSendFees(restoreDto)).to.be.revertedWithCustomError(
        erc20Facet,
        'Pausable__Paused'
      );

      await (await erc20Facet.enable()).wait();

      const tx = await feeStoreFacet.restoreFeesFromSendFees(restoreDto);
      await expect(tx).to.emit(feeStoreFacet, 'FeesRestored');
      await expect(tx).to.changeTokenBalances(
        erc20Facet,
        [deployer, diamondAddress, operator.address],
        [parseEther('-3'), parseEther('2'), parseEther('1')]
      );
    });
  });
});
