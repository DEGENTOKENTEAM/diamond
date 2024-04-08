import { ZeroAddress } from 'ethers';
import { deployments } from 'hardhat';
import { diamondContractName } from './diamond';

export const deployFixtures = deployments.createFixture(
  async ({ deployments, ethers, diamond }, options?: { fixtures: string[] }) => {
    await deployments.fixture(options?.fixtures, { keepExistingDeployments: true });
    const accountList = await ethers.getSigners();
    const [wallet, walletDiamond, user0, user1, user2, user3, signer0, signer1, signer2, signer3] = accountList;

    const { chainIdHome } = await diamond.getConfig();
    const { contracts, accounts } = await diamond.getProtocols();

    const diamondAddress = await (await ethers.getContract(diamondContractName())).getAddress();

    const feeHub$ = await ethers.getContractAt('CelerFeeHubFacet', diamondAddress);
    const feeHubMock$ = await ethers.getContractAt('CelerFeeHubFacetMock', diamondAddress);
    const feeStore$ = await ethers.getContractAt('FeeStoreFacet', diamondAddress);
    const feeStoreMock$ = await ethers.getContractAt('FeeStoreFacetMock', diamondAddress);
    const feeGeneric$ = await ethers.getContractAt('FeeGenericFacet', diamondAddress);
    const feeDistributor$ = await ethers.getContractAt('FeeDistributorFacet', diamondAddress);
    const feeDistributorMock$ = await ethers.getContractAt('FeeDistributorFacetMock', diamondAddress);

    const feeManager$ = await ethers.getContractAt('FeeManagerFacet', diamondAddress);
    const diamondERC20$ = await ethers.getContractAt('ERC20Facet', diamondAddress);
    const accessControl$ = await ethers.getContractAt('AccessControlEnumerableFacet', diamondAddress);

    const nativeWrapperAddress = contracts.degenx.nativeWrapper.address;
    const routerAddress = contracts.degenx.router.address;
    const liquidityBackingAddress = contracts.degenx.liquidityBacking?.address || ZeroAddress;
    const liquidityBackingVaultAddress = contracts.degenx.liquidityBackingVault?.address || ZeroAddress;
    const platformAddress = contracts.degenx.platform?.address || ZeroAddress;
    const btcbAddress = contracts.degenx.btcb?.address || ZeroAddress;

    const router$ = await ethers.getContractAt('IRouter02', routerAddress);

    const liquidityBackingDeployerAddress = accounts.liquidityBackingDeployer?.address || ZeroAddress;

    return {
      diamondAddress,
      accountList,
      chainIdHome,
      routerAddress,
      btcbAddress,
      platformAddress,
      nativeWrapperAddress,
      liquidityBackingAddress,
      liquidityBackingVaultAddress,
      liquidityBackingDeployerAddress,
      getContract: async (contractName: string) => {
        return await ethers.getContract(contractName);
      },
      accounts: {
        wallet,
        walletDiamond,
        user0,
        user1,
        user2,
        user3,
        signer0,
        signer1,
        signer2,
        signer3,
      },
      contracts: {
        router$,
        feeHub$,
        feeHubMock$,
        feeStore$,
        feeStoreMock$,
        feeGeneric$,
        feeDistributor$,
        feeDistributorMock$,
        feeManager$,
        diamondERC20$,
        accessControl$,
      },
    };
  }
);
