import { http, HttpResponse } from "msw";

// Define your API handlers here
export const handlers = [
  // Example handler for Supabase API
  http.get("*/rest/v1/*", () => {
    // Mock Supabase API responses
    return HttpResponse.json([]);
  }),

  http.post("*/rest/v1/*", () => {
    // Mock Supabase API responses
    return HttpResponse.json({});
  }),

  // Add more handlers as needed for your API endpoints
  // Example:
  // http.get('/api/articles', () => {
  //   return HttpResponse.json(mockArticles);
  // }),
];
