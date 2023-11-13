import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { formatEther, parseEther } from 'ethers';
import { ethers, network } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { updateDeploymentLogs } from './9999_utils';

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

  console.log(`---------------------------------------------------------------------`);
  console.log(`Deploy Degen ATM on Chain ID: ${chainId}`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  if (network.name === 'localfork' || network.name === 'hardhat') setBalance(deployer, parseEther('100'));

  const diamondAddress = await (await ethers.getContract('Diamond')).getAddress();

  console.log(`Deploy DegenATM`);
  const deployResult = await deploy('DegenATM', {
    from: deployer,
    skipIfAlreadyDeployed: false,
  });
  const { address: atmAddress } = deployResult;
  await updateDeploymentLogs('DegenATM', deployResult, false);
  const atm = await ethers.getContractAt('DegenATM', atmAddress);
  console.log(`Deployed DegenATM to ${atmAddress}`);
  console.log(``);

  console.log(`Set token to ${diamondAddress}`);
  await (await atm.setToken(diamondAddress)).wait();
  console.log(``);

  const allocationLimit = parseEther('5.5');
  console.log(`Set allocation limit to ${formatEther(allocationLimit)}`);
  await (await atm.setAllocationLimit(allocationLimit)).wait();
  console.log(``);

  console.log(`---------------------------------------------------------------------`);
  console.log(``);
  console.log(`Finished after ${((Date.now() - startTime) / 1000).toPrecision(2)} seconds`);
};

export default main;

main.id = 'deploy_degen_atm';
main.tags = ['DeployDegenATM'];
