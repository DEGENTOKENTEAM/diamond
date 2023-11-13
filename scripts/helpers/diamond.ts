import { Contract, Fragment, FunctionFragment, ZeroAddress } from 'ethers';
import { ethers } from 'hardhat';
import { IDiamondCut, IDiamondLoupe } from './../../typechain-types';

const verbose = false;

export function getSelectors(contract: Contract): string[] {
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
  facets: Contract[],
  diamondAddress: string,
  initContract: string = ZeroAddress,
  initData = '0x'
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
  await doCut(diamondAddress, cut, initContract, initData);

  !verbose || console.log('Done.');
}

export async function addFacets(
  facets: Contract[],
  diamondAddress: string,
  initContract: string = ZeroAddress,
  initData = '0x'
): Promise<void> {
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
    !verbose || console.log('No facets to add or replace.');
    return;
  }

  !verbose || console.log('Adding facet(s)...');
  await doCut(diamondAddress, cut, initContract, initData);

  !verbose || console.log('Done.');
}

export async function removeFacet(selectors: string[], diamondAddress: string): Promise<void> {
  const cut = [
    {
      facetAddress: ZeroAddress,
      action: FacetCutAction.Remove,
      functionSelectors: selectors,
    },
  ];

  !verbose || console.log('Removing facet...');
  await doCut(diamondAddress, cut, ZeroAddress, '0x');

  !verbose || console.log('Done.');
}

export async function replaceFacet(
  facet: Contract,
  diamondAddress: string,
  initContract: string = ZeroAddress,
  initData = '0x'
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
  await doCut(diamondAddress, cut, initContract, initData);

  !verbose || console.log('Done.');
}

async function doCut(diamondAddress: string, cut: any[], initContract: string, initData: string): Promise<void> {
  const cutter = <IDiamondCut>await ethers.getContractAt('IDiamondCut', diamondAddress);

  const tx = await cutter.diamondCut(cut, initContract, initData);
  !verbose || console.log('Diamond cut tx: ', tx.hash);
  const receipt = await tx.wait();
  if (!receipt?.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
}
