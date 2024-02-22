function removeElements() {
    const elements = document.querySelectorAll('ytd-rich-section-renderer');
    const elements1 = document.querySelectorAll('ytd-reel-shelf-renderer');
    elements.forEach(element => element.remove());
    elements1.forEach(element => element.remove());
    console.log('Removed Shorts')
}
  
removeElements();

const observer = new MutationObserver(removeElements);
observer.observe(document.body, { childList: true, subtree: true });
  