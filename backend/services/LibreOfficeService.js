const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class LibreOfficeService {
    constructor() {
        // User provided path: C:\Program Files\LibreOffice\program
        this.basePath = 'C:\\Program Files\\LibreOffice\\program';
        this.executablePath = path.join(this.basePath, 'soffice.exe');
    }

    /**
     * Convert a file to PDF synchronously using execFileSync
     * @param {string} inputPath - Absolute path to input file (docx)
     * @param {string} outputDir - Directory to save the output PDF
     * @returns {string} - Absolute path to the generated PDF
     */
    convertToPdfSync(inputPath, outputDir) {
        // 1. Verify Executable
        if (!fs.existsSync(this.executablePath)) {
            console.warn(`⚠️ [LibreOffice] soffice.exe not found at: ${this.executablePath}`);

            // Try explicit fallback to program path provided by user if exe missing (maybe just checks dir?)
            if (fs.existsSync(this.basePath)) {
                console.warn(`ℹ️ [LibreOffice] Directory exists but executable not found. Checking alternatives...`);
            }

            // Fallback: Check standard x86 path just in case
            const x86Path = 'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe';
            if (fs.existsSync(x86Path)) {
                console.log(`✅ [LibreOffice] Found alternative at (x86): ${x86Path}`);
                this.executablePath = x86Path;
            } else {
                throw new Error(`LibreOffice not found! Checked:\n 1. ${this.executablePath} (User Provided)\n 2. ${x86Path}`);
            }
        } else {
            // console.log(`✅ [LibreOffice] Using executable: ${this.executablePath}`);
        }

        if (!fs.existsSync(inputPath)) {
            throw new Error(`Input file not found: ${inputPath}`);
        }

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        try {
            console.log(`🔄 [LibreOffice] Converting: ${path.basename(inputPath)}`);

            // Arguments for soffice
            // --headless --convert-to pdf --outdir <outDir> <inFile>
            const args = [
                '--headless',
                '--convert-to',
                'pdf',
                '--outdir',
                outputDir,
                inputPath
            ];

            // Execute Synchronously
            // stdio: 'pipe' allows us to capture output if needed, but 'ignore' is faster if we don't need logs.
            // Using 'pipe' to debug if it fails.
            execFileSync(this.executablePath, args, { stdio: 'pipe' });

            // Verify Output
            const baseName = path.basename(inputPath, path.extname(inputPath));
            const pdfPath = path.join(outputDir, `${baseName}.pdf`);

            if (fs.existsSync(pdfPath)) {
                console.log(`✅ [LibreOffice] Created: ${pdfPath}`);
                return pdfPath;
            } else {
                throw new Error('PDF file was not found after conversion command finished.');
            }
        } catch (error) {
            console.error('❌ [LibreOffice] Conversion Failed:', error.message);
            if (error.stderr) console.error('Stderr:', error.stderr.toString());
            if (error.stdout) console.log('Stdout:', error.stdout.toString());
            throw new Error(`PDF Conversion Failed: ${error.message}`);
        }
    }
    /**
     * Convert a file to HTML synchronously
     * @param {string} inputPath - Absolute path to input file (docx)
     * @param {string} outputDir - Directory to save the output HTML
     * @returns {string} - Absolute path to the generated HTML file
     */
    convertToHtmlSync(inputPath, outputDir) {
        if (!fs.existsSync(this.executablePath)) {
            // Re-check for fallback
            const x86Path = 'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe';
            if (fs.existsSync(x86Path)) {
                this.executablePath = x86Path;
            } else {
                throw new Error('LibreOffice executable not found');
            }
        }

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        try {
            console.log(`🔄 [LibreOffice] Converting to HTML: ${path.basename(inputPath)}`);
            //  --headless --convert-to html:HTML --outdir <outDir> <inFile>
            // Note: Use html:HTML (StarOffice HTML) or specific filter if needed. Standard 'html' usually works.
            const args = [
                '--headless',
                '--convert-to',
                'html',
                '--outdir',
                outputDir,
                inputPath
            ];

            execFileSync(this.executablePath, args, { stdio: 'pipe' });

            const baseName = path.basename(inputPath, path.extname(inputPath));
            const htmlPath = path.join(outputDir, `${baseName}.html`);

            if (fs.existsSync(htmlPath)) {
                console.log(`✅ [LibreOffice] Created HTML: ${htmlPath}`);
                return htmlPath;
            } else {
                throw new Error('HTML file was not found after conversion.');
            }
        } catch (error) {
            console.error('❌ [LibreOffice] HTML Conversion Failed:', error.message);
            throw error;
        }
    }
}

module.exports = new LibreOfficeService();
