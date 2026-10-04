#!/bin/bash

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

validate_url() {
  local url=$1
  if [[ $url =~ ^https?:// ]]; then
    return 0
  fi
  return 1
}

validate_openai_key() {
  local key=$1
  if [[ $key =~ ^sk_(test|live)_ ]]; then
    return 0
  fi
  return 1
}

validate_anthropic_key() {
  local key=$1
  if [[ $key =~ ^sk-ant- ]]; then
    return 0
  fi
  return 1
}

validate_uuid() {
  local uuid=$1
  if [[ $uuid =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
    return 0
  fi
  return 1
}

prompt_for_value() {
  local prompt=$1
  local secret=${2:-false}
  local value=""

  while [[ -z "$value" ]]; do
    if $secret; then
      read -s -p "$prompt: " value
      echo ""
    else
      read -p "$prompt: " value
    fi

    if [[ -z "$value" ]]; then
      log_error "Value cannot be empty"
    fi
  done

  echo "$value"
}

confirm_value() {
  local value=$1
  local masked=${2:-$value}
  echo "  Entered: $masked"
  read -p "  Confirm? (y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    return 0
  fi
  return 1
}

# Check if .env.local already exists
if [ -f .env.local ]; then
  log_warning ".env.local already exists"
  read -p "Do you want to overwrite it? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Keeping existing .env.local"
    exit 0
  fi
fi

log_info "Starting credential setup..."
echo ""

# Track which credentials we collected
CREDENTIALS=""
ERRORS=0

# ============================================================================
# SUPABASE CONFIGURATION
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
log_info "SUPABASE CONFIGURATION"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Get these values from your Supabase project settings:"
echo "  1. Go to supabase.co -> Your Project"
echo "  2. Settings -> API"
echo "  3. Copy Project URL and the two API keys"
echo ""

# Supabase URL
while true; do
  log_info "Enter Supabase Project URL"
  SUPABASE_URL=$(prompt_for_value "Project URL (https://...supabase.co)")

  if validate_url "$SUPABASE_URL"; then
    if confirm_value "$SUPABASE_URL"; then
      CREDENTIALS+="NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL\n"
      log_success "Supabase URL configured"
      break
    fi
  else
    log_error "Invalid URL format. Expected https://..."
  fi
done

echo ""

# Supabase Anon Key
while true; do
  log_info "Enter Supabase Anonymous Key (public, safe in client code)"
  SUPABASE_ANON=$(prompt_for_value "Anon Key" true)

  if [ ${#SUPABASE_ANON} -gt 50 ]; then
    if confirm_value "$SUPABASE_ANON" "**** (${#SUPABASE_ANON} chars)"; then
      CREDENTIALS+="NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON\n"
      log_success "Supabase Anon Key configured"
      break
    fi
  else
    log_error "Key appears too short (expected >50 characters)"
  fi
done

echo ""

# Supabase Service Role Key
while true; do
  log_info "Enter Supabase Service Role Key (SECRET - keep private!)"
  SUPABASE_SERVICE=$(prompt_for_value "Service Role Key" true)

  if [ ${#SUPABASE_SERVICE} -gt 50 ]; then
    if confirm_value "$SUPABASE_SERVICE" "**** (${#SUPABASE_SERVICE} chars)"; then
      CREDENTIALS+="SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE\n"
      log_success "Supabase Service Role Key configured"
      break
    fi
  else
    log_error "Key appears too short (expected >50 characters)"
  fi
done

echo ""

# Supabase JWT Secret
while true; do
  log_info "Enter Supabase JWT Secret (from Settings -> API -> JWT Secret)"
  SUPABASE_JWT=$(prompt_for_value "JWT Secret" true)

  if [ ${#SUPABASE_JWT} -gt 20 ]; then
    if confirm_value "$SUPABASE_JWT" "**** (${#SUPABASE_JWT} chars)"; then
      CREDENTIALS+="SUPABASE_JWT_SECRET=$SUPABASE_JWT\n"
      log_success "Supabase JWT Secret configured"
      break
    fi
  else
    log_error "Secret appears too short (expected >20 characters)"
  fi
done

echo ""

# ============================================================================
# INNGEST CONFIGURATION
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
log_info "INNGEST CONFIGURATION"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Get this from: https://app.inngest.com -> Your App -> API Keys"
echo ""

while true; do
  log_info "Enter Inngest Event Key"
  INNGEST_KEY=$(prompt_for_value "Event Key" true)

  if [ ${#INNGEST_KEY} -gt 20 ]; then
    if confirm_value "$INNGEST_KEY" "**** (${#INNGEST_KEY} chars)"; then
      CREDENTIALS+="INNGEST_EVENT_KEY=$INNGEST_KEY\n"
      log_success "Inngest Event Key configured"
      break
    fi
  else
    log_error "Key appears too short (expected >20 characters)"
  fi
done

echo ""

# ============================================================================
# AI PROVIDER CONFIGURATION
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
log_info "AI PROVIDER CONFIGURATION"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# AI Provider Selection
read -p "Which AI providers do you want to configure? (comma-separated: openai,anthropic,both,none) [none]: " -r AI_CHOICE
AI_CHOICE=${AI_CHOICE:-none}

if [[ "$AI_CHOICE" =~ (openai|both) ]]; then
  echo ""
  log_info "OpenAI Configuration"
  echo "Get your API key from: https://platform.openai.com/account/api-keys"
  echo ""

  while true; do
    log_info "Enter OpenAI API Key"
    OPENAI_KEY=$(prompt_for_value "OpenAI API Key (sk_test_... or sk_live_...)" true)

    if validate_openai_key "$OPENAI_KEY"; then
      if confirm_value "$OPENAI_KEY" "**** (${#OPENAI_KEY} chars)"; then
        CREDENTIALS+="OPENAI_API_KEY=$OPENAI_KEY\n"
        CREDENTIALS+="AI_PROVIDER=openai\n"
        log_success "OpenAI API Key configured"
        break
      fi
    else
      log_error "Invalid OpenAI key format. Expected to start with sk_test_ or sk_live_"
    fi
  done
  echo ""
fi

if [[ "$AI_CHOICE" =~ (anthropic|both) ]]; then
  echo ""
  log_info "Anthropic Configuration"
  echo "Get your API key from: https://console.anthropic.com/account/keys"
  echo ""

  while true; do
    log_info "Enter Anthropic API Key"
    ANTHROPIC_KEY=$(prompt_for_value "Anthropic API Key (sk-ant-...)" true)

    if validate_anthropic_key "$ANTHROPIC_KEY"; then
      if confirm_value "$ANTHROPIC_KEY" "**** (${#ANTHROPIC_KEY} chars)"; then
        CREDENTIALS+="ANTHROPIC_API_KEY=$ANTHROPIC_KEY\n"
        if [[ ! "$AI_CHOICE" =~ both ]]; then
          CREDENTIALS+="AI_PROVIDER=anthropic\n"
        fi
        log_success "Anthropic API Key configured"
        break
      fi
    else
      log_error "Invalid Anthropic key format. Expected to start with sk-ant-"
    fi
  done
  echo ""
fi

# ============================================================================
# OPTIONAL: LOCAL AI (OLLAMA)
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
log_info "LOCAL AI CONFIGURATION (OPTIONAL)"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

read -p "Do you want to configure local AI (Ollama)? (y/n) [n]: " -n 1 -r SETUP_OLLAMA
echo ""

if [[ $SETUP_OLLAMA =~ ^[Yy]$ ]]; then
  log_info "Ollama Configuration"
  echo "Make sure Ollama is running at the specified URL"
  echo "Default local address: http://localhost:11434"
  echo ""

  while true; do
    log_info "Enter Ollama Base URL"
    OLLAMA_URL=$(prompt_for_value "Ollama URL (http://localhost:11434)" false)

    if validate_url "$OLLAMA_URL"; then
      if confirm_value "$OLLAMA_URL"; then
        CREDENTIALS+="LOCAL_AI_ENABLED=true\n"
        CREDENTIALS+="LOCAL_AI_BASE_URL=$OLLAMA_URL\n"
        log_success "Ollama configuration added"
        break
      fi
    else
      log_error "Invalid URL format. Expected http://... or https://..."
    fi
  done
  echo ""
fi

# ============================================================================
# ENVIRONMENT SETUP
# ============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
log_info "FINALIZING SETUP"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create .env.local file with collected credentials
{
  echo "# Auto-generated by setup-credentials.sh"
  echo "# Do NOT commit this file to git"
  echo ""
  echo "# Supabase Configuration"
  echo -e "$CREDENTIALS" | grep SUPABASE
  echo ""
  echo "# Inngest Configuration"
  echo -e "$CREDENTIALS" | grep INNGEST
  echo ""
  echo "# AI Provider Configuration"
  echo -e "$CREDENTIALS" | grep -E "OPENAI|ANTHROPIC|AI_PROVIDER|LOCAL_AI"
  echo ""
  echo "# Application Configuration"
  echo "NODE_ENV=development"
  echo "AUTH_PROVIDER=mock"
  echo "SUPABASE_AUTH_ENABLED=false"
  echo "DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001"
  echo "DEFAULT_USER_ID=00000000-0000-0000-0000-000000000001"
} > .env.local

log_success ".env.local created"
echo ""

# ============================================================================
# VALIDATION
# ============================================================================
log_info "Validating credentials..."
echo ""

# Check if we can run the TypeScript validator
if command -v npx &> /dev/null; then
  log_info "Running connectivity tests (this may take a moment)..."
  if npx --quiet ts-node scripts/validate-credentials.ts; then
    log_success "All connectivity tests passed!"
    echo ""
    log_success "Credential setup complete! You're ready to run tests."
    echo ""
    echo "Next steps:"
    echo "  1. Run: npm run validate:credentials"
    echo "  2. Run: npm test"
    echo ""
    exit 0
  else
    log_warning "Some connectivity tests failed - review the output above"
    echo ""
    echo "You can:"
    echo "  1. Fix the issues and run: npm run validate:credentials"
    echo "  2. Or proceed with: npm test"
    echo ""
    exit 0
  fi
else
  log_warning "npx not found - skipping connectivity tests"
  log_info "Run 'npm run validate:credentials' after npm install to test connectivity"
  echo ""
  echo "Next steps:"
  echo "  1. Run: npm install"
  echo "  2. Run: npm run validate:credentials"
  echo "  3. Run: npm test"
  echo ""
  exit 0
fi
