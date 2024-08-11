import fs from 'fs';

interface AddressesFile {
  [contract: string]: string;
}

export const getContractAddress = (network: string, name: string): string => {
  return readAddressFileData(network)[name];
};

export const updateAddress = function (network: string, name: string, address: string) {
  let data = readAddressFileData(network);
  writeAddressFileData(network, { ...data, [name]: address });
};

const readAddressFileData = (network: string): AddressesFile => {
  try {
    return JSON.parse(fs.readFileSync(getAddressesFileName(network), 'utf8')) as AddressesFile;
  } catch (e) {
    throw new Error(`${e}`);
  }
};

const writeAddressFileData = (network: string, data: AddressesFile): void => {
  fs.writeFileSync(getAddressesFileName(network), JSON.stringify(data, null, 2));
};

const getAddressesFileName = (network: string) => {
  return process.env.PRODUCTION?.toLowerCase() === 'true'
    ? `deployments/${network}.json`
    : `deployments/${network}.staging.json`;
};
