(function() {
    const init = () => {
        const modal = document.getElementById('delkin-octopart-modal');
        const modalBody = document.getElementById('delkin-modal-body');
        const closeBtn = document.querySelector('.delkin-modal-close');

        if (typeof delkinOctopartData === 'undefined') {
            console.warn('Delkin Octopart Integration: Localized data missing.');
            return;
        }

        const skuRegex = /\b([a-z0-9]{2,}(?:[-−–—][a-z0-9]{2,})*(?:[-−–—][a-z0-9]+))\b/gi;
        const skipTags = ['A', 'BUTTON', 'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT'];

        function isProtected(element) {
            if (!element || element.nodeType !== 1) return true;
            if (skipTags.includes(element.tagName)) return true;
            if (element.closest('.delkin-sku-link, #delkin-octopart-modal, .delkin-buy-now-btn')) return true;
            return false;
        }

        function linkifySkus(rootNode) {
            if (!rootNode) return;

            const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
                acceptNode: (node) => {
                    if (isProtected(node.parentElement)) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            });

            const nodesToProcess = [];
            let currentNode;
            while (currentNode = walker.nextNode()) {
                // Quick check to avoid regex state issues in the loop
                if (/[a-z0-9]{2,}[-−–—][a-z0-9]{2,}[-−–—][a-z0-9]+/i.test(currentNode.nodeValue)) {
                    nodesToProcess.push(currentNode);
                }
            }

            nodesToProcess.forEach(node => {
                const parent = node.parentNode;
                if (!parent) return;

                const text = node.nodeValue;
                const fragment = document.createDocumentFragment();

                // Reset regex state for each node
                skuRegex.lastIndex = 0;
                const parts = text.split(skuRegex);

                let hasMatches = false;
                for (let i = 0; i < parts.length; i++) {
                    if (i % 2 === 1) { // Captured group match
                        hasMatches = true;
                        const span = document.createElement('span');
                        span.className = 'delkin-sku-link';
                        span.setAttribute('data-sku', parts[i].toUpperCase().trim());
                        span.textContent = parts[i];
                        fragment.appendChild(span);
                    } else if (parts[i]) {
                        fragment.appendChild(document.createTextNode(parts[i]));
                    }
                }

                if (hasMatches) {
                    parent.replaceChild(fragment, node);
                }
            });
        }

        // 1. Linkify SKUs in plain text if enabled
        if (delkinOctopartData.skuLinking) {
            console.log('Delkin SKU Linking: Enabled');

            // Initial run and delayed runs for slow-loading widgets
            linkifySkus(document.body);
            setTimeout(() => linkifySkus(document.body), 1000);
            setTimeout(() => linkifySkus(document.body), 3000);

            // MutationObserver for dynamic content
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1) {
                                if (!isProtected(node)) linkifySkus(node);
                            } else if (node.nodeType === 3) {
                                if (!isProtected(node.parentElement)) linkifySkus(node.parentElement);
                            }
                        });
                    } else if (mutation.type === 'characterData') {
                        const parent = mutation.target.parentElement;
                        if (parent && !isProtected(parent)) linkifySkus(parent);
                    }
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }

        // Handle button click (and SKU link clicks)
        document.addEventListener('click', (e) => {
            const triggerBtn = e.target.closest('.delkin-buy-now-btn, .delkin-sku-link');
            if (triggerBtn) {
                const sku = triggerBtn.getAttribute('data-sku');
                if (sku) {
                    const displayMode = delkinOctopartData.displayMode || 'overlay';

                    // Linkified SKUs always use overlay modal to avoid layout breaking in tables
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
                        if (columns.includes('packaging'))   tableHTML += `<td>${item.packaging}</td>`;
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
