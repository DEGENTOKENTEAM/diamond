import { ZeroAddress, keccak256, toUtf8Bytes } from 'ethers';
import { ethers } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { result } from 'lodash';
import { diamondContractName, getConfig, updateDeploymentLogs } from './9999_utils';

// load env config
import * as dotenv from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';
const dotEnvConfig = dotenv.config();
dotenvExpand(dotEnvConfig);

const main: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const startTime = Date.now();
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;
  const chainId = await getChainId();
  const deployerSigner = await ethers.getSigner(deployer);

  console.log(`---------------------------------------------------------------------`);
  console.log(`Deploy Launch Protocol on Chain ID: ${chainId}`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  const accountsConfig = getConfig('accounts');
  const contractsConfig = getConfig('contracts');

  const lpTokenReceiver = result(accountsConfig, `${chainId}.lpTokenReceiver`, deployer);
  const router = result(contractsConfig, `${chainId}.router`, ZeroAddress);

  const diamondAddress = await (await ethers.getContract(diamondContractName)).getAddress();
  const accessControlEnumerableFacet = await ethers.getContractAt('AccessControlEnumerableFacet', diamondAddress);

  console.log(`Deploy LaunchControl`);
  const deployResult = await deploy('LaunchControl', {
    from: deployer,
    skipIfAlreadyDeployed: false,
  });
  const { address: launchControlAddress } = deployResult;
  await updateDeploymentLogs('LaunchControl', deployResult, false);
  console.log(`Deployed LaunchControl to ${launchControlAddress}`);
  console.log(``);

  const launchControl = await ethers.getContractAt('LaunchControl', launchControlAddress);
  const ADMIN_ROLE = keccak256(toUtf8Bytes('ADMIN_ROLE'));
  console.log(`Grant role ADMIN_ROLE to LaunchControl`);
  await (await accessControlEnumerableFacet.grantRole(ADMIN_ROLE, launchControlAddress)).wait();
  console.log(`Granted!`);
  console.log(``);

  console.log(`Set router to ${router}`);
  await (await launchControl.connect(deployerSigner).setRouter(router)).wait();
  console.log(`Set token to ${diamondAddress} and create pair`);
  console.log(`Pair address before: ${await launchControl.lp()}`);
  await (await launchControl.connect(deployerSigner).setToken(diamondAddress)).wait();
  console.log(`Pair address after: ${await launchControl.lp()}`);
  console.log(`Set lp token receiver to ${lpTokenReceiver}`);
  await (await launchControl.connect(deployerSigner).setLpTokenReceiver(lpTokenReceiver)).wait();
  console.log(``);

  console.log(`---------------------------------------------------------------------`);
  console.log(``);
  console.log(`Finished after ${((Date.now() - startTime) / 1000).toPrecision(2)} seconds`);
};

export default main;

main.id = 'deploy_launch_protocol';
main.tags = ['DeployLaunchProtocol'];
