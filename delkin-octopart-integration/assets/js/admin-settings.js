jQuery(document).ready(function($) {
    $('#delkin-test-api-btn').on('click', function() {
        const $btn = $(this);
        const $result = $('#delkin-test-api-result');

        $btn.prop('disabled', true);
        $result.text('Testing...').css('color', '#666');

        $.post(ajaxurl, {
            action: 'delkin_test_nexar_api',
            nonce: delkinOctopartAdmin.nonce
        }, function(response) {
            if (response.success) {
                $result.text(response.data.message).css('color', '#46b450');
                // Reload after a delay to refresh the sellers dropdown
                setTimeout(() => {
                    location.reload();
                }, 2000);
            } else {
                $result.text(response.data.message).css('color', '#d63638');
                $btn.prop('disabled', false);
            }
        });
    });

    // Handle adding sellers from available to selected
    $(document).on('click', '#delkin-available-sellers .delkin-seller-item', function() {
        const $item = $(this);
        const value = $item.attr('data-value');
        const name = $item.contents().filter(function() {
            return this.nodeType === 3;
        }).text().trim();

        // Add to selected box
        $('#delkin-selected-sellers').append(
            `<div class="delkin-seller-item" data-value="${value}"><span class="delkin-remove-seller">×</span> ${name}</div>`
        );

        // Add to hidden select
        $('#nexar-approved-sellers-hidden').append(
            `<option value="${value}" selected>${name}</option>`
        );

        // Remove from available box
        $item.remove();
    });

    // Handle removing sellers from selected back to available
    $(document).on('click', '#delkin-selected-sellers .delkin-remove-seller', function(e) {
        e.stopPropagation();
        const $item = $(this).closest('.delkin-seller-item');
        const value = $item.attr('data-value');
        const name = $item.contents().filter(function() {
            return this.nodeType === 3;
        }).text().trim();

        // Add back to available box
        $('#delkin-available-sellers').append(
            `<div class="delkin-seller-item" data-value="${value}">${name}</div>`
        );

        // Remove from hidden select
        $(`#nexar-approved-sellers-hidden option[value="${value}"]`).remove();

        // Remove from selected box
        $item.remove();

        // Sort available sellers list alphabetically
        const $available = $('#delkin-available-sellers');
        const $items = $available.children('.delkin-seller-item').get();
        $items.sort(function(a, b) {
            return $(a).text().toUpperCase().localeCompare($(b).text().toUpperCase());
        });
        $.each($items, function(i, itm) {
            $available.append(itm);
        });
    });
});
