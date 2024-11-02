export interface DocumentData {
  name: string;
  documentNumber: string;
  expirationDate: string;
}

export interface ScanResult {
  text: string;
  confidence: number;
}