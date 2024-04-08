import * as dotenv from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';
import { formatEther, parseEther } from 'ethers';
import { ethers } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { updateDeploymentLogs } from './9999_utils';
const dotEnvConfig = dotenv.config();
dotenvExpand(dotEnvConfig);

const main: DeployFunction = async ({ deployments, getNamedAccounts, network }: HardhatRuntimeEnvironment) => {
  const { deployer } = await getNamedAccounts();
  const { deploy, log } = deployments;
  const { chainId } = network.config;
  const allocationLimit = parseEther('13');

  log(`---------------------------------------------------------------------`);
  log(`Deploy Degen ATM on Chain ID ${chainId}`);
  log(`---------------------------------------------------------------------`);

  log(`Deploy protocol`);
  const deployResult = await deploy('DegenATM', {
    from: deployer,
    log: true,
  });
  const { address: atmAddress } = deployResult;
  const atm = await ethers.getContractAt('DegenATM', atmAddress);
  if (!deployResult.newlyDeployed) {
    log(`✅ aleady deployed on ${atmAddress}`);
  } else {
    await updateDeploymentLogs('DegenATM', deployResult, false);
    log(`✅ deployed (${atmAddress})`);
  }
  log(`---------------------------------------------------------------------`);

  log(`Set allocation limit to ${formatEther(allocationLimit)}`);
  const currentAllocationLimit = await atm.allocationLimit();
  if (currentAllocationLimit !== allocationLimit) {
    await (await atm.setAllocationLimit(allocationLimit)).wait();
    log(`✅ done`);
  } else {
    log('✅ already set');
  }
  log(`---------------------------------------------------------------------`);
  log(`Finished deploying Degen ATM`);
};

export default main;

main.id = 'deploy_degen_atm';
main.skip = async ({ diamond, network }) => (await diamond.getConfig()).chainIdHome === network.config.chainId;
main.tags = ['DeployDegenATM'];
