<?php
/**
 * Plugin Name: Delkin Octopart Integration
 * Description: Integrates WooCommerce with the Nexar (Octopart) API to fetch real-time distributor stock and purchase links.
 * Version: 1.4.0
 * Author: KWSM: a digital marketing agency
 * Author URI: https://kwsmdigital.com/
 * Text Domain: delkin-octopart
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly
}

// Define plugin paths
define( 'DELKIN_OCTOPART_PATH', plugin_dir_path( __FILE__ ) );

// Include the required classes
require_once DELKIN_OCTOPART_PATH . 'includes/class-nexar-api.php';
require_once DELKIN_OCTOPART_PATH . 'includes/class-wp-endpoints.php';
require_once DELKIN_OCTOPART_PATH . 'includes/class-settings-page.php';

// Initialize the API Endpoints and Settings
function run_delkin_octopart_integration() {
    $endpoints = new Delkin_WP_Endpoints();
    $endpoints->init();

    if ( is_admin() ) {
        $settings = new Delkin_Octopart_Settings();
        $settings->init();
    }
}
add_action( 'plugins_loaded', 'run_delkin_octopart_integration' );

// Enqueue frontend scripts
function delkin_octopart_enqueue_scripts() {
    wp_enqueue_style(
        'delkin-octopart-css',
        plugins_url( '/assets/css/octopart-styles.css', __FILE__ ),
        array(),
        '1.2.0'
    );

    wp_enqueue_script(
        'delkin-octopart-js',
        plugins_url( '/assets/js/octopart-modal.js', __FILE__ ),
        array( 'jquery' ),
        '1.2.0',
        true // Load in footer
    );

    // Localize the script with the REST API URL, nonce, and styling/column settings
    wp_localize_script( 'delkin-octopart-js', 'delkinOctopartData', array(
        'root'        => esc_url_raw( rest_url() ),
        'nonce'       => wp_create_nonce( 'wp_rest' ),
        'displayMode' => get_option('nexar_display_mode', 'overlay'),
        'columns'     => get_option('nexar_table_columns', array('distributor', 'mpn', 'packaging', 'stock')),
        'styling'     => array(
            'btnText'    => get_option('nexar_button_text', 'Buy Now'),
            'modalTitle' => get_option('nexar_modal_title', 'Delkin Authorized Distributors'),
            'btnBgColor' => get_option('nexar_button_bg_color', '#02549c'),
            'btnColor'   => get_option('nexar_button_text_color', '#ffffff'),
            'btnIcon'    => get_option('nexar_button_icon', ''),
        )
    ) );
}
add_action( 'wp_enqueue_scripts', 'delkin_octopart_enqueue_scripts' );

/**
 * Adds attributes to the script tag to prevent WP Rocket from delaying/optimizing our JS.
 */
function delkin_octopart_script_loader_tag( $tag, $handle, $src ) {
    if ( 'delkin-octopart-js' !== $handle ) {
        return $tag;
    }

    // Add data-rocketasync="false" and data-nowprocket="true" to the script tag
    return str_replace( ' src', ' data-rocketasync="false" data-nowprocket="true" src', $tag );
}
add_filter( 'script_loader_tag', 'delkin_octopart_script_loader_tag', 10, 3 );

/**
 * Renders the "Buy Now" button and modal placeholder on the product page.
 * Hooked to woocommerce_product_meta_end to appear after Category/SKU.
 */
function delkin_octopart_render_buy_button() {
    global $product;
    if ( ! $product ) {
        return;
    }

    $sku = $product->get_sku();
    if ( empty( $sku ) ) {
        return;
    }

    $btn_text     = get_option('nexar_button_text', 'Buy Now');
    $btn_bg       = get_option('nexar_button_bg_color', '#02549c');
    $btn_color    = get_option('nexar_button_text_color', '#ffffff');
    $btn_icon_raw = get_option('nexar_button_icon', '');

    $btn_icon = '';
    if ( ! empty( $btn_icon_raw ) ) {
        if ( strpos( $btn_icon_raw, '<svg' ) !== false ) {
            $btn_icon = '<span class="delkin-btn-icon">' . $btn_icon_raw . '</span>';
        } else {
            $btn_icon = '<span class="delkin-btn-icon dashicons ' . esc_attr( $btn_icon_raw ) . '"></span>';
        }
    }

    ?>
    <div class="delkin-octopart-container">
        <button type="button" class="delkin-buy-now-btn" data-sku="<?php echo esc_attr( $sku ); ?>" style="background-color: <?php echo esc_attr( $btn_bg ); ?>; color: <?php echo esc_attr( $btn_color ); ?>;">
            <?php echo $btn_icon; ?>
            <span class="delkin-btn-text"><?php echo esc_html( $btn_text ); ?></span>
        </button>
        <div id="delkin-inline-results-<?php echo esc_attr( sanitize_title( $sku ) ); ?>" class="delkin-inline-results" style="display: none !important;"></div>
    </div>
    <?php
}
add_action( 'woocommerce_product_meta_end', 'delkin_octopart_render_buy_button' );

/**
 * Renders the modal HTML in the footer to avoid layout issues.
 */
function delkin_octopart_render_modal() {
    ?>
    <!-- Custom Modal Placeholder -->
    <div id="delkin-octopart-modal" class="delkin-modal" style="display: none !important;">
        <div class="delkin-modal-content">
            <span class="delkin-modal-close">&times;</span>
            <div id="delkin-modal-body">
                <!-- Table will be injected here -->
            </div>
        </div>
    </div>
    <?php
}
add_action( 'wp_footer', 'delkin_octopart_render_modal' );

// Enqueue admin scripts
function delkin_octopart_enqueue_admin_scripts( $hook ) {
    if ( 'settings_page_delkin-octopart' !== $hook ) {
        return;
    }

    wp_enqueue_style(
        'delkin-octopart-admin-css',
        plugins_url( '/assets/css/admin-styles.css', __FILE__ ),
        array(),
        '1.0.0'
    );

    wp_enqueue_script(
        'delkin-octopart-admin-js',
        plugins_url( '/assets/js/admin-settings.js', __FILE__ ),
        array( 'jquery' ),
        '1.1.0',
        true
    );

    wp_localize_script( 'delkin-octopart-admin-js', 'delkinOctopartAdmin', array(
        'nonce' => wp_create_nonce( 'delkin_octopart_admin_nonce' )
    ) );
}
add_action( 'admin_enqueue_scripts', 'delkin_octopart_enqueue_admin_scripts' );

// Add settings link on the plugins page
function delkin_octopart_add_settings_link( $links ) {
    $settings_link = '<a href="options-general.php?page=delkin-octopart">' . __( 'Settings' ) . '</a>';
    array_unshift( $links, $settings_link );
    return $links;
}
$plugin = plugin_basename( __FILE__ );
add_filter( "plugin_action_links_$plugin", 'delkin_octopart_add_settings_link' );
