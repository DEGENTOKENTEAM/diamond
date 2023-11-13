export enum FeeCurrency {
  Null,
  Native,
  Token,
}

export enum FeeType {
  Null,
  Default,
  From,
  To,
}

export enum FeeSyncStatus {
  Null,
  Changed,
  Queued,
  Pending,
  Synced,
}

export enum FeeSyncAction {
  Null,
  Add, // adding a fee
  Update, // updating a fee
  Delete, // removing a fee
}

/// custom enums
export enum ExecutionStatus {
  Fail, // execution failed, finalized
  Success, // execution succeeded, finalized
  Retry, // execution rejected, can retry later
}
