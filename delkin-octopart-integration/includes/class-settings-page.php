<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Delkin_Octopart_Settings {

    private $option_group = 'delkin_octopart_settings_group';

    public function init() {
        add_action( 'admin_menu', array( $this, 'add_settings_page' ) );
        add_action( 'admin_init', array( $this, 'register_settings' ) );
        add_action( 'wp_ajax_delkin_test_nexar_api', array( $this, 'ajax_test_connection' ) );
    }

    public function add_settings_page() {
        add_options_page(
            'Octopart (Nexar) Integration Settings',
            'Octopart API',
            'manage_options', // Only admins can access
            'delkin-octopart',
            array( $this, 'render_settings_page' )
        );
    }

    public function register_settings() {
        // Register API Keys
        register_setting( $this->option_group, 'nexar_client_id', 'sanitize_text_field' );
        register_setting( $this->option_group, 'nexar_client_secret', 'sanitize_text_field' );

        // Register Cache Duration (cast to integer for security)
        register_setting( $this->option_group, 'nexar_cache_hours', 'absint' );

        // Register Approved Sellers (as an array)
        register_setting( $this->option_group, 'nexar_approved_sellers', array(
            'type'              => 'array',
            'sanitize_callback' => array( $this, 'sanitize_approved_sellers' ),
            'default'           => array( 'Arrow Electronics', 'DigiKey', 'Farnell', 'Mouser' ),
        ) );

        add_settings_section(
            'nexar_api_section',
            'API Credentials',
            array( $this, 'render_api_section_info' ),
            'delkin-octopart'
        );

        add_settings_field(
            'nexar_client_id',
            'Client ID',
            array( $this, 'render_client_id_field' ),
            'delkin-octopart',
            'nexar_api_section'
        );

        add_settings_field(
            'nexar_client_secret',
            'Client Secret',
            array( $this, 'render_client_secret_field' ),
            'delkin-octopart',
            'nexar_api_section'
        );

        add_settings_section(
            'nexar_general_section',
            'General Configuration',
            null,
            'delkin-octopart'
        );

        add_settings_field(
            'nexar_cache_hours',
            'Cache Duration (Hours)',
            array( $this, 'render_cache_hours_field' ),
            'delkin-octopart',
            'nexar_general_section'
        );

        add_settings_field(
            'nexar_approved_sellers',
            'Available Sellers',
            array( $this, 'render_approved_sellers_field' ),
            'delkin-octopart',
            'nexar_general_section'
        );
    }

    public function render_api_section_info() {
        echo '<p>Enter your Nexar API credentials below. You can generate these by creating an application in the <a href="https://nexar.com/developer" target="_blank" rel="noopener noreferrer">Nexar Developer Portal</a>.</p>';
        echo '<button type="button" id="delkin-test-api-btn" class="button button-secondary">Test API Connection</button>';
        echo '<span id="delkin-test-api-result" style="margin-left: 10px; vertical-align: middle;"></span>';
    }

    public function render_client_id_field() {
        $value = get_option( 'nexar_client_id', '' );
        echo '<input type="text" name="nexar_client_id" value="' . esc_attr( $value ) . '" class="regular-text" required>';
    }

    public function render_client_secret_field() {
        $value = get_option( 'nexar_client_secret', '' );
        // Use type="password" to obscure the secret on the screen
        echo '<input type="password" name="nexar_client_secret" value="' . esc_attr( $value ) . '" class="regular-text" required>';
    }

    public function render_cache_hours_field() {
        $value = get_option( 'nexar_cache_hours', 2 ); // Default 2 hours
        echo '<input type="number" name="nexar_cache_hours" value="' . esc_attr( $value ) . '" class="small-text" min="1" max="48">';
        echo '<p class="description">How long should distributor stock data be saved before asking the API again? (Recommended: 2 to 4 hours). This drastically speeds up load times and prevents API rate-limiting.</p>';
    }

    public function sanitize_approved_sellers( $input ) {
        if ( ! is_array( $input ) ) {
            return array();
        }
        return array_map( 'sanitize_text_field', $input );
    }

    public function render_approved_sellers_field() {
        $selected_sellers = get_option( 'nexar_approved_sellers', array( 'Arrow Electronics', 'DigiKey', 'Farnell', 'Mouser' ) );
        if ( ! is_array( $selected_sellers ) ) {
            $selected_sellers = array();
        }

        $api = new Delkin_Nexar_API();
        $all_sellers = $api->get_all_sellers();

        if ( is_wp_error( $all_sellers ) ) {
            echo '<p class="description" style="color: #d63638;">' . esc_html( $all_sellers->get_error_message() ) . ' Please ensure API credentials are correct to load the seller list.</p>';
            echo '<input type="text" name="nexar_approved_sellers" value="' . esc_attr( implode( ', ', $selected_sellers ) ) . '" class="regular-text">';
            return;
        }

        // Hidden select for actual form submission
        echo '<select id="nexar-approved-sellers-hidden" name="nexar_approved_sellers[]" multiple style="display:none;">';
        foreach ( $selected_sellers as $seller ) {
            echo '<option value="' . esc_attr( $seller ) . '" selected>' . esc_html( $seller ) . '</option>';
        }
        echo '</select>';

        echo '<div class="delkin-seller-selection-container">';

        // Selected Sellers Box
        echo '<div class="delkin-seller-box-wrapper">';
        echo '<strong>Selected Approved Sellers</strong>';
        echo '<div id="delkin-selected-sellers" class="delkin-seller-box">';
        foreach ( $selected_sellers as $seller ) {
            echo '<div class="delkin-seller-item" data-value="' . esc_attr( $seller ) . '"><span class="delkin-remove-seller">×</span>' . esc_html( $seller ) . '</div>';
        }
        echo '</div>';
        echo '</div>';

        // Available Sellers Box
        echo '<div class="delkin-seller-box-wrapper">';
        echo '<strong>Available Sellers</strong>';
        echo '<div id="delkin-available-sellers" class="delkin-seller-box">';
        foreach ( $all_sellers as $seller ) {
            if ( ! in_array( $seller, $selected_sellers ) ) {
                echo '<div class="delkin-seller-item" data-value="' . esc_attr( $seller ) . '">' . esc_html( $seller ) . '</div>';
            }
        }
        echo '</div>';
        echo '</div>';

        echo '</div>'; // end container
        echo '<p class="description">Click an available seller to add it. Click the × to remove a selected seller.</p>';
    }

    public function ajax_test_connection() {
        check_ajax_referer( 'delkin_octopart_admin_nonce', 'nonce' );

        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( array( 'message' => 'Unauthorized' ) );
        }

        $api = new Delkin_Nexar_API();
        $is_connected = $api->test_connection();

        if ( $is_connected ) {
            // Also clear the sellers transient to force a refresh if they just added keys
            delete_transient( 'nexar_all_sellers' );
            wp_send_json_success( array( 'message' => 'Connection successful!' ) );
        } else {
            wp_send_json_error( array( 'message' => 'Connection failed. Please check your Client ID and Secret.' ) );
        }
    }

    public function render_settings_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }
        ?>
        <div class="wrap">
            <h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
            <p>This plugin connects your WooCommerce products to the Octopart supply chain network.</p>
            <form action="options.php" method="post">
                <?php
                settings_fields( $this->option_group );
                do_settings_sections( 'delkin-octopart' );
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }
}
