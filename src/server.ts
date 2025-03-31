import express, { Request, Response } from "express";
import cors from "cors";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const app = express();
const port = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Status endpoint for Cursor IDE
app.get("/status", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    version: "1.0.0",
    capabilities: ["file_system", "text_operations"],
    server_time: new Date().toISOString(),
    protocol: "sse",
  });
});

// SSE endpoint for Cursor IDE
app.get("/sse", (req: Request, res: Response) => {
  // Set CORS headers specifically for SSE
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // Handle OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Send initial connection established message
  const initialMessage = {
    type: "connection_established",
    timestamp: new Date().toISOString(),
    server_info: {
      version: "1.0.0",
      capabilities: ["file_system", "text_operations"],
    },
  };
  res.write(
    `event: connection_established\ndata: ${JSON.stringify(initialMessage)}\n\n`
  );

  // Keep connection alive with ping messages
  const keepAlive = setInterval(() => {
    const pingMessage = {
      type: "ping",
      timestamp: new Date().toISOString(),
    };
    res.write(`event: ping\ndata: ${JSON.stringify(pingMessage)}\n\n`);
  }, 30000);

  // Handle client disconnect
  req.on("close", () => {
    clearInterval(keepAlive);
    console.log("Client disconnected from SSE");
  });

  // Handle errors
  req.on("error", () => {
    clearInterval(keepAlive);
    console.log("SSE connection error");
  });
});

// Helper function to resolve paths
function resolvePath(filePath: string): string {
  return filePath.replace(/^~/, os.homedir());
}

// MCP Protocol endpoints
interface MCPRequest {
  command: string;
  args: any;
}

interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface FileMove {
  source: string;
  destination: string;
}

// File system operations
async function listDirectory(dirPath: string): Promise<string[]> {
  try {
    const resolvedPath = resolvePath(dirPath);
    const files = await fs.readdir(resolvedPath);
    return files;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
    throw new Error("Failed to list directory: Unknown error");
  }
}

async function readFile(filePath: string): Promise<string> {
  try {
    const resolvedPath = resolvePath(filePath);
    const content = await fs.readFile(resolvedPath, "utf-8");
    return content;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
    throw new Error("Failed to read file: Unknown error");
  }
}

async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    const resolvedPath = resolvePath(filePath);
    await fs.writeFile(resolvedPath, content, "utf-8");
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
    throw new Error("Failed to write file: Unknown error");
  }
}

async function moveFile(source: string, destination: string): Promise<void> {
  try {
    const resolvedSource = resolvePath(source);
    const resolvedDestination = resolvePath(destination);
    await fs.rename(resolvedSource, resolvedDestination);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to move file: ${error.message}`);
    }
    throw new Error("Failed to move file: Unknown error");
  }
}

async function createDirectory(dirPath: string): Promise<void> {
  try {
    const resolvedPath = resolvePath(dirPath);
    await fs.mkdir(resolvedPath, { recursive: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to create directory: ${error.message}`);
    }
    throw new Error("Failed to create directory: Unknown error");
  }
}

async function moveFilesByType(
  files: string[],
  sourceDir: string,
  targetDir: string,
  extensions: string[]
): Promise<FileMove[]> {
  const moves: FileMove[] = [];

  for (const file of files) {
    const ext = file.toLowerCase().split(".").pop() || "";
    if (extensions.includes(ext)) {
      moves.push({
        source: path.join(sourceDir, file),
        destination: path.join(targetDir, file),
      });
    }
  }

  return moves;
}

// MCP Protocol handler
app.post("/mcp", async (req: Request, res: Response) => {
  const request: MCPRequest = req.body;
  let response: MCPResponse;

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

      case "createDir":
        await createDirectory(request.args.path);
        response = { success: true };
        break;

      case "organizeFiles":
        const sourceDir = resolvePath(request.args.sourceDir);
        const allFiles = await listDirectory(request.args.sourceDir);

        // Define file types and their extensions
        const fileTypes = {
          documents: ["pdf", "doc", "docx", "rtf", "txt", "xlsx", "xls", "csv"],
          images: ["png", "jpg", "jpeg", "gif", "svg", "webp", "avif", "heic"],
          books: ["epub", "mobi", "fb2"],
          archives: ["zip", "rar", "7z", "tar", "gz"],
          videos: ["mp4", "mov", "avi", "mkv"],
        };

        // Create category directories
        for (const category of Object.keys(fileTypes)) {
          const categoryDir = path.join(
            sourceDir,
            category.charAt(0).toUpperCase() + category.slice(1)
          );
          await createDirectory(categoryDir);
        }

        // Move files by category
        const moves: FileMove[] = [];
        for (const [category, extensions] of Object.entries(fileTypes)) {
          const categoryDir = path.join(
            sourceDir,
            category.charAt(0).toUpperCase() + category.slice(1)
          );
          const categoryMoves = await moveFilesByType(
            allFiles,
            sourceDir,
            categoryDir,
            extensions
          );
          moves.push(...categoryMoves);
        }

        // Move remaining files to Others
        const othersDir = path.join(sourceDir, "Others");
        await createDirectory(othersDir);

        const movedFiles = new Set(
          moves.map((move) => path.basename(move.source))
        );
        const remainingFiles = allFiles.filter(
          (file) =>
            !movedFiles.has(file) &&
            file !== ".DS_Store" &&
            file !== ".localized" &&
            !Object.keys(fileTypes)
              .map((cat) => cat.charAt(0).toUpperCase() + cat.slice(1))
              .includes(file)
        );

        for (const file of remainingFiles) {
          moves.push({
            source: path.join(sourceDir, file),
            destination: path.join(othersDir, file),
          });
        }

        // Execute moves
        for (const move of moves) {
          try {
            await moveFile(move.source, move.destination);
          } catch (error) {
            console.error(`Failed to move ${move.source}: ${error}`);
          }
        }

        response = {
          success: true,
          data: {
            totalFiles: allFiles.length,
            movedFiles: moves.length,
            categories: Object.keys(fileTypes).concat(["Others"]),
          },
        };
        break;

      default:
        response = {
          success: false,
          error: `Unknown command: ${request.command}`,
        };
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      response = {
        success: false,
        error: error.message,
      };
    } else {
      response = {
        success: false,
        error: "Unknown error occurred",
      };
    }
  }

  res.json(response);
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
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
  console.log("- createDir: Create directory");
  console.log("- organizeFiles: Organize files by type");
});
