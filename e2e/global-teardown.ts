// Global teardown runs once after all tests
async function globalTeardown() {
  // You can add global cleanup logic here
  // For example: clean up test data, close database connections, etc.

  // eslint-disable-next-line no-console
  console.log("Running global teardown for e2e tests...");

  // Example: Clean up test data
  // await cleanupTestDatabase();

  // eslint-disable-next-line no-console
  console.log("Global teardown completed.");
}

export default globalTeardown;
