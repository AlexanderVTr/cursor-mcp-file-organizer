import { promises as fs } from "fs";
import path from "path";
import os from "os";

interface FileRule {
  extensions: string[];
  destination: string;
}

interface OrganizeOptions {
  createDestinationFolders: boolean;
  moveInsteadOfCopy: boolean;
  organizeByDate: boolean;
  dateFormat: string;
  keepOriginalExtension: boolean;
  skipExistingFiles: boolean;
}

interface DownloadsConfig {
  path: string;
  organizeBy: Record<string, FileRule>;
  options: OrganizeOptions;
}

interface MCPConfig {
  version: string;
  rules: {
    downloads: DownloadsConfig;
  };
}

class FileOrganizer {
  private config: MCPConfig;

  constructor(configPath: string) {
    this.config = require(configPath);
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private getFileExtension(fileName: string): string {
    return path.extname(fileName).toLowerCase();
  }

  private async getDestinationPath(
    filePath: string,
    rule: FileRule
  ): Promise<string> {
    const fileName = path.basename(filePath);
    const date = new Date();
    const dateStr = date.toISOString().split("T")[0];

    let destination = rule.destination.replace("~", os.homedir());

    if (this.config.rules.downloads.options.organizeByDate) {
      destination = path.join(destination, dateStr);
    }

    await this.ensureDirectoryExists(destination);
    return path.join(destination, fileName);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async moveFile(source: string, destination: string): Promise<void> {
    if (await this.fileExists(destination)) {
      if (this.config.rules.downloads.options.skipExistingFiles) {
        console.log(`Skipping existing file: ${path.basename(destination)}`);
        return;
      }

      // Add timestamp to filename if file exists
      const ext = path.extname(destination);
      const base = path.basename(destination, ext);
      const timestamp = new Date().getTime();
      destination = path.join(
        path.dirname(destination),
        `${base}_${timestamp}${ext}`
      );
    }

    if (this.config.rules.downloads.options.moveInsteadOfCopy) {
      await fs.rename(source, destination);
      console.log(
        `Moved: ${path.basename(source)} -> ${path.basename(destination)}`
      );
    } else {
      await fs.copyFile(source, destination);
      console.log(
        `Copied: ${path.basename(source)} -> ${path.basename(destination)}`
      );
    }
  }

  public async organizeDownloads(): Promise<void> {
    const downloadsPath = this.config.rules.downloads.path.replace(
      "~",
      os.homedir()
    );

    try {
      const files = await fs.readdir(downloadsPath);
      let organizedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const file of files) {
        const filePath = path.join(downloadsPath, file);
        const stats = await fs.stat(filePath);

        if (!stats.isFile()) continue;

        const extension = this.getFileExtension(file);
        let fileOrganized = false;

        for (const [category, rule] of Object.entries(
          this.config.rules.downloads.organizeBy
        )) {
          if (rule.extensions.includes(extension)) {
            try {
              const destinationPath = await this.getDestinationPath(
                filePath,
                rule
              );
              await this.moveFile(filePath, destinationPath);
              fileOrganized = true;
              organizedCount++;
              break;
            } catch (error) {
              console.error(`Error processing ${file}:`, error);
              errorCount++;
            }
          }
        }

        if (!fileOrganized) {
          skippedCount++;
          console.log(`Skipped: ${file} (no matching category)`);
        }
      }

      console.log("\nOrganization Summary:");
      console.log(`Total files processed: ${files.length}`);
      console.log(`Successfully organized: ${organizedCount}`);
      console.log(`Skipped: ${skippedCount}`);
      console.log(`Errors: ${errorCount}`);
    } catch (error) {
      console.error("Error organizing files:", error);
      throw error;
    }
  }
}

// Example usage
const organizer = new FileOrganizer("./mcp-config.json");
organizer.organizeDownloads().catch(console.error);
