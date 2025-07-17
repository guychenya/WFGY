# 🚀 TXT OS - IDE Setup Guide

## Overview
This comprehensive IDE setup enhances your development experience for the TXT OS project with optimized configurations, debugging tools, and automated workflows.

## 📁 Configuration Files Created

### 1. **settings.json** - Project Settings
- **Editor Configuration**: Optimized for web development with proper formatting, linting, and code completion
- **File Management**: Auto-save, trim whitespace, and proper file associations
- **Language Support**: Enhanced HTML, CSS, JavaScript, and JSON support
- **Git Integration**: Smart commit and sync settings
- **Live Server**: Configured for multiple port support
- **Theme & UI**: Dark theme with proper syntax highlighting

### 2. **extensions.json** - Recommended Extensions
Essential extensions for TXT OS development:
- **Live Server**: Real-time preview of your HTML changes
- **Auto Rename Tag**: Automatically rename paired HTML tags
- **Path Intellisense**: Intelligent path completion
- **Prettier**: Code formatting
- **GitLens**: Enhanced Git integration
- **Material Icon Theme**: Better file icons
- **GitHub Copilot**: AI-powered code completion
- **Spell Checker**: Prevents typos in code and comments
- **TODO Tree**: Track TODO comments across the project

### 3. **launch.json** - Debug Configurations
Multiple launch configurations for different scenarios:
- **🚀 Launch TXT OS (Modern)**: Debug modern interface (port 5500)
- **🎯 Launch TXT OS (Legacy)**: Debug legacy interface (port 5501)
- **🐍 Launch Python Server**: Debug Flask server
- **🔧 Debug Connection Test**: Test connection functionality
- **🐛 Debug Chat Interface**: Debug chat components
- **🔗 Attach to Chrome**: Attach to running Chrome instance
- **🔗 Attach to Node**: Attach to Node.js process

### 4. **tasks.json** - Automated Tasks
Pre-configured tasks for common operations:
- **serve-modern**: Start HTTP server for modern interface
- **serve-legacy**: Start HTTP server for legacy interface
- **serve-python-flask**: Start Flask development server
- **format-all**: Format HTML, CSS, JS, and JSON files
- **lint-js**: Run JavaScript linting with auto-fix
- **validate-html**: Validate HTML structure
- **git-status**: Quick git status check
- **deploy-netlify**: Deploy to Netlify
- **build-and-deploy**: Complete build and deployment pipeline

### 5. **WFGY-OS.code-workspace** - Workspace Configuration
Multi-folder workspace with:
- **Main Project**: Core TXT OS files
- **Project Images**: Image assets folder
- **Documentation**: Documentation files
- **Custom Theme**: TXT OS branded color scheme
- **Integrated Launch/Task Configs**: Workspace-specific debugging and tasks

## 🎨 Visual Features

### Custom Color Theme
The workspace includes a custom dark theme with TXT OS branding:
- **Primary Blue**: #1e40af (title bar, status bar)
- **Dark Background**: #0f172a (editor, terminal)
- **Accent Colors**: Blue theme with proper contrast
- **Syntax Highlighting**: Enhanced for web technologies

### UI Enhancements
- **Material Icon Theme**: Better file type recognition
- **Bracket Pair Colorization**: Easier code navigation
- **Indent Guides**: Visual code structure
- **Minimap**: Code overview panel
- **Breadcrumbs**: File/symbol navigation

## 🔧 Usage Instructions

### Opening the Workspace
1. Open VS Code
2. Go to `File > Open Workspace from File...`
3. Select `WFGY-OS.code-workspace`
4. Click \"Open Workspace\"

### Running the Application
1. **Method 1 - Using Debug Panel**:
   - Press `F5` or go to Run & Debug panel
   - Select \"🚀 Launch TXT OS (Modern)\"
   - Click the play button

2. **Method 2 - Using Tasks**:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type \"Tasks: Run Task\"
   - Select \"serve-modern\"

3. **Method 3 - Using Terminal**:
   - Open integrated terminal (`Ctrl+`` ` )
   - Run: `python3 -m http.server 5500`
   - Open browser to `http://localhost:5500/index-modern.html`

### Debugging Features
- **Breakpoints**: Click in the gutter to set breakpoints
- **Console**: Use browser dev tools integrated with VS Code
- **Variables**: Inspect variables in the debug panel
- **Call Stack**: View function call hierarchy
- **Watch**: Monitor specific variables or expressions

### Code Quality Tools
- **Format on Save**: Automatically formats code when saving
- **Auto-fix**: ESLint automatically fixes common issues
- **Spell Check**: Highlights spelling errors in comments and strings
- **TODO Tracking**: Automatically finds and organizes TODO comments

## 🚀 Development Workflow

### 1. Daily Development
```bash
# Start the development server
Ctrl+Shift+P → Tasks: Run Task → serve-modern

# Or use the debug configuration
F5 → Launch TXT OS (Modern)
```

### 2. Code Quality Check
```bash
# Format all files
Ctrl+Shift+P → Tasks: Run Task → format-all

# Lint JavaScript
Ctrl+Shift+P → Tasks: Run Task → lint-js
```

### 3. Testing
```bash
# Run connection tests
F5 → Debug Connection Test

# Debug chat interface
F5 → Debug Chat Interface
```

### 4. Deployment
```bash
# Build and deploy pipeline
Ctrl+Shift+P → Tasks: Run Task → build-and-deploy
```

## 🎯 Quick Commands

| Command | Action |
|---------|--------|
| `F5` | Start debugging |
| `Ctrl+Shift+P` | Open command palette |
| `Ctrl+`` ` | Open terminal |
| `Ctrl+Shift+E` | Open explorer |
| `Ctrl+Shift+F` | Global search |
| `Ctrl+Shift+G` | Git panel |
| `Ctrl+Shift+X` | Extensions panel |
| `Ctrl+Shift+D` | Debug panel |
| `Ctrl+K Ctrl+S` | Keyboard shortcuts |

## 📝 Customization

### Adding New Tasks
Edit `.vscode/tasks.json` to add custom build or deployment tasks.

### Modifying Launch Configurations
Edit `.vscode/launch.json` to add new debugging scenarios.

### Workspace Settings
Edit `WFGY-OS.code-workspace` to modify workspace-specific settings.

### Theme Customization
Modify the `workbench.colorCustomizations` section in the workspace file to change colors.

## 🔍 Troubleshooting

### Common Issues

1. **Server Won't Start**
   - Check if port 5500 is available
   - Try different port in task configuration
   - Ensure Python 3 is installed

2. **Debugging Not Working**
   - Check Chrome is installed
   - Verify server is running
   - Clear browser cache

3. **Extensions Not Loading**
   - Reload VS Code window (`Ctrl+Shift+P` → \"Reload Window\")
   - Check extension recommendations
   - Install missing extensions manually

### Performance Tips
- Close unused tabs to improve performance
- Use workspace folders to organize files
- Enable auto-save to prevent data loss
- Use integrated terminal for better workflow

## 🌟 Advanced Features

### Multi-Root Workspace
- Separate folders for different project aspects
- Independent settings per folder
- Better organization for large projects

### Compound Launch Configurations
- Launch multiple services simultaneously
- Full-stack debugging (Frontend + Backend)
- Integrated testing environments

### Custom Color Themes
- TXT OS branded interface
- Improved readability
- Consistent visual identity

### Automated Workflows
- Pre-configured build pipelines
- Automated formatting and linting
- One-click deployment

## 📚 Additional Resources

- [VS Code Documentation](https://code.visualstudio.com/docs)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Live Server Extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
- [GitLens Extension](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens)

---

**Happy Coding! 🎉**

This IDE setup is specifically tailored for the TXT OS project to provide the best development experience possible. All configurations are optimized for web development with modern tools and workflows.