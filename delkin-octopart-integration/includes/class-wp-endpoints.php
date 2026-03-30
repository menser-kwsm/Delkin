<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Delkin_WP_Endpoints {

    public function init() {
        add_action( 'rest_api_init', array( $this, 'register_routes' ) );
    }

    public function register_routes() {
        register_rest_route( 'delkin/v1', '/stock/(?P<sku>[a-zA-Z0-9_\-]+)', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'get_stock_data' ),
            'permission_callback' => '__return_true', // Publicly accessible so any visitor can check stock
            'args'                => array(
                'sku' => array(
                    'validate_callback' => function($param, $request, $key) {
                        return is_string( $param );
                    }
                ),
            ),
        ) );
    }

    public function get_stock_data( WP_REST_Request $request ) {
        $sku = sanitize_text_field( $request->get_param( 'sku' ) );
        $transient_key = 'delkin_stock_' . $sku;

        // 1. Check if we have a cached response for this SKU
        $cached_data = get_transient( $transient_key );
        if ( false !== $cached_data ) {
            return rest_ensure_response( $cached_data );
        }

        // 2. No cache found, query the Nexar API
        $nexar_api = new Delkin_Nexar_API();
        $api_response = $nexar_api->get_part_data( $sku );

        if ( is_wp_error( $api_response ) ) {
            return new WP_REST_Response( array( 'error' => $api_response->get_error_message() ), 500 );
        }

        // 3. Format the data to make it easy for the frontend to consume
        $formatted_data = $this->format_nexar_response( $api_response );

        // 4. Cache the formatted data based on the Settings page (default to 2 hours)
        $cache_hours = (int) get_option( 'nexar_cache_hours', 2 );
        if ( $cache_hours < 1 ) {
            $cache_hours = 2; // Fallback safeguard
        }
        set_transient( $transient_key, $formatted_data, $cache_hours * HOUR_IN_SECONDS );

        return rest_ensure_response( $formatted_data );
    }

    /**
     * Flattens the complex GraphQL response and filters for specific distributors.
     */
    private function format_nexar_response( $raw_data ) {
        $distributors = array();

        // 1. Pull approved sellers from the settings page (now an array)
        $approved_sellers = get_option( 'nexar_approved_sellers', array( 'Arrow Electronics', 'DigiKey', 'Farnell', 'Mouser' ) );
        if ( ! is_array( $approved_sellers ) ) {
             $approved_sellers = array();
        }

        // Check if we got valid part data back
        if ( empty( $raw_data['data']['supSearch']['results'] ) ) {
            return $distributors; // Returns empty array if part not found
        }

        $sellers = $raw_data['data']['supSearch']['results'][0]['part']['sellers'];

        foreach ( $sellers as $seller ) {
            $distributor_name = $seller['company']['name'];

            // 2. Skip any seller that is NOT in our strict approved list
            if ( ! in_array( $distributor_name, $approved_sellers ) ) {
                continue;
            }

            // Octopart sometimes returns multiple offers per seller, grab the first one
            $stock = 0;
            $url = '#';

            if ( ! empty( $seller['offers'] ) ) {
                $stock = $seller['offers'][0]['inventoryLevel'];
                $url = $seller['offers'][0]['clickUrl'];
            }

            $distributors[] = array(
                'distributor' => $distributor_name,
                'stock'       => $stock,
                'url'         => $url
            );
        }

        return $distributors;
    }
}
