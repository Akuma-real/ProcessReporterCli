# Process Reporter Cli for Windows

Process Reporter Cli is a windows cli. It is designed to report in real time the name of the foreground application being used by the current user on windows.

## Related projects

- [ProcessReporterMac](https://github.com/mx-space/ProcessReporterMac)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or higher recommended)
- yarn package manager
- Windows operating system

### Environment Configuration

Create a `.env` file in the root directory with the following environment variables:

```env
# API Configuration
# Your API endpoint for receiving process information
# Example: https://api.example.com/api/v2/fn/ps/update
API_URL=

# Key for validating update requests
UPDATE_KEY=

# S3 Configuration
# Cloudflare R2 or S3-compatible storage configuration

# R2 Account ID (found in Cloudflare R2 console)
S3_ACCOUNT_ID=

# R2 Access Key ID (generated in Cloudflare R2 console)
S3_ACCESS_KEY=

# R2 Secret Access Key (generated in Cloudflare R2 console)
S3_SECRET_KEY=
```

### Custom Configuration

After setting up environment variables, you can edit `./src/configs.ts` to customize:

- Process name replacement rules
- Description formatting
- Process ignore list
- Icon handling rules
- Update interval

### Running the Application

For development:

```bash
# Install dependencies
yarn install --ignore-engines

# Start development server
yarn run dev
```

For production:

```bash
# Install dependencies
yarn install --ignore-engines

# Build project
yarn run build

# Change to build directory
cd dist

# Ensure .env file is copied to dist directory
# Run the program
node index.js
```

## Features

- Real-time foreground application monitoring
- Automatic icon upload to S3-compatible storage
- Customizable process names and description formats
- Process ignore list support
- Configurable update interval
- SQLite local cache to avoid duplicate uploads

## Troubleshooting

1. If icon uploads fail, check:
   - S3 configuration accuracy
   - Bucket permissions
   - Custom domain configuration

2. If process information isn't updating, verify:
   - API_URL correctness
   - UPDATE_KEY match
   - Network connectivity

## License

2024 Innei, MIT
