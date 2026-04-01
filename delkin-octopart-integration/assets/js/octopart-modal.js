document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('delkin-octopart-modal');
    const modalBody = document.getElementById('delkin-modal-body');
    const closeBtn = document.querySelector('.delkin-modal-close');

    if (!modal || !modalBody || !closeBtn) return;

    // Handle button click
    document.addEventListener('click', (e) => {
        const triggerBtn = e.target.closest('.delkin-buy-now-btn');
        if (triggerBtn) {
            const sku = triggerBtn.getAttribute('data-sku');
            if (sku) {
                openModal(sku);
            }
        }
    });

    // Close modal
    closeBtn.onclick = () => {
        modal.style.display = "none";
    };

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };

    function openModal(sku) {
        modal.style.display = "block";
        modalBody.innerHTML = '<div style="text-align:center; padding: 20px;">Fetching live stock data...</div>';

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
                if (!data || data.length === 0) {
                    modalBody.innerHTML = '<p>No distributors found for this part number.</p>';
                    return;
                }

                const columns = delkinOctopartData.columns; // array e.g. ['distributor', 'mpn', 'packaging', 'stock']

                let tableHTML = `
                    <div class="delkin-modal-header">
                        <h3>Silicon Labs Authorized Distributors</h3>
                        <p>Device: <span style="color: #02549c; font-weight: bold;">${sku}</span></p>
                    </div>
                    <table class="octopart-stock-table" style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr style="background: #e9e9e9; border-bottom: 1px solid #ddd;">
                `;

                // Add Table Headers based on settings
                if (columns.includes('distributor')) tableHTML += '<th style="padding: 10px;">Distributor</th>';
                if (columns.includes('mpn'))         tableHTML += '<th style="padding: 10px;">Part Number</th>';
                if (columns.includes('packaging'))   tableHTML += '<th style="padding: 10px;">Packaging</th>';
                if (columns.includes('stock'))       tableHTML += '<th style="padding: 10px;">Stock</th>';
                tableHTML += '<th style="padding: 10px;"></th>'; // Buy button column

                tableHTML += `
                            </tr>
                        </thead>
                        <tbody>
                `;

                data.forEach(item => {
                    const stockText = item.stock > 0 ? item.stock : '0';
                    const buyButton = item.stock > 0
                        ? `<a href="${item.url}" target="_blank" class="octo-buy-btn" style="display:inline-block; padding:8px 16px; background:#02549c; color:#fff; text-decoration:none; border-radius:4px;">Buy</a>`
                        : `<button disabled class="octo-buy-btn disabled" style="padding:8px 16px; background:#ccc; color:#666; border:none; border-radius:4px; cursor:not-allowed;">Buy</button>`;

                    // Escape distributor for safety
                    const distributorEscaped = document.createElement('div');
                    distributorEscaped.textContent = item.distributor;

                    tableHTML += `<tr style="border-bottom: 1px solid #ddd;">`;
                    if (columns.includes('distributor')) tableHTML += `<td style="padding: 10px;">${distributorEscaped.innerHTML}</td>`;
                    if (columns.includes('mpn'))         tableHTML += `<td style="padding: 10px;">${item.mpn}</td>`;
                    if (columns.includes('packaging'))   tableHTML += `<td style="padding: 10px;">${item.packaging}</td>`;
                    if (columns.includes('stock'))       tableHTML += `<td style="padding: 10px;">${stockText}</td>`;
                    tableHTML += `<td style="padding: 10px; text-align: right;">${buyButton}</td>`;
                    tableHTML += `</tr>`;
                });

                tableHTML += `</tbody></table>`;
                modalBody.innerHTML = tableHTML;
            })
            .catch(error => {
                console.error('Error fetching Octopart data:', error);
                modalBody.innerHTML = '<p>Error loading stock data. Please try again later.</p>';
            });
    }
});
