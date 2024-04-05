import { ZeroAddress } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { FeeCurrency, FeeType } from '../test/utils/enums';
import { getContractAddress } from '../utils/addresses';
import { diamondContractName } from '../utils/diamond';
import { ERC20_DEVELOPER_FEE, ERC20_MARKETING_FEE, ERC20_PLATFORM_FEE, ERC20_REWARD_FEE } from '../utils/feeConfigs';
import { NETWORK_MAINNET_AVAX, NETWORK_MAINNET_ETH } from '../utils/networks';

export type FeeDistributionReceiver = {
  name: string;
  points: number;
  account: string;
  swapPath: string[];
};

export type FeeConfig = {
  id: string;
  fee: number;
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
          id: ERC20_MARKETING_FEE,
          fee: 100,
          receiver: contracts.degenx.marketing?.address!,
          currency: 2,
          ftype: 1,
        },
        {
          id: ERC20_REWARD_FEE,
          fee: 100,
          receiver: ZeroAddress,
          currency: 2,
          ftype: 1,
        },
        {
          id: ERC20_PLATFORM_FEE,
          fee: 60,
          receiver: contracts.degenx.platform?.address!,
          currency: 2,
          ftype: 1,
        },
        {
          id: ERC20_DEVELOPER_FEE,
          fee: 40,
          receiver: accounts.development.address,
          currency: 2,
          ftype: 1,
        },
      ],
      feeConfigToChain: [
        { chainId: 1, ids: [ERC20_MARKETING_FEE, ERC20_REWARD_FEE, ERC20_PLATFORM_FEE, ERC20_DEVELOPER_FEE] },
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
