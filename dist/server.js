"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = require("fs");
const os_1 = __importDefault(require("os"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// SSE endpoint for Cursor IDE
app.get("/sse", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    // Send initial connection established message
    res.write('data: {"type": "connection_established"}\n\n');
    // Keep connection alive
    const keepAlive = setInterval(() => {
        res.write('data: {"type": "ping"}\n\n');
    }, 30000);
    // Clean up on client disconnect
    req.on("close", () => {
        clearInterval(keepAlive);
    });
});
// Helper function to resolve paths
function resolvePath(filePath) {
    return filePath.replace(/^~/, os_1.default.homedir());
}
// File system operations
async function listDirectory(dirPath) {
    try {
        const resolvedPath = resolvePath(dirPath);
        const files = await fs_1.promises.readdir(resolvedPath);
        return files;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to list directory: ${error.message}`);
        }
        throw new Error("Failed to list directory: Unknown error");
    }
}
async function readFile(filePath) {
    try {
        const resolvedPath = resolvePath(filePath);
        const content = await fs_1.promises.readFile(resolvedPath, "utf-8");
        return content;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to read file: ${error.message}`);
        }
        throw new Error("Failed to read file: Unknown error");
    }
}
async function writeFile(filePath, content) {
    try {
        const resolvedPath = resolvePath(filePath);
        await fs_1.promises.writeFile(resolvedPath, content, "utf-8");
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to write file: ${error.message}`);
        }
        throw new Error("Failed to write file: Unknown error");
    }
}
async function moveFile(source, destination) {
    try {
        const resolvedSource = resolvePath(source);
        const resolvedDestination = resolvePath(destination);
        await fs_1.promises.rename(resolvedSource, resolvedDestination);
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to move file: ${error.message}`);
        }
        throw new Error("Failed to move file: Unknown error");
    }
}
// MCP Protocol handler
app.post("/mcp", async (req, res) => {
    const request = req.body;
    let response;
    try {
        switch (request.command) {
            case "listDir":
                const files = await listDirectory(request.args.path);
                response = { success: true, data: files };
                break;
            case "readFile":
                const content = await readFile(request.args.path);
                response = { success: true, data: content };
                break;
            case "writeFile":
                await writeFile(request.args.path, request.args.content);
                response = { success: true };
                break;
            case "moveFile":
                await moveFile(request.args.source, request.args.destination);
                response = { success: true };
                break;
            default:
                response = {
                    success: false,
                    error: `Unknown command: ${request.command}`,
                };
        }
    }
    catch (error) {
        if (error instanceof Error) {
            response = {
                success: false,
                error: error.message,
            };
        }
        else {
            response = {
                success: false,
                error: "Unknown error occurred",
            };
        }
    }
    res.json(response);
});
// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});
// Start server
app.listen(port, () => {
    console.log(`MCP Server running at http://localhost:${port}`);
    console.log("Available commands:");
    console.log("- listDir: List directory contents");
    console.log("- readFile: Read file contents");
    console.log("- writeFile: Write content to file");
    console.log("- moveFile: Move file to new location");
});
