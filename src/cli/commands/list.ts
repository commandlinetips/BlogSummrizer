import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

interface ListOptions {
  sort?: string;
  limit?: string;
}

interface ArticleInfo {
  name: string;
  path: string;
  size: number;
  modified: Date;
  title?: string;
}

export async function listArticles(
  directory: string | undefined,
  options: ListOptions
): Promise<void> {
  try {
    const dir = directory || './output/articles';

    // Check if directory exists
    try {
      await fs.access(dir);
    } catch {
      console.log(chalk.yellow(`\n📁 No articles directory found at ${dir}\n`));
      return;
    }

    // Get all markdown files
    const files = await fs.readdir(dir);
    const articles: ArticleInfo[] = [];

    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);

        // Try to extract title from file
        let title = file.replace(/\.(original_|summarised_)?/g, '').replace(/\.md$/, '');

        articles.push({
          name: file,
          path: filePath,
          size: stats.size,
          modified: stats.mtime,
          title,
        });
      }
    }

    if (articles.length === 0) {
      console.log(chalk.yellow('\n📭 No articles found\n'));
      return;
    }

    // Sort articles
    const sortBy = options.sort || 'date';
    if (sortBy === 'date') {
      articles.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    } else if (sortBy === 'title') {
      articles.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'size') {
      articles.sort((a, b) => b.size - a.size);
    }

    // Limit results
    const limit = parseInt(options.limit || '10', 10) || 10;
    const displayArticles = articles.slice(0, limit);

    // Format output
    console.log(chalk.bold.cyan(`\n📚 Extracted Articles (${articles.length} total)\n`));
    console.log(chalk.gray('Name'.padEnd(40)) + chalk.gray('Size'.padEnd(12)) + chalk.gray('Modified'));
    console.log(chalk.gray('─'.repeat(70)));

    for (const article of displayArticles) {
      const sizeKB = (article.size / 1024).toFixed(1);
      const modified = article.modified.toLocaleDateString();
      console.log(
        chalk.green(article.name.padEnd(40)) +
          chalk.cyan(`${sizeKB}KB`.padEnd(12)) +
          chalk.gray(modified)
      );
    }

    if (articles.length > limit) {
      console.log(chalk.gray(`\n... and ${articles.length - limit} more articles`));
    }

    console.log('');
  } catch (error) {
    console.error(chalk.red('Error listing articles:'), error instanceof Error ? error.message : error);
    throw error;
  }
}
