<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Delkin_Octopart_Settings {

    private $option_group = 'delkin_octopart_settings_group';

    public function init() {
        add_action( 'admin_menu', array( $this, 'add_settings_page' ) );
        add_action( 'admin_init', array( $this, 'register_settings' ) );
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

        // Register Approved Sellers
        register_setting( $this->option_group, 'nexar_approved_sellers', 'sanitize_text_field' );

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
            'Approved Sellers',
            array( $this, 'render_approved_sellers_field' ),
            'delkin-octopart',
            'nexar_general_section'
        );
    }

    public function render_api_section_info() {
        echo '<p>Enter your Nexar API credentials below. You can generate these by creating an application in the <a href="https://nexar.com/developer" target="_blank" rel="noopener noreferrer">Nexar Developer Portal</a>.</p>';
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

    public function render_approved_sellers_field() {
        $value = get_option( 'nexar_approved_sellers', 'Arrow Electronics, DigiKey, Farnell, Mouser' );
        echo '<input type="text" name="nexar_approved_sellers" value="' . esc_attr( $value ) . '" class="regular-text">';
        echo '<p class="description">Comma-separated list of distributor names to display in the modal. (e.g., Arrow Electronics, DigiKey, Farnell, Mouser)</p>';
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
