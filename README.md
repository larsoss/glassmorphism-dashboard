# 🌟 Glassmorphism Dashboard

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/release/larsz-o/glassmorphism-dashboard.svg)](https://github.com/larsz-o/glassmorphism-dashboard/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A beautiful, fully configurable smart home dashboard card for Home Assistant with a modern glassmorphism design.

![Dashboard Preview](images/preview.png)

## ✨ Features

- **🎨 Glassmorphism Design** - Modern frosted glass aesthetic with blur effects
- **🏠 Room Management** - Organize devices by room with easy tab navigation
- **⚙️ Visual Configuration** - Add/remove entities through an intuitive UI (no YAML required!)
- **💡 Multi-device Support** - Lights, climate, media players, sensors, and switches
- **🔄 Live Updates** - Real-time state synchronization with Home Assistant
- **💾 Persistent Storage** - Configuration saved in browser localStorage
- **🇳🇱 Dutch Interface** - Native Dutch language labels
- **📱 Responsive** - Works on desktop, tablet, and mobile

## 📦 Installation

### HACS (Recommended)

1. Open HACS in Home Assistant
2. Click on "Frontend"
3. Click the three dots in the top right corner
4. Select "Custom repositories"
5. Add this repository URL: `https://github.com/larsz-o/glassmorphism-dashboard`
6. Select category: "Lovelace"
7. Click "Add"
8. Find "Glassmorphism Dashboard" and click "Download"
9. Restart Home Assistant

### Manual Installation

1. Download `glassmorphism-dashboard.js` from the [latest release](https://github.com/larsz-o/glassmorphism-dashboard/releases)
2. Copy it to your `config/www` folder
3. Add the resource in Home Assistant:
   - Go to Settings → Dashboards → Resources
   - Click "Add Resource"
   - URL: `/local/glassmorphism-dashboard.js`
   - Resource type: JavaScript Module

## 🚀 Usage

### Basic Configuration

Add the card to your dashboard:

```yaml
type: custom:glassmorphism-dashboard
location: Enschede
weather_entity: weather.home
energy_entity: sensor.daily_energy
```

### Full Configuration Options

```yaml
type: custom:glassmorphism-dashboard
location: Enschede                        # Location name shown in header
weather_entity: weather.buienradar        # Weather entity for temperature/humidity
energy_entity: sensor.stroom_dag          # Energy sensor for daily consumption
storage_key: my_dashboard_config          # Custom localStorage key (optional)
```

### Panel Mode (Recommended)

For the best experience, use the card in panel mode:

1. Go to Settings → Dashboards
2. Create a new dashboard or edit existing
3. Add a new view
4. Set view type to "Panel (1 card)"
5. Add the Glassmorphism Dashboard card

## 🎛️ Using the Dashboard

### Edit Mode

1. Click the **✏️ pencil button** in the top right to enter edit mode
2. In edit mode you can:
   - **Add entities** - Click "+ Toevoegen" in any section
   - **Remove entities** - Click the red × on any device card
   - **Add rooms** - Click "+ Kamer" at the bottom
   - **Remove rooms** - Click × on room tabs
3. Click the pencil button again to exit edit mode

### Room Navigation

- Click on room tabs at the bottom to switch between rooms
- Each room has its own set of configured entities
- Configuration is stored per-browser (not synced between devices)

### Device Controls

- **Lights/Switches**: Click to toggle, or use the toggle switch
- **Climate**: Use +/- buttons to adjust temperature
- **Media**: Play/pause and skip controls

## 🎨 Customization

The dashboard uses CSS custom properties that you can override:

```yaml
type: custom:glassmorphism-dashboard
# ... your config
card_mod:
  style: |
    :host {
      --glass-bg: rgba(30, 35, 50, 0.85);
      --accent: #00BCD4;
    }
```

### Available CSS Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `--glass-bg` | `rgba(30, 35, 50, 0.75)` | Card background color |
| `--glass-border` | `rgba(255, 255, 255, 0.1)` | Card border color |
| `--accent` | `#4FC3F7` | Accent color (buttons, active states) |
| `--success` | `#4CAF50` | Success color |
| `--danger` | `#f44336` | Danger/remove color |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Roadmap

- [ ] Card configuration editor in HA UI
- [ ] Theme presets (dark, light, colorful)
- [ ] Drag & drop entity ordering
- [ ] Custom icons per entity
- [ ] Sync configuration across devices
- [ ] English language option
- [ ] Scene/script support

## 🐛 Known Issues

- Configuration is stored in browser localStorage, not synced between devices
- Some older browsers may not support backdrop-filter (glassmorphism effect)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by modern iOS/macOS glassmorphism design
- Built for the Home Assistant community
- Thanks to all contributors!

---

Made with ❤️ by [Lars](https://github.com/larsz-o) | [AllSetProfessional](https://allsetprofessional.com)
