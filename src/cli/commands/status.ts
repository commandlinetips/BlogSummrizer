import chalk from 'chalk';
import { Ora } from 'ora';
import { OllamaClient } from '../../services/OllamaClient.js';

export async function checkStatus(spinner: Ora): Promise<void> {
  try {
    spinner.text = chalk.blue('Checking Ollama server...');

    const ollamaClient = new OllamaClient();
    const isRunning = await ollamaClient.isRunning();

    if (!isRunning) {
      spinner.fail(chalk.red('Ollama server is not running'));
      console.log(
        chalk.yellow(
          '\n⚠️  To start Ollama, run: ollama serve\n'
        )
      );
      return;
    }

    spinner.text = chalk.blue('Retrieving available models...');

    const modelInfos = await ollamaClient.getAvailableModels();
    const models = modelInfos.map(m => m.name);

    spinner.succeed(chalk.green('System check complete'));

    // Display status
    console.log(chalk.bold.cyan('\n✅ System Status\n'));

    console.log(chalk.bold('Ollama Server:'));
    console.log(chalk.green(`  ✓ Running (http://localhost:11434)\n`));

    console.log(chalk.bold('Available Models:'));
    if (models.length === 0) {
      console.log(chalk.yellow('  ⚠️  No models installed\n'));
      console.log(chalk.gray('  To download a model, run: ollama pull <model-name>\n'));
    } else {
      for (const model of models) {
        console.log(chalk.green(`  ✓ ${model}`));
      }
      console.log('');
    }

    console.log(chalk.bold('Default Models (fallback chain):'));
    console.log(chalk.cyan('  1. llama3.1'));
    console.log(chalk.cyan('  2. mistral'));
    console.log(chalk.cyan('  3. qwen3:4b\n'));

    // Check if primary model is available
    const primaryModel = 'llama3.1';
    if (models.includes(primaryModel)) {
      console.log(chalk.green(`✓ Primary model (${primaryModel}) is ready\n`));
    } else {
      console.log(
        chalk.yellow(
          `⚠️  Primary model (${primaryModel}) not installed\n`
        )
      );
      console.log(chalk.gray(`   Run: ollama pull ${primaryModel}\n`));
    }
  } catch (error) {
    throw error;
  }
}
