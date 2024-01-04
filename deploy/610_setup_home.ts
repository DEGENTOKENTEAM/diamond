import { ZeroAddress, keccak256, toUtf8Bytes } from 'ethers';
import { ethers, getNamedAccounts } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { result } from 'lodash';
import { RelayerCeler } from '../typechain-types';
import { diamondContractName, getConfig, getContractAddress } from './9999_utils';

const main: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const startTime = Date.now();
  const diamond = await ethers.getContract(diamondContractName);
  const diamonAddress = await diamond.getAddress();
  const { deployer } = await getNamedAccounts();
  const deployerSigner = await ethers.getSigner(deployer);

  const chainId = await hre.getChainId();
  const targetChainId = +process.env.DEPLOY_TARGET_CHAIN_ID!;

  console.log(`---------------------------------------------------------------------`);
  console.log(`Setup Home with chain id ${chainId}`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  ///
  /// configure fees
  ///
  const feeManager = await ethers.getContractAt('FeeManagerFacet', diamonAddress);
  const celerFeeHub = await ethers.getContractAt('CelerFeeHubFacet', diamonAddress);
  const feeDistributor = await ethers.getContractAt('FeeDistributorFacet', diamonAddress);
  const accessControlEnumerable = await ethers.getContractAt('AccessControlEnumerableFacet', diamonAddress);
  const relayerCeler = (await ethers.getContract('RelayerCeler')) as RelayerCeler;
  const marketingFeeId = keccak256(toUtf8Bytes('ERC20_MARKETING_FEE'));
  const rewardFeeId = keccak256(toUtf8Bytes('ERC20_REWARD_FEE'));
  const platformFeeId = keccak256(toUtf8Bytes('ERC20_PLATFORM_FEE'));
  const developerFeeId = keccak256(toUtf8Bytes('ERC20_DEVELOPER_FEE'));

  console.log(`Determine contracts...`);
  const contractsConfig = getConfig('contracts');
  const marketingAddress = result(contractsConfig, `${chainId}.marketing`, ZeroAddress);
  const platformAddress = result(contractsConfig, `${chainId}.platform`, ZeroAddress);
  const developerAddress = result(contractsConfig, `${chainId}.development`, ZeroAddress);
  const lbAddress = result(contractsConfig, `${chainId}.liquidityBacking`, ZeroAddress);
  const diamonAddressTarget = getContractAddress(diamondContractName, process.env.DEPLOY_TARGET_NETWORK);
  const relayerCelerAddressTarget = getContractAddress('RelayerCeler', process.env.DEPLOY_TARGET_NETWORK);

  console.log(``);
  console.log(`---------------------------------------------------------------------`);
  console.log(`Configure Fee Manager`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  console.log(`Add chain ${targetChainId} with target diamond ${diamonAddressTarget}`);
  // add chains
  await (await feeManager.addChain({ chainId: targetChainId, target: diamonAddressTarget })).wait();

  console.log(`Add Marketing Fee with ID ${marketingFeeId} to Fee Manager`);
  // add fee config
  await (
    await feeManager.addFeeConfig({
      id: marketingFeeId,
      fee: 100,
      receiver: marketingAddress,
      currency: 2,
      ftype: 1,
    })
  ).wait();
  console.log(`Add Reward Fee with ID ${rewardFeeId} to Fee Manager`);
  await (
    await feeManager.addFeeConfig({
      id: rewardFeeId,
      fee: 100,
      receiver: ZeroAddress,
      currency: 2,
      ftype: 1,
    })
  ).wait();
  console.log(`Add Platform Fee with ID ${platformFeeId} to Fee Manager`);
  await (
    await feeManager.addFeeConfig({
      id: platformFeeId,
      fee: 60,
      receiver: platformAddress,
      currency: 2,
      ftype: 1,
    })
  ).wait();
  console.log(`Add Developer Fee with ID ${developerFeeId} to Fee Manager`);
  await (
    await feeManager.addFeeConfig({
      id: developerFeeId,
      fee: 40,
      receiver: developerAddress,
      currency: 2,
      ftype: 1,
    })
  ).wait();
  console.log(``);

  // assign fee config to chain
  console.log(`Assign Fee ID ${marketingFeeId} to chain id ${targetChainId}`);
  await (await feeManager.assignFeeConfigToChain({ chainId: targetChainId, id: marketingFeeId })).wait();
  console.log(`Assign Fee ID ${platformFeeId} to chain id ${targetChainId}`);
  await (await feeManager.assignFeeConfigToChain({ chainId: targetChainId, id: platformFeeId })).wait();
  console.log(`Assign Fee ID ${rewardFeeId} to chain id ${targetChainId}`);
  await (await feeManager.assignFeeConfigToChain({ chainId: targetChainId, id: rewardFeeId })).wait();
  console.log(`Assign Fee ID ${developerFeeId} to chain id ${targetChainId}`);
  await (await feeManager.assignFeeConfigToChain({ chainId: targetChainId, id: developerFeeId })).wait();
  console.log(``);

  console.log(``);
  console.log(`---------------------------------------------------------------------`);
  console.log(`Configure Fee Hub`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  await (await celerFeeHub.addRelayerForChain(relayerCelerAddressTarget, targetChainId)).wait();
  console.log(`Added Target Chain ${targetChainId} Relayer ${relayerCelerAddressTarget} to Home Celer Fee Hub`);

  console.log(``);
  console.log(`---------------------------------------------------------------------`);
  console.log(`Configure Fee Distributor`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  console.log(`Add Fee Distribution Receiver 'Liquidity Backing' with address '${lbAddress}'`);
  await (
    await feeDistributor.addFeeDistributionReceiver({
      name: 'Liquidity Backing',
      points: 30000,
      account: lbAddress,
      swapPath: [],
    })
  ).wait();

  console.log(`Grant Relayer FEE_DISTRIBUTOR_PUSH_ROLE`);
  await (
    await accessControlEnumerable.grantRole(
      keccak256(toUtf8Bytes('FEE_DISTRIBUTOR_PUSH_ROLE')),
      await relayerCeler.getAddress()
    )
  ).wait();
  console.log(``);

  console.log(``);
  console.log(`---------------------------------------------------------------------`);
  console.log(`Configure Relayer`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  console.log(`Add Actor ${relayerCelerAddressTarget} for chain id ${targetChainId} on home relayer`);
  await (await relayerCeler.connect(deployerSigner).addActor(targetChainId, relayerCelerAddressTarget)).wait();

  console.log(``);
  console.log(`---------------------------------------------------------------------`);
  console.log(`IMPORTANT: After deploying to the target chain, you have to deploy the fee configurations`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);
  console.log(`Finished after ${((Date.now() - startTime) / 1000).toPrecision(2)} seconds`);
};

export default main;

main.id = 'setup_home';
main.tags = ['SetupHome'];
