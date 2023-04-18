import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import { expand as dotenvExpand } from "dotenv-expand";
import { HardhatUserConfig } from "hardhat/config";
import "solidity-docgen";
require("@openzeppelin/hardhat-upgrades");
require("hardhat-contract-sizer");
require("solidity-coverage");
const dotEnvConfig = dotenv.config();
dotenvExpand(dotEnvConfig);

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks: {
    localfork: {
      url: "http://127.0.0.1:8545",
      chainId: parseInt(process.env.CHAIN_ID || ""),
      gasPrice: 225000000000,
      accounts: {
        mnemonic: `${process.env.LOCAL_MNEMONIC}`,
      },
    },
    hardhat: {
      chainId: parseInt(process.env.CHAIN_ID || ""),
      gasPrice: 225000000000,
      accounts: {
        count: 20,
      },
      forking: {
        enabled: true,
        url: process.env.NODE_URL || "",
        blockNumber: parseInt(process.env.NODE_BLOCK || ""),
      },
    },
  },
};

export default config;
