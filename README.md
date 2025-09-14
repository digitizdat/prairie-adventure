# Prairie Adventure 🚙

A 3D prairie driving game built with Three.js featuring procedurally generated terrain, realistic physics, and immersive gameplay.

## 🎮 Features

- **Procedurally Generated Terrain**: Dynamic hilly prairie landscape with realistic collision detection
- **Drivable Vehicle**: Fully controllable jeep with physics-based movement and terrain following
- **Immersive Environment**: 
  - Scattered rocks, logs, and trees for visual interest
  - Atmospheric fog and realistic lighting with shadows
  - Dynamic sky and ambient lighting
- **Intuitive Controls**: WASD or arrow key driving with space bar braking
- **Camera System**: Smooth third-person camera that follows the vehicle
- **Real-time UI**: Live speedometer and control instructions
- **Responsive Design**: Full-screen gameplay with automatic window resizing

## 🛠️ Tech Stack

- **Three.js** (v0.128.0) - 3D graphics and rendering
- **Cannon.js** - Physics engine for realistic vehicle movement
- **Vanilla JavaScript** - Core game logic and controls
- **HTML5 Canvas** - WebGL rendering context
- **CSS3** - UI styling and responsive layout

## 🚀 Getting Started

### Prerequisites

- Modern web browser with WebGL support (Chrome, Firefox, Safari, Edge)
- Local web server (for development)

### Installation & Setup

1. **Clone or download the repository**
   ```bash
   git clone https://github.com/digitizdat/prairie-adventure
   cd prairie-adventure
   ```

2. **Serve the files locally**
   
   **Option A: Using Python (if installed)**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```
   
   **Option B: Using Node.js (if installed)**
   ```bash
   npx serve .
   ```
   
   **Option C: Using any other local server**
   - Use VS Code Live Server extension
   - Use any other local development server

3. **Open in browser**
   - Navigate to `http://localhost:8000` (or your server's URL)
   - Click anywhere on the screen to start playing

## 🎯 How to Play

### Controls
- **W / ↑** - Accelerate forward
- **S / ↓** - Reverse/brake
- **A / ←** - Turn left
- **D / →** - Turn right
- **Space** - Emergency brake
- **Mouse** - Look around (click to enable mouse lock)

### Gameplay
- Drive your jeep across the procedurally generated prairie terrain
- Navigate around rocks, logs, and trees scattered throughout the landscape
- Watch your speed on the speedometer in the top-left corner
- Enjoy the realistic physics as your vehicle follows the terrain contours
- Explore the vast prairie environment at your own pace

## 📁 Project Structure

```
prairie-adventure/
├── index.html          # Main HTML file with game container and UI
├── game.js             # Core game logic and Three.js implementation
├── cannon.min.js       # Physics engine (local copy)
├── LICENSE             # GPL-3.0 license
└── README.md           # This file
```

## 🔧 Development

### Key Components

- **PrairieDrivingGame Class**: Main game controller managing scene, camera, and game loop
- **Terrain Generation**: Procedural height map using sine/cosine functions
- **Vehicle Physics**: Position-based movement with terrain collision
- **Environment System**: Random placement of environmental objects
- **Camera Controller**: Third-person follow camera with smooth tracking

### Customization

You can easily modify the game by adjusting parameters in `game.js`:

- **Terrain size**: Change `this.terrainSize` (default: 200)
- **Terrain resolution**: Modify `this.terrainResolution` (default: 64)
- **Vehicle speed**: Adjust acceleration values in `updateVehicle()`
- **Environment density**: Change loop counts in `createEnvironment()`

## 🐛 Troubleshooting

**Game doesn't load:**
- Ensure you're serving files through a web server (not opening index.html directly)
- Check browser console for any JavaScript errors
- Verify WebGL support in your browser

**Controls not working:**
- Click on the game area to focus the window
- Check if browser has pointer lock permissions

**Performance issues:**
- Try reducing terrain resolution or environment object count
- Close other browser tabs to free up GPU resources

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs or suggest features
- Submit pull requests with improvements
- Share screenshots of your prairie adventures

## 🎨 Future Enhancements

Potential features for future development:
- Multiplayer support
- Vehicle customization
- Weather effects
- Day/night cycle
- Collectible items
- Sound effects and music
- Mobile touch controls

---

**Enjoy your prairie adventure!** 🌾
