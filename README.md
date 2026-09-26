# MauseAI

AI-powered automation platform built with Next.js, TypeScript, Supabase, and Inngest.

## Phase 1: Repository Skeleton

This project is in Phase 1 of development, focusing on establishing the repository foundation and core infrastructure.

### Technology Stack

- **Frontend**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Code Quality**: ESLint, Prettier
- **Git Hooks**: Husky with lint-staged
- **CI/CD**: GitHub Actions
- **Backend Services**: Supabase, Inngest

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

- Supabase URL and Anon Key
- Inngest Event Key and Signing Key

### Available Scripts

- `npm run dev` - Start development server on localhost:3000
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint checks
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Check TypeScript types without emitting code

### Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Pre-commit hooks will automatically run:
   - ESLint: `npm run lint`
   - Prettier: `npm run format`
4. Commit your changes
5. Push to your feature branch
6. Create a pull request

The CI/CD pipeline will automatically:

- Run TypeScript type checking
- Run ESLint
- Build the project

All checks must pass before merging to main.

### Contributing

This project is actively under development. Please follow the established code style and ensure all tests and linters pass before submitting a pull request.

## License

TBD
