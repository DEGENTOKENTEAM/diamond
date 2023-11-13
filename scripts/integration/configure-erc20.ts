import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { ZeroAddress, keccak256, parseEther, toUtf8Bytes } from 'ethers';
import * as hre from 'hardhat';
import {
  AddChainParamsStruct,
  AddFeeConfigParamsStruct,
  AssignFeeConfigToChainParamsStruct,
  RemoveChainParamsStruct,
  UnassignFeeConfigFromAllChainsParamsStruct,
} from '../../typechain-types/contracts/diamond/facets/FeeManagerFacet';
import { FeeCurrency, FeeType } from '../../test/utils/enums';
const { getNamedAccounts, ethers } = hre;

(async () => {
  console.log(`-`.repeat(40));
  console.log(`Configure ERC20`);
  console.log(`-`.repeat(40));
  console.log(``);
})()