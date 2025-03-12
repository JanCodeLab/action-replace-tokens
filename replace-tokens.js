const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs");
const path = require("path");

async function run() {
  try {
    // Get inputs
    const files = core
      .getInput("files")
      .split(",")
      .map((file) => file.trim());
    const tokenStart = core.getInput("token-start");
    const tokenEnd = core.getInput("token-end");
    const failOnMissing = core.getInput("fail-on-missing").toLowerCase() === "true";
    const githubToken = core.getInput("github-token");

    // Validate inputs
    if (files.length === 0 || files[0] === "") {
      core.info("No files specified for token replacement");
      return;
    }

    // Initialize octokit client if token is provided
    let octokit = null;
    if (githubToken) {
      octokit = github.getOctokit(githubToken);
      core.debug("GitHub API client initialized");
    }

    if (!octokit) {
      core.warning(
        "Not connected to GitHub API. Tokens will be replaced only from environment variables"
      );
    }

    core.info(`🔍 Replacing tokens in ${files.length} file(s)`);
    core.info(`Token delimiter: ${tokenStart}...${tokenEnd}`);

    // Process each file
    for (const file of files) {
      core.info(`Processing file: ${file}`);

      if (!fs.existsSync(file)) {
        core.warning(`File not found: ${file}`);
        continue;
      }

      let content;
      try {
        content = fs.readFileSync(file, "utf8");
      } catch (error) {
        throw new Error(`Failed to read file ${file}: ${error.message}`);
      }

      // Find all tokens in the file
      const tokenRegex = new RegExp(
        `${escapeRegExp(tokenStart)}(.*?)${escapeRegExp(tokenEnd)}`,
        "g"
      );
      let match;
      let replacedContent = content;
      const missingTokens = [];

      while ((match = tokenRegex.exec(content)) !== null) {
        const fullToken = match[0];
        const tokenName = match[1].trim();

        // Try to get token value in order of priority
        let tokenValue;

        // 1. Check for environment variables (which would be explicitly set in workflow)
        let envTokenValue = process.env[tokenName];
        if (envTokenValue !== undefined) {
          tokenValue = envTokenValue;
        }

        // 2. Try to get from GitHub repository variables via API (if token provided)
        if (tokenValue === undefined && octokit) {
          try {
            // Get repository variables
            // Note: This requires appropriate permissions on the token
            const repoVars = await octokit.rest.actions
              .getRepoVariable({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                name: tokenName,
              })
              .catch((e) => {
                core.debug(
                  `No repo variable found for ${tokenName}: ${e.message}`
                );
                return null;
              });

            if (repoVars && repoVars.data && repoVars.data.value) {
              tokenValue = repoVars.data.value;
              core.debug(`Found value in GitHub repo variables: ${tokenName}`);
            }
          } catch (error) {
            core.debug(
              `Error accessing repo variable ${tokenName}: ${error.message}`
            );
          }
        }

        // If token value is found, replace it in the content
        if (tokenValue !== undefined) {
          replacedContent = replacedContent.replace(fullToken, tokenValue);
          core.info(`Replaced token: ${tokenName}`);
        } else {
          missingTokens.push(tokenName);
          core.warning(`⚠️ Token not found: ${tokenName}`);
        }
      }

      // Handle missing tokens
      if (missingTokens.length > 0) {
        if (failOnMissing) {
          throw new Error(
            `Missing token values for: ${missingTokens.join(", ")}`
          );
        } else {
          core.warning(`⚠️ Tokens without values: ${missingTokens.join(", ")}`);
        }
      }

      // Write the updated content back to the file
      try {
        fs.writeFileSync(file, replacedContent, "utf8");
        core.info(`✅ Successfully processed ${file}`);
      } catch (error) {
        throw new Error(`Failed to write file ${file}: ${error.message}`);
      }
    }

    core.info("✅ Token replacement completed successfully");
  } catch (error) {
    core.setFailed(error.message);
  }
}

// Helper function to escape special characters for use in a regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

run();
