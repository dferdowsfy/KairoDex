declare module 'pdf-parse' {
  interface PDFInfo {
    PDFFormatVersion?: string
    IsAcroFormPresent?: boolean
    IsXFAPresent?: boolean
    Producer?: string
    Creator?: string
    Author?: string
    Title?: string
    CreationDate?: string
    ModDate?: string
    Pages?: number
  }
  interface PDFMetadata {}
  interface PDFData {
    numpages: number
    numrender: number
    info: PDFInfo
    metadata: PDFMetadata | null
    version: string
    text: string
  }
  function pdfParse(dataBuffer: Buffer | Uint8Array | ArrayBuffer, options?: any): Promise<PDFData>
  export default pdfParse
}
