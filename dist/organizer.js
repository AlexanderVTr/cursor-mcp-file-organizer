"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
class FileOrganizer {
    constructor(configPath) {
        this.config = require(configPath);
    }
    async ensureDirectoryExists(dirPath) {
        try {
            await fs_1.promises.access(dirPath);
        }
        catch {
            await fs_1.promises.mkdir(dirPath, { recursive: true });
        }
    }
    getFileExtension(fileName) {
        return path_1.default.extname(fileName).toLowerCase();
    }
    async getDestinationPath(filePath, rule) {
        const fileName = path_1.default.basename(filePath);
        const date = new Date();
        const dateStr = date.toISOString().split("T")[0];
        let destination = rule.destination.replace("~", os_1.default.homedir());
        if (this.config.rules.downloads.options.organizeByDate) {
            destination = path_1.default.join(destination, dateStr);
        }
        await this.ensureDirectoryExists(destination);
        return path_1.default.join(destination, fileName);
    }
    async fileExists(filePath) {
        try {
            await fs_1.promises.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    async moveFile(source, destination) {
        if (await this.fileExists(destination)) {
            if (this.config.rules.downloads.options.skipExistingFiles) {
                console.log(`Skipping existing file: ${path_1.default.basename(destination)}`);
                return;
            }
            // Add timestamp to filename if file exists
            const ext = path_1.default.extname(destination);
            const base = path_1.default.basename(destination, ext);
            const timestamp = new Date().getTime();
            destination = path_1.default.join(path_1.default.dirname(destination), `${base}_${timestamp}${ext}`);
        }
        if (this.config.rules.downloads.options.moveInsteadOfCopy) {
            await fs_1.promises.rename(source, destination);
            console.log(`Moved: ${path_1.default.basename(source)} -> ${path_1.default.basename(destination)}`);
        }
        else {
            await fs_1.promises.copyFile(source, destination);
            console.log(`Copied: ${path_1.default.basename(source)} -> ${path_1.default.basename(destination)}`);
        }
    }
    async organizeDownloads() {
        const downloadsPath = this.config.rules.downloads.path.replace("~", os_1.default.homedir());
        try {
            const files = await fs_1.promises.readdir(downloadsPath);
            let organizedCount = 0;
            let skippedCount = 0;
            let errorCount = 0;
            for (const file of files) {
                const filePath = path_1.default.join(downloadsPath, file);
                const stats = await fs_1.promises.stat(filePath);
                if (!stats.isFile())
                    continue;
                const extension = this.getFileExtension(file);
                let fileOrganized = false;
                for (const [category, rule] of Object.entries(this.config.rules.downloads.organizeBy)) {
                    if (rule.extensions.includes(extension)) {
                        try {
                            const destinationPath = await this.getDestinationPath(filePath, rule);
                            await this.moveFile(filePath, destinationPath);
                            fileOrganized = true;
                            organizedCount++;
                            break;
                        }
                        catch (error) {
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
        }
        catch (error) {
            console.error("Error organizing files:", error);
            throw error;
        }
    }
}
// Example usage
const organizer = new FileOrganizer("./mcp-config.json");
organizer.organizeDownloads().catch(console.error);
