# convert-commands

simple node.js script to use llms to convert prefix commands to slash commands in your discord bot


## usage

1. download the converter script
2. install dependencies:
   ```bash
   pnpm install openai
   ```
3. set up your api key (choose one method):
   ```bash
   # environment variable (recommended)
   export OPENAI_API_KEY="your-api-key-here"
   
   # or use cli argument
   node slash-command-mover.js --api-key "your-api-key-here"
   ```
4. update the system prompt and paths in slash-command-mover.js

## quick start

### basic usage
```bash
# convert all commands in default directories
node slash-command-mover.js
```

## configuration options

### command line arguments

| option | short | description | default |
|--------|-------|-------------|---------|
| `--model` | `-m` | openai model to use | `gpt-3.5-turbo` |
| `--endpoint` | `-e` | custom api endpoint | `https://api.openai.com/v1` |
| `--api-key` | `-k` | api key | uses `OPENAI_API_KEY` env var |
| `--source` | `-s` | source directory path | `./commands/PrefixCommands` |
| `--output` | `-o` | output directory path | `./commands/SlashCommands` |
| `--delay` | `-d` | delay between requests (ms) | `1000` |
| `--help` | `-h` | show help message | - |


## usage examples

### standard conversion
```bash
# convert with default settings
node converter.js
```

### custom model and timing
```bash
# use gpt-4 with 2-second delays
node converter.js --model gpt-4 --delay 2000
```

### custom directories
```bash
# specify custom source and output directories
node converter.js --source ./legacy-commands --output ./modern-commands
```

### azure openai integration
```bash
# use azure openai endpoint
node converter.js \
  --endpoint "https://your-instance.openai.azure.com/openai/deployments/gpt-35-turbo" \
  --api-key "your-azure-key" \
  --model "gpt-35-turbo"
```

### local ai server
```bash
# use local or custom ai endpoint
node converter.js \
  --endpoint "http://localhost:8080/v1" \
  --api-key "local-key" \
  --model "your-local-model"
```

## output examples

### successful conversion
```
============================================================
discord command converter
============================================================

configuration:
  model: gpt-3.5-turbo
  endpoint: https://api.openai.com/v1
  source: ./commands/PrefixCommands
  destination: ./commands/SlashCommands
  max size: 20000 chars

found 5 files to process

[1/5] processing: ping.js
info: converting ping.js
success: converted ping.js

[2/5] processing: ban.js
warning: skipping ban.js (already exists)

============================================================
conversion results:
============================================================
success: converted: 3
warning: skipped: 1
error: failed: 1

total processed: 5 files
```

### error handling
```
[3/5] processing: complex-command.js
warning: large file (25000 chars), cleaning...
info: converting complex-command.js
error: failed to convert complex-command.js: request timeout
```

## supported models

### openai models
- `gpt-4` (recommended for complex commands)
- `gpt-3.5-turbo` (default, cost-effective)
- `gpt-4-turbo`
- any other openai chat model

### compatible services
- **azure openai**: full compatibility
- **local ai servers**: lm studio, ollama, etc.
- **third-party apis**: any openai-compatible endpoint

## file processing

### automatic cleanup
the converter automatically handles large files by:
- removing single-line comments (`//`)
- removing multi-line comments (`/* */`)
- trimming excessive whitespace
- eliminating empty lines

### size limits
- maximum file size: 20,000 characters
- files larger than limit are automatically cleaned
- very large files are skipped with warnings

### skip logic
- existing files are automatically skipped
- use different output directories for re-processing
- manual deletion required to force re-conversion

## troubleshooting

### common issues

**api key errors**
```bash
error: api key not found. set OPENAI_API_KEY environment variable.
```
**solution**: set your api key as an environment variable or use `--api-key`

**directory not found**
```bash
error: source directory not found: ./commands/PrefixCommands
```
**solution**: create the directory or specify correct path with `--source`

**rate limiting**
```bash
error: failed to convert command.js: rate limit exceeded
```
**solution**: increase delay with `--delay 2000` or higher

**large files**
```bash
warning: file still too large (30000 chars)
```
**solution**: manually reduce file size or split into smaller commands

### best practices

1. **start with small batches** to test api compatibility
2. **use gpt-4 for complex commands** requiring better understanding
3. **set reasonable delays** (1-2 seconds) to avoid rate limits
4. **review converted files** before deploying to production
5. **keep backups** of original prefix commands

## api costs

estimated costs for common scenarios:

| scenario | model | approx. cost |
|----------|-------|--------------|
| 10 simple commands | gpt-3.5-turbo | $0.05 |
| 50 commands | gpt-3.5-turbo | $0.25 |
| 10 complex commands | gpt-4 | $0.50 |
| 50 complex commands | gpt-4 | $2.50 |

*costs are estimates and may vary based on file size and complexity*

## contributing

1. fork the repository
2. create a feature branch
3. make your changes
4. test with various command types
5. submit a pull request

## license

mit license - feel free to modify and distribute

## support

- create an issue for bugs or feature requests
- check existing issues before creating new ones
- provide sample commands and error logs when reporting issues
