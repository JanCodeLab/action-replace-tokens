const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    // Get inputs
    const files = core.getInput('files').split(',').map(file => file.trim());
    const tokenStart = core.getInput('token-start');
    const tokenEnd = core.getInput('token-end');
    const failOnMissing = core.getInput('fail-on-missing').toLowerCase() === 'true';
    
    // Validate inputs
    if (files.length === 0 || files[0] === '') {
      throw new Error('No files specified for token replacement');
    }
    
    core.info(`🔍 Replacing tokens in ${files.length} file(s)`);
    core.info(`Token delimiter: ${tokenStart}...${tokenEnd}`);
    
    // Process each file
    for (const file of files) {
      core.info(`Processing file: ${file}`);
      
      if (!fs.existsSync(file)) {
        const message = `File not found: ${file}`;
        if (failOnMissing) {
          throw new Error(message);
        } else {
          core.warning(message);
          continue;
        }
      }
      
      let content;
      try {
        content = fs.readFileSync(file, 'utf8');
      } catch (error) {
        throw new Error(`Failed to read file ${file}: ${error.message}`);
      }
      
      // Find all tokens in the file
      const tokenRegex = new RegExp(`${escapeRegExp(tokenStart)}(.*?)${escapeRegExp(tokenEnd)}`, 'g');
      let match;
      let replacedContent = content;
      const missingTokens = [];
      
      while ((match = tokenRegex.exec(content)) !== null) {
        const fullToken = match[0];
        const tokenName = match[1];
        
        // Try to get token value from GitHub variables, secrets, and env
        let tokenValue;
        
        // First try GitHub variables
        try {
          tokenValue = github.context.repo[tokenName];
        } catch (error) {
          // Not found in repo variables
        }
        
        // Then try secrets and environment variables
        if (tokenValue === undefined) {
          tokenValue = process.env[tokenName];
        }
        
        // If token value is found, replace it in the content
        if (tokenValue !== undefined) {
          replacedContent = replacedContent.replace(fullToken, tokenValue);
          core.debug(`Replaced token: ${tokenName}`);
        } else {
          missingTokens.push(tokenName);
          core.warning(`Token not found: ${tokenName}`);
        }
      }
      
      // Handle missing tokens
      if (missingTokens.length > 0) {
        if (failOnMissing) {
          throw new Error(`Missing token values for: ${missingTokens.join(', ')}`);
        } else {
          core.warning(`Tokens without values: ${missingTokens.join(', ')}`);
        }
      }
      
      // Write the updated content back to the file
      try {
        fs.writeFileSync(file, replacedContent, 'utf8');
        core.info(`✅ Successfully processed ${file}`);
      } catch (error) {
        throw new Error(`Failed to write file ${file}: ${error.message}`);
      }
    }
    
    core.info('✅ Token replacement completed successfully');
    
  } catch (error) {
    core.setFailed(error.message);
  }
}

// Helper function to escape special characters for use in a regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

run();