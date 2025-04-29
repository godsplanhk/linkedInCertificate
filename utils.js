import "./libs/pdf-lib.min.js";
const PDFDocument = PDFLib.PDFDocument;
let savedRequest = null;
let fetchOptions = null;
export function saveXHRRequest(details) {
    console.log(details);
    fetchOptions = {
        method: details.method || 'GET', // Default to GET
        headers: {},
        body: details.method === 'POST' ? details.body : undefined // Include body for POST requests
    };
    if (details.requestHeaders) {
        for (const x of (details.requestHeaders)) {
            fetchOptions.headers[x.name] = x.value; // Add each header
        }
    }
    console.log("savedFetchedrequest", fetchOptions);
    savedRequest = [{
        url: details.url,
        method: details.method,
        requestId: details.requestId,
        type: details.type,
        timeStamp: details.timeStamp,
        initiator: details.initiator,
        body: details.requestBody,
        headers: details.requestHeaders
    }, fetchOptions]
    return savedRequest;
}

function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
async function addPdfToPdf(targetDoc, sourceBuffer) {
    const sourceDoc = await PDFDocument.load(sourceBuffer);

    const pages = sourceDoc.getPageCount(); // Updated method for pdf-lib

    const copiedPages = await targetDoc.copyPages(sourceDoc, Array.from(Array(pages).keys()));

    copiedPages.forEach(page => {
        targetDoc.addPage(page);
    });
}
async function mergePdfs(pdfArrayBuffers) {
    const mergedPdf = await PDFDocument.create();

    for (let buffer of pdfArrayBuffers) {
        await addPdfToPdf(mergedPdf, buffer);
    }

    const mergedPdfBytes = await mergedPdf.save();
    return mergedPdfBytes;
}
export async function fetchAndMergePdf(certBlob) {
    // if (!response.isDownloaded) {
    //     message.innerText = `${response.responses.length}/${response.total} Certificates Downloaded. Please Try after some time`;
    //     return;
    // }
    const pdfArrayBuffers = [];
    for (const url of certBlob) {
        const response = await fetch(url);
        pdfArrayBuffers.push(await response.arrayBuffer());
    }
    const mergedPdf = await mergePdfs(pdfArrayBuffers);
    console.log("mergedPDFBUfffer", mergedPdf);
    return mergedPdf;
}