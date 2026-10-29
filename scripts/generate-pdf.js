const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function findBrowserBinary() {
    const candidates = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser'
    ];

    for (const bin of candidates) {
        if (fs.existsSync(bin)) {
            return bin;
        }
    }

    return 'chrome';
}

function generateResumePdf() {
    const rootDir = path.resolve(__dirname, '..');
    const htmlPath = path.join(rootDir, 'curriculo.html');
    const outputPdfRoot = path.join(rootDir, 'curriculo.pdf');
    const outputPdfCurriculo = path.join(rootDir, 'curriculo', 'curriculo.pdf');

    if (!fs.existsSync(htmlPath)) {
        console.error('Erro: curriculo.html não encontrado em:', htmlPath);
        process.exit(1);
    }

    const browser = findBrowserBinary();
    console.log(`Usando navegador: ${browser}`);

    const htmlUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
    const tempPdf = path.join(rootDir, 'curriculo_generated.pdf');

    const args = [
        '--headless=new',
        '--disable-gpu',
        '--no-pdf-header-footer',
        `--print-to-pdf=${tempPdf}`,
        htmlUrl
    ];

    console.log(`Renderizando ${htmlUrl} para PDF...`);
    const result = spawnSync(browser, args, { stdio: 'inherit' });

    if (!fs.existsSync(tempPdf)) {
        console.error('Falha ao gerar PDF.');
        process.exit(1);
    }

    // Copiar para a raiz e para o diretório /curriculo
    fs.copyFileSync(tempPdf, outputPdfRoot);
    if (fs.existsSync(path.dirname(outputPdfCurriculo))) {
        fs.copyFileSync(tempPdf, outputPdfCurriculo);
    }
    fs.unlinkSync(tempPdf);

    const stats = fs.statSync(outputPdfRoot);
    console.log(`✔ PDF gerado com sucesso!`);
    console.log(`  -> ${outputPdfRoot} (${stats.size} bytes)`);
    console.log(`  -> ${outputPdfCurriculo} (${stats.size} bytes)`);
}

generateResumePdf();
