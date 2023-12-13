import { Fragment } from '@ethersproject/abi';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { ActionType } from 'hardhat/types';
import path from 'path';

export const generateABI =
  (diamondType: string): ActionType<any> =>
  async (_args, _hre) => {
    await _hre.run('compile');
    let abi: Fragment[] = [];

    const _artifactsContractsPath =
      _hre.config.paths.artifacts + _hre.config.paths.sources.replace(_hre.config.paths.root, '') + '/diamond';

    for (const file of readAllFiles(_artifactsContractsPath.toString())) {
      if (!file.includes('.dbg.json') && file.includes('.json')) {
        const _artifactContent = JSON.parse(readFileSync(file).toString());
        if (_artifactContent.abi.length > 0) {
          for (const abiFragment of _artifactContent.abi) {
            abi.push(abiFragment);
          }
        }
      }
    }

    const abiFile = `${diamondType}.json`;
    const diamondAbi = JSON.stringify(abi);
    if (!existsSync('./abis')) mkdirSync('./abis');
    writeFileSync(`./abis/${abiFile}`, diamondAbi);
    console.log(`Diamond ABI written ${abiFile}`);
  };

function* readAllFiles(dir: string): Generator<string> {
  const files = readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    if (file.isDirectory()) {
      yield* readAllFiles(path.join(dir, file.name));
    } else {
      yield path.join(dir, file.name);
    }
  }
}
