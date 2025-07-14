# TXT OS Web UI

A modern web interface for the TXT OS AI reasoning system with Ollama integration.

## Features

- **Chat Interface**: Clean, responsive chat UI similar to modern AI assistants
- **Semantic Tree Memory**: Visual representation of conversation memory with exportable data
- **Knowledge Boundary Detection**: Real-time monitoring of AI confidence levels
- **Ollama Integration**: Direct connection to local Ollama models
- **System Metrics**: Live monitoring of accuracy, memory depth, and boundary status

## Setup

1. **Start Ollama**: Make sure Ollama is running on your system
   ```bash
   ollama serve
   ```

2. **Open the UI**: Open `index.html` in your web browser

3. **Configure Connection**: 
   - Default Ollama URL: `http://127.0.0.1:11435`
   - Select your preferred model
   - Adjust temperature (default: 0.2)

4. **Test Connection**: Click "Test Connection" to verify Ollama connectivity

## Usage

### Basic Chat
- Type messages in the input field
- Press Enter or click send to submit
- Chat history is maintained throughout the session

### Special Commands
- `hello world` - Initialize TXT OS with full feature set
- `kbtest` - Run knowledge boundary detection test

### Features

#### Semantic Tree Memory
- Located in the left panel
- Shows conversation context and reasoning patterns
- Export memory data as JSON for analysis
- Automatically tracks semantic relationships

#### Knowledge Boundary Detection
- Real-time confidence monitoring
- Color-coded risk levels (Green: Safe, Yellow: Caution, Red: High Risk)
- Automatic detection of uncertain responses
- Visual indicators in the header

#### System Metrics
- **Knowledge Boundary**: Current risk assessment
- **Semantic Accuracy**: Performance enhancement (+22.4% baseline)
- **Memory Depth**: Number of active memory nodes

## Technical Details

### Architecture
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Backend**: Ollama API integration
- **Storage**: Local storage for settings, memory export available

### File Structure
```
OS/
├── index.html          # Main UI interface
├── styles.css          # Styling and responsive design
├── script.js           # Core functionality and Ollama integration
└── README-UI.md        # This documentation
```

### API Integration
The UI communicates with Ollama through its REST API:
- `GET /api/tags` - List available models
- `POST /api/generate` - Generate responses

### Memory System
- Semantic tree structure with weighted nodes
- Automatic context preservation
- Exportable memory snapshots
- Real-time visualization

## Customization

### Styling
Edit `styles.css` to customize:
- Color scheme and theming
- Layout and spacing
- Responsive breakpoints
- Animation effects

### Functionality
Modify `script.js` to add:
- Additional special commands
- Custom knowledge boundary rules
- Enhanced memory algorithms
- New metric calculations

## Troubleshooting

### Connection Issues
- Ensure Ollama is running: `ollama serve`
- Check firewall settings
- Verify URL in settings (default: `http://127.0.0.1:11435`)

### Performance
- Reduce temperature for more consistent responses
- Clear chat history to free memory
- Export and clear memory tree for large sessions

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- JavaScript must be enabled
- Local storage support required

## Future Enhancements

- Multi-model comparison
- Advanced memory search
- Custom knowledge boundary rules
- Integration with TXT modules (Blur, Blow, Blah)
- Real-time collaboration features
- Voice input/output support