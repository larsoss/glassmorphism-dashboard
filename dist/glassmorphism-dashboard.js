/**
 * Glassmorphism Dashboard Card for Home Assistant
 * 
 * A beautiful, configurable smart home dashboard with glassmorphism design.
 * 
 * Features:
 * - Room-based organization with tabs
 * - Configurable entities per room (lights, climate, media, sensors, switches)
 * - Live state updates
 * - Edit mode for easy configuration
 * - Persistent storage in browser localStorage
 * - Dutch language interface
 * 
 * @author Lars Altorf
 * @version 1.0.0
 * @license MIT
 */

const CARD_VERSION = '1.0.2';

console.info(
  `%c GLASSMORPHISM-DASHBOARD %c v${CARD_VERSION} `,
  'color: white; background: #4FC3F7; font-weight: bold;',
  'color: #4FC3F7; background: white; font-weight: bold;'
);

class GlassmorphismDashboard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = {};
    this._activeRoom = 0;
    this._editMode = false;
    this._modal = null;
    this._modalData = null;
    this._updateInterval = null;
  }

  // ============================================
  // LIFECYCLE METHODS
  // ============================================

  setConfig(config) {
    this._config = {
      location: config.location || 'Home',
      weather_entity: config.weather_entity || '',
      energy_entity: config.energy_entity || '',
      storage_key: config.storage_key || 'glassmorphism_dashboard_rooms',
      ...config
    };
    
    this.loadRoomConfig();
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    this._updateInterval = setInterval(() => this.updateTime(), 1000);
  }

  disconnectedCallback() {
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
    }
  }

  // ============================================
  // STORAGE METHODS
  // ============================================

  loadRoomConfig() {
    try {
      const saved = localStorage.getItem(this._config.storage_key);
      if (saved) {
        this._rooms = JSON.parse(saved);
      } else {
        this._rooms = this.getDefaultRooms();
        this.saveRoomConfig();
      }
    } catch (e) {
      console.error('Glassmorphism Dashboard: Error loading room config:', e);
      this._rooms = this.getDefaultRooms();
    }
  }

  saveRoomConfig() {
    try {
      localStorage.setItem(this._config.storage_key, JSON.stringify(this._rooms));
    } catch (e) {
      console.error('Glassmorphism Dashboard: Error saving room config:', e);
    }
  }

  getDefaultRooms() {
    return [
      {
        id: 'woonkamer',
        name: 'Woonkamer',
        icon: 'mdi:sofa',
        lights: [],
        climate: [],
        media: [],
        sensors: [],
        switches: []
      },
      {
        id: 'slaapkamer',
        name: 'Slaapkamer',
        icon: 'mdi:bed',
        lights: [],
        climate: [],
        media: [],
        sensors: [],
        switches: []
      },
      {
        id: 'keuken',
        name: 'Keuken',
        icon: 'mdi:silverware-fork-knife',
        lights: [],
        climate: [],
        media: [],
        sensors: [],
        switches: []
      }
    ];
  }

  // ============================================
  // ENTITY HELPER METHODS
  // ============================================

  getState(entityId) {
    return this._hass?.states?.[entityId];
  }

  callService(domain, service, data) {
    this._hass?.callService(domain, service, data);
  }

  toggleEntity(entityId) {
    const state = this.getState(entityId);
    if (!state) return;
    
    const domain = entityId.split('.')[0];
    
    if (domain === 'climate') {
      const newMode = state.state === 'off' ? 'heat_cool' : 'off';
      this.callService('climate', 'set_hvac_mode', { 
        entity_id: entityId, 
        hvac_mode: newMode 
      });
    } else {
      this.callService('homeassistant', 'toggle', { entity_id: entityId });
    }
  }

  setTemperature(entityId, temperature) {
    this.callService('climate', 'set_temperature', { 
      entity_id: entityId, 
      temperature: temperature 
    });
  }

  mediaControl(entityId, action) {
    const actions = {
      'play': 'media_play',
      'pause': 'media_pause',
      'next': 'media_next_track',
      'prev': 'media_previous_track'
    };
    
    if (actions[action]) {
      this.callService('media_player', actions[action], { entity_id: entityId });
    }
  }

  getAvailableEntities(domain) {
    if (!this._hass) return [];
    
    return Object.keys(this._hass.states)
      .filter(id => id.startsWith(domain + '.'))
      .map(id => ({
        entity_id: id,
        name: this._hass.states[id].attributes.friendly_name || id,
        state: this._hass.states[id].state
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // ============================================
  // ROOM MANAGEMENT
  // ============================================

  addEntityToRoom(entityId, category) {
    const room = this._rooms[this._activeRoom];
    if (!room[category]) room[category] = [];
    
    if (!room[category].includes(entityId)) {
      room[category].push(entityId);
      this.saveRoomConfig();
      this.render();
    }
  }

  removeEntityFromRoom(entityId, category) {
    const room = this._rooms[this._activeRoom];
    if (room[category]) {
      room[category] = room[category].filter(id => id !== entityId);
      this.saveRoomConfig();
      this.render();
    }
  }

  addRoom(name) {
    const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    this._rooms.push({
      id,
      name,
      icon: 'mdi:home',
      lights: [],
      climate: [],
      media: [],
      sensors: [],
      switches: []
    });
    this.saveRoomConfig();
    this._activeRoom = this._rooms.length - 1;
    this.render();
  }

  removeRoom(index) {
    if (this._rooms.length > 1) {
      this._rooms.splice(index, 1);
      if (this._activeRoom >= this._rooms.length) {
        this._activeRoom = this._rooms.length - 1;
      }
      this.saveRoomConfig();
      this.render();
    }
  }

  // ============================================
  // UI HELPERS
  // ============================================

  updateTime() {
    const timeEl = this.shadowRoot?.querySelector('.time-display');
    const dateEl = this.shadowRoot?.querySelector('.date-display');
    
    if (timeEl && dateEl) {
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString('nl-NL', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      dateEl.textContent = now.toLocaleDateString('nl-NL', { 
        weekday: 'long',
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    }
  }

  getWeatherIcon(state) {
    const icons = {
      'sunny': '☀️',
      'clear-night': '🌙',
      'cloudy': '☁️',
      'partlycloudy': '⛅',
      'rainy': '🌧️',
      'pouring': '🌧️',
      'snowy': '❄️',
      'snowy-rainy': '🌨️',
      'fog': '🌫️',
      'hail': '🌨️',
      'lightning': '⚡',
      'lightning-rainy': '⛈️',
      'windy': '💨',
      'windy-variant': '💨',
      'exceptional': '⚠️'
    };
    return icons[state] || '🌤️';
  }

  getCategoryLabel(category) {
    const labels = {
      lights: 'Verlichting',
      climate: 'Klimaat',
      media: 'Media',
      sensors: 'Sensoren',
      switches: 'Schakelaars'
    };
    return labels[category] || category;
  }

  getCategoryIcon(category) {
    const icons = {
      lights: '💡',
      climate: '❄️',
      media: '🔊',
      sensors: '📊',
      switches: '🔌'
    };
    return icons[category] || '📦';
  }

  getCategoryDomain(category) {
    const domains = {
      lights: 'light',
      climate: 'climate',
      media: 'media_player',
      sensors: 'sensor',
      switches: 'switch'
    };
    return domains[category] || category;
  }

  // ============================================
  // RENDER METHODS
  // ============================================

  render() {
    if (!this._hass || !this._rooms) return;

    const room = this._rooms[this._activeRoom];
    const weather = this.getState(this._config.weather_entity);
    const energy = this.getState(this._config.energy_entity);

    const now = new Date();
    const timeStr = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('nl-NL', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    // Get entities for current room
    const lights = (room.lights || []).map(id => this.getState(id)).filter(Boolean);
    const climates = (room.climate || []).map(id => this.getState(id)).filter(Boolean);
    const mediaPlayers = (room.media || []).map(id => this.getState(id)).filter(Boolean);
    const sensors = (room.sensors || []).map(id => this.getState(id)).filter(Boolean);
    const switches = (room.switches || []).map(id => this.getState(id)).filter(Boolean);

    // Calculate stats
    const lightsOn = lights.filter(l => l.state === 'on').length;
    const climatesActive = climates.filter(c => c.state !== 'off').length;

    this.shadowRoot.innerHTML = `
      <style>${this.getStyles()}</style>
      
      <div class="dashboard">
        <!-- HEADER -->
        <header class="header glass-card">
          <div class="header-left">
            <div class="date-display">${dateStr}</div>
            <div class="time-display">${timeStr}</div>
          </div>
          
          <div class="header-center">
            <h1 class="room-title">${room.name}</h1>
            <div class="room-stats">
              ${lights.length > 0 ? `
                <span class="stat-pill ${lightsOn > 0 ? 'active' : ''}">
                  💡 ${lightsOn}/${lights.length}
                </span>
              ` : ''}
              ${climates.length > 0 ? `
                <span class="stat-pill ${climatesActive > 0 ? 'active' : ''}">
                  ❄️ ${climatesActive}/${climates.length}
                </span>
              ` : ''}
            </div>
          </div>
          
          <div class="header-right">
            ${weather ? `
              <div class="weather-widget">
                <div class="weather-temp">
                  ${weather.attributes.temperature ?? '-'}°C
                </div>
                <div class="weather-icon">
                  ${this.getWeatherIcon(weather.state)}
                </div>
              </div>
            ` : ''}
            <button class="edit-button ${this._editMode ? 'active' : ''}" id="edit-toggle">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
          </div>
        </header>

        <!-- STATS BAR -->
        <div class="stats-bar">
          ${energy ? `
            <div class="stat-card glass-card">
              <span class="stat-icon">⚡</span>
              <div class="stat-content">
                <span class="stat-value">${parseFloat(energy.state).toFixed(2)}</span>
                <span class="stat-label">kWh vandaag</span>
              </div>
            </div>
          ` : ''}
          ${weather ? `
            <div class="stat-card glass-card">
              <span class="stat-icon">💧</span>
              <div class="stat-content">
                <span class="stat-value">${weather.attributes.humidity ?? '-'}%</span>
                <span class="stat-label">Luchtvochtigheid</span>
              </div>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-icon">🌡️</span>
              <div class="stat-content">
                <span class="stat-value">${Math.round(weather.attributes.pressure) || '-'}</span>
                <span class="stat-label">hPa</span>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- MAIN CONTENT -->
        <main class="main-content glass-card">
          ${this.renderSection('lights', lights)}
          ${this.renderSection('climate', climates)}
          ${this.renderSection('media', mediaPlayers)}
          ${this.renderSection('sensors', sensors)}
          ${this.renderSection('switches', switches)}
        </main>

        <!-- ROOM TABS -->
        <nav class="room-tabs">
          ${this._rooms.map((r, i) => `
            <button class="room-tab ${i === this._activeRoom ? 'active' : ''}" data-room="${i}">
              ${r.name}
              ${this._editMode && this._rooms.length > 1 ? `
                <span class="tab-remove" data-room-remove="${i}">×</span>
              ` : ''}
            </button>
          `).join('')}
          ${this._editMode ? `
            <button class="room-tab add-room" id="add-room-btn">+ Kamer</button>
          ` : ''}
        </nav>

        <!-- MODALS -->
        ${this._modal === 'entity' ? this.renderEntityModal() : ''}
        ${this._modal === 'room' ? this.renderRoomModal() : ''}
      </div>
    `;

    this.attachEventListeners();
  }

  renderSection(category, entities) {
    const domain = this.getCategoryDomain(category);
    
    return `
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">
            ${this.getCategoryIcon(category)} ${this.getCategoryLabel(category)}
          </h2>
          ${this._editMode ? `
            <button class="add-entity-btn" data-category="${category}" data-domain="${domain}">
              + Toevoegen
            </button>
          ` : ''}
        </div>
        <div class="devices-grid ${category === 'sensors' ? 'sensors-grid' : ''}">
          ${entities.length === 0 ? `
            <div class="empty-state">
              Geen ${this.getCategoryLabel(category).toLowerCase()} toegevoegd
            </div>
          ` : ''}
          ${entities.map(entity => this.renderEntity(entity, category)).join('')}
        </div>
      </section>
    `;
  }

  renderEntity(entity, category) {
    switch (category) {
      case 'lights':
      case 'switches':
        return this.renderToggleDevice(entity, category);
      case 'climate':
        return this.renderClimateDevice(entity, category);
      case 'media':
        return this.renderMediaDevice(entity, category);
      case 'sensors':
        return this.renderSensor(entity, category);
      default:
        return '';
    }
  }

  renderToggleDevice(entity, category) {
    const isOn = entity.state === 'on';
    const icon = category === 'lights' ? (isOn ? '💡' : '🔌') : '🔌';
    
    return `
      <div class="device-card ${isOn ? 'active' : ''}" data-entity="${entity.entity_id}">
        ${this._editMode ? `
          <button class="remove-btn" data-entity="${entity.entity_id}" data-category="${category}">×</button>
        ` : ''}
        <div class="device-icon ${isOn ? 'glow' : ''}">${icon}</div>
        <div class="device-name">${entity.attributes.friendly_name || entity.entity_id}</div>
        <div class="device-state">${isOn ? 'Aan' : 'Uit'}</div>
        <div class="toggle ${isOn ? 'on' : 'off'}" data-toggle="${entity.entity_id}">
          <div class="toggle-knob"></div>
        </div>
      </div>
    `;
  }

  renderClimateDevice(entity, category) {
    const isOn = entity.state !== 'off';
    const targetTemp = entity.attributes.temperature || 20;
    const currentTemp = entity.attributes.current_temperature || '-';
    
    return `
      <div class="device-card climate-card ${isOn ? 'active' : ''}" data-entity="${entity.entity_id}">
        ${this._editMode ? `
          <button class="remove-btn" data-entity="${entity.entity_id}" data-category="${category}">×</button>
        ` : ''}
        <div class="climate-header">
          <div class="device-name">${entity.attributes.friendly_name || entity.entity_id}</div>
          <div class="toggle ${isOn ? 'on' : 'off'}" data-toggle="${entity.entity_id}">
            <div class="toggle-knob"></div>
          </div>
        </div>
        <div class="climate-display">
          <div class="current-temp">${currentTemp}°</div>
          <div class="target-temp">
            <button class="temp-btn" data-temp-entity="${entity.entity_id}" data-temp="${targetTemp - 0.5}">−</button>
            <span>${targetTemp}°C</span>
            <button class="temp-btn" data-temp-entity="${entity.entity_id}" data-temp="${targetTemp + 0.5}">+</button>
          </div>
        </div>
        <div class="device-state">
          ${entity.state}${entity.attributes.hvac_action ? ` • ${entity.attributes.hvac_action}` : ''}
        </div>
      </div>
    `;
  }

  renderMediaDevice(entity, category) {
    const isPlaying = entity.state === 'playing';
    const title = entity.attributes.media_title || 'Geen media';
    const artist = entity.attributes.media_artist || '';
    
    return `
      <div class="device-card media-card ${isPlaying ? 'active' : ''}" data-entity="${entity.entity_id}">
        ${this._editMode ? `
          <button class="remove-btn" data-entity="${entity.entity_id}" data-category="${category}">×</button>
        ` : ''}
        <div class="media-info">
          <div class="device-name">${entity.attributes.friendly_name || entity.entity_id}</div>
          <div class="media-title">${title}</div>
          ${artist ? `<div class="media-artist">${artist}</div>` : ''}
        </div>
        <div class="media-controls">
          <button class="media-btn" data-media="${entity.entity_id}" data-action="prev">⏮</button>
          <button class="media-btn play-btn" data-media="${entity.entity_id}" data-action="${isPlaying ? 'pause' : 'play'}">
            ${isPlaying ? '⏸' : '▶'}
          </button>
          <button class="media-btn" data-media="${entity.entity_id}" data-action="next">⏭</button>
        </div>
      </div>
    `;
  }

  renderSensor(entity, category) {
    return `
      <div class="sensor-card" data-entity="${entity.entity_id}">
        ${this._editMode ? `
          <button class="remove-btn" data-entity="${entity.entity_id}" data-category="${category}">×</button>
        ` : ''}
        <div class="sensor-value">
          ${entity.state}
          <span class="sensor-unit">${entity.attributes.unit_of_measurement || ''}</span>
        </div>
        <div class="sensor-name">${entity.attributes.friendly_name || entity.entity_id}</div>
      </div>
    `;
  }

  renderEntityModal() {
    const domain = this._modalData?.domain || 'light';
    const category = this._modalData?.category || 'lights';
    const entities = this.getAvailableEntities(domain);
    const currentEntities = this._rooms[this._activeRoom][category] || [];

    return `
      <div class="modal-overlay" id="entity-modal">
        <div class="modal glass-card">
          <div class="modal-header">
            <h3>Selecteer ${this.getCategoryLabel(category)}</h3>
            <button class="close-btn" id="close-entity-modal">×</button>
          </div>
          <div class="modal-search">
            <input type="text" placeholder="Zoeken..." id="entity-search" />
          </div>
          <div class="entity-list">
            ${entities.map(entity => `
              <div class="entity-item ${currentEntities.includes(entity.entity_id) ? 'selected' : ''}" 
                   data-entity-select="${entity.entity_id}" data-category="${category}">
                <div class="entity-info">
                  <div class="entity-name">${entity.name}</div>
                  <div class="entity-id">${entity.entity_id}</div>
                </div>
                <div class="entity-state">${entity.state}</div>
                ${currentEntities.includes(entity.entity_id) ? 
                  '<span class="entity-check">✓</span>' : 
                  '<span class="entity-add">+</span>'}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderRoomModal() {
    return `
      <div class="modal-overlay" id="room-modal">
        <div class="modal glass-card small">
          <div class="modal-header">
            <h3>Nieuwe Kamer</h3>
            <button class="close-btn" id="close-room-modal">×</button>
          </div>
          <div class="modal-body">
            <input type="text" placeholder="Kamer naam..." id="room-name-input" />
            <button class="primary-btn" id="save-room-btn">Toevoegen</button>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  attachEventListeners() {
    // Edit mode toggle
    this.shadowRoot.querySelector('#edit-toggle')?.addEventListener('click', () => {
      this._editMode = !this._editMode;
      this.render();
    });

    // Room tabs
    this.shadowRoot.querySelectorAll('.room-tab[data-room]').forEach(tab => {
      tab.addEventListener('click', (e) => {
        if (e.target.hasAttribute('data-room-remove')) {
          e.stopPropagation();
          const index = parseInt(e.target.dataset.roomRemove);
          if (confirm(`Weet je zeker dat je "${this._rooms[index].name}" wilt verwijderen?`)) {
            this.removeRoom(index);
          }
        } else {
          this._activeRoom = parseInt(tab.dataset.room);
          this.render();
        }
      });
    });

    // Add room button
    this.shadowRoot.querySelector('#add-room-btn')?.addEventListener('click', () => {
      this._modal = 'room';
      this.render();
    });

    // Add entity buttons
    this.shadowRoot.querySelectorAll('.add-entity-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._modalData = {
          category: btn.dataset.category,
          domain: btn.dataset.domain
        };
        this._modal = 'entity';
        this.render();
      });
    });

    // Remove entity buttons
    this.shadowRoot.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeEntityFromRoom(btn.dataset.entity, btn.dataset.category);
      });
    });

    // Toggle switches
    this.shadowRoot.querySelectorAll('.toggle[data-toggle]').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleEntity(toggle.dataset.toggle);
      });
    });

    // Device cards (click to toggle)
    this.shadowRoot.querySelectorAll('.device-card[data-entity]').forEach(card => {
      card.addEventListener('click', () => {
        if (!this._editMode) {
          this.toggleEntity(card.dataset.entity);
        }
      });
    });

    // Temperature buttons
    this.shadowRoot.querySelectorAll('.temp-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setTemperature(btn.dataset.tempEntity, parseFloat(btn.dataset.temp));
      });
    });

    // Media buttons
    this.shadowRoot.querySelectorAll('.media-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.mediaControl(btn.dataset.media, btn.dataset.action);
      });
    });

    // Entity modal
    this.shadowRoot.querySelector('#close-entity-modal')?.addEventListener('click', () => {
      this._modal = null;
      this._modalData = null;
      this.render();
    });

    this.shadowRoot.querySelector('#entity-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'entity-modal') {
        this._modal = null;
        this._modalData = null;
        this.render();
      }
    });

    // Entity search
    this.shadowRoot.querySelector('#entity-search')?.addEventListener('input', (e) => {
      const search = e.target.value.toLowerCase();
      this.shadowRoot.querySelectorAll('.entity-item').forEach(item => {
        const name = item.querySelector('.entity-name').textContent.toLowerCase();
        const id = item.querySelector('.entity-id').textContent.toLowerCase();
        item.style.display = (name.includes(search) || id.includes(search)) ? 'flex' : 'none';
      });
    });

    // Entity selection
    this.shadowRoot.querySelectorAll('.entity-item[data-entity-select]').forEach(item => {
      item.addEventListener('click', () => {
        const entityId = item.dataset.entitySelect;
        const category = item.dataset.category;
        const currentEntities = this._rooms[this._activeRoom][category] || [];
        
        if (currentEntities.includes(entityId)) {
          this.removeEntityFromRoom(entityId, category);
        } else {
          this.addEntityToRoom(entityId, category);
        }
      });
    });

    // Room modal
    this.shadowRoot.querySelector('#close-room-modal')?.addEventListener('click', () => {
      this._modal = null;
      this.render();
    });

    this.shadowRoot.querySelector('#room-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'room-modal') {
        this._modal = null;
        this.render();
      }
    });

    this.shadowRoot.querySelector('#save-room-btn')?.addEventListener('click', () => {
      const input = this.shadowRoot.querySelector('#room-name-input');
      const name = input?.value?.trim();
      if (name) {
        this.addRoom(name);
        this._modal = null;
        this.render();
      }
    });

    this.shadowRoot.querySelector('#room-name-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.shadowRoot.querySelector('#save-room-btn')?.click();
      }
    });
  }

  // ============================================
  // STYLES
  // ============================================

  getStyles() {
    return `
      :host {
        display: block;
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #fff;
        --glass-bg: rgba(20, 25, 40, 0.85);
        --glass-border: rgba(255, 255, 255, 0.1);
        --accent: #4FC3F7;
        --accent-glow: rgba(79, 195, 247, 0.4);
        --success: #4CAF50;
        --danger: #f44336;
      }
      
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      .dashboard {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        min-height: 100vh;
        padding: 20px;
      }
      
      .glass-card {
        background: var(--glass-bg);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 20px;
        border: 1px solid var(--glass-border);
      }
      
      /* HEADER */
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        margin-bottom: 16px;
      }
      
      .header-left .date-display {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 4px;
        text-transform: capitalize;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
      }
      
      .header-left .time-display {
        font-size: 42px;
        font-weight: 200;
        letter-spacing: -1px;
        text-shadow: 0 3px 6px rgba(0, 0, 0, 0.8);
      }
      
      .header-center {
        text-align: center;
      }
      
      .room-title {
        font-size: 28px;
        font-weight: 600;
        margin-bottom: 8px;
        text-shadow: 0 3px 6px rgba(0, 0, 0, 0.8);
      }
      
      .room-stats {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
      
      .stat-pill {
        padding: 4px 12px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        font-size: 12px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      }
      
      .stat-pill.active {
        background: rgba(79, 195, 247, 0.3);
        color: var(--accent);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      }
      
      .header-right {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      
      .weather-widget {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .weather-temp {
        font-size: 28px;
        font-weight: 300;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
      }
      
      .weather-icon {
        font-size: 36px;
      }
      
      .edit-button {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
        color: rgba(255, 255, 255, 0.9);
      }
      
      .edit-button:hover,
      .edit-button.active {
        background: var(--accent);
        color: #1a1a2e;
      }
      
      /* STATS BAR */
      .stats-bar {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }
      
      .stat-card {
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .stat-icon {
        font-size: 28px;
      }
      
      .stat-content {
        display: flex;
        flex-direction: column;
      }
      
      .stat-value {
        font-size: 22px;
        font-weight: 500;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
      }
      
      .stat-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.8);
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
      }
      
      /* MAIN CONTENT */
      .main-content {
        padding: 20px;
        margin-bottom: 16px;
      }
      
      .section {
        margin-bottom: 24px;
      }
      
      .section:last-child {
        margin-bottom: 0;
      }
      
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      
      .section-title {
        font-size: 16px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
      }
      
      .add-entity-btn {
        padding: 6px 14px;
        background: rgba(79, 195, 247, 0.2);
        border: 1px solid var(--accent);
        border-radius: 8px;
        color: var(--accent);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .add-entity-btn:hover {
        background: var(--accent);
        color: #1a1a2e;
      }
      
      .devices-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
      }
      
      .sensors-grid {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      }
      
      .empty-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 24px;
        color: rgba(255, 255, 255, 0.7);
        font-size: 13px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
      }
      
      /* DEVICE CARDS */
      .device-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 16px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s;
        position: relative;
      }
      
      .device-card:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .device-card.active {
        background: rgba(79, 195, 247, 0.15);
        border: 1px solid rgba(79, 195, 247, 0.3);
      }
      
      .device-icon {
        font-size: 32px;
        margin-bottom: 8px;
      }
      
      .device-icon.glow {
        filter: drop-shadow(0 0 8px rgba(255, 200, 50, 0.8));
      }
      
      .device-name {
        font-size: 13px;
        font-weight: 500;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
      }
      
      .device-state {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 10px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
      }
      
      .remove-btn {
        position: absolute;
        top: 6px;
        right: 6px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--danger);
        border: none;
        color: white;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
      }
      
      /* TOGGLE */
      .toggle {
        width: 44px;
        height: 24px;
        border-radius: 12px;
        cursor: pointer;
        position: relative;
        transition: all 0.3s ease;
        margin: 0 auto;
      }
      
      .toggle.on {
        background: var(--accent);
      }
      
      .toggle.off {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .toggle-knob {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #fff;
        position: absolute;
        top: 3px;
        transition: left 0.3s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
      
      .toggle.on .toggle-knob {
        left: 23px;
      }
      
      .toggle.off .toggle-knob {
        left: 3px;
      }
      
      /* CLIMATE CARD */
      .climate-card {
        text-align: left;
      }
      
      .climate-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      
      .climate-header .toggle {
        margin: 0;
      }
      
      .climate-display {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      
      .current-temp {
        font-size: 36px;
        font-weight: 300;
      }
      
      .target-temp {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 18px;
      }
      
      .temp-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      
      .temp-btn:hover {
        background: var(--accent);
        color: #1a1a2e;
      }
      
      /* MEDIA CARD */
      .media-card {
        text-align: left;
      }
      
      .media-info {
        margin-bottom: 12px;
      }
      
      .media-title {
        font-size: 14px;
        font-weight: 500;
        margin-top: 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .media-artist {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
      }
      
      .media-controls {
        display: flex;
        justify-content: center;
        gap: 8px;
      }
      
      .media-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .media-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .media-btn.play-btn {
        width: 44px;
        height: 44px;
        background: var(--accent);
        color: #1a1a2e;
      }
      
      /* SENSOR CARD */
      .sensor-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 16px;
        text-align: center;
        position: relative;
      }
      
      .sensor-value {
        font-size: 24px;
        font-weight: 500;
        margin-bottom: 4px;
      }
      
      .sensor-unit {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
      }
      
      .sensor-name {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      /* ROOM TABS */
      .room-tabs {
        display: flex;
        justify-content: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      
      .room-tab {
        padding: 12px 24px;
        border-radius: 24px;
        border: none;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: inherit;
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.7);
        position: relative;
      }
      
      .room-tab:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      
      .room-tab.active {
        background: var(--accent);
        color: #1a1a2e;
        font-weight: 600;
      }
      
      .room-tab.add-room {
        background: rgba(79, 195, 247, 0.2);
        color: var(--accent);
        border: 1px dashed var(--accent);
      }
      
      .tab-remove {
        margin-left: 8px;
        opacity: 0.6;
      }
      
      .tab-remove:hover {
        opacity: 1;
        color: var(--danger);
      }
      
      /* MODAL */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 20px;
      }
      
      .modal {
        width: 100%;
        max-width: 500px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
      }
      
      .modal.small {
        max-width: 350px;
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid var(--glass-border);
      }
      
      .modal-header h3 {
        font-size: 18px;
        font-weight: 600;
      }
      
      .close-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .close-btn:hover {
        background: var(--danger);
      }
      
      .modal-search {
        padding: 16px 20px;
        border-bottom: 1px solid var(--glass-border);
      }
      
      .modal-search input,
      .modal-body input {
        width: 100%;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid var(--glass-border);
        border-radius: 12px;
        color: white;
        font-size: 14px;
        outline: none;
      }
      
      .modal-search input::placeholder,
      .modal-body input::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }
      
      .modal-search input:focus,
      .modal-body input:focus {
        border-color: var(--accent);
      }
      
      .modal-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .entity-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px 20px 20px;
      }
      
      .entity-item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .entity-item:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .entity-item.selected {
        background: rgba(79, 195, 247, 0.2);
        border: 1px solid var(--accent);
      }
      
      .entity-info {
        flex: 1;
      }
      
      .entity-name {
        font-size: 14px;
        font-weight: 500;
      }
      
      .entity-id {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
      }
      
      .entity-state {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        margin-right: 12px;
      }
      
      .entity-check {
        color: var(--success);
        font-size: 18px;
      }
      
      .entity-add {
        color: var(--accent);
        font-size: 18px;
      }
      
      .primary-btn {
        padding: 14px 24px;
        background: var(--accent);
        border: none;
        border-radius: 12px;
        color: #1a1a2e;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .primary-btn:hover {
        filter: brightness(1.1);
      }
      
      /* RESPONSIVE */
      @media (max-width: 768px) {
        .header {
          flex-direction: column;
          gap: 16px;
          text-align: center;
        }
        
        .header-left,
        .header-right {
          width: 100%;
          justify-content: center;
        }
        
        .stats-bar {
          grid-template-columns: 1fr;
        }
        
        .devices-grid {
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        }
      }
    `;
  }

  // ============================================
  // CARD CONFIG
  // ============================================

  getCardSize() {
    return 10;
  }

  static getStubConfig() {
    return {
      location: 'Home',
      weather_entity: '',
      energy_entity: ''
    };
  }

  static getConfigElement() {
    return document.createElement('glassmorphism-dashboard-editor');
  }
}

// Register the card
customElements.define('glassmorphism-dashboard', GlassmorphismDashboard);

// Register with HACS/HA card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'glassmorphism-dashboard',
  name: 'Glassmorphism Dashboard',
  description: 'A beautiful, configurable smart home dashboard with glassmorphism design',
  preview: true,
  documentationURL: 'https://github.com/larsz-o/glassmorphism-dashboard'
});

console.info('Glassmorphism Dashboard loaded successfully');
