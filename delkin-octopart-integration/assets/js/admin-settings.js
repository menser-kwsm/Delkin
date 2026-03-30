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
});
