import type { Report } from '@/evolution/report'

// react-pdf (~500 KB) só é baixado quando a pessoa pede o PDF
export async function generatePdf(r: Report, photos: Record<string, string>): Promise<Blob> {
  const [{ pdf }, { ReportDocument }] = await Promise.all([import('@react-pdf/renderer'), import('./ReportDocument')])
  return pdf(<ReportDocument report={r} photos={photos} />).toBlob()
}
