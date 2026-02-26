/**
 * GA4 events and their required parameters.
 * Used for mock data and as reference for the dashboard.
 * Source: ga4_qa_requirements seed / BIGQUERY_TABLES_REFERENCE.txt
 */

export const EVENTS_AND_PARAMS: Record<string, string[]> = {
  session_start: ["environment", "page_country", "ga_session_id"],
  page_view: ["environment", "page_country", "page_location", "page_title"],
  view_item: ["environment", "page_country", "item_id", "item_name", "currency", "value"],
  add_to_cart: ["environment", "page_country", "item_id", "item_name", "currency", "value", "quantity"],
  begin_checkout: [
    "environment",
    "page_country",
    "item_id",
    "currency",
    "value",
    "items",
  ],
  purchase: [
    "environment",
    "page_country",
    "transaction_id",
    "currency",
    "value",
    "items",
  ],
};

export const EVENT_NAMES = Object.keys(EVENTS_AND_PARAMS) as [
  "session_start",
  "page_view",
  "view_item",
  "add_to_cart",
  "begin_checkout",
  "purchase",
];
