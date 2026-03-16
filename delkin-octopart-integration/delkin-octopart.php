<?php
/**
 * Plugin Name: Delkin Octopart Integration
 * Description: Integrates WooCommerce with the Nexar (Octopart) API to fetch real-time distributor stock and purchase links.
 * Version: 1.1.0
 * Author: Your Agency Name
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
        '1.0.0'
    );

    wp_enqueue_script(
        'delkin-octopart-js',
        plugins_url( '/assets/js/octopart-modal.js', __FILE__ ),
        array( 'jquery' ), // Depend on jQuery since Elementor's popup event requires it
        '1.1.0',
        true // Load in footer
    );

    // Localize the script with the REST API URL and a nonce
    wp_localize_script( 'delkin-octopart-js', 'delkinOctopartData', array(
        'root'  => esc_url_raw( rest_url() ),
        'nonce' => wp_create_nonce( 'wp_rest' )
    ) );
}
add_action( 'wp_enqueue_scripts', 'delkin_octopart_enqueue_scripts' );
