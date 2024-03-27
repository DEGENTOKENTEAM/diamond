import { Contract } from 'ethers';
import { deployments, ethers, getNamedAccounts } from 'hardhat';
import { DeployResult } from 'hardhat-deploy/types';
import { FacetCutAction, getSelectors } from './diamond';

export const deployDiamond = async (
  diamondName: string,
  diamondCutFacetName = 'DiamondCutFacet',
  diamonInitName = 'DiamondInit',
  facetNames: string[] = [],
  facetDeployArgs: { [key: string]: any[] } = {}
) => {
  const { diamondDeployer, deployer } = await getNamedAccounts();
  const { deploy, log } = deployments;

  log(`Start deploying ${diamondCutFacetName}`);
  const diamondCutFacet = await deploy(diamondCutFacetName, { from: deployer });
  log(`${diamondCutFacetName} deployed: ${diamondCutFacet.address}`);

  const diamond = await deploy(diamondName, { from: diamondDeployer, args: [deployer, diamondCutFacet.address] });
  log(`${diamondName} deployed: ${diamond.address}`);

  const diamondInit = await deploy(diamonInitName, { from: deployer });
  log(`${diamonInitName} deployed: ${diamondInit.address}`);

  // deploy facets
  log('Deploying facets');
  const FacetNames = facetNames || [];
  const cut = [];
  for (const FacetName of FacetNames) {
    const facet = await deploy(FacetName, { from: deployer, args: facetDeployArgs[FacetName] || null });
    const facetContract = (await ethers.getContract(FacetName)) as Contract;
    const action = FacetCutAction.Add;
    const facetAddress = facet.address;
    const functionSelectors = getSelectors(facetContract);
    log('functions', JSON.stringify(functionSelectors));
    cut.push({
      facetAddress,
      action,
      functionSelectors,
    });
  }

  // upgrade diamond with facets
  log('');
  log('Diamond Cut:', cut);
  const diamondCut = await ethers.getContractAt('IDiamondCut', diamond.address, await ethers.getSigner(deployer));
  const diamondInitContract = await ethers.getContract(diamonInitName);
  let tx;
  let receipt;
  // call to init function
  let functionCall = diamondInitContract.interface.encodeFunctionData('init');
  tx = await diamondCut.diamondCut(cut, diamondInit.address, functionCall);
  log('Diamond cut tx: ', tx.hash);
  receipt = await tx.wait();
  if (!receipt?.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
  log('Completed diamond cut');

  return {
    diamond: (await ethers.getContract(diamondName, await ethers.getSigner(deployer))) as Contract,
    diamondAddress: diamond.address,
  };
};

export const deployFacet = async (
  facetName: string,
  deployParams?: any[]
): Promise<{ facet: DeployResult; facetContract: Contract }> => {
  const { deployer } = await getNamedAccounts();
  const { deploy, log } = deployments;
  log(`Start deploying: ${facetName}`);
  const facet = await deploy(facetName, { from: deployer, args: !!deployParams ? deployParams : undefined });
  const facetContract: Contract = await ethers.getContract(facetName, await ethers.getSigner(deployer));
  log(`Finished deploying: ${facetName} on ${facet.address}`);
  return { facet, facetContract };
};
