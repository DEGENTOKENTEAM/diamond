import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { deployFixture } from './utils/helper';

describe('DegenX Diamond', function () {
  it('should deploy successfully', async () => {
    const { diamondAddress } = await deployFixture();
    const diamond = await ethers.getContractAt('DegenX', diamondAddress);
    const diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress);
    expect(await diamond.waitForDeployment()).to.be.instanceOf(Contract);
    expect((await diamondLoupeFacet.facets()).length).to.eq(2);
  });
});
