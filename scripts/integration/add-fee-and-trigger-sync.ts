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
  const startTime = Date.now();
  console.log(`-`.repeat(40));
  console.log(`Add Fee And Trigger Sync`);
  console.log(`-`.repeat(40));
  console.log(``);

  const { deployer } = await getNamedAccounts();

  if (hre.network.name === 'localfork') setBalance(deployer, parseEther('100'));

  const diamond = await ethers.getContract('Diamond');
  const diamondAddress = await diamond.getAddress();

  // @todo change this to the desired chain
  const chainId = 97;
  const chainRelayer = '0xeb4133a068255a6B5128e2e66Dfe279F0a42a11e';

  const marketingFeeId = keccak256(toUtf8Bytes('ERC20_MARKETING_FEE'));
  const backingFeeId = keccak256(toUtf8Bytes('ERC20_BACKING_FEE'));
  const platformFeeId = keccak256(toUtf8Bytes('ERC20_PLATFORM_FEE'));
  const developerFeeId = keccak256(toUtf8Bytes('ERC20_DEVELOPER_FEE'));

  const feeManager = await ethers.getContractAt('FeeManagerFacet', diamondAddress);
  const celerFeeHub = await ethers.getContractAt('CelerFeeHubFacet', diamondAddress);

  // // add chains
  // console.log(`MANAGER: Add relayer ${chainRelayer} for chain ${chainId}`);
  // await (await feeManager.addChain({ chainId, target: diamondAddress })).wait();
  // console.log(``);

  // console.log(`FEE HUB: Add relayer ${chainRelayer} for chain ${chainId}`);
  // await (await celerFeeHub.addRelayerForChain(chainRelayer, chainId)).wait();
  // console.log(``);

  // // add fee config
  // console.log(`Add fee ${marketingFeeId}`);
  // await (
  //   await feeManager.addFeeConfig({
  //     id: marketingFeeId,
  //     fee: 10000,
  //     receiver: ZeroAddress,
  //     currency: 2,
  //     ftype: 1,
  //   })
  // ).wait();
  // console.log(`Add fee ${backingFeeId}`);
  // await (
  //   await feeManager.addFeeConfig({
  //     id: backingFeeId,
  //     fee: 30000,
  //     receiver: ZeroAddress,
  //     currency: 2,
  //     ftype: 1,
  //   })
  // ).wait();
  // console.log(`Add fee ${platformFeeId}`);
  // await (
  //   await feeManager.addFeeConfig({
  //     id: platformFeeId,
  //     fee: 6000,
  //     receiver: '0x95D21F80076E29dbd7fc065d8Da0eD0a5F43Be2b',
  //     currency: 2,
  //     ftype: 1,
  //   })
  // ).wait();
  // console.log(`Add fee ${developerFeeId}`);
  // await (
  //   await feeManager.addFeeConfig({
  //     id: developerFeeId,
  //     fee: 4000,
  //     receiver: '0x95D21F80076E29dbd7fc065d8Da0eD0a5F43Be2b',
  //     currency: 2,
  //     ftype: 1,
  //   })
  // ).wait();
  // console.log(``);

  // assign fee config to chain
  console.log(`Assign fee ${marketingFeeId} to chain ${chainId}`);
  await (await feeManager.assignFeeConfigToChain({ chainId, id: marketingFeeId })).wait();
  console.log(`Assign fee ${platformFeeId} to chain ${chainId}`);
  await (await feeManager.assignFeeConfigToChain({ chainId, id: platformFeeId })).wait();
  console.log(`Assign fee ${backingFeeId} to chain ${chainId}`);
  await (await feeManager.assignFeeConfigToChain({ chainId, id: backingFeeId })).wait();
  console.log(`Assign fee ${developerFeeId} to chain ${chainId}`);
  await (await feeManager.assignFeeConfigToChain({ chainId, id: developerFeeId })).wait();
  console.log(``);

  console.log(`-`.repeat(40));
  console.log(``);

  // deploy fees with celer
  console.log(`Deploy fees`);
  await (await celerFeeHub.deployFeesWithCeler({ value: parseEther('0.01') })).wait();
  console.log(``);

  console.log(`-`.repeat(40));
  console.log(``);
  console.log(`Finished after ${((Date.now() - startTime) / 1000).toPrecision(2)} seconds`);
})();
