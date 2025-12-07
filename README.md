# PulseReader

An intelligent news aggregator designed to provide users with a personalized and valuable content stream, fighting information overload.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

In a world saturated with content, finding valuable and truly relevant information is a significant challenge. PulseReader addresses this by giving users full control over their news feed. It's an intelligent aggregator that filters articles from various RSS sources based on the user's mood, preferred topics, and a custom blocklist of keywords and domains.

By leveraging AI for sentiment and topic analysis, PulseReader aims to combat information fatigue and deliver a reading experience tailored to individual needs and state of mind.

## Product Requirements

- The full PRD (scope, user stories, success metrics) lives at `.ai/prd.md`.

## Tech Stack

The project is built using a modern, scalable, and efficient technology stack:

| Category     | Technology                                                                                                                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend** | [Astro 5](https://astro.build/), [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/), [Tailwind 4](https://tailwindcss.com/), [Shadcn/ui](https://ui.shadcn.com/) |
| **Backend**  | [Supabase](https://supabase.com/) (PostgreSQL, Authentication, BaaS)                                                                                                                          |
| **AI**       | [OpenRouter.ai](https://openrouter.ai/) for multi-model access                                                                                                                                |
| **Testing**  | [Vitest](https://vitest.dev/) for unit/integration tests, [Playwright](https://playwright.dev/) for E2E tests, [k6](https://k6.io/) for load testing                                          |
| **DevOps**   | [GitHub Actions](https://github.com/features/actions) for CI/CD, [DigitalOcean](https://www.digitalocean.com/) for hosting                                                                    |

## Getting Started Locally

To set up and run the project on your local machine, follow these steps:

### Prerequisites

- [Node.js](https://nodejs.org/) (version `22.14.0`). We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage Node versions.
- [npm](https://www.npmjs.com/) (usually comes with Node.js).

### Installation

1.  **Clone the repository:**

    ```sh
    git clone https://github.com/your-username/10x-PulseReader.git
    cd 10x-PulseReader
    ```

2.  **Set the correct Node.js version:**
    If you are using `nvm`, run this command in the project root:

    ```sh
    nvm use
    ```

3.  **Install dependencies:**

    ```sh
    npm install
    ```

4.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add the necessary environment variables for Supabase and OpenRouter.

    ```env
    # .env
    PUBLIC_SUPABASE_URL="your-supabase-project-url"
    PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
    OPENROUTER_API_KEY="your-openrouter-api-key"
    ```

    For local development, the repo expects the bundled Supabase stack at `http://127.0.0.1:18785` with the anon/service keys from `.dev.vars`; copy those values into your `.env` (or `cp .dev.vars .env`) for a zero-friction start.

5.  **Run the development server:**
    ```sh
    npm run dev
    ```
    The application will be available at `http://localhost:4321`.

## Available Scripts

The following scripts are available in the `package.json`:

- `npm run dev`: Starts the development server with hot-reloading.
- `npm run build`: Builds the application for production.
- `npm run preview`: Starts a local server to preview the production build.
- `npm run lint`: Lints the codebase for errors and style issues.
- `npm run lint:fix`: Automatically fixes fixable linting issues.
- `npm run format`: Formats the code using Prettier.
- `npm run docs:api`: Serves the API documentation using Swagger UI.
- `npm run docs:api:validate`: Validates the OpenAPI specification.
- `npm run docs:api:build`: Generates static HTML documentation from the OpenAPI spec.

## Project Scope

### Key Features (MVP)

- **Content Aggregation**: Automatically fetches articles from predefined RSS feeds every 15 minutes.
- **User Management**: Secure user registration and authentication via Supabase Auth.
- **AI Integration**: Background AI analysis of articles for sentiment (positive, neutral, negative) and topic classification.
- **Personalization & Filtering**: Users can filter their feed by mood and manage a unified blocklist for keywords and URLs.
- **Responsive UI**: A fully responsive web interface with an infinite scroll feed.

### Out of Scope (for MVP)

The following features are not planned for the initial release:

- Displaying full article content within the app.
- Advanced AI-based recommendation systems.
- Social features (comments, ratings, sharing).
- Push or email notifications.
- Integration with paid, commercial news APIs.
- Manual content moderation by administrators.

## API Documentation

The REST API is fully documented using OpenAPI 3.0 specification. You can:

- **View interactive documentation**: Run `npm run docs:api` to start Swagger UI
- **Read the spec**: See [`docs/openapi.yaml`](docs/openapi.yaml)
- **Generate client SDKs**: Use the OpenAPI spec with code generators
- **Validate the spec**: Run `npm run docs:api:validate`

For more details, see [`docs/API.md`](docs/API.md).

## Project Status

**In Development**: This project is currently in the development phase for the Minimum Viable Product (MVP).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
