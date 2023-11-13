import { task } from 'hardhat/config';
import { generateABI } from './helper/generate-abi';

export const fullDiamondABI = task('fullDiamondABI', '', generateABI('fullDiamondABI'));
