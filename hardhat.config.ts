import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import * as dotenv from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import { HardhatUserConfig } from 'hardhat/config';
import 'solidity-docgen';
import './config';
import './tasks';
import {
  NETWORK_HARDHAT,
  NETWORK_LOCALFORK,
  NETWORK_LOCALHOST,
  NETWORK_MAINNET_AVAX,
  NETWORK_MAINNET_ETH,
} from './utils/networks';
require('@openzeppelin/hardhat-upgrades');
require('hardhat-contract-sizer');
require('solidity-coverage');

const dotEnvConfig = dotenv.config();
dotenvExpand(dotEnvConfig);

const accounts =
  process.env.USE_REAL_ACCOUNTS === 'true'
    ? [`${process.env.MAINNET_DEPLOYER_PK_CONTRACTS}`, `${process.env.MAINNET_DEPLOYER_PK_DIAMOND}`]
    : undefined;

const accountsHardhat =
  process.env.USE_REAL_ACCOUNTS === 'true'
    ? [
        { privateKey: `${process.env.MAINNET_DEPLOYER_PK_CONTRACTS}`, balance: (1337n * 10n ** 18n).toString() },
        { privateKey: `${process.env.MAINNET_DEPLOYER_PK_DIAMOND}`, balance: (1337n * 10n ** 18n).toString() },
      ]
    : undefined;

const localforkAVAX = {
  chainId: parseInt(`${process.env.LOCALFORK_CHAIN_ID_AVAX}`),
  block: parseInt(`${process.env.LOCALFORK_BLOCK_AVAX}`),
  url: `${process.env.LOCALFORK_RPC_AVAX}`,
};

const localforkETH = {
  chainId: parseInt(`${process.env.LOCALFORK_CHAIN_ID_ETH}`),
  block: parseInt(`${process.env.LOCALFORK_BLOCK_ETH}`),
  url: `${process.env.LOCALFORK_RPC_ETH}`,
};

const localforkRPCs: { [network: string]: { block: number; url: string; chainId: number } } = {
  [NETWORK_MAINNET_AVAX]: { ...localforkAVAX },
  [NETWORK_MAINNET_ETH]: { ...localforkETH },
};
localforkRPCs[NETWORK_HARDHAT] = localforkRPCs[`${process.env.LOCALFORK_RPC_NETWORK}`];

const useLocalforkInstead = process.env.USE_LOCALFORK_INSTEAD !== 'false';
const localforkUrlAVAX = 'http://127.0.0.1:8545';
const localforkUrlETH = 'http://127.0.0.1:8546';
const localforkUrlBNB = 'http://127.0.0.1:8547';

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.19',
        settings: {
          optimizer: {
            enabled: true,
            runs: 99999,
          },
        },
      },
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 99999,
          },
        },
      },
      {
        version: '0.8.0',
        settings: {
          optimizer: {
            enabled: true,
            runs: 99999,
          },
        },
      },
    ],
  },
  namedAccounts: {
    deployer: 0,
    diamondDeployer: 1,
  },
  networks: {
    'testnet-eth': {
      live: !useLocalforkInstead,
      chainId: parseInt(process.env.TESTNET_ETH_CHAIN_ID!),
      url: useLocalforkInstead ? localforkUrlETH : `${process.env.TESTNET_ETH_RPC!}`,
      accounts,
    },
    'testnet-avax': {
      live: !useLocalforkInstead,
      chainId: parseInt(process.env.TESTNET_AVAX_CHAIN_ID!),
      url: useLocalforkInstead ? localforkUrlAVAX : `${process.env.TESTNET_AVAX_RPC!}`,
      accounts,
    },
    'testnet-bsc': {
      live: !useLocalforkInstead,
      chainId: parseInt(process.env.TESTNET_BSC_CHAIN_ID!),
      url: useLocalforkInstead ? localforkUrlBNB : `${process.env.TESTNET_BSC_RPC!}`,
      accounts,
    },
    'mainnet-eth': {
      live: !useLocalforkInstead,
      chainId: parseInt(process.env.MAINNET_ETH_CHAIN_ID!),
      url: useLocalforkInstead ? localforkUrlETH : `${process.env.MAINNET_ETH_RPC!}`,
      accounts,
    },
    'mainnet-avax': {
      live: !useLocalforkInstead,
      chainId: parseInt(process.env.MAINNET_AVAX_CHAIN_ID!),
      url: useLocalforkInstead ? localforkUrlAVAX : `${process.env.MAINNET_AVAX_RPC!}`,
      gasMultiplier: 1.2,
      accounts,
    },
    'mainnet-bsc': {
      live: !useLocalforkInstead,
      chainId: parseInt(process.env.MAINNET_BSC_CHAIN_ID!),
      url: useLocalforkInstead ? localforkUrlBNB : `${process.env.MAINNET_BSC_RPC!}`,
      gasMultiplier: 1.2,
      accounts,
    },
    localfork: {
      live: false,
      saveDeployments: false,
      url: localforkUrlAVAX,
      chainId: parseInt(process.env.LOCALFORK_CHAIN_ID!),
      accounts,
    },
    hardhat: {
      live: false,
      saveDeployments: false,
      chainId: localforkRPCs[`${process.env.LOCALFORK_RPC_NETWORK}`].chainId,
      accounts: accountsHardhat,
      forking: {
        enabled: true,
        url: localforkRPCs[`${process.env.LOCALFORK_RPC_NETWORK}`].url,
        blockNumber: localforkRPCs[`${process.env.LOCALFORK_RPC_NETWORK}`].block,
      },
    },
  },
  typechain: {
    alwaysGenerateOverloads: true,
  },
  docgen: {
    pages: 'files',
    exclude: ['__mocks__'],
  },
  etherscan: {
    apiKey: {
      avalanche: process.env.APIKEY_AVALANCHE || '',
      avalancheFujiTestnet: process.env.APIKEY_AVALANCHE_TESTNET || '',
      bscTestnet: process.env.APIKEY_BSC_TESTNET || '',
      goerli: process.env.APIKEY_GOERLI || '',
      mainnet: process.env.APIKEY_MAINNET || '',
    },
    customChains: [
      {
        network: 'goerli',
        chainId: 5,
        urls: {
          apiURL: 'https://api-goerli.etherscan.io/api',
          browserURL: 'https://goerli.etherscan.io',
        },
      },
    ],
  },
};

export default config;
