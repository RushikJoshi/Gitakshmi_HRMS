const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class PuppeteerPDFService {
    /**
     * Generate PDF from HTML file using Puppeteer
     * Supports professional footer paging "Page X of Y"
     */
    async generatePdfFromHtmlFile(htmlFilePath, outputPdfPath) {
        let browser;
        try {
            console.log(`🚀 [Puppeteer] Launching browser to convert: ${htmlFilePath}`);
            browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();

            // Load local HTML file
            // 'file://' protocol ensures relative images/css load correctly
            const fileUrl = 'file://' + htmlFilePath.replace(/\\/g, '/');
            await page.goto(fileUrl, { waitUntil: 'networkidle0' });

            // INJECT CSS TO HIDE OLD WORD FOOTERS
            // Word -> HTML often uses "footer" or "ftr" classes or @page rules.
            // We force hide them to avoid double footers (cut-off ones).
            await page.addStyleTag({
                content: `
                    @media print {
                        footer, .footer, .ftr, [class*="footer"], [class*="ftr"] { display: none !important; }
                        /* Ensure our Puppeteer footer is visible (it's in shadow DOM, so this shouldn't affect it, but safe to be specific) */
                    }
                    /* Also hide common converted Word headers/footers in body */
                    div[style*="mso-element:footer"], p[class*="Footer"] { display: none !important; height: 0 !important; overflow: hidden !important; }
                `
            });

            // Professional Footer Template using Puppeteer classes
            // date, title, url, pageNumber, totalPages
            const footerTemplate = `
                <style>
                    .footer {
                        width: 100%;
                        font-size: 10px;
                        font-family: Arial, sans-serif;
                        color: #555;
                        text-align: center;
                        margin-top: 10px;
                        border-top: 1px solid #ddd;
                        padding-top: 5px;
                    }
                </style>
                <div class="footer">
                    Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                </div>
            `;

            console.log(`🖨️ [Puppeteer] Printing PDF to: ${outputPdfPath}`);

            await page.pdf({
                path: outputPdfPath,
                format: 'A4',
                printBackground: true, // Print CSS backgrounds
                displayHeaderFooter: true,
                headerTemplate: '<div></div>', // Empty header
                footerTemplate: footerTemplate,
                margin: {
                    top: '40px',
                    bottom: '60px', // Space for footer
                    left: '40px',
                    right: '40px'
                }
            });

            console.log(`✅ [Puppeteer] PDF Generated Successfully`);
            return outputPdfPath;

        } catch (error) {
            console.error("❌ [Puppeteer] PDF Generation Failed:", error);
            throw error;
        } finally {
            if (browser) await browser.close();
        }
    }
}

module.exports = new PuppeteerPDFService();
