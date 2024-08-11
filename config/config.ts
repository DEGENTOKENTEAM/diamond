import { ZeroAddress } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { FeeCurrency, FeeType } from '../test/utils/enums';
import { getContractAddress } from '../utils/addresses';
import { diamondContractName } from '../utils/diamond';
import {
  DEPLOYER_STAKEX_FEE,
  ERC20_DEVELOPER_FEE,
  ERC20_DEVELOPER_FEE_V2,
  ERC20_MARKETING_FEE,
  ERC20_MARKETING_FEE_V2,
  ERC20_PLATFORM_FEE,
  ERC20_PLATFORM_FEE_V2,
  ERC20_REWARD_FEE,
  ERC20_REWARD_FEE_V2,
} from '../utils/feeConfigs';
import { NETWORK_MAINNET_AVAX, NETWORK_MAINNET_ETH } from '../utils/networks';

export type FeeDistributionReceiver = {
  name: string;
  points: number;
  account: string;
  swapPath: string[];
};

export type FeeConfig = {
  id: string;
  fee: bigint;
  receiver: string;
  currency: FeeCurrency;
  ftype: FeeType;
};

export type ChainConfig = {
  chainId: number;
  target: string;
};

export type TargetChainConfig = {
  chainId: number;
  name: string;
  relayerAddress: string;
};

export type FeeConfigChainAssignment = {
  ids: string[];
  chainId: number;
};

export type Config = {
  chainIdHome: number;
  chainNameHome: string;
  targetChains: TargetChainConfig[];
  token: {
    name: string;
    symbol: string;
    decimals: number;
  };
  initials: {
    feeConfigs: FeeConfig[];
    chains: ChainConfig[];
    feeConfigToChain: FeeConfigChainAssignment[];
    feeReceivers: FeeDistributionReceiver[];
  };
};

export default async function ({ diamond }: HardhatRuntimeEnvironment): Promise<Config> {
  const { contracts, accounts } = await diamond.getProtocols();

  const config: Config = {
    chainIdHome: 43114,
    chainNameHome: NETWORK_MAINNET_AVAX,
    targetChains: [
      {
        chainId: 1,
        name: NETWORK_MAINNET_ETH,
        relayerAddress: getContractAddress(NETWORK_MAINNET_ETH, 'RelayerCeler'),
      },
    ],
    token: {
      name: 'DegenX',
      symbol: 'DGNX',
      decimals: 18,
    },
    initials: {
      chains: [
        {
          chainId: 1,
          target: getContractAddress(NETWORK_MAINNET_ETH, diamondContractName()),
        },
      ],
      feeConfigs: [
        {
          id: ERC20_MARKETING_FEE_V2,
          fee: 10n,
          receiver: contracts.degenx.marketing?.address!,
          currency: 2,
          ftype: 1,
        },
        {
          id: ERC20_REWARD_FEE_V2,
          fee: 10n,
          receiver: ZeroAddress,
          currency: 2,
          ftype: 1,
        },
        {
          id: ERC20_PLATFORM_FEE_V2,
          fee: 6n,
          receiver: contracts.degenx.platform?.address!,
          currency: 2,
          ftype: 1,
        },
        {
          id: ERC20_DEVELOPER_FEE_V2,
          fee: 4n,
          receiver: accounts.development.address,
          currency: 2,
          ftype: 1,
        },
        {
          id: ERC20_MARKETING_FEE,
          fee: 100n,
          receiver: contracts.degenx.marketing?.address!,
          currency: 2,
          ftype: 1,
        },
        {
          id: ERC20_REWARD_FEE,
          fee: 100n,
          receiver: ZeroAddress,
          currency: 2,
          ftype: 1,
        },
        {
          id: ERC20_PLATFORM_FEE,
          fee: 60n,
          receiver: contracts.degenx.platform?.address!,
          currency: 2,
          ftype: 1,
        },
        {
          id: ERC20_DEVELOPER_FEE,
          fee: 40n,
          receiver: accounts.development.address,
          currency: 2,
          ftype: 1,
        },
        {
          id: DEPLOYER_STAKEX_FEE,
          fee: 5n * 10n ** 18n,
          receiver: contracts.degenx.platform?.address!,
          currency: FeeCurrency.Native,
          ftype: FeeType.Default,
        },
      ],
      feeConfigToChain: [
        {
          chainId: 1,
          ids: [
            ERC20_MARKETING_FEE,
            ERC20_REWARD_FEE,
            ERC20_PLATFORM_FEE,
            ERC20_DEVELOPER_FEE,
            ERC20_MARKETING_FEE_V2,
            ERC20_REWARD_FEE_V2,
            ERC20_PLATFORM_FEE_V2,
            ERC20_DEVELOPER_FEE_V2,
          ],
        },
      ],
      feeReceivers: [
        {
          account: contracts.degenx.liquidityBacking?.address!,
          name: 'Liquidity Backing',
          points: 10000,
          swapPath: [],
        },
      ],
    },
  };

  return config;
}
