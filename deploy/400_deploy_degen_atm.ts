import { formatEther, parseEther } from 'ethers';
import { ethers } from 'hardhat';
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
  const deployerSigner = await ethers.getSigner(deployer);

  console.log(`---------------------------------------------------------------------`);
  console.log(`Deploy Degen ATM on Chain ID: ${chainId}`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

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

  const allocationLimit = parseEther('13');
  console.log(`Set allocation limit to ${formatEther(allocationLimit)}`);
  await (await atm.connect(deployerSigner).setAllocationLimit(allocationLimit)).wait();
  console.log(``);

  console.log(`---------------------------------------------------------------------`);
  console.log(``);
  console.log(`Finished after ${((Date.now() - startTime) / 1000).toPrecision(2)} seconds`);
};

export default main;

main.id = 'deploy_degen_atm';
main.tags = ['DeployDegenATM'];
