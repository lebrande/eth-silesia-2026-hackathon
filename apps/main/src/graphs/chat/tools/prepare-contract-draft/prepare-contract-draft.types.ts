export type ContractSection = {
  title: string;
  body: string;
};

export type ContractMetadata = {
  tariffCode: string;
  effectiveFrom: string;
  customerName: string;
};

export type ContractStatus = "pending" | "accepted" | "signed";

export type ContractSigningData = {
  sections: ContractSection[];
  metadata: ContractMetadata;
  status: ContractStatus;
};
