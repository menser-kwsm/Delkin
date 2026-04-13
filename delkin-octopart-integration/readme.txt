=== Delkin Octopart Integration ===
Contributors: KWSM: a digital marketing agency
Requires at least: 5.8
Tested up to: 6.4
Stable tag: 1.5.0
Requires PHP: 7.4
License: GPLv2 or later

Integrates WooCommerce products with the Nexar (Octopart) GraphQL API to display real-time distributor stock and purchase links via an overlay modal or inline display.

== Description ==
This plugin registers a custom secure REST API endpoint (`/wp-json/delkin/v1/stock/<sku>`) that your frontend can query.

It handles the OAuth2 authentication with Nexar securely on the backend, executes the necessary GraphQL query to fetch distributor pricing/stock for a specific MPN (Manufacturer Part Number), and uses WordPress Transients to cache the results for 2 hours to prevent API rate-limiting and improve page load speeds.

== Installation ==
1. Upload the `delkin-octopart-integration` folder to the `/wp-content/plugins/` directory.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Configure your Nexar API credentials in the settings page under 'Settings > Octopart API'.
