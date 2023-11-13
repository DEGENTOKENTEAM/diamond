import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployResult } from 'hardhat-deploy/types';
import { artifacts, ethers, network } from 'hardhat';
import { addOrReplaceFacets } from '../scripts/helpers/diamond';
import { Contract } from 'ethers';

interface AddressesFile {
  [contract: string]: string;
}

interface DiamondFile {
  [diamond: string]: {
    Facets: {
      [contract: string]: {
        Name: string;
        Version: string;
      };
    };
  };
}

interface LogFile {
  [contract: string]: {
    [network: string]: {
      [productOrStaging: string]: {
        [version: string]: {
          ADDRESS: string;
          OPTIMIZER_RUNS: string;
          TIMESTAMP: string;
          CONSTRUCTOR_ARGS: string;
          SALT: string;
          VERIFIED: string;
        }[];
      };
    };
  };
}

export const useDefDiamond = process.env.USE_DEF_DIAMOND?.toLowerCase() !== 'false';

export const isProduction = process.env.PRODUCTION?.toLowerCase() === 'true';

export const diamondContractName = useDefDiamond ? 'Diamond' : 'DegenX';

export const addressesFile = isProduction
  ? `deployments/${network.name}.json`
  : `deployments/${network.name}.staging.json`;

export const diamondFile = isProduction
  ? `deployments/${network.name}.diamond${useDefDiamond ? '' : '.immutable'}.json`
  : `deployments/${network.name}.diamond${useDefDiamond ? '' : '.immutable'}.staging.json`;

export const updateDeploymentLogs = async function (name: string, deployResult: DeployResult, isVerified?: boolean) {
  const path = (await artifacts.readArtifact(name)).sourceName;

  const version = getContractVersion(path);

  updateAddress(name, deployResult.address);
  updateDiamond(name, deployResult.address, {
    version: version,
  });
  updateLog(name, version, {
    ADDRESS: deployResult.address,
    OPTIMIZER_RUNS: '10000',
    TIMESTAMP: new Date(
      ((await ethers.provider.getBlock(deployResult.receipt?.blockNumber || 'latest')) || { timestamp: 0 }).timestamp *
        1000
    )
      .toISOString()
      .replace('T', ' ')
      .split('.')[0],
    CONSTRUCTOR_ARGS: (await ethers.getContractFactory(name)).interface.encodeDeploy(deployResult.args),
    VERIFIED: (isVerified || false).toString(),
  });
};

export const updateAddress = function (name: string, address: string) {
  let data: AddressesFile = {};
  try {
    data = JSON.parse(fs.readFileSync(addressesFile, 'utf8')) as AddressesFile;
  } catch {}

  data[name] = address;

  fs.writeFileSync(addressesFile, JSON.stringify(data, null, 2));
};

export const updateDiamond = function (
  name: string,
  address: string,
  options: {
    version?: string;
  }
) {
  let data: DiamondFile = {};
  try {
    data = JSON.parse(fs.readFileSync(diamondFile, 'utf8')) as DiamondFile;
  } catch {}

  if (!data[diamondContractName]) {
    data[diamondContractName] = {
      Facets: {},
    };
  }

  data[diamondContractName].Facets[address] = {
    Name: name,
    Version: options.version || '',
  };

  fs.writeFileSync(diamondFile, JSON.stringify(data, null, 2));
};

export const updateLog = function (name: string, version: string, info: any) {
  let data: LogFile = {};
  try {
    data = JSON.parse(fs.readFileSync('deployments/_deployments_log_file.json', 'utf8')) as LogFile;
  } catch {}

  const type = isProduction ? 'production' : 'staging';

  if (!data[name]) {
    data[name] = {};
  }
  if (!data[name][network.name]) {
    data[name][network.name] = {};
  }
  if (!data[name][network.name][type]) {
    data[name][network.name][type] = {};
  }
  if (!data[name][network.name][type][version]) {
    data[name][network.name][type][version] = [];
  }

  data[name][network.name][type][version].push(info);

  fs.writeFileSync('deployments/_deployments_log_file.json', JSON.stringify(data, null, 2));
};

export const getContractVersion = function (path: string): string {
  const code = fs.readFileSync(path, 'utf8');
  const codeSplits = code.split('@custom:version');
  if (codeSplits.length >= 2) {
    return codeSplits[1].split('\n')[0].trim();
  }
  throw new Error(`Missing '@custom:version' tag in ${path}`);
};

export const deployFacet = async function (
  hre: HardhatRuntimeEnvironment,
  name: string,
  options?: { address?: string; args?: any[] }
) {
  if (network.name !== 'zksync' && network.name !== 'zksyncGoerli') {
    return;
  }

  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const deployedFacet = await deploy(name, {
    from: deployer,
    log: true,
    args: options?.args,
    skipIfAlreadyDeployed: true,
  });

  const facet = await ethers.getContract(name);
  const diamond = await ethers.getContract(diamondContractName);

  await addOrReplaceFacets([facet as Contract], await diamond.getAddress());

  const isVerified = await verifyContract(hre, name, {
    address: await facet.getAddress(),
    args: options?.args,
  });

  await updateDeploymentLogs('DiamondCutFacet', deployedFacet, isVerified);
};

export const verifyContract = async function (
  hre: HardhatRuntimeEnvironment,
  name: string,
  options?: { address?: string; args?: any[] }
) {
  if (network.name !== 'zksync' && network.name !== 'zksyncGoerli') {
    return;
  }

  try {
    await hre.run('verify:verify', {
      address: options?.address || (await (await ethers.getContract(name)).getAddress()),
      constructorArguments: options?.args || [],
    });
    return true;
  } catch (e: any) {
    console.log(`Failed to verify ${name} contract: ${e}`);
    if (e.toString().includes('This contract is already verified')) {
      return true;
    }
  }
  return false;
};

export const getConfig = (name: string) => {
  try {
    return JSON.parse(fs.readFileSync(`configs/${name}.json`, { encoding: 'utf-8' }));
  } catch (e) {
    throw new Error(`Config file '${name}.json' is not existing: ${e}`);
  }
};

export const getContractAddress = (name: string, network?: string): string => {
  let data: AddressesFile = {};
  const file = isProduction ? `deployments/${network}.json` : `deployments/${network}.staging.json`;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8')) as AddressesFile;
  } catch (e) {
    throw new Error(`${e}`);
  }
  return data[name];
};
