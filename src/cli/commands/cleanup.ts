import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

interface CleanupOptions {
  days?: string;
  'dry-run'?: boolean;
}

export async function cleanupCommand(
  directory: string | undefined,
  options: CleanupOptions
): Promise<void> {
  try {
    const dir = directory || './output/articles';
    const days = parseInt(options.days || '30', 10) || 30;
    const dryRun = options['dry-run'] || false;

    // Check if directory exists
    try {
      await fs.access(dir);
    } catch {
      console.log(chalk.yellow(`\n📁 No articles directory found at ${dir}\n`));
      return;
    }

    const now = Date.now();
    const threshold = now - days * 24 * 60 * 60 * 1000;
    let deletedCount = 0;
    let deletedSize = 0;

    // Recursively find and delete old files
    async function cleanDirectory(currentPath: string): Promise<void> {
      const files = await fs.readdir(currentPath, { withFileTypes: true });

      for (const file of files) {
        const fullPath = path.join(currentPath, file.name);
        const stats = await fs.stat(fullPath);

        if (file.isDirectory()) {
          await cleanDirectory(fullPath);
        } else if (stats.mtime.getTime() < threshold) {
          if (!dryRun) {
            await fs.unlink(fullPath);
          }
          deletedCount++;
          deletedSize += stats.size;
          console.log(chalk.yellow(`  Delete: ${fullPath}`));
        }
      }
    }

    console.log(
      chalk.cyan(`\n🗑️  Cleaning articles older than ${days} days...${dryRun ? ' (DRY RUN)' : ''}\n`)
    );

    await cleanDirectory(dir);

    if (deletedCount > 0) {
      const sizeMB = (deletedSize / 1024 / 1024).toFixed(2);
      console.log(
        chalk.green(
          `\n✅ Cleanup complete: Removed ${deletedCount} files (${sizeMB} MB)${dryRun ? ' [DRY RUN]' : ''}\n`
        )
      );
    } else {
      console.log(chalk.green('\n✅ No articles to clean up\n'));
    }
  } catch (error) {
    console.error(chalk.red('Error during cleanup:'), error instanceof Error ? error.message : error);
    throw error;
  }
}
