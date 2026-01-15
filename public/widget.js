(function () {
    // Get the script tag that loaded this file
    // Get the script tag that loaded this file
    var currentScript = document.currentScript;

    // Fallback for older browsers or async processing
    if (!currentScript) {
        var scripts = document.getElementsByTagName('script');
        currentScript = scripts[scripts.length - 1];
    }
    var chatbotId = currentScript.getAttribute('data-id');

    if (!chatbotId) {
        console.error('OneMinute Support Widget: data-id attribute is required');
        return;
    }

    // Get the base URL from the script src
    var scriptSrc = currentScript.src;
    // Handles scenarios where script is at root or subdirectory. 
    // If src is "https://example.com/widget.js", baseUrl is "https://example.com"
    var baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));

    // Create iframe container
    var container = document.createElement('div');
    container.id = 'oneminute-widget-container';
    container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 999999; width: 80px; height: 80px; transition: width 0.3s ease, height 0.3s ease, bottom 0.3s ease, right 0.3s ease; background-color: transparent;';

    // Create iframe
    var iframe = document.createElement('iframe');
    iframe.src = baseUrl + '/widget/' + chatbotId;
    iframe.style.cssText = 'border: none; width: 100%; height: 100%; pointer-events: auto; border-radius: 16px; background-color: transparent;';
    iframe.setAttribute('allow', 'clipboard-write');

    container.appendChild(iframe);

    // Handle Resize Messages
    window.addEventListener('message', function (event) {
        if (event.data && event.data.type === 'oneminute-widget-resize') {
            if (event.data.isOpen) {
                // Open State
                if (window.innerWidth < 480) {
                    // Mobile: Full screen
                    container.style.width = '100vw';
                    container.style.height = '100vh';
                    container.style.bottom = '0';
                    container.style.right = '0';
                    iframe.style.borderRadius = '0';
                } else {
                    // Desktop: Widget size + padding
                    container.style.width = '420px'; // Slightly larger to avoid scrollbars
                    container.style.height = '680px';
                    container.style.bottom = '20px';
                    container.style.right = '20px';
                    iframe.style.borderRadius = '16px';
                }
            } else {
                // Closed State (Button only)
                container.style.width = '80px';
                container.style.height = '80px';
                container.style.bottom = '20px';
                container.style.right = '20px';
                iframe.style.borderRadius = '50%'; // Rounded for button area
            }
        }
    });

    // Inject into page when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            document.body.appendChild(container);
        });
    } else {
        document.body.appendChild(container);
    }
})();
