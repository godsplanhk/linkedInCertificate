import { saveXHRRequest, fetchAndMergePdf } from "./utils.js";
let learningPath = null;
let sections = null;
let fetchOptions = null;
const items = [];
let downloadable = [];
let certRequest;
let requestToReplicate = null;
let isDownloaded = false;
const regex = /urn:li:lyndaCourse:(\d+)/;

chrome.webRequest.onBeforeSendHeaders.addListener(
    async (details) => {
        if (details.url.includes("https://www.linkedin.com/learning-api/detailedLearningPaths") && details.initiator.includes("https://www.linkedin.com")) {
            const interceptedXHRRequests = saveXHRRequest(details);
            // Perform fetch request
            fetchOptions = interceptedXHRRequests[1];
            const request = interceptedXHRRequests[0];
            fetch(request.url, fetchOptions)
                .then(response => response.json())
                .then(data => {
                    console.log("Fetch request response:", data);
                    // Optionally send the fetched data back to the popup
                    sections = data.data.elements[0].sections;
                    downloadable = [];
                    for (const x of sections) {
                        for (const y of x.items) {
                            const content = y["*content"];
                            let splitContent = content.split(":");
                            console.log(splitContent);
                            if (splitContent[splitContent.length - 2] === "lyndaCourse" && splitContent[splitContent.length - 4] != "(urn") {
                                console.log(splitContent);
                                downloadable.push(splitContent[splitContent.length - 1]);
                            }
                        }
                    }
                })
                .catch(error => {
                    console.error("Fetch request error:", error);
                });
        }
        if (details.url.includes("https://www.linkedin.com/learning-api/contentCertificate?") && details.initiator.includes("https://www.linkedin.com")) {
            certRequest = saveXHRRequest(details);
        }
    },

    {
        urls: ["*://www.linkedin.com/learning-api/detailedLearningPaths*", "*://www.linkedin.com/learning-api/contentCertificate*"],
        types: ["xmlhttprequest"]
    },
    ["requestHeaders", "extraHeaders"]
);

const fetchAndMergeWrapper = async (sendResponse, data) => {
    const mergedPdfArray = await fetchAndMergePdf(data);
    console.log("finished merging ...", mergedPdfArray);
    sendResponse(mergedPdfArray);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getDownloadable") {
        sendResponse({ downloadable: downloadable, fetchOptions: fetchOptions })
    }
    else if (message.type === "getFetchOptions") {
        sendResponse(fetchOptions);
    }
    else if (message.type === "fetchAndMerge") {
        fetchAndMergeWrapper(sendResponse, message.data);
    }
    return true;
});