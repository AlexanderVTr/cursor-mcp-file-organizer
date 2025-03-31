# Cursor MCP File Organizer

A Model Context Protocol (MCP) server for organizing files in your Downloads folder using Cursor IDE.

## Features

- Automatically organizes files in Downloads folder by type
- Supports multiple file categories:
  - Images (jpg, jpeg, png, gif, webp, svg, etc.)
  - Documents (pdf, doc, docx, txt, etc.)
  - Archives (zip, rar, 7z, tar, etc.)
  - Code files (js, ts, py, java, etc.)
  - Media files (mp4, mp3, wav, etc.)
  - Design files (psd, ai, sketch, etc.)
  - Databases (sql, sqlite, etc.)
  - Fonts (ttf, otf, woff, etc.)
- Configurable organization rules
- Real-time file system monitoring
- SSE (Server-Sent Events) support for live updates

## Prerequisites

- Node.js (v14 or higher)
- TypeScript
- Cursor IDE

## Installation

1. Clone the repository:

```bash
git clone https://github.com/AlexanderVTr/cursor-mcp-file-organizer.git
cd cursor-mcp-file-organizer
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

## Configuration

1. Configure Cursor IDE MCP settings:

```json
{
  "mcpServers": {
    "file-organizer": {
      "url": "http://localhost:3001",
      "port": 3001,
      "enabled": true,
      "description": "File organization MCP server"
    }
  }
}
```

2. Customize organization rules in `mcp-config.json`:

```json
{
  "version": "1.0",
  "rules": {
    "downloads": {
      "path": "~/Downloads",
      "organizeBy": {
        "images": {
          "extensions": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
          "destination": "~/Downloads/Pictures"
        }
        // ... other categories
      }
    }
  }
}
```

## Usage

1. Start the server:

```bash
npm start
```

2. Use Cursor IDE to send commands:

```typescript
// Example command to organize files
{
  command: "organizeFiles",
  args: {
    path: "~/Downloads"
  }
}
```

## Available Commands

- `listDir`: List directory contents
- `readFile`: Read file contents
- `writeFile`: Write content to file
- `moveFile`: Move file to new location
- `createDir`: Create directory
- `organizeFiles`: Organize files by type

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build the project
npm run build

# Start the server
npm start
```

## Project Structure

```
cursor-mcp-file-organizer/
├── src/
│   ├── server.ts      # Main server implementation
│   └── organizer.ts   # File organization logic
├── dist/             # Compiled JavaScript
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript configuration
└── mcp-config.json   # Organization rules
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Cursor IDE team for the MCP protocol
- Node.js community for the excellent tools and libraries
