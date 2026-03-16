document.addEventListener('DOMContentLoaded', () => {
    let currentSku = '';

    // 1. Listen for clicks on the Buy Now button to capture the SKU
    // We use event delegation on the body so it works with Elementor's dynamic content
    document.body.addEventListener('click', (e) => {
        const triggerBtn = e.target.closest('.trigger-octopart-modal');
        if (triggerBtn) {
            currentSku = triggerBtn.getAttribute('data-sku');
        }
    });

    // 2. Listen for the Elementor popup to open
    // Elementor uses jQuery heavily, so we tap into their native popup event
    if (typeof jQuery !== 'undefined') {
        jQuery(document).on('elementor/popup/show', (event, id, instance) => {
            const container = document.getElementById('octopart-table-container');

            // If the container isn't in this specific popup, or we don't have a SKU, do nothing
            if (!container || !currentSku) return;

            // 3. Show a loading state inside the modal
            container.innerHTML = '<div style="text-align:center; padding: 20px;">Fetching live stock data...</div>';

            // 4. Fetch the data from our custom WordPress REST API
            const apiUrl = `${delkinOctopartData.root}delkin/v1/stock/${currentSku}`;
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
                    // Handle empty data (no distributors found)
                    if (!data || data.length === 0) {
                        container.innerHTML = '<p>No distributors found for this part number.</p>';
                        return;
                    }

                    // 5. Build the HTML Table
                    let tableHTML = `
                        <table class="octopart-stock-table" style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr style="background: #e9e9e9; border-bottom: 1px solid #ddd;">
                                    <th style="padding: 10px;">Distributor</th>
                                    <th style="padding: 10px;">Stock</th>
                                    <th style="padding: 10px;"></th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    data.forEach(item => {
                        const stockText = item.stock > 0 ? item.stock : '0';

                        // Disable the button if stock is 0
                        const buyButton = item.stock > 0
                            ? `<a href="${item.url}" target="_blank" class="octo-buy-btn" style="display:inline-block; padding:8px 16px; background:#0056b3; color:#fff; text-decoration:none; border-radius:4px;">Buy</a>`
                            : `<button disabled class="octo-buy-btn disabled" style="padding:8px 16px; background:#ccc; color:#666; border:none; border-radius:4px; cursor:not-allowed;">Buy</button>`;

                        // Escape values to prevent XSS
                        const distributorEscaped = document.createElement('div');
                        distributorEscaped.textContent = item.distributor;

                        tableHTML += `
                            <tr style="border-bottom: 1px solid #ddd;">
                                <td style="padding: 10px;">${distributorEscaped.innerHTML}</td>
                                <td style="padding: 10px;">${stockText}</td>
                                <td style="padding: 10px; text-align: right;">${buyButton}</td>
                            </tr>
                        `;
                    });

                    tableHTML += `</tbody></table>`;

                    // Add the "Powered by" footer from the design
                    tableHTML += `
                        <div style="margin-top: 15px; font-size: 11px; color: #777;">
                            Powered by <strong>Nexar</strong>
                        </div>
                    `;

                    // 6. Inject the table into the Elementor modal
                    container.innerHTML = tableHTML;
                })
                .catch(error => {
                    console.error('Error fetching Octopart data:', error);
                    container.innerHTML = '<p>Error loading stock data. Please try again later.</p>';
                });
        });
    }
});
