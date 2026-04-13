(function() {
    const init = () => {
        const modal = document.getElementById('delkin-octopart-modal');
        const modalBody = document.getElementById('delkin-modal-body');
        const closeBtn = document.querySelector('.delkin-modal-close');

        if (typeof delkinOctopartData === 'undefined') {
            console.warn('Delkin Octopart Integration: Localized data missing.');
            return;
        }

        // 1. Linkify SKUs in plain text if enabled
        if (delkinOctopartData.skuLinking) {
            linkifySkus(document.body);

            // Set up an observer to linkify dynamically loaded content (e.g. AJAX tabs, lazy loading)
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            // Don't re-process the modal or its content
                            if (node.id === 'delkin-octopart-modal' || node.closest('#delkin-octopart-modal')) return;
                            linkifySkus(node);
                        }
                    });
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        // Handle button click (and SKU link clicks)
        document.addEventListener('click', (e) => {
            const triggerBtn = e.target.closest('.delkin-buy-now-btn, .delkin-sku-link');
            if (triggerBtn) {
                const sku = triggerBtn.getAttribute('data-sku');
                if (sku) {
                    const displayMode = delkinOctopartData.displayMode || 'overlay';
                    const forceModal = triggerBtn.classList.contains('delkin-sku-link');

                    if (displayMode === 'inline' && !forceModal) {
                        const sanitizedSku = sku.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                        const inlineContainer = document.getElementById(`delkin-inline-results-${sanitizedSku}`);
                        if (inlineContainer) {
                            openResults(sku, inlineContainer);
                        } else {
                            const container = triggerBtn.nextElementSibling;
                            if (container && container.classList.contains('delkin-inline-results')) {
                                openResults(sku, container);
                            }
                        }
                    } else {
                        if (modal && modalBody) {
                            openResults(sku, modalBody, modal);
                        }
                    }
                }
            }
        });

        // Close modal
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.style.setProperty('display', 'none', 'important');
            };
        }

        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.setProperty('display', 'none', 'important');
            }
        };

        // Handle close for inline results
        document.addEventListener('click', (e) => {
            if (e.target.closest('.delkin-inline-close')) {
                const container = e.target.closest('.delkin-inline-results');
                if (container) {
                    container.style.setProperty('display', 'none', 'important');
                }
            }
        });

        function linkifySkus(rootNode) {
            // Updated Regex: Handles common SKU patterns like SE12TLKFX-1D000-3 or SE32TRDMH-U1000-D
            // Matches: alphanumeric (3+), dash, alphanumeric (3+), dash, alphanumeric (1+)
            const skuRegex = /\b([A-Z0-9]{3,}-[A-Z0-9]{3,}-[A-Z0-9]{1,})\b/g;
            const skipTags = ['A', 'BUTTON', 'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT'];

            // Fast check for text nodes containing something like a SKU
            const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
                acceptNode: (node) => {
                    if (skipTags.includes(node.parentElement.tagName)) return NodeFilter.FILTER_REJECT;
                    if (node.parentElement.classList.contains('delkin-sku-link')) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            });

            const nodesToProcess = [];
            let currentNode;
            while (currentNode = walker.nextNode()) {
                if (skuRegex.test(currentNode.nodeValue)) {
                    nodesToProcess.push(currentNode);
                }
                skuRegex.lastIndex = 0; // reset regex
            }

            nodesToProcess.forEach(node => {
                const parent = node.parentNode;
                if (!parent) return;

                const parts = node.nodeValue.split(skuRegex);
                const fragment = document.createDocumentFragment();

                parts.forEach((part, i) => {
                    if (i % 2 === 1) { // This is a SKU match
                        const span = document.createElement('span');
                        span.className = 'delkin-sku-link';
                        span.setAttribute('data-sku', part);
                        span.textContent = part;
                        fragment.appendChild(span);
                    } else {
                        if (part) fragment.appendChild(document.createTextNode(part));
                    }
                });

                parent.replaceChild(fragment, node);
            });
        }

        function openResults(sku, container, modalElement = null) {
            if (modalElement) {
                modalElement.style.setProperty('display', 'block', 'important');
            } else {
                container.style.setProperty('display', 'block', 'important');
            }

            container.innerHTML = '<div style="text-align:center; padding: 20px;">Fetching live stock data...</div>';

            const apiUrl = `${delkinOctopartData.root}delkin/v1/stock/${sku}`;
            fetch(apiUrl, {
                headers: {
                    'X-WP-Nonce': delkinOctopartData.nonce
                }
            })
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.json();
                })
                .then(data => {
                    if (!data || !Array.isArray(data) || data.length === 0) {
                        container.innerHTML = '<p style="padding: 20px; text-align: center;">No distributors found for this part number.</p>';
                        return;
                    }

                    const columns = (Array.isArray(delkinOctopartData.columns) && delkinOctopartData.columns.length > 0)
                                    ? delkinOctopartData.columns
                                    : ['distributor', 'mpn', 'packaging', 'stock'];

                    const styling = delkinOctopartData.styling || {};
                    const modalTitle = styling.modalTitle || 'Delkin Authorized Distributors';
                    const btnBgColor = styling.btnBgColor || '#02549c';
                    const btnTextColor = styling.btnColor || '#ffffff';
                    const isInline = !modalElement;

                    let tableHTML = '';
                    if (isInline) {
                        tableHTML += `<span class="delkin-inline-close">&times;</span>`;
                    }

                    tableHTML += `
                        <div class="delkin-results-header">
                            <h3>${modalTitle}</h3>
                            <p>Device: <span style="color: #02549c; font-weight: bold;">${sku}</span></p>
                        </div>
                        <div class="delkin-table-wrapper">
                            <table class="octopart-stock-table">
                                <thead>
                                    <tr>
                    `;

                    if (columns.includes('distributor')) tableHTML += '<th>Distributor</th>';
                    if (columns.includes('mpn'))         tableHTML += '<th>Part Number</th>';
                    if (columns.includes('packaging'))   tableHTML += '<th>Packaging</th>';
                    if (columns.includes('stock'))       tableHTML += '<th>Stock</th>';
                    tableHTML += '<th></th>';

                    tableHTML += `
                                    </tr>
                                </thead>
                                <tbody>
                    `;

                    data.forEach(item => {
                        const stockVal = (typeof item.stock !== 'undefined' && item.stock !== null) ? item.stock : 0;
                        const stockText = stockVal > 0 ? stockVal : '0';
                        const url = item.url || '#';
                        const distributor = item.distributor || 'Unknown';
                        const mpn = item.mpn || 'N/A';
                        const packaging = item.packaging || 'N/A';

                        const buyButton = stockVal > 0
                            ? `<a href="${url}" target="_blank" class="octo-buy-btn" style="background-color: ${btnBgColor}; color: ${btnTextColor};">Buy</a>`
                            : `<button disabled class="octo-buy-btn disabled">Buy</button>`;

                        const distributorEscaped = document.createElement('div');
                        distributorEscaped.textContent = distributor;

                        tableHTML += `<tr>`;
                        if (columns.includes('distributor')) tableHTML += `<td>${distributorEscaped.innerHTML}</td>`;
                        if (columns.includes('mpn'))         tableHTML += `<td>${mpn}</td>`;
                        if (columns.includes('packaging'))   tableHTML += `<td>${packaging}</td>`;
                        if (columns.includes('stock'))       tableHTML += `<td>${stockText}</td>`;
                        tableHTML += `<td style="text-align: right;">${buyButton}</td>`;
                        tableHTML += `</tr>`;
                    });

                    tableHTML += `</tbody></table></div>`;
                    container.innerHTML = tableHTML;
                })
                .catch(error => {
                    console.error('Error fetching Octopart data:', error);
                    container.innerHTML = '<p style="padding: 20px; text-align: center;">Error loading stock data. Please try again later.</p>';
                });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
