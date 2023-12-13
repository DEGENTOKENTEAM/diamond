import * as hre from 'hardhat';

const DiamondCutFacet = '0x93608C676480718e28AD7acFE1081030C32ae28d';
const Diamond = '0x6B6c83e849E6Cc74135587FD3da13BBf1C80EfDc';
const DiamondInit = '0xE3D0B247B3C169e6AEff09Ebe29CB2659794B4E9';
const DiamondLoupeFacet = '0x7335FBf754599F5CbE2695B9880400FaD109f26C';
const AccessControlEnumerableFacet = '0x565DCF8Cb77863664F13C1f4539d10AE4aA1EeE3';
const ERC20Facet = '0xEA4cCC6e235dC917389EFe9e22b0FdE1ccABfd1A';
const deployer = '0x2fcb9d07eD31874f5fe6da6de315B3b28Dd0aD10';

const main = async () => {
  await hre.run('verify:verify', { address: DiamondCutFacet });
  await hre.run('verify:verify', {
    address: Diamond,
    contract: 'contracts/diamond/Diamond.sol:Diamond',
    constructorArguments: [deployer, deployer, DiamondCutFacet],
  });
  await hre.run('verify:verify', { address: DiamondInit });
  await hre.run('verify:verify', { address: DiamondLoupeFacet });
  await hre.run('verify:verify', { address: AccessControlEnumerableFacet });
  await hre.run('verify:verify', { address: ERC20Facet });
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
