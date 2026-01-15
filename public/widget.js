(function () {
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
    var baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));

    // Create iframe container - minimal styling, no background
    var container = document.createElement('div');
    container.id = 'oneminute-widget-container';
    container.style.cssText = 'position: fixed; bottom: 0; right: 0; z-index: 2147483647; width: 0; height: 0; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); pointer-events: none; overflow: visible;';

    // Create iframe
    var iframe = document.createElement('iframe');
    iframe.src = baseUrl + '/widget/' + chatbotId;
    iframe.style.cssText = 'border: none; width: 100%; height: 100%; pointer-events: auto; background: transparent; display: block;';
    iframe.setAttribute('allow', 'clipboard-write');

    container.appendChild(iframe);

    // Handle Resize Messages
    window.addEventListener('message', function (event) {
        if (event.data && event.data.type === 'oneminute-widget-resize') {
            if (event.data.isOpen) {
                // Open State
                if (window.innerWidth <= 768) {
                    // Mobile: Full screen bottom sheet
                    container.style.width = '100vw';
                    container.style.height = '100vh';
                    container.style.bottom = '0';
                    container.style.right = '0';
                    container.style.left = '0';
                } else {
                    // Desktop: Widget size
                    container.style.width = '400px';
                    container.style.height = '680px';
                    container.style.bottom = '24px';
                    container.style.right = '24px';
                    container.style.left = 'auto';
                }
            } else {
                // Closed State (Button only)
                container.style.width = '80px';
                container.style.height = '80px';
                container.style.bottom = '20px';
                container.style.right = '20px';
                container.style.left = 'auto';
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
