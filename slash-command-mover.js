const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// Configuration
const config = {
    model: 'gpt-5',
    baseURL: 'https://api.openai.com/v1', // Custom endpoint
    apiKey: process.env.OPENAI_API_KEY || '',
    temperature: 0.3,
    maxTokens: 2000,
    maxContentSize: 20000,
    prefixDir: './commands/PrefixCommands',
    slashDir: './commands/SlashCommands',
    delay: 1000 // ms between requests
};

// System prompt for conversion
const SYSTEM_PROMPT = `Convert this Discord.js prefix command to a slash command. Use SlashCommandBuilder, replace message with interaction, use interaction.reply() and interaction.options.get(). Output only the JavaScript code.`;

// Initialize OpenAI client
let openai;

function log(message, color = colors.white) {
    console.log(`${color}${message}${colors.reset}`);
}

function logError(message) {
    log(`ERROR: ${message}`, colors.red);
}

function logSuccess(message) {
    log(`SUCCESS: ${message}`, colors.green);
}

function logWarning(message) {
    log(`WARNING: ${message}`, colors.yellow);
}

function logInfo(message) {
    log(`INFO: ${message}`, colors.cyan);
}

// Get all JS files recursively
function getAllJSFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) {
        logError(`Directory not found: ${dir}`);
        return fileList;
    }

    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            getAllJSFiles(filePath, fileList);
        } else if (file.endsWith('.js')) {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

// Clean content by removing comments and excess whitespace
function cleanContent(content, maxSize = config.maxContentSize) {
    if (content.length <= maxSize) {
        return content;
    }
    
    let cleaned = content
        .replace(/\/\/.*$/gm, '') // Remove single line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .replace(/\n\s*\n/g, '\n') // Remove double newlines
        .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .replace(/^\s*\n/gm, ''); // Remove empty lines
    
    return cleaned.length > maxSize ? cleaned.substring(0, maxSize) : cleaned;
}

// Clean AI response content
function cleanResponseContent(content) {
    if (!content) return content;
    
    // Remove thinking tags
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
    
    // Extract code from code blocks
    const codeBlockMatch = content.match(/```(?:javascript|js)?\n?([\s\S]*?)```/i);
    if (codeBlockMatch) {
        content = codeBlockMatch[1].trim();
    }
    
    return content.trim();
}

// Convert a single command
async function convertCommand(filePath) {
    try {
        const relativePath = path.relative(config.prefixDir, filePath);
        const outputPath = path.join(config.slashDir, relativePath);
        
        // Check if already exists
        if (fs.existsSync(outputPath)) {
            logWarning(`Skipping ${path.basename(filePath)} (already exists)`);
            return 'skipped';
        }
        
        logInfo(`Converting ${path.basename(filePath)}`);
        
        // Read original file
        let originalCode = fs.readFileSync(filePath, 'utf8');
        const originalSize = originalCode.length;
        
        // Clean if too large
        if (originalSize > config.maxContentSize) {
            logWarning(`Large file (${originalSize} chars), cleaning...`);
            originalCode = cleanContent(originalCode);
            
            if (originalCode.length > config.maxContentSize) {
                logError(`File still too large (${originalCode.length} chars)`);
                return 'failed';
            }
        }
        
        // Call OpenAI API
        const response = await openai.chat.completions.create({
            model: config.model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `Convert to slash command:\n\n${originalCode}` }
            ],
            temperature: config.temperature,
            max_tokens: config.maxTokens
        });
        
        const convertedCode = cleanResponseContent(response.choices[0].message.content);
        
        if (!convertedCode || convertedCode.trim().length === 0) {
            throw new Error('Empty response from API');
        }
        
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Write converted file
        fs.writeFileSync(outputPath, convertedCode.trim());
        logSuccess(`Converted ${path.basename(filePath)}`);
        
        return 'success';
        
    } catch (error) {
        logError(`Failed to convert ${path.basename(filePath)}: ${error.message}`);
        return 'failed';
    }
}

// Initialize OpenAI client with custom config
function initializeOpenAI() {
    if (!config.apiKey) {
        logError('API key not found. Set OPENAI_API_KEY environment variable.');
        process.exit(1);
    }
    
    openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL
    });
    
    logInfo(`Initialized OpenAI client with endpoint: ${config.baseURL}`);
}

// Main conversion function
async function convertCommands() {
    console.clear();
    log(`${'='.repeat(60)}`, colors.bright);
    log('Discord Command Converter', colors.bright + colors.cyan);
    log(`${'='.repeat(60)}`, colors.bright);
    
    // Initialize OpenAI
    initializeOpenAI();
    
    // Display configuration
    log('\nConfiguration:', colors.bright);
    log(`  Model: ${colors.yellow}${config.model}${colors.reset}`);
    log(`  Endpoint: ${colors.yellow}${config.baseURL}${colors.reset}`);
    log(`  Source: ${colors.yellow}${config.prefixDir}${colors.reset}`);
    log(`  Destination: ${colors.yellow}${config.slashDir}${colors.reset}`);
    log(`  Max Size: ${colors.yellow}${config.maxContentSize} chars${colors.reset}`);
    
    // Ensure directories exist
    if (!fs.existsSync(config.prefixDir)) {
        logError(`Source directory not found: ${config.prefixDir}`);
        process.exit(1);
    }
    
    if (!fs.existsSync(config.slashDir)) {
        fs.mkdirSync(config.slashDir, { recursive: true });
        logInfo(`Created output directory: ${config.slashDir}`);
    }
    
    // Get command files
    const commandFiles = getAllJSFiles(config.prefixDir);
    
    if (commandFiles.length === 0) {
        logWarning('No JavaScript files found to convert');
        return;
    }
    
    log(`\nFound ${colors.yellow}${commandFiles.length}${colors.reset} files to process\n`);
    
    // Convert files
    const results = { success: 0, failed: 0, skipped: 0 };
    
    for (let i = 0; i < commandFiles.length; i++) {
        const file = commandFiles[i];
        const fileNumber = `[${i + 1}/${commandFiles.length}]`;
        
        log(`${colors.blue}${fileNumber}${colors.reset} Processing: ${path.basename(file)}`);
        
        const result = await convertCommand(file);
        results[result]++;
        
        // Delay between requests
        if (i < commandFiles.length - 1 && config.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, config.delay));
        }
    }
    
    // Display results
    log(`\n${'='.repeat(60)}`, colors.bright);
    log('Conversion Results:', colors.bright + colors.white);
    log(`${'='.repeat(60)}`, colors.bright);
    
    logSuccess(`Converted: ${results.success}`);
    logWarning(`Skipped: ${results.skipped}`);
    logError(`Failed: ${results.failed}`);
    
    const total = results.success + results.failed + results.skipped;
    log(`\nTotal processed: ${colors.bright}${total}${colors.reset} files`);
    
    if (results.failed > 0) {
        logWarning('Some conversions failed. Check error messages above.');
    }
}

// CLI argument parsing
function parseArguments() {
    const args = process.argv.slice(2);
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];
        
        switch (arg) {
            case '--model':
            case '-m':
                if (nextArg) config.model = nextArg;
                i++;
                break;
            case '--endpoint':
            case '-e':
                if (nextArg) config.baseURL = nextArg;
                i++;
                break;
            case '--api-key':
            case '-k':
                if (nextArg) config.apiKey = nextArg;
                i++;
                break;
            case '--source':
            case '-s':
                if (nextArg) config.prefixDir = nextArg;
                i++;
                break;
            case '--output':
            case '-o':
                if (nextArg) config.slashDir = nextArg;
                i++;
                break;
            case '--delay':
            case '-d':
                if (nextArg) config.delay = parseInt(nextArg);
                i++;
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
                break;
        }
    }
}

// Show help message
function showHelp() {
    log('Discord Command Converter', colors.bright + colors.cyan);
    log('Converts Discord.js prefix commands to slash commands using OpenAI\n', colors.white);
    
    log('Usage:', colors.bright);
    log('  node converter.js [options]\n');
    
    log('Options:', colors.bright);
    log('  -m, --model <model>       OpenAI model to use (default: gpt-3.5-turbo)');
    log('  -e, --endpoint <url>      Custom API endpoint (default: OpenAI)');
    log('  -k, --api-key <key>       API key (or set OPENAI_API_KEY env var)');
    log('  -s, --source <dir>        Source directory (default: ./commands/PrefixCommands)');
    log('  -o, --output <dir>        Output directory (default: ./commands/SlashCommands)');
    log('  -d, --delay <ms>          Delay between requests (default: 1000)');
    log('  -h, --help                Show this help message');
    
    log('\nExamples:', colors.bright);
    log('  node converter.js --model gpt-4 --delay 2000');
    log('  node converter.js --endpoint https://api.openai.com/v1 --api-key your-key');
}

// Main execution
if (require.main === module) {
    parseArguments();
    
    convertCommands().catch(error => {
        logError(`Script failed: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { convertCommand, getAllJSFiles, config };
