/// <reference types="chrome"/>

chrome.runtime.onInstalled.addListener(() => {
    console.log("Decentralized Password Manager Extension Installed");
});

// Listener for messages from the popup/frontend
chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (message.type === 'PING') {
        sendResponse({ status: 'PONG' });
    }
});
