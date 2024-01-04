module.exports = {
  modifierWhitelist: ['onlyOwner', 'onlyMessageBus', 'whenNotPaused'],
  skipFiles: [
    '__mocks__/CelerFeeHubFacetMock.sol',
    '__mocks__/DepositableMock.sol',
    '__mocks__/ERC20Mock.sol',
    '__mocks__/FeeDistributorFacetMock.sol',
    '__mocks__/FeeStoreFacetMock.sol',
    '__mocks__/FeeStoreTestingDummyFacet.sol',
    '__mocks__/MessageBusMock.sol',
    '__mocks__/NativeWrapperMock.sol',
    '__mocks__/RelayerCelerMock.sol',
    '__mocks__/RelayerCelerTargetMock.sol',
    '__mocks__/SwapRouterMock.sol',
    'diamond/Diamond.sol',
    'diamond/facets/AccessControlEnumerableFacet.sol',
    'diamond/facets/DiamondCutFacet.sol',
    'diamond/facets/DiamondLoupeFacet.sol',
    'diamond/interfaces/IDiamondCut.sol',
    'diamond/interfaces/IDiamondLoupe.sol',
    'diamond/interfaces/IERC165.sol',
    'diamond/interfaces/IERC173.sol',
    'diamond/libraries/LibAccessControlEnumerable.sol',
    'diamond/libraries/LibDiamond.sol',
  ],
};
