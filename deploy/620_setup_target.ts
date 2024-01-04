import { ethers, getNamedAccounts } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { RelayerCeler } from '../typechain-types';
import { getContractAddress } from './9999_utils';

const main: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const startTime = Date.now();
  const chainId = await hre.getChainId();
  const { deployer } = await getNamedAccounts();
  const deployerSigner = await ethers.getSigner(deployer);

  console.log(`---------------------------------------------------------------------`);
  console.log(`Setup Target with chain id ${chainId}`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  console.log(``);
  console.log(`---------------------------------------------------------------------`);
  console.log(`Configure Relayer`);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);

  const relayerCelerAddressHome = getContractAddress('RelayerCeler', process.env.DEPLOY_HOME_NETWORK);
  const chainIdHome = +process.env.DEPLOY_HOME_CHAIN_ID!;
  const relayerCeler = (await ethers.getContract('RelayerCeler')) as RelayerCeler;

  await (await relayerCeler.connect(deployerSigner).addActor(chainIdHome, relayerCelerAddressHome)).wait();
  console.log(`Added the HOME CHAIN and HOME RELAYER ADDRESS as an Actor to the TARGET Relayer`);

  console.log(``);
  console.log(`---------------------------------------------------------------------`);
  console.log(``);
  console.log(`Finished after ${((Date.now() - startTime) / 1000).toPrecision(2)} seconds`);
};

export default main;

main.id = 'setup_target';
main.tags = ['SetupTarget'];
