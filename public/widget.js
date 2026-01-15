(function () {
    // Get the script tag that loaded this file
    var scripts = document.getElementsByTagName('script');
    var currentScript = scripts[scripts.length - 1];
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
    container.style.cssText = 'position: fixed; bottom: 0; right: 0; z-index: 999999; pointer-events: none;';

    // Create iframe
    var iframe = document.createElement('iframe');
    iframe.src = baseUrl + '/widget/' + chatbotId;
    iframe.style.cssText = 'border: none; width: 100vw; height: 100vh; pointer-events: auto;';
    iframe.setAttribute('allow', 'clipboard-write');

    container.appendChild(iframe);

    // Inject into page when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            document.body.appendChild(container);
        });
    } else {
        document.body.appendChild(container);
    }
})();
