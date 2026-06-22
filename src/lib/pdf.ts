import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium-min'

const IS_PROD = process.env.NODE_ENV === 'production'

export function escHtml(str: unknown): string {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function getExecutablePath(): Promise<string> {
  if (!IS_PROD) {
    return (
      process.env.LOCAL_CHROME_PATH ??
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    )
  }
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  return chromium.executablePath(
    process.env.CHROMIUM_DOWNLOAD_URL ??
      'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.tar'
  )
}

/* Copy Puppeteer's Buffer (Uint8Array<ArrayBufferLike>) into a clean
   Uint8Array<ArrayBuffer> so it satisfies BlobPart / BodyInit. */
function toCleanUint8Array(src: Uint8Array): Uint8Array<ArrayBuffer> {
  const dst = new Uint8Array(src.byteLength)
  dst.set(src)
  return dst as Uint8Array<ArrayBuffer>
}

export async function generateScreenshot(html: string, viewportWidth = 1200): Promise<Uint8Array<ArrayBuffer>> {
  const executablePath = await getExecutablePath()
  let browser
  try {
    browser = await puppeteer.launch(
      IS_PROD
        ? { args: chromium.args, defaultViewport: { width: viewportWidth, height: 900 }, executablePath, headless: true }
        : { executablePath, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'], defaultViewport: { width: viewportWidth, height: 900 } }
    )
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    const shot = await page.screenshot({ type: 'png', fullPage: true })
    return toCleanUint8Array(shot as Uint8Array)
  } finally {
    if (browser) await browser.close()
  }
}

export async function generatePDF(html: string): Promise<Uint8Array<ArrayBuffer>> {
  const executablePath = await getExecutablePath()
  let browser
  try {
    browser = await puppeteer.launch(
      IS_PROD
        ? {
            args: chromium.args,
            defaultViewport: { width: 1100, height: 850 },
            executablePath,
            headless: true,
          }
        : {
            executablePath,
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: { width: 1100, height: 850 },
          }
    )
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    return toCleanUint8Array(pdf as Uint8Array)
  } finally {
    if (browser) await browser.close()
  }
}
