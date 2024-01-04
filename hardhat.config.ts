import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import { HardhatUserConfig } from 'hardhat/config';
import 'solidity-docgen';
import './tasks';
require('@openzeppelin/hardhat-upgrades');
require('hardhat-contract-sizer');
require('solidity-coverage');

// load env config
import * as dotenv from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';
const dotEnvConfig = dotenv.config();
dotenvExpand(dotEnvConfig);

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
    diamondDeployer: 0,
    deployer: 1,
  },
  networks: {
    'testnet-eth': {
      chainId: parseInt(process.env.TESTNET_ETH_CHAIN_ID!),
      url: `${process.env.TESTNET_ETH_RPC!}`,
      accounts: [`${process.env.TESTNET_DEPLOYER_PK_DIAMOND}`, `${process.env.TESTNET_DEPLOYER_PK_CONTRACTS}`],
    },
    'testnet-avax': {
      chainId: parseInt(process.env.TESTNET_AVAX_CHAIN_ID!),
      url: `${process.env.TESTNET_AVAX_RPC!}`,
      accounts: [`${process.env.TESTNET_DEPLOYER_PK_DIAMOND}`, `${process.env.TESTNET_DEPLOYER_PK_CONTRACTS}`],
    },
    'testnet-bsc': {
      chainId: parseInt(process.env.TESTNET_BSC_CHAIN_ID!),
      url: `${process.env.TESTNET_BSC_RPC!}`,
      accounts: [`${process.env.TESTNET_DEPLOYER_PK_DIAMOND}`, `${process.env.TESTNET_DEPLOYER_PK_CONTRACTS}`],
    },
    'mainnet-eth': {
      chainId: parseInt(process.env.MAINNET_ETH_CHAIN_ID!),
      url: `${process.env.MAINNET_ETH_RPC!}`,
      accounts: [`${process.env.MAINNET_DEPLOYER_PK_DIAMOND}`, `${process.env.MAINNET_DEPLOYER_PK_CONTRACTS}`],
    },
    'mainnet-avax': {
      chainId: parseInt(process.env.MAINNET_AVAX_CHAIN_ID!),
      url: `${process.env.MAINNET_AVAX_RPC!}`,
      gasMultiplier: 1.2,
      accounts: [`${process.env.MAINNET_DEPLOYER_PK_DIAMOND}`, `${process.env.MAINNET_DEPLOYER_PK_CONTRACTS}`],
    },
    'mainnet-bsc': {
      chainId: parseInt(process.env.MAINNET_BSC_CHAIN_ID!),
      url: `${process.env.MAINNET_BSC_RPC!}`,
      gasMultiplier: 1.2,
      accounts: [`${process.env.MAINNET_DEPLOYER_PK_DIAMOND}`, `${process.env.MAINNET_DEPLOYER_PK_CONTRACTS}`],
    },
    localfork: {
      saveDeployments: false,
      url: 'http://127.0.0.1:8545',
      chainId: parseInt(process.env.LOCALFORK_CHAIN_ID!),
      accounts:
        process.env.LOCALFORK_USE_REAL_ACCOUNTS !== 'false'
          ? [`${process.env.MAINNET_DEPLOYER_PK_DIAMOND}`, `${process.env.MAINNET_DEPLOYER_PK_CONTRACTS}`]
          : undefined,
    },
    hardhat: {
      saveDeployments: false,
      chainId: parseInt(process.env.LOCALFORK_CHAIN_ID!),
      accounts:
        process.env.LOCALFORK_USE_REAL_ACCOUNTS !== 'false'
          ? [
              { privateKey: `${process.env.MAINNET_DEPLOYER_PK_DIAMOND}`, balance: (1337n * 10n ** 18n).toString() },
              { privateKey: `${process.env.MAINNET_DEPLOYER_PK_CONTRACTS}`, balance: (1337n * 10n ** 18n).toString() },
            ]
          : undefined,
      forking: {
        enabled: true,
        url: `${process.env.LOCALFORK_RPC}`,
        // blockNumber: parseInt(process.env.LOCALFORK_BLOCK!),
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
