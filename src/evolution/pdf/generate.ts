import { createElement } from 'react'
import { shareFile } from '../../lib/share'
import type { Report } from '../report'

// react-pdf (~500 KB) só é baixado quando a pessoa pede o PDF
export async function generatePdf(r: Report, photos: Record<string, string>): Promise<Blob> {
  const [{ pdf }, { ReportDocument }] = await Promise.all([import('@react-pdf/renderer'), import('./ReportDocument')])
  return pdf(createElement(ReportDocument, { report: r, photos }) as Parameters<typeof pdf>[0]).toBlob()
}

export const sharePdf = (blob: Blob, filename: string) => shareFile(new File([blob], filename, { type: 'application/pdf' }))
