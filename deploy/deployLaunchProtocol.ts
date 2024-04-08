import * as dotenv from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';
import { ZeroAddress } from 'ethers';
import { ethers } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { result } from 'lodash';
import { ADMIN_ROLE } from '../test/utils/mocks';
import { diamondContractName } from '../utils/diamond';
import { getConfig, updateDeploymentLogs } from './9999_utils';
const dotEnvConfig = dotenv.config();
dotenvExpand(dotEnvConfig);

const main: DeployFunction = async ({ deployments, getNamedAccounts, network, diamond }: HardhatRuntimeEnvironment) => {
  const { deployer } = await getNamedAccounts();
  const { deploy, log } = deployments;
  const { chainId } = network.config;

  log(`---------------------------------------------------------------------`);
  log(`Deploy Launch Protocol on Chain ID ${chainId}`);
  log(`---------------------------------------------------------------------`);

  const accountsConfig = getConfig('accounts');
  const contractsConfig = getConfig('contracts');

  const {
    contracts: {
      degenx: { nativeWrapper },
    },
  } = await diamond.getProtocols();

  const lpTokenReceiver = result(accountsConfig, `${chainId}.lpTokenReceiver`, deployer);
  const router = result(contractsConfig, `${chainId}.router`, ZeroAddress);

  const diamondAddress = await (await ethers.getContract(diamondContractName())).getAddress();
  const accessControl = await ethers.getContractAt('AccessControlEnumerableFacet', diamondAddress);

  log(`Deploy protocol`);
  const deployResult = await deploy('LaunchControl', {
    from: deployer,
    log: true,
    args: [nativeWrapper.address],
  });
  const { address: launchControlAddress } = deployResult;
  const launchControl = await ethers.getContractAt('LaunchControl', launchControlAddress);
  if (!deployResult.newlyDeployed) {
    log(`✅ aleady deployed on ${launchControlAddress}`);
  } else {
    await updateDeploymentLogs('LaunchControl', deployResult, false);
    log(`✅ deployed (${launchControlAddress})`);
  }
  log(`---------------------------------------------------------------------`);

  log(`Grant role ADMIN_ROLE (${ADMIN_ROLE}) for launch protocol`);
  const hasRole = await accessControl.hasRole(ADMIN_ROLE, launchControlAddress);
  if (hasRole) {
    log('✅ already has access');
  } else {
    await (await accessControl.grantRole(ADMIN_ROLE, launchControlAddress)).wait();
    log(`✅ granted!`);
  }
  log(`---------------------------------------------------------------------`);

  log(`Set router (${router})`);
  const currentRouter = await launchControl.router();
  if (currentRouter !== router) {
    await (await launchControl.setRouter(router)).wait();
    log(`✅ done`);
  } else {
    log('✅ already set');
  }
  log(`---------------------------------------------------------------------`);

  log(`Set token to ${diamondAddress} and create pair`);
  const currentToken = await launchControl.token();
  if (currentToken !== diamondAddress) {
    await (await launchControl.setToken(diamondAddress)).wait();
    log(`✅ done`);
  } else {
    log('✅ already set');
  }
  log(`Pair is ${await launchControl.lp()}`);
  log(`---------------------------------------------------------------------`);

  log(`Set lp token receiver to ${lpTokenReceiver}`);
  const currentLpTokenReceiver = await launchControl.lpTokenReceiver();
  if (currentLpTokenReceiver !== lpTokenReceiver) {
    await (await launchControl.setLpTokenReceiver(lpTokenReceiver)).wait();
    log(`✅ done`);
  } else {
    log('✅ already set');
  }
  log(`---------------------------------------------------------------------`);
  log(`Finished deploying Launch Protocol`);
};

export default main;

main.id = 'deploy_launch_protocol';
main.skip = async ({ diamond, network }) => (await diamond.getConfig()).chainIdHome === network.config.chainId;
main.tags = ['DeployLaunchProtocol'];
