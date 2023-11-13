import { AbiCoder, BigNumberish, Interface, ZeroAddress, ZeroHash, keccak256, parseEther, toUtf8Bytes } from 'ethers';
import { ZERO_ADDR } from '../../providers/celer-contracts/test/lib/constants';
import { FeeStoreFacet__factory } from '../../typechain-types';
import { AddReceiverParamsStruct } from '../../typechain-types/contracts/diamond/facets/FeeDistributorFacet';
import {
  AddChainParamsStruct,
  AddFeeConfigParamsStruct,
  AssignFeeConfigToChainParamsStruct,
  RemoveChainParamsStruct,
  UnassignFeeConfigFromAllChainsParamsStruct,
  UnassignFeeConfigFromChainParamsStruct,
  UpdateFeeConfigParamsStruct,
} from '../../typechain-types/contracts/diamond/facets/FeeManagerFacet';
import { FeeConfigSyncDTOStruct } from '../../typechain-types/contracts/diamond/facets/FeeStoreFacet';
import { FeeCurrency, FeeSyncAction, FeeType } from './enums';

export const feeId = keccak256(toUtf8Bytes('myfeeid'));
export const feeIdOther = keccak256(toUtf8Bytes('myotherfeeid'));
export const feeValue = 100;
export const feeValueUpdated = 200;
export const feeChainId = 1;
export const feeChainIdOther = 2;
export const feeChainIdUpdate = 3;
export const feeTarget = '0x1111111111111111111111111111111111111111';
export const feeTargetUpdate = '0x2222222222222222222222222222222222222222';
export const feeReceiver = '0x1111111111111111111111111111111111111111';
export const feeReceiverUpdate = '0x2222222222222222222222222222222222222222';
export const chainTargetContract = '0x1111111111111111111111111111111111111111';
export const relayerAddress = '0x1111111111111111111111111111111111111111';
export const relayerAddressUpdate = '0x2222222222222222222222222222222222222222';
export const relayerAddressOther = '0x3333333333333333333333333333333333333333';
export const nativeAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
export const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';

/// fee management source chain
export const feeConfigParamsAddFaulty: AddFeeConfigParamsStruct = {
  id: feeId,
  fee: 0,
  receiver: ZeroAddress,
  ftype: FeeType.Default,
  currency: FeeCurrency.Native,
};
export const feeConfigParamsAdd: AddFeeConfigParamsStruct = {
  ...feeConfigParamsAddFaulty,
  receiver: feeReceiver,
  fee: feeValue,
};

export const feeConfigParamsUpdateFaulty: UpdateFeeConfigParamsStruct = {
  id: feeId,
  fee: 0,
  receiver: ZeroAddress,
};
export const feeConfigParamsUpdate: UpdateFeeConfigParamsStruct = {
  ...feeConfigParamsUpdateFaulty,
  fee: feeValueUpdated,
  receiver: feeReceiverUpdate,
};

// fee management cross chain
export const feeConfigSyncAddDTORaw: FeeConfigSyncDTOStruct = {
  id: feeId,
  fee: feeValue,
  target: chainTargetContract,
  action: FeeSyncAction.Add,
};

export const feeConfigSyncUpdateDTORaw: FeeConfigSyncDTOStruct = {
  ...feeConfigSyncAddDTORaw,
  fee: feeValueUpdated,
  action: FeeSyncAction.Update,
};

export const feeConfigSyncDeleteDTORaw: FeeConfigSyncDTOStruct = {
  ...feeConfigSyncAddDTORaw,
  action: FeeSyncAction.Delete,
};

// chain management
export const addChainParams: AddChainParamsStruct = { chainId: feeChainId, target: chainTargetContract };
export const removeChainParams: RemoveChainParamsStruct = { chainId: feeChainId };

// fee & chain management
export const assignFeeConfigToChainParams: AssignFeeConfigToChainParamsStruct = { id: feeId, chainId: feeChainId };
export const unassignFeeConfigFromChainParams: UnassignFeeConfigFromChainParamsStruct = {
  id: feeId,
  chainId: feeChainId,
};
export const unassignFeeConfigFromAllChainsParams: UnassignFeeConfigFromAllChainsParamsStruct = { id: feeId };

///
/// fee sync
///
export const feeDeployerMessageAdd = FeeStoreFacet__factory.createInterface().encodeFunctionData(
  'syncFees((bytes32,uint256,address,uint8)[])',
  [[feeConfigSyncAddDTORaw]]
);
export const feeDeployerMessageAddOther = FeeStoreFacet__factory.createInterface().encodeFunctionData(
  'syncFees((bytes32,uint256,address,uint8)[])',
  [[{ ...feeConfigSyncAddDTORaw, id: feeIdOther }]]
);
export const feeDeployerMessageRemove = FeeStoreFacet__factory.createInterface().encodeFunctionData(
  'syncFees((bytes32,uint256,address,uint8)[])',
  [[feeConfigSyncDeleteDTORaw]]
);
///
///
///

///
/// Relayer DTO
///
const celerRelayerDataTuple = 'tuple(bytes32 what,address target,bytes message)';

///
/// deploy fees
///
export const deployFeesMessageRelayer = (_target: string = chainTargetContract) =>
  new AbiCoder().encode(
    [celerRelayerDataTuple],
    [{ what: RELAYER_ACTION_DEPLOY_FEES, target: _target, message: feeDeployerMessageAdd }]
  );
export const deployFeesConfirmMessageRelayer = (_target: string = chainTargetContract) =>
  new AbiCoder().encode(
    [celerRelayerDataTuple],
    [{ what: RELAYER_ACTION_DEPLOY_FEES_CONFIRM, target: ZERO_ADDR, message: feeDeployerMessageAdd }]
  );
export const deployFeesMessageEmptyRelayer = (_target: string = chainTargetContract) =>
  new AbiCoder().encode(
    [celerRelayerDataTuple], //
    [{ what: RELAYER_ACTION_DEPLOY_FEES, target: _target, message: ZeroHash }]
  );
///
///
///

///
/// send fees
///
const sendFeeDataTuple = 'tuple(uint256 totalFees,address bountyReceiver,tuple(bytes32 id,uint256 amount)[] fees)';
export const sendFeeData = (
  totalFees = parseEther('2'),
  bountyReceiver: string = ZeroAddress,
  fees: { id: string; amount: BigNumberish }[] = [{ id: feeId, amount: parseEther('2') }]
) => {
  return { totalFees, bountyReceiver, fees };
};
export const sendFeesMessage = (id: string, amount: BigNumberish, bountyReceiver: string = ZeroAddress) =>
  new AbiCoder().encode([sendFeeDataTuple], [sendFeeData(parseEther('2'), bountyReceiver, [{ id, amount }])]); // @todo fix that here and in tests
export const sendFeesMessageCustom = (
  totalFees: bigint,
  bountyReceiver: string,
  fees: { id: string; amount: BigNumberish }[]
) => new AbiCoder().encode([sendFeeDataTuple], [sendFeeData(totalFees, bountyReceiver, fees)]); // @todo fix that here and in tests
export const sendFeesMessageRelayer = (
  id: string,
  amount: BigNumberish,
  bountyReceiver: string = ZeroAddress,
  target: string = chainTargetContract
) =>
  new AbiCoder().encode(
    [celerRelayerDataTuple],
    [{ what: RELAYER_ACTION_SEND_FEES, target, message: sendFeesMessage(id, amount, bountyReceiver) }]
  );
export const executeMessageNotExistingFunctionSelector = () =>
  new AbiCoder().encode(
    [celerRelayerDataTuple],
    [
      {
        what: ZeroHash,
        target: ZeroAddress,
        message: new Interface(['function notExistingFunction(uint amount)']).encodeFunctionData(
          'notExistingFunction',
          [0]
        ),
      },
    ]
  );
///
///
///

/// CONSTANTS
export const FEE_STORE_MANAGER_ROLE = keccak256(toUtf8Bytes('FEE_STORE_MANAGER_ROLE'));
export const FEE_MANAGER_ROLE = keccak256(toUtf8Bytes('FEE_MANAGER_ROLE'));
export const FEE_DISTRIBUTOR_PUSH_ROLE = keccak256(toUtf8Bytes('FEE_DISTRIBUTOR_PUSH_ROLE'));
export const FEE_DISTRIBUTOR_MANAGER = keccak256(toUtf8Bytes('FEE_DISTRIBUTOR_MANAGER'));
export const MINTER_ROLE = keccak256(toUtf8Bytes('MINTER_ROLE'));
export const DEPLOYER_ROLE = keccak256(toUtf8Bytes('DEPLOYER_ROLE'));
export const BURNER_ROLE = keccak256(toUtf8Bytes('BURNER_ROLE'));
export const ADMIN_ROLE = keccak256(toUtf8Bytes('ADMIN_ROLE'));
export const RELAYER_ACTION_DEPLOY_FEES = keccak256(toUtf8Bytes('RELAYER_ACTION_DEPLOY_FEES'));
export const RELAYER_ACTION_DEPLOY_FEES_CONFIRM = keccak256(toUtf8Bytes('RELAYER_ACTION_DEPLOY_FEES_CONFIRM'));
export const RELAYER_ACTION_SEND_FEES = keccak256(toUtf8Bytes('RELAYER_ACTION_SEND_FEES'));

/// ERROR FROM LIBS
export const onlyOwnerModifierError = 'Ownable: caller is not the owner';
export const erc20TransferError = 'ERC20: transfer amount exceeds balance';

/// FEE DISTRIBUTOR
export const receiverName1 = 'Receiver 1';
export const receiverName2 = 'Receiver 2';
export const receiverName3 = 'Receiver 3';
export const addReceiverParams = (
  account: string,
  name: string = receiverName1,
  points: number = 10000,
  swapPath: string[] = []
) =>
  ({
    account,
    name,
    points,
    swapPath,
  } as AddReceiverParamsStruct);
