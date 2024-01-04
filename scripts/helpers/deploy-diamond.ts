import { Contract } from 'ethers';
import { deployments, ethers, getNamedAccounts } from 'hardhat';
import { DeployResult } from 'hardhat-deploy/types';
import { FacetCutAction, getSelectors } from './diamond';

const verbose = false;
export const deployDiamond = async (
  diamondName: string,
  diamondCutFacetName = 'DiamondCutFacet',
  diamonInitName = 'DiamondInit',
  facetNames: string[] = [],
  facetDeployArgs: { [key: string]: any[] } = {}
) => {
  const { diamondDeployer: deployer } = await getNamedAccounts();
  const { deploy } = deployments;

  !verbose || console.log(`Start deploying ${diamondCutFacetName}`);
  const diamondCutFacet = await deploy(diamondCutFacetName, { from: deployer });
  !verbose || console.log(`${diamondCutFacetName} deployed: ${diamondCutFacet.address}`);

  const diamond = await deploy(diamondName, { from: deployer, args: [deployer, diamondCutFacet.address] });
  !verbose || console.log(`${diamondName} deployed: ${diamond.address}`);

  const diamondInit = await deploy(diamonInitName, { from: deployer });
  !verbose || console.log(`${diamonInitName} deployed: ${diamondInit.address}`);

  // deploy facets
  !verbose || console.log('');
  !verbose || console.log('Deploying facets');
  const FacetNames = facetNames || [];
  const cut = [];
  for (const FacetName of FacetNames) {
    const facet = await deploy(FacetName, { from: deployer, args: facetDeployArgs[FacetName] || null });
    const facetContract = (await ethers.getContract(FacetName)) as Contract;
    const action = FacetCutAction.Add;
    const facetAddress = facet.address;
    const functionSelectors = getSelectors(facetContract);
    !verbose || console.log('functions', JSON.stringify(functionSelectors));
    cut.push({
      facetAddress,
      action,
      functionSelectors,
    });
  }

  // upgrade diamond with facets
  !verbose || console.log('');
  !verbose || console.log('Diamond Cut:', cut);
  const diamondCut = await ethers.getContractAt('IDiamondCut', diamond.address);
  const diamondInitContract = await ethers.getContract(diamonInitName);
  let tx;
  let receipt;
  // call to init function
  let functionCall = diamondInitContract.interface.encodeFunctionData('init');
  tx = await diamondCut.diamondCut(cut, diamondInit.address, functionCall);
  !verbose || console.log('Diamond cut tx: ', tx.hash);
  receipt = await tx.wait();
  if (!receipt?.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
  !verbose || console.log('Completed diamond cut');

  return { diamond: (await ethers.getContract(diamondName)) as Contract, diamondAddress: diamond.address };
};

export const deployFacet = async (
  facetName: string,
  deployParams?: any[]
): Promise<{ facet: DeployResult; facetContract: Contract }> => {
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;
  !verbose || console.log(`Start deploying: ${facetName}`);
  const facet = await deploy(facetName, { from: deployer, args: !!deployParams ? deployParams : undefined });
  const facetContract: Contract = await ethers.getContract(facetName);
  !verbose || console.log(`Finished deploying: ${facetName} on ${facet.address}`);
  return { facet, facetContract };
};
