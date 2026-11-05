function removeTargetElement() {
    document.querySelectorAll('span').forEach(span => {
        if (span.textContent.includes('Suggested for you')) {
            let ancestor = span.parentElement;
            // Keep traversing up until a div with the specific class is found or the root is reached
            while (ancestor && !ancestor.matches('div.x1lliihq')) {
                ancestor = ancestor.parentElement;
            }
            // If the correct div is found, remove it
            if (ancestor && ancestor.matches('div.x1lliihq')) {
                ancestor.remove();
                console.log('Removed suggested for you' + ancestor);
            }
        }
    });

    document.querySelectorAll('span').forEach(span => {
        if (span.textContent.includes('Follow')) {
            let ancestor = span.parentElement;
            // Keep traversing up until a div with the specific class is found or the root is reached
            while (ancestor && !ancestor.matches('div.x1lliihq')) {
                ancestor = ancestor.parentElement;
            }
            // If the correct div is found, remove it
            if (ancestor && ancestor.matches('div.x1lliihq')) {
                ancestor.remove();
                console.log('Removed suggested for you' + ancestor);
            }
        }
    });
}

removeTargetElement();

const observer = new MutationObserver((mutations) => {
    removeTargetElement();
});

// Start observing the document body for child list changes or subtree modifications
observer.observe(document.body, {
    childList: true,
    subtree: true
});