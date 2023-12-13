import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import { HardhatUserConfig } from 'hardhat/config';
import 'solidity-docgen';
require('@openzeppelin/hardhat-upgrades');
require('hardhat-contract-sizer');
require('solidity-coverage');
import './tasks';

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
    deployer: 0,
  },
  networks: {
    'testnet-eth': {
      chainId: parseInt(process.env.TESTNET_ETH_CHAIN_ID!),
      url: `${process.env.TESTNET_ETH_RPC!}`,
      accounts: {
        mnemonic: `${process.env.TESTNET_DEPLOYER_MNEMONIC}`,
      },
    },

    'testnet-avax': {
      chainId: parseInt(process.env.TESTNET_AVAX_CHAIN_ID!),
      url: `${process.env.TESTNET_AVAX_RPC!}`,
      accounts: {
        mnemonic: `${process.env.TESTNET_DEPLOYER_MNEMONIC}`,
      },
    },

    'testnet-bsc': {
      chainId: parseInt(process.env.TESTNET_BSC_CHAIN_ID!),
      url: `${process.env.TESTNET_BSC_RPC!}`,
      accounts: {
        mnemonic: `${process.env.TESTNET_DEPLOYER_MNEMONIC}`,
      },
    },

    localfork: {
      // saveDeployments: false,
      url: 'http://127.0.0.1:8545',
      chainId: parseInt(process.env.LOCALFORK_CHAIN_ID!),
      accounts: {
        mnemonic: `${process.env.TESTNET_DEPLOYER_MNEMONIC}`,
      },
    },
    hardhat: {
      saveDeployments: false,
      chainId: parseInt(process.env.LOCALFORK_CHAIN_ID!),
      accounts: {
        mnemonic: `${process.env.TESTNET_DEPLOYER_MNEMONIC}`,
        count: 20,
      },
      forking: {
        enabled: true,
        url: process.env.LOCALFORK_RPC!,
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
      goerli: process.env.APIKEY_GOERLI || '',
      bscTestnet: process.env.APIKEY_BSC_TESTNET || '',
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
