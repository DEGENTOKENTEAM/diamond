import { BaseContract, Contract, Fragment, FunctionFragment, ZeroAddress } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { IDiamondLoupe } from './../../typechain-types';

const verbose = false;

export function getSelectors(contract: BaseContract | Contract): string[] {
  const selectors = contract.interface.fragments.reduce((acc: string[], val: Fragment) => {
    if (val.type === 'function') {
      acc.push((val as FunctionFragment).selector);
      return acc;
    } else {
      return acc;
    }
  }, []);
  return selectors;
}

export const FacetCutAction = {
  Add: 0,
  Replace: 1,
  Remove: 2,
};

export async function addOrReplaceFacets(
  facets: (BaseContract | Contract)[],
  diamondAddress: string,
  initContract: string = ZeroAddress,
  initData = '0x',
  signer?: string
): Promise<void> {
  const loupe = <IDiamondLoupe>await ethers.getContractAt('IDiamondLoupe', diamondAddress);

  const cut = [];
  for (const f of facets) {
    const replaceSelectors = [];
    const addSelectors = [];

    const selectors = getSelectors(f);

    for (const s of selectors) {
      const addr = await loupe.facetAddress(s);

      if (addr === ZeroAddress) {
        addSelectors.push(s);
        continue;
      }

      if (addr.toLowerCase() !== (await f.getAddress()).toLowerCase()) {
        replaceSelectors.push(s);
      }
    }

    if (replaceSelectors.length) {
      cut.push({
        facetAddress: await f.getAddress(),
        action: FacetCutAction.Replace,
        functionSelectors: replaceSelectors,
      });
    }
    if (addSelectors.length) {
      cut.push({
        facetAddress: await f.getAddress(),
        action: FacetCutAction.Add,
        functionSelectors: addSelectors,
      });
    }
  }

  if (!cut.length) {
    !verbose || console.log('No facets to add or replace.');
    return;
  }

  !verbose || console.log('Adding/Replacing facet(s)...');
  await doCut(diamondAddress, cut, initContract, initData, signer);

  !verbose || console.log('Done.');
}

export async function addFacets(
  facets: (BaseContract | Contract)[],
  diamondAddress: string,
  initContract: string = ZeroAddress,
  initData = '0x',
  signer?: string
): Promise<void> {
  const { log } = deployments;
  const cut = [];
  for (const f of facets) {
    const selectors = getSelectors(f);

    cut.push({
      facetAddress: await f.getAddress(),
      action: FacetCutAction.Add,
      functionSelectors: selectors,
    });
  }

  if (!cut.length) {
    log('No facets to add or replace.');
    return;
  }

  log('Adding facet(s)...');

  await doCut(diamondAddress, cut, initContract, initData, signer);

  log('Done.');
}

export async function removeFacet(selectors: string[], diamondAddress: string, signer?: string): Promise<void> {
  const { log } = deployments;

  const cut = [
    {
      facetAddress: ZeroAddress,
      action: FacetCutAction.Remove,
      functionSelectors: selectors,
    },
  ];

  log('Removing facet...');

  await doCut(diamondAddress, cut, ZeroAddress, '0x', signer);

  log('Done.');
}

export async function replaceFacet(
  facet: BaseContract | Contract,
  diamondAddress: string,
  initContract: string = ZeroAddress,
  initData = '0x',
  signer?: string
): Promise<void> {
  const selectors = getSelectors(facet);

  const cut = [
    {
      facetAddress: await facet.getAddress(),
      action: FacetCutAction.Replace,
      functionSelectors: selectors,
    },
  ];

  !verbose || console.log('Replacing facet...');
  await doCut(diamondAddress, cut, initContract, initData, signer);

  !verbose || console.log('Done.');
}

async function doCut(
  diamondAddress: string,
  cut: any[],
  initContract: string,
  initData: string,
  signer?: string
): Promise<void> {
  const cutter = await ethers.getContractAt(
    'IDiamondCut',
    diamondAddress,
    signer ? await ethers.getSigner(signer) : (await ethers.getSigners())[0]
  );
  const tx = await cutter.diamondCut(cut, initContract, initData);
  deployments.log(`Diamond cut tx: ${tx.hash}`);
  const receipt = await tx.wait();
  if (!receipt?.status) throw Error(`Diamond upgrade failed: ${tx.hash}`);
}

export async function executeInit(
  diamondAddress: string,
  initContract: string,
  initData: string,
  signer?: string
): Promise<void> {
  doCut(diamondAddress, [], initContract, initData, signer);
}
