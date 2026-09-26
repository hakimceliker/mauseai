# MouseAI Core

AI-powered automation platform for autonomous workflows and task execution.

## Phase 1: Repository Skeleton

This project is in Phase 1 of development, establishing the repository foundation and core infrastructure.

### Vision

Independent MouseAI core platform designed to:
- Safely plan user objectives
- Route to appropriate AI providers and tools
- Monitor execution
- Resume on failure
- Produce verifiable output

### Technology Stack

- **Frontend**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Code Quality**: ESLint, Prettier
- **Git Hooks**: Husky with lint-staged
- **CI/CD**: GitHub Actions
- **Backend Services**: Supabase, Inngest
- **Testing**: Vitest

### Project Structure

- `app/`: Next.js App Router components and API routes
- `src/`: Core library code (schemas, services, utilities)
- `docs/`: Architecture decisions, planning, and runbooks
- `tests/`: Unit and integration tests

### Installation

1. Clone the repository:

```bash
git clone https://github.com/hakimceliker/mauseai.git
cd mauseai
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your actual API keys:

- Supabase URL and Service Role Key
- Inngest Event Key and Signing Key
- OpenAI and Anthropic API keys (if using)

### Available Scripts

- `npm run dev` - Start development server on localhost:3000
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint checks
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Check TypeScript types without emitting code
- `npm test` - Run tests with Vitest
- `npm run format:check` - Check formatting
- `npm run lint:check` - Check linting

### Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Pre-commit hooks will automatically run code quality checks
4. Commit your changes
5. Push to your feature branch
6. Create a pull request

The CI/CD pipeline will automatically:

- Check code formatting
- Run TypeScript type checking
- Run ESLint
- Run tests
- Build the project

All checks must pass before merging to main.

### Security

- `.env.local` and actual API keys are never committed to the repository
- Example variables are kept in `.env.example`
- Secrets are only loaded from the environment at runtime

### Contributing

This project is actively under development. Please follow the established code style and ensure all checks pass before submitting a pull request.

## License

TBD
