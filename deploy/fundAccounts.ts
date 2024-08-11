import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { expandDecimals } from './../utils/math';

const func: DeployFunction = async ({ getNamedAccounts, deployments, network }: HardhatRuntimeEnvironment) => {
  const { log } = deployments;
  log(`Start deployment on network ${network.name}`);
  const { deployer, diamondDeployer } = await getNamedAccounts();
  const balance = expandDecimals(10000, 18);
  log('Set deployer %s balance to %s', deployer, balance);
  await setBalance(deployer, balance);
  log('Set diamond deployer %s balance to %s', diamondDeployer, balance);
  await setBalance(diamondDeployer, balance);
};

func.skip = async ({ network }: HardhatRuntimeEnvironment) => {
  return network.live;
};

func.tags = ['FundAccounts'];

export default func;
