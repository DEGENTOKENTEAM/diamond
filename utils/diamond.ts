export const useDefDiamond = () => process.env.USE_DEF_DIAMOND?.toLowerCase() !== 'false';
export const diamondContractName = () => (useDefDiamond() ? 'Diamond' : 'DegenX');
