import { task } from 'hardhat/config';
import { generateABI } from './helper/generate-abi';

export const publicDiamondABI = task('publicDiamondABI', '', generateABI('publicDiamondABI'));
