import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { AbiCoder, ZeroAddress, ZeroHash, keccak256, parseEther, toUtf8Bytes } from 'ethers';
import { deployments, ethers, getNamedAccounts, network } from 'hardhat';
import { deployFacet } from '../scripts/helpers/deploy-diamond';
import { addFacets } from '../scripts/helpers/diamond';
import { ERC20Mock, FeeStoreFacet, FeeStoreTestingDummyFacet } from '../typechain-types';
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
  let erc20: ERC20Mock;
  const { diamondAddress } = await deployDiamondFixture();
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;
  const deployerSigner = await ethers.getSigner(deployer);

  await addFacets([(await deployFacet('FeeStoreFacet')).facetContract], diamondAddress, undefined, undefined, deployer);
  const feeStoreFacet = await ethers.getContractAt('FeeStoreFacet', diamondAddress, deployerSigner);

  {
    const { address } = await deploy('ERC20Mock', { from: deployer });
    erc20 = await ethers.getContractAt('ERC20Mock', address, deployerSigner);
  }

  await erc20.mint(deployer, parseEther('1000'));

  return {
    deployer,
    deployerSigner,
    diamondAddress,
    feeStoreFacet,
    erc20,
  };
};

describe('FeeStoreFacet', () => {
  let deployer: string,
    diamondAddress: string,
    deployerSigner: SignerWithAddress,
    feeStoreFacet: FeeStoreFacet,
    erc20: ERC20Mock;

  let snapshotId: any;

  beforeEach(async () => {
    ({ deployer, diamondAddress, deployerSigner, feeStoreFacet, erc20 } = await deployFixture());
    snapshotId = await network.provider.send('evm_snapshot');
  });

  afterEach(async function () {
    await network.provider.send('evm_revert', [snapshotId]);
  });

  describe('Deployment', () => {
    it('should deploy successfully', async () => {
      const diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress, deployerSigner);
      expect((await diamondLoupeFacet.facets()).length).to.eq(3);
    });
  });

  describe('Sync FeeConfig', () => {
    it('should add a config based on a sync data transfer object', async () => {
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
      await expect(
        deployerSigner.sendTransaction({
          data: feeDeployerMessageAdd,
          to: diamondAddress,
          from: deployerSigner.address,
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
      await expect(feeStoreFacet.syncFees([feeConfigSyncUpdateDTORaw]))
        .to.revertedWithCustomError(feeStoreFacet, 'FeeNotExisting')
        .withArgs(feeConfigSyncUpdateDTORaw.id);
      await feeStoreFacet.syncFees([feeConfigSyncAddDTORaw]);
      await expect(feeStoreFacet.syncFees([feeConfigSyncUpdateDTORaw]))
        .to.emit(feeStoreFacet, 'FeeConfigUpdated')
        .withArgs(feeConfigSyncUpdateDTORaw.id);
    });

    it('should delete a config based on a sync data transfer object', async () => {
      await expect(feeStoreFacet.syncFees([feeConfigSyncDeleteDTORaw]))
        .to.revertedWithCustomError(feeStoreFacet, 'FeeNotExisting')
        .withArgs(feeConfigSyncDeleteDTORaw.id);

      await feeStoreFacet.syncFees([{ ...feeConfigSyncAddDTORaw, id: keccak256(toUtf8Bytes('otherfee')) }]); // add another fee first, so else branch gets tested
      await feeStoreFacet.syncFees([feeConfigSyncAddDTORaw]);
      await expect(feeStoreFacet.syncFees([feeConfigSyncDeleteDTORaw]))
        .to.emit(feeStoreFacet, 'FeeConfigDeleted')
        .withArgs(feeConfigSyncDeleteDTORaw.id);
    });
  });

  describe('Charge Fees', () => {
    let chargeFeeFacet: FeeStoreTestingDummyFacet;

    beforeEach(async () => {
      const { facetContract } = await deployFacet('FeeStoreTestingDummyFacet');
      await addFacets([facetContract], diamondAddress, undefined, undefined, deployer);

      chargeFeeFacet = await ethers.getContractAt('FeeStoreTestingDummyFacet', diamondAddress, deployerSigner);

      await deployerSigner.sendTransaction({
        data: feeDeployerMessageAdd,
        to: diamondAddress,
        from: deployer,
      });
    });

    it('should prepare fees internally so it can be sent through provider specific fee hub', async () => {
      await feeStoreFacet.syncFees([{ ...feeConfigSyncAddDTORaw, id: feeIdOther }]); // add other fee to add some else cases
      await expect(chargeFeeFacet.prepareToSendFeesTest()).to.be.revertedWithCustomError(feeStoreFacet, 'ZeroFees');
      const inputAmount = parseEther('1');
      const [, expectedOutputAmount] = await chargeFeeFacet.calcFeesRelative(
        feeConfigSyncAddDTORaw.id,
        diamondAddress,
        inputAmount
      );
      await erc20.mint(await feeStoreFacet.getAddress(), expectedOutputAmount);
      await chargeFeeFacet.putFees(feeConfigSyncAddDTORaw.id, expectedOutputAmount);
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
      await erc20.mint(diamondAddress, expectedOutputAmount);
      await chargeFeeFacet.putFees(feeConfigSyncAddDTORaw.id, expectedOutputAmount);

      // remove fee tx
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
      await erc20.mint(diamondAddress, expectedOutputAmount);
      await chargeFeeFacet.putFees(feeConfigSyncAddDTORaw.id, expectedOutputAmount);

      await deployerSigner.sendTransaction({
        data: feeDeployerMessageRemove,
        to: diamondAddress,
      });
      await expect(chargeFeeFacet.prepareToSendFeesTest())
        .to.emit(feeStoreFacet, 'FeeConfigDeleted')
        .withArgs(feeConfigSyncAddDTORaw.id);
    });

    it('should be enable the manager to collect the fees', async () => {
      const [, , otherSigner] = await ethers.getSigners();

      await expect(feeStoreFacet.connect(otherSigner).collectFeesFromFeeStore()).to.be.revertedWith(
        accessControlError(otherSigner.address, FEE_STORE_MANAGER_ROLE)
      );
      const inputAmount = parseEther('1');
      const [, expectedOutputAmount] = await chargeFeeFacet.calcFeesRelative(
        feeConfigSyncAddDTORaw.id,
        diamondAddress,
        inputAmount
      );
      await erc20.mint(diamondAddress, expectedOutputAmount);
      await chargeFeeFacet.putFees(feeConfigSyncAddDTORaw.id, expectedOutputAmount);
      await expect(feeStoreFacet.collectFeesFromFeeStore()).to.be.revertedWithCustomError(feeStoreFacet, 'AddressZero');
      await feeStoreFacet.initFeeStoreFacet(otherSigner.address, await erc20.getAddress());
      const tx = await feeStoreFacet.collectFeesFromFeeStore();
      await expect(tx).to.emit(feeStoreFacet, 'FeesCollected');
      await expect(tx).to.changeTokenBalances(
        erc20,
        [diamondAddress, otherSigner.address],
        [parseEther('-0.001'), parseEther('0.001')]
      );
    });

    it('should check if absolute calculation is being done properly', async () => {
      const inputAmount = parseEther('1');
      expect(
        await chargeFeeFacet.calcFeesAbsolute(feeConfigSyncAddDTORaw.id, await erc20.getAddress(), inputAmount)
      ).to.deep.eq([parseEther('0.99'), parseEther('0.01'), 100n]);
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

      await feeStoreFacet.syncFees([
        { ...feeConfigSyncAddDTORaw, id: fee1 },
        { ...feeConfigSyncAddDTORaw, id: fee2 },
      ]);
      expect(await feeStoreFacet.getFeeConfigIds()).to.deep.eq([feeId, fee1, fee2]);
    });

    it('should be initialized successfully', async () => {
      await expect(feeStoreFacet.initFeeStoreFacet(deployer, await erc20.getAddress())).to.emit(
        feeStoreFacet,
        'Initialized'
      );
      await expect(feeStoreFacet.initFeeStoreFacet(deployer, await erc20.getAddress())).to.be.revertedWithCustomError(
        feeStoreFacet,
        'AlreadyInitialized'
      );
      expect(await feeStoreFacet.getOperator()).to.eq(deployer);
    });

    it('should change operator', async () => {
      const [, , newOperator] = await ethers.getSigners();
      await feeStoreFacet.initFeeStoreFacet(deployer, diamondAddress);
      await expect(feeStoreFacet.connect(newOperator).setOperator(newOperator.address)).to.be.rejectedWith(
        accessControlError(newOperator.address, DEPLOYER_ROLE)
      );
      await expect(feeStoreFacet.setOperator(ZeroAddress)).to.be.revertedWithCustomError(feeStoreFacet, 'AddressZero');
      await expect(feeStoreFacet.setOperator(newOperator.address)).to.emit(feeStoreFacet, 'UpdatedOperator');
      expect(await feeStoreFacet.getOperator()).to.eq(newOperator.address);
    });

    it('should change intermediate asset', async () => {
      await feeStoreFacet.initFeeStoreFacet(deployer, await erc20.getAddress());
      await expect(feeStoreFacet.setIntermediateAsset(ZeroAddress)).to.be.revertedWithCustomError(
        feeStoreFacet,
        'AddressZero'
      );
      await expect(feeStoreFacet.setIntermediateAsset(deployer)).to.emit(feeStoreFacet, 'UpdatedIntermediateAsset');
      expect(await feeStoreFacet.getIntermediateAsset()).to.eq(deployer);
    });

    it('should deposit a fee based on its fee id manually', async () => {
      const [, , otherSigner] = await ethers.getSigners();
      const erc20Address = await erc20.getAddress();
      await feeStoreFacet.initFeeStoreFacet(deployer, erc20Address);

      await expect(feeStoreFacet.connect(otherSigner).feeStoreDepositFeeAmount(ZeroHash, 0)).to.be.revertedWith(
        accessControlError(otherSigner.address, FEE_STORE_MANAGER_ROLE)
      );

      expect(await feeStoreFacet.getCollectedFeesByConfigId(feeId)).to.eq(0);

      const amountToDeposit = parseEther('123');
      const amountToWithdraw = parseEther('-123');

      await erc20.approve(diamondAddress, amountToDeposit);
      const tx = feeStoreFacet.feeStoreDepositFeeAmount(feeId, amountToDeposit);
      await expect(tx).to.emit(feeStoreFacet, 'FeeAmountDeposited').withArgs(erc20Address, feeId, amountToDeposit);
      await expect(tx).to.changeTokenBalances(erc20, [diamondAddress, deployer], [amountToDeposit, amountToWithdraw]);

      expect(await feeStoreFacet.getCollectedFeesByConfigId(feeId)).to.eq(amountToDeposit);
    });
  });

  describe('Restore Fees', () => {
    let operator: SignerWithAddress;

    beforeEach(async () => {
      [, , operator] = await ethers.getSigners();
      await feeStoreFacet.initFeeStoreFacet(operator.address, await erc20.getAddress());
      await feeStoreFacet.syncFees([
        { ...feeConfigSyncAddDTORaw, id: feeId },
        { ...feeConfigSyncAddDTORaw, id: feeIdOther },
      ]);
    });

    it('should restore fees', async () => {
      await erc20.approve(diamondAddress, parseEther('3'));
      await erc20.disable();

      const restoreDto = {
        totalFees: parseEther('3'),
        bountyReceiver: deployer,
        fees: [
          { id: feeId, amount: parseEther('0.8') },
          { id: feeIdOther, amount: parseEther('1.2') },
          { id: ZeroHash, amount: parseEther('1') },
        ],
      };

      await expect(feeStoreFacet.restoreFeesFromSendFees(restoreDto)).to.be.revertedWith(
        'ERC20Pausable: token transfer while paused'
      );

      await erc20.setReturnFalseOnTransfer(true);
      await erc20.enable();

      await expect(feeStoreFacet.restoreFeesFromSendFees(restoreDto)).to.be.revertedWithCustomError(
        feeStoreFacet,
        'TransferFailed'
      );

      await erc20.setReturnFalseOnTransfer(false);

      const tx = await feeStoreFacet.restoreFeesFromSendFees(restoreDto);
      await expect(tx).to.emit(feeStoreFacet, 'FeesRestored');
      await expect(tx).to.changeTokenBalances(
        erc20,
        [deployer, diamondAddress, operator.address],
        [parseEther('-3'), parseEther('2'), parseEther('1')]
      );
    });
  });
});
