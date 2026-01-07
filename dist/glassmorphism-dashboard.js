/**
 * Glassmorphism Dashboard Card for Home Assistant
 * 
 * A beautiful, configurable smart home dashboard with glassmorphism design.
 * 
 * @author Lars Altorf
 * @version 1.0.5
 * @license MIT
 */

const CARD_VERSION = '1.0.5';

console.info(
  '%c GLASSMORPHISM-DASHBOARD %c v' + CARD_VERSION + ' ',
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
        lights: [],
        climate: [],
        media: [],
        sensors: [],
        switches: []
      },
      {
        id: 'slaapkamer',
        name: 'Slaapkamer',
        lights: [],
        climate: [],
        media: [],
        sensors: [],
        switches: []
      },
      {
        id: 'keuken',
        name: 'Keuken',
        lights: [],
        climate: [],
        media: [],
        sensors: [],
        switches: []
      },
      {
        id: 'kantoor',
        name: 'Kantoor',
        lights: [],
        climate: [],
        media: [],
        sensors: [],
        switches: []
      },
      {
        id: 'zolder',
        name: 'Zolder',
        lights: [],
        climate: [],
        media: [],
        sensors: [],
        switches: []
      }
    ];
  }

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
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    }
  }

  getWeatherIcon(state) {
    const icons = {
      'sunny': '\u2600\uFE0F',
      'clear-night': '\uD83C\uDF19',
      'cloudy': '\u2601\uFE0F',
      'partlycloudy': '\u26C5',
      'rainy': '\uD83C\uDF27\uFE0F',
      'pouring': '\uD83C\uDF27\uFE0F',
      'snowy': '\u2744\uFE0F',
      'snowy-rainy': '\uD83C\uDF28\uFE0F',
      'fog': '\uD83C\uDF2B\uFE0F',
      'hail': '\uD83C\uDF28\uFE0F',
      'lightning': '\u26A1',
      'lightning-rainy': '\u26C8\uFE0F',
      'windy': '\uD83D\uDCA8',
      'windy-variant': '\uD83D\uDCA8',
      'exceptional': '\u26A0\uFE0F'
    };
    return icons[state] || '\uD83C\uDF24\uFE0F';
  }

  // SVG Icons als strings (voorkomt encoding problemen)
  getIcon(name) {
    const icons = {
      light: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zM9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z"/></svg>',
      climate: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M17 4h-1V2h-2v2H9V2H7v2H6C4.9 4 4 4.9 4 6v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H6V9h12v9z"/></svg>',
      media: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
      sensor: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>',
      switch: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"/></svg>',
      energy: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z"/></svg>',
      humidity: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/></svg>',
      pressure: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
      edit: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
      location: '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>',
      prev: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>',
      play: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>',
      pause: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
      next: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',
      close: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
      add: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>',
      check: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>'
    };
    return icons[name] || '';
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

  render() {
    if (!this._hass || !this._rooms) return;

    const room = this._rooms[this._activeRoom];
    const weather = this.getState(this._config.weather_entity);
    const energy = this.getState(this._config.energy_entity);

    const now = new Date();
    const timeStr = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('nl-NL', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    const lights = (room.lights || []).map(id => this.getState(id)).filter(Boolean);
    const climates = (room.climate || []).map(id => this.getState(id)).filter(Boolean);
    const mediaPlayers = (room.media || []).map(id => this.getState(id)).filter(Boolean);
    const sensors = (room.sensors || []).map(id => this.getState(id)).filter(Boolean);
    const switches = (room.switches || []).map(id => this.getState(id)).filter(Boolean);

    const lightsOn = lights.filter(l => l.state === 'on').length;
    const climatesActive = climates.filter(c => c.state !== 'off').length;

    const weatherTemp = weather?.attributes?.temperature ?? '-';
    const weatherHumidity = weather?.attributes?.humidity ?? '-';
    const weatherPressure = weather?.attributes?.pressure ? Math.round(weather.attributes.pressure) : '-';
    const energyValue = energy?.state ? parseFloat(energy.state).toFixed(2) : '-';

    this.shadowRoot.innerHTML = `
      <style>${this.getStyles()}</style>
      
      <div class="dashboard">
        <header class="header glass-card">
          <div class="header-left">
            <div class="date-display">${dateStr}</div>
            <div class="time-display">${timeStr}</div>
          </div>
          
          <div class="header-center">
            ${weather ? `
              <div class="weather-main">
                <span class="location-icon">${this.getIcon('location')}</span>
                <span class="location-name">${this._config.location}</span>
              </div>
              <div class="weather-temp-large">${weatherTemp}<span class="temp-unit">°C</span></div>
              <div class="weather-desc">Buiten Temperatuur</div>
            ` : `
              <h1 class="room-title">${room.name}</h1>
            `}
          </div>
          
          <div class="header-right">
            ${weather ? `
              <div class="weather-icon-large">${this.getWeatherIcon(weather.state)}</div>
            ` : ''}
            <button class="edit-button ${this._editMode ? 'active' : ''}" id="edit-toggle">
              ${this.getIcon('edit')}
            </button>
          </div>
        </header>

        <div class="stats-bar">
          ${energy ? `
            <div class="stat-card glass-card">
              <span class="stat-icon">${this.getIcon('energy')}</span>
              <div class="stat-content">
                <span class="stat-value">${energyValue}</span>
                <span class="stat-unit">kWh</span>
                <span class="stat-label">Verbruik Vandaag</span>
              </div>
            </div>
          ` : ''}
          ${weather ? `
            <div class="stat-card glass-card">
              <span class="stat-icon">${this.getIcon('humidity')}</span>
              <div class="stat-content">
                <span class="stat-value">${weatherHumidity}</span>
                <span class="stat-unit">%</span>
                <span class="stat-label">Luchtvochtigheid</span>
              </div>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-icon">${this.getIcon('pressure')}</span>
              <div class="stat-content">
                <span class="stat-value">${weatherPressure}</span>
                <span class="stat-unit">hPa</span>
                <span class="stat-label">Luchtdruk</span>
              </div>
            </div>
          ` : ''}
        </div>

        <main class="main-content glass-card">
          <h2 class="content-title">${room.name}</h2>
          ${this.renderSection('lights', lights)}
          ${this.renderSection('climate', climates)}
          ${this.renderSection('media', mediaPlayers)}
          ${this.renderSection('sensors', sensors)}
          ${this.renderSection('switches', switches)}
        </main>

        <nav class="room-tabs">
          ${this._rooms.map((r, i) => `
            <button class="room-tab ${i === this._activeRoom ? 'active' : ''}" data-room="${i}">
              ${r.name}
              ${this._editMode && this._rooms.length > 1 ? `
                <span class="tab-remove" data-room-remove="${i}">x</span>
              ` : ''}
            </button>
          `).join('')}
          ${this._editMode ? `
            <button class="room-tab add-room" id="add-room-btn">+</button>
          ` : ''}
        </nav>

        ${this._modal === 'entity' ? this.renderEntityModal() : ''}
        ${this._modal === 'room' ? this.renderRoomModal() : ''}
      </div>
    `;

    this.attachEventListeners();
  }

  renderSection(category, entities) {
    const domain = this.getCategoryDomain(category);
    const iconMap = {
      lights: 'light',
      climate: 'climate',
      media: 'media',
      sensors: 'sensor',
      switches: 'switch'
    };
    
    return `
      <section class="section">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">${this.getIcon(iconMap[category])}</span>
            ${this.getCategoryLabel(category)}
          </h3>
          ${this._editMode ? `
            <button class="add-entity-btn" data-category="${category}" data-domain="${domain}">
              ${this.getIcon('add')} Toevoegen
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
    const stateText = entity.state === 'unavailable' ? 'Niet beschikbaar' : (isOn ? 'Aan' : 'Uit');
    
    return `
      <div class="device-card ${isOn ? 'active' : ''}" data-entity="${entity.entity_id}">
        ${this._editMode ? `
          <button class="remove-btn" data-entity="${entity.entity_id}" data-category="${category}">x</button>
        ` : ''}
        <div class="device-icon ${isOn ? 'glow' : ''}">${this.getIcon(category === 'lights' ? 'light' : 'switch')}</div>
        <div class="device-name">${entity.attributes.friendly_name || entity.entity_id}</div>
        <div class="device-state">${stateText}</div>
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
          <button class="remove-btn" data-entity="${entity.entity_id}" data-category="${category}">x</button>
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
            <button class="temp-btn" data-temp-entity="${entity.entity_id}" data-temp="${targetTemp - 0.5}">-</button>
            <span>${targetTemp}°C</span>
            <button class="temp-btn" data-temp-entity="${entity.entity_id}" data-temp="${targetTemp + 0.5}">+</button>
          </div>
        </div>
        <div class="device-state">
          ${entity.state}${entity.attributes.hvac_action ? ' - ' + entity.attributes.hvac_action : ''}
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
          <button class="remove-btn" data-entity="${entity.entity_id}" data-category="${category}">x</button>
        ` : ''}
        <div class="media-info">
          <div class="device-name">${entity.attributes.friendly_name || entity.entity_id}</div>
          <div class="media-title">${title}</div>
          ${artist ? `<div class="media-artist">${artist}</div>` : ''}
        </div>
        <div class="media-controls">
          <button class="media-btn" data-media="${entity.entity_id}" data-action="prev">${this.getIcon('prev')}</button>
          <button class="media-btn play-btn" data-media="${entity.entity_id}" data-action="${isPlaying ? 'pause' : 'play'}">
            ${isPlaying ? this.getIcon('pause') : this.getIcon('play')}
          </button>
          <button class="media-btn" data-media="${entity.entity_id}" data-action="next">${this.getIcon('next')}</button>
        </div>
      </div>
    `;
  }

  renderSensor(entity, category) {
    const stateText = entity.state === 'unavailable' ? '-' : entity.state;
    return `
      <div class="sensor-card" data-entity="${entity.entity_id}">
        ${this._editMode ? `
          <button class="remove-btn" data-entity="${entity.entity_id}" data-category="${category}">x</button>
        ` : ''}
        <div class="sensor-value">
          ${stateText}
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
            <button class="close-btn" id="close-entity-modal">${this.getIcon('close')}</button>
          </div>
          <div class="modal-search">
            <input type="text" placeholder="Zoeken..." id="entity-search" />
          </div>
          <div class="entity-list">
            ${entities.length === 0 ? `
              <div class="empty-state">Geen ${this.getCategoryLabel(category).toLowerCase()} gevonden</div>
            ` : ''}
            ${entities.map(entity => `
              <div class="entity-item ${currentEntities.includes(entity.entity_id) ? 'selected' : ''}" 
                   data-entity-select="${entity.entity_id}" data-category="${category}">
                <div class="entity-info">
                  <div class="entity-name">${entity.name}</div>
                  <div class="entity-id">${entity.entity_id}</div>
                </div>
                <div class="entity-state">${entity.state}</div>
                ${currentEntities.includes(entity.entity_id) ? 
                  `<span class="entity-check">${this.getIcon('check')}</span>` : 
                  `<span class="entity-add">${this.getIcon('add')}</span>`}
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
            <button class="close-btn" id="close-room-modal">${this.getIcon('close')}</button>
          </div>
          <div class="modal-body">
            <input type="text" placeholder="Kamer naam..." id="room-name-input" />
            <button class="primary-btn" id="save-room-btn">Toevoegen</button>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Edit mode toggle
    const editBtn = this.shadowRoot.querySelector('#edit-toggle');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._editMode = !this._editMode;
        this.render();
      });
    }

    // Room tabs
    this.shadowRoot.querySelectorAll('.room-tab[data-room]').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        if (e.target.hasAttribute('data-room-remove')) {
          e.stopPropagation();
          const index = parseInt(e.target.dataset.roomRemove);
          if (confirm('Weet je zeker dat je "' + this._rooms[index].name + '" wilt verwijderen?')) {
            this.removeRoom(index);
          }
        } else {
          this._activeRoom = parseInt(tab.dataset.room);
          this.render();
        }
      });
    });

    // Add room button
    const addRoomBtn = this.shadowRoot.querySelector('#add-room-btn');
    if (addRoomBtn) {
      addRoomBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._modal = 'room';
        this.render();
      });
    }

    // Add entity buttons
    this.shadowRoot.querySelectorAll('.add-entity-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
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
        e.preventDefault();
        e.stopPropagation();
        this.removeEntityFromRoom(btn.dataset.entity, btn.dataset.category);
      });
    });

    // Toggle switches
    this.shadowRoot.querySelectorAll('.toggle[data-toggle]').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleEntity(toggle.dataset.toggle);
      });
    });

    // Device cards (click to toggle)
    this.shadowRoot.querySelectorAll('.device-card[data-entity]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!this._editMode && !e.target.closest('.toggle') && !e.target.closest('.temp-btn') && !e.target.closest('.media-btn')) {
          this.toggleEntity(card.dataset.entity);
        }
      });
    });

    // Temperature buttons
    this.shadowRoot.querySelectorAll('.temp-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setTemperature(btn.dataset.tempEntity, parseFloat(btn.dataset.temp));
      });
    });

    // Media buttons
    this.shadowRoot.querySelectorAll('.media-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.mediaControl(btn.dataset.media, btn.dataset.action);
      });
    });

    // Entity modal close
    const closeEntityModal = this.shadowRoot.querySelector('#close-entity-modal');
    if (closeEntityModal) {
      closeEntityModal.addEventListener('click', (e) => {
        e.preventDefault();
        this._modal = null;
        this._modalData = null;
        this.render();
      });
    }

    const entityModal = this.shadowRoot.querySelector('#entity-modal');
    if (entityModal) {
      entityModal.addEventListener('click', (e) => {
        if (e.target.id === 'entity-modal') {
          this._modal = null;
          this._modalData = null;
          this.render();
        }
      });
    }

    // Entity search
    const entitySearch = this.shadowRoot.querySelector('#entity-search');
    if (entitySearch) {
      entitySearch.addEventListener('input', (e) => {
        const search = e.target.value.toLowerCase();
        this.shadowRoot.querySelectorAll('.entity-item').forEach(item => {
          const name = item.querySelector('.entity-name').textContent.toLowerCase();
          const id = item.querySelector('.entity-id').textContent.toLowerCase();
          item.style.display = (name.includes(search) || id.includes(search)) ? 'flex' : 'none';
        });
      });
    }

    // Entity selection
    this.shadowRoot.querySelectorAll('.entity-item[data-entity-select]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
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

    // Room modal close
    const closeRoomModal = this.shadowRoot.querySelector('#close-room-modal');
    if (closeRoomModal) {
      closeRoomModal.addEventListener('click', (e) => {
        e.preventDefault();
        this._modal = null;
        this.render();
      });
    }

    const roomModal = this.shadowRoot.querySelector('#room-modal');
    if (roomModal) {
      roomModal.addEventListener('click', (e) => {
        if (e.target.id === 'room-modal') {
          this._modal = null;
          this.render();
        }
      });
    }

    // Save room button
    const saveRoomBtn = this.shadowRoot.querySelector('#save-room-btn');
    if (saveRoomBtn) {
      saveRoomBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const input = this.shadowRoot.querySelector('#room-name-input');
        const name = input?.value?.trim();
        if (name) {
          this.addRoom(name);
          this._modal = null;
          this.render();
        }
      });
    }

    // Room name input enter key
    const roomNameInput = this.shadowRoot.querySelector('#room-name-input');
    if (roomNameInput) {
      roomNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.shadowRoot.querySelector('#save-room-btn')?.click();
        }
      });
    }
  }

  getStyles() {
    return `
      :host {
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #fff;
        --glass-bg: rgba(30, 35, 50, 0.75);
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
      
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px;
        margin-bottom: 16px;
      }
      
      .header-left .date-display {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 4px;
      }
      
      .header-left .time-display {
        font-size: 48px;
        font-weight: 200;
        letter-spacing: -2px;
      }
      
      .header-center {
        text-align: center;
      }
      
      .weather-main {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        margin-bottom: 8px;
        color: rgba(255, 255, 255, 0.7);
        font-size: 13px;
      }
      
      .location-icon {
        display: flex;
        align-items: center;
      }
      
      .location-icon svg {
        fill: rgba(255, 255, 255, 0.7);
      }
      
      .weather-temp-large {
        font-size: 42px;
        font-weight: 300;
      }
      
      .temp-unit {
        font-size: 20px;
        vertical-align: super;
        color: rgba(255, 255, 255, 0.7);
      }
      
      .weather-desc {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
      }
      
      .room-title {
        font-size: 28px;
        font-weight: 600;
      }
      
      .header-right {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      
      .weather-icon-large {
        font-size: 48px;
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
      
      .edit-button svg {
        fill: currentColor;
      }
      
      .stats-bar {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 16px;
      }
      
      .stat-card {
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
      }
      
      .stat-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        background: rgba(79, 195, 247, 0.2);
        border-radius: 12px;
        color: var(--accent);
      }
      
      .stat-icon svg {
        fill: currentColor;
      }
      
      .stat-content {
        display: flex;
        flex-direction: column;
      }
      
      .stat-value {
        font-size: 28px;
        font-weight: 600;
        display: inline;
      }
      
      .stat-unit {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.6);
        margin-left: 4px;
      }
      
      .stat-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        margin-top: 4px;
      }
      
      .main-content {
        padding: 24px;
        margin-bottom: 16px;
      }
      
      .content-title {
        font-size: 22px;
        font-weight: 600;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--glass-border);
      }
      
      .section {
        margin-bottom: 28px;
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
        font-size: 15px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
        color: rgba(255, 255, 255, 0.9);
      }
      
      .section-icon {
        display: flex;
        align-items: center;
        color: var(--accent);
      }
      
      .section-icon svg {
        fill: currentColor;
      }
      
      .add-entity-btn {
        padding: 8px 16px;
        background: rgba(79, 195, 247, 0.15);
        border: 1px solid rgba(79, 195, 247, 0.3);
        border-radius: 8px;
        color: var(--accent);
        font-size: 13px;
        cursor: pointer;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .add-entity-btn svg {
        fill: currentColor;
      }
      
      .add-entity-btn:hover {
        background: var(--accent);
        color: #1a1a2e;
      }
      
      .devices-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 12px;
      }
      
      .sensors-grid {
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      }
      
      .empty-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 32px;
        color: rgba(255, 255, 255, 0.4);
        font-size: 14px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 12px;
        border: 1px dashed rgba(255, 255, 255, 0.1);
      }
      
      .device-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 18px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s;
        position: relative;
        border: 1px solid transparent;
      }
      
      .device-card:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      
      .device-card.active {
        background: rgba(79, 195, 247, 0.12);
        border-color: rgba(79, 195, 247, 0.3);
      }
      
      .device-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        margin: 0 auto 12px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        color: rgba(255, 255, 255, 0.7);
      }
      
      .device-icon svg {
        fill: currentColor;
      }
      
      .device-icon.glow {
        background: rgba(255, 200, 50, 0.2);
        color: #ffc832;
        box-shadow: 0 0 20px rgba(255, 200, 50, 0.3);
      }
      
      .device-name {
        font-size: 13px;
        font-weight: 500;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .device-state {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 12px;
      }
      
      .remove-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--danger);
        border: none;
        color: white;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        z-index: 10;
      }
      
      .toggle {
        width: 48px;
        height: 26px;
        border-radius: 13px;
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
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fff;
        position: absolute;
        top: 3px;
        transition: left 0.3s ease;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }
      
      .toggle.on .toggle-knob {
        left: 25px;
      }
      
      .toggle.off .toggle-knob {
        left: 3px;
      }
      
      .climate-card {
        text-align: left;
      }
      
      .climate-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
      }
      
      .climate-header .toggle {
        margin: 0;
      }
      
      .climate-display {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      
      .current-temp {
        font-size: 38px;
        font-weight: 300;
      }
      
      .target-temp {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 16px;
      }
      
      .temp-btn {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        font-size: 20px;
        font-weight: bold;
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
      
      .media-card {
        text-align: left;
      }
      
      .media-info {
        margin-bottom: 14px;
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
        margin-top: 2px;
      }
      
      .media-controls {
        display: flex;
        justify-content: center;
        gap: 10px;
      }
      
      .media-btn {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .media-btn svg {
        fill: currentColor;
      }
      
      .media-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .media-btn.play-btn {
        width: 48px;
        height: 48px;
        background: var(--accent);
        color: #1a1a2e;
      }
      
      .sensor-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 14px;
        padding: 18px;
        text-align: center;
        position: relative;
      }
      
      .sensor-value {
        font-size: 26px;
        font-weight: 500;
        margin-bottom: 6px;
      }
      
      .sensor-unit {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.5);
      }
      
      .sensor-name {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .room-tabs {
        display: flex;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      
      .room-tab {
        padding: 14px 28px;
        border-radius: 28px;
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
        background: rgba(79, 195, 247, 0.15);
        color: var(--accent);
        border: 1px dashed rgba(79, 195, 247, 0.5);
        padding: 14px 20px;
        font-size: 18px;
      }
      
      .tab-remove {
        margin-left: 10px;
        font-weight: bold;
        opacity: 0.6;
      }
      
      .tab-remove:hover {
        opacity: 1;
        color: var(--danger);
      }
      
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.75);
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
        max-width: 360px;
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid var(--glass-border);
      }
      
      .modal-header h3 {
        font-size: 18px;
        font-weight: 600;
      }
      
      .close-btn {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .close-btn svg {
        fill: currentColor;
      }
      
      .close-btn:hover {
        background: var(--danger);
      }
      
      .modal-search {
        padding: 16px 24px;
        border-bottom: 1px solid var(--glass-border);
      }
      
      .modal-search input,
      .modal-body input {
        width: 100%;
        padding: 14px 18px;
        background: rgba(255, 255, 255, 0.08);
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
        background: rgba(79, 195, 247, 0.08);
      }
      
      .modal-body {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .entity-list {
        flex: 1;
        overflow-y: auto;
        padding: 12px 24px 24px;
        max-height: 400px;
      }
      
      .entity-item {
        display: flex;
        align-items: center;
        padding: 14px 18px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        margin-bottom: 10px;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid transparent;
      }
      
      .entity-item:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      
      .entity-item.selected {
        background: rgba(79, 195, 247, 0.15);
        border-color: rgba(79, 195, 247, 0.4);
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
        margin-top: 2px;
      }
      
      .entity-state {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        margin-right: 14px;
      }
      
      .entity-check {
        color: var(--success);
        display: flex;
        align-items: center;
      }
      
      .entity-check svg {
        fill: currentColor;
      }
      
      .entity-add {
        color: var(--accent);
        display: flex;
        align-items: center;
      }
      
      .entity-add svg {
        fill: currentColor;
      }
      
      .primary-btn {
        padding: 16px 28px;
        background: var(--accent);
        border: none;
        border-radius: 12px;
        color: #1a1a2e;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .primary-btn:hover {
        filter: brightness(1.1);
        transform: translateY(-1px);
      }
      
      @media (max-width: 900px) {
        .stats-bar {
          grid-template-columns: 1fr;
        }
      }
      
      @media (max-width: 768px) {
        .header {
          flex-direction: column;
          gap: 20px;
          text-align: center;
        }
        
        .header-left,
        .header-right {
          width: 100%;
          justify-content: center;
        }
        
        .devices-grid {
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        }
      }
    `;
  }

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
}

customElements.define('glassmorphism-dashboard', GlassmorphismDashboard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'glassmorphism-dashboard',
  name: 'Glassmorphism Dashboard',
  description: 'A beautiful, configurable smart home dashboard with glassmorphism design',
  preview: true,
  documentationURL: 'https://github.com/larsoss/glassmorphism-dashboard'
});

console.info('Glassmorphism Dashboard v' + CARD_VERSION + ' loaded successfully');
