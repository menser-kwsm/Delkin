<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Delkin_Nexar_API {

    private $auth_url = 'https://identity.nexar.com/connect/token';
    private $api_url = 'https://api.nexar.com/graphql';

    /**
     * Retrieves the OAuth2 token, caching it for 23 hours (it expires in 24).
     */
    private function get_access_token() {
        $token = get_transient( 'nexar_access_token' );

        if ( false === $token ) {
            // Pull credentials from the new WP Settings page options
            $client_id     = get_option( 'nexar_client_id', '' );
            $client_secret = get_option( 'nexar_client_secret', '' );

            if ( empty($client_id) || empty($client_secret) ) {
                return new WP_Error( 'missing_credentials', 'Nexar API credentials are not configured in settings.' );
            }

            $response = wp_remote_post( $this->auth_url, array(
                'body' => array(
                    'grant_type'    => 'client_credentials',
                    'client_id'     => $client_id,
                    'client_secret' => $client_secret
                )
            ));

            if ( is_wp_error( $response ) ) {
                return $response;
            }

            $body = json_decode( wp_remote_retrieve_body( $response ), true );

            if ( isset( $body['access_token'] ) ) {
                $token = $body['access_token'];
                // Cache the token for just under 24 hours
                set_transient( 'nexar_access_token', $token, 23 * HOUR_IN_SECONDS );
            } else {
                return new WP_Error( 'auth_failed', 'Failed to retrieve access token from Nexar.' );
            }
        }

        return $token;
    }

    /**
     * Tests the API connection by attempting to retrieve an access token.
     */
    public function test_connection() {
        $token = $this->get_access_token();
        return ! is_wp_error( $token );
    }

    /**
     * Fetches all available sellers from the Nexar API.
     */
    public function get_all_sellers() {
        $sellers = get_transient( 'nexar_all_sellers' );

        if ( false === $sellers ) {
            $token = $this->get_access_token();

            if ( is_wp_error( $token ) ) {
                return $token;
            }

            $query = '
                query Sellers {
                  supSellers {
                    name
                  }
                }
            ';

            $response = wp_remote_post( $this->api_url, array(
                'headers' => array(
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type'  => 'application/json',
                ),
                'body' => json_encode( array(
                    'query' => $query,
                )),
                'timeout' => 30
            ));

            if ( is_wp_error( $response ) ) {
                return $response;
            }

            $body = json_decode( wp_remote_retrieve_body( $response ), true );

            if ( isset( $body['data']['supSellers'] ) ) {
                $sellers = array_column( $body['data']['supSellers'], 'name' );
                sort( $sellers );
                // Cache for 24 hours
                set_transient( 'nexar_all_sellers', $sellers, DAY_IN_SECONDS );
            } else {
                return new WP_Error( 'fetch_sellers_failed', 'Failed to retrieve sellers from Nexar.' );
            }
        }

        return $sellers;
    }

    /**
     * Queries the Nexar GraphQL API for a specific MPN.
     */
    public function get_part_data( $mpn ) {
        $token = $this->get_access_token();

        if ( is_wp_error( $token ) ) {
            return $token;
        }

        // GraphQL Query tailored to get ONLY authorized sellers
        $query = '
            query Search($mpn: String!) {
              supSearch(q: $mpn, limit: 1) {
                results {
                  part {
                    mpn
                    sellers(authorizedOnly: true) {
                      company {
                        name
                      }
                      offers {
                        inventoryLevel
                        clickUrl
                      }
                    }
                  }
                }
              }
            }
        ';

        $variables = array( 'mpn' => $mpn );

        $response = wp_remote_post( $this->api_url, array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
            ),
            'body' => json_encode( array(
                'query'     => $query,
                'variables' => $variables
            )),
            'timeout' => 15
        ));

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        return json_decode( wp_remote_retrieve_body( $response ), true );
    }
}
