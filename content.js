
function triggerDownload(pdfArrayBuffer) {
    const convertedBuffer = new Uint8Array(Object.values(pdfArrayBuffer));
    const blob = new Blob([convertedBuffer], { type: "application/pdf" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "LinkedInCert.pdf";
    a.click();
    URL.revokeObjectURL(url);
}
async function Download() {
    let learningPath = document.location.href.split('/');
    learningPath = learningPath[learningPath.length - 1].split('?')[0];
    const downloadable = await learningPathExtractor(learningPath);
    const certData = await certificateChecker(downloadable);
    const certBlob = await certificateDownloader(certData);
    chrome.runtime.sendMessage({ type: "fetchAndMerge", data: certBlob }, (response) => {
        triggerDownload(response);
    });
}



async function learningPathExtractor(learningPath) {
    const message = document.getElementById("message");
    const progress_bar = document.getElementById("progress_container");
    progress_bar.style.visibility = "visible";
    resetProgressBar();
    message.style.visibility = "visible";
    message.innerText = "Fetching All courses...";
    const url = 'https://www.linkedin.com/learning-api/detailedLearningPaths?learningPathSlug=' + learningPath + '&q=slug&version=2';
    const fetchOptions = await chrome.runtime.sendMessage({ type: "getFetchOptions" });
    if (!fetchOptions && !fetchOptions?.headers["Csrf-Token"]) {
        window.location.href = "/learning/me/my-library/completed"
    }
    console.log(fetchOptions);
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    sections = data.data.elements[0].sections;
    downloadable = [];
    for (const x of sections) {
        for (const y of x.items) {
            const content = y["*content"];
            let splitContent = content.split(":");
            if (splitContent[splitContent.length - 2] === "lyndaCourse" && splitContent[splitContent.length - 4] != "(urn") {
                message.innerText = downloadable.length + " courses found...";
                downloadable.push(splitContent[splitContent.length - 1]);
                if (downloadable.length % 4 > 3) resetProgressBar();
                updateProgressBar(1, 3, "cornflowerblue")
            }
        }
    }
    return downloadable;
}

async function fetchWrapper(url, fetchOptions) {
    let data = null;
    chrome.runtime.sendMessage({ type: "fetchWrapper", url: url, fetchOptions: fetchOptions }, (data) => {
        data = data;
    });
    return data;
}
function encodeRFC5987ValueChars(str) {
    return (
        encodeURIComponent(str)
            // The following creates the sequences %27 %28 %29 %2A (Note that
            // the valid encoding of "*" is %2A, which necessitates calling
            // toUpperCase() to properly encode). Although RFC3986 reserves "!",
            // RFC5987 does not, so we do not need to escape it.
            .replace(
                /['()*]/g,
                (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
            )
            // The following are not required for percent-encoding per RFC5987,
            // so we can allow for a little better readability over the wire: |`^
            .replace(/%(7C|60|5E)/g, (str, hex) =>
                String.fromCharCode(parseInt(hex, 16)),
            )
    );
}
function resetProgressBar() {
    const progress = document.getElementById("progress_container");
    progress.innerHTML = "";
}
async function certificateDownloader(certData) {
    const certBlob = [];
    resetProgressBar();
    const fetchOptions = await chrome.runtime.sendMessage({ type: "getFetchOptions" });
    const message = document.getElementById("message");
    message.innerText = "Downloading certificates...";
    for (const [course, certificates] of (certData[0])) {
        for (const cert of certificates.certificates) {
            const url = 'https://www.linkedin.com/learning-api/contentCertificate?learnerCertificateUrn=' + encodeRFC5987ValueChars(cert)
            try {
                const data = await fetch(url, fetchOptions)
                if (data.status == 200) {
                    certBlob.push(await blobToDataURL(await data.blob()));
                    updateProgressBar(1, certData[1], "cornflowerblue");
                    message.innerText = certBlob.length + '/' + certData[1] + " downloaded";
                }
                else {
                    updateProgressBar(1, certData[1], "red");
                }
            }
            catch (error) {
            };
        }
    }
    return certBlob;
}
async function certificateChecker(downloadable) {
    const certData = [new Map(), 0];
    let counter = 0;
    resetProgressBar();
    const fetchOptions = await chrome.runtime.sendMessage({ type: "getFetchOptions" });
    const message = document.getElementById("message");
    for (const x of (downloadable)) {
        let data = await fetch('https://www.linkedin.com/learning-api/contentCertificateStatus/urn:li:lyndaCourse:' + x, fetchOptions);
        updateProgressBar(1, downloadable.length, "70aef1");
        data = await data.json();
        if (data.data.containsCertificates) {
            counter += data.data['*certificates'].length;
            message.innerText = counter + " certificates found..."
            certData[0].set(x, { certificates: data.data['*certificates'], access: data.data.certificateAccess });
        }
    }
    certData[1] = counter;
    return certData;
}
function updateProgressBar(amount, total, color) {
    const progressContainer = document.getElementById("progress_container");
    const segmentDiv = document.createElement("div");
    segmentDiv.style.height = "20px";
    segmentDiv.style.width = `${(amount / total) * 100}%`;
    segmentDiv.style.backgroundColor = color;
    progressContainer.appendChild(segmentDiv);
}
function addDownload() {
    observer.disconnect();
    const checkButton = document.getElementById('custom-download-btn');
    const progressContainer = document.createElement("div");
    progressContainer.style.width = "100%";
    progressContainer.style.visibility = "hidden";
    progressContainer.id = "progress_container";
    progressContainer.style.backgroundColor = "#ddd";
    progressContainer.style.borderRadius = "10px";
    progressContainer.style.overflow = "hidden";
    progressContainer.style.display = "flex";
    progressContainer.style.zIndex = "9999";
    if (!checkButton) {
        const downloadDiv = document.querySelector("body > div.init.init--with-nav-bar > div.init__container > div.init__body > main > div.path-layout.path-body > div.path-layout__container.layout-container.layout-container--size-large.layout-container--align-center.layout-container--margin-wide > div.path-layout__header._container_iq15dg._lined_1aegh9 > div.path-layout__header-body > div.path-layout__header-sidebar");
        const addedDiv = document.createElement("div");
        const button = document.createElement('button');
        const message = document.createElement("div");
        addedDiv.style.display = "grid";
        addedDiv.style.placeItems = "center";
        message.id = "message";
        message.style.visibility = "hidden";
        message.className = "lls-card-released-on _bodyText_1e5nen _default_1i6ulk _sizeSmall_1e5nen _lowEmphasis_1i6ulk"
        button.id = 'custom-download-btn';
        button.innerText = 'Download Certificate';
        button.style.marginTop = '10px';
        button.className = 'ember-view _button_ps32ck _small_ps32ck _tertiary_ps32ck _emphasized_ps32ck _left_ps32ck _container_iq15dg _flat_1aegh9';
        button.style.width = '-webkit-fill-available'
        button.onclick = Download;
        const completedTrophy = document.querySelector("body > div.init.init--with-nav-bar > div.init__container > div.init__body > main > div.path-layout.path-body > div.path-layout__container.layout-container.layout-container--size-large.layout-container--align-center.layout-container--margin-wide > div.path-layout__header._container_iq15dg._lined_1aegh9 > div.path-layout__header-body > div.path-layout__header-sidebar > div > div");
        if (completedTrophy) {
            downloadDiv.appendChild(addedDiv);
            addedDiv.appendChild(button);
            addedDiv.appendChild(progressContainer);
            addedDiv.appendChild(message);
        }
    }
    observe();
}
function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
const observer = new MutationObserver(addDownload);
function observe() {
    observer.observe(document, {
        subtree: true,
        childList: true,
    });
}
observe();