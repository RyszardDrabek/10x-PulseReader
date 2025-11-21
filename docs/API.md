# PulseReader API Documentation

This directory contains the OpenAPI 3.0 specification for the PulseReader REST API.

## Files

- **`openapi.yaml`** - Complete OpenAPI 3.0 specification file
- **`api/`** - Individual endpoint documentation in Markdown format

## Viewing the API Documentation

### Option 1: Swagger UI (Recommended)

1. Install Swagger UI globally or use npx:
   ```bash
   npx swagger-ui-serve docs/openapi.yaml
   ```

2. Or use an online viewer:
   - [Swagger Editor](https://editor.swagger.io/) - Upload `openapi.yaml`
   - [Swagger UI Online](https://petstore.swagger.io/) - Import the file

### Option 2: Redoc

Generate beautiful HTML documentation:

```bash
npx @redocly/cli build-docs docs/openapi.yaml --output docs/api-docs.html
```

Then open `docs/api-docs.html` in your browser.

### Option 3: VS Code Extension

Install the "OpenAPI (Swagger) Editor" extension in VS Code to view and edit the spec with live preview.

## API Base URL

- **Production**: `https://api.pulsereader.com/api`
- **Development**: `http://localhost:3000/api`

## Authentication

The API uses Supabase Auth with JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Getting a Token

1. Register/login via Supabase Auth SDK
2. Extract the access token from the session
3. Include it in API requests

## Quick Start Examples

### Get Articles (Guest)

```bash
curl https://api.pulsereader.com/api/articles?limit=10
```

### Get Personalized Articles (Authenticated)

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.pulsereader.com/api/articles?applyPersonalization=true&limit=20"
```

### Update User Profile

```bash
curl -X PATCH \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mood": "positive", "blocklist": ["covid", "election"]}' \
  https://api.pulsereader.com/api/profile
```

## Code Generation

### Generate TypeScript Client

```bash
npx @openapitools/openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g typescript-axios \
  -o src/generated/api-client
```

### Generate Python Client

```bash
npx @openapitools/openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g python \
  -o generated/python-client
```

## Validation

Validate the OpenAPI spec:

```bash
npx swagger-cli validate docs/openapi.yaml
```

Or use the online validator:
- [Swagger Validator](https://validator.swagger.io/)

## Versioning

Current API version: **1.0.0**

The API follows semantic versioning. Breaking changes will be introduced in new versions (e.g., `/api/v2/articles`).

## Support

For API support or questions, please refer to the project documentation or create an issue in the repository.

