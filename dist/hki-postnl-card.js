// HKI PostNL Card v3.0.0
import { LitElement, html, css } from "https://unpkg.com/lit@2.8.0/index.js?module";

const CARD_VERSION = '3.0.1';

// Embedded PostNL Logo as SVG
const POSTNL_LOGO_SVG = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <path d="M100,20 L180,100 L100,180 L20,100 Z" fill="#FF6200"/>
  <path d="M100,35 L165,100 L100,165 L35,100 Z" fill="white"/>
  <g transform="translate(100, 65)">
    <rect x="-2.5" y="3" width="5" height="7" fill="#FF6200"/>
    <rect x="-8" y="6" width="3" height="4" fill="#FF6200"/>
    <rect x="5" y="6" width="3" height="4" fill="#FF6200"/>
    <circle cx="-6" cy="4" r="2" fill="#FF6200"/>
    <circle cx="0" cy="1" r="2" fill="#FF6200"/>
    <circle cx="6" cy="4" r="2" fill="#FF6200"/>
  </g>
  <text x="100" y="125" text-anchor="middle" fill="#FF6200" font-family="Arial, sans-serif" font-weight="700" font-size="28">postnl</text>
</svg>
`)}`;

const VAN_SVG = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">
  <rect x="15" y="35" width="75" height="30" fill="#FF6200" rx="3"/>
  <path d="M 15 35 L 25 25 L 45 25 L 45 35 Z" fill="#E55800"/>
  <rect x="27" y="27" width="15" height="6" fill="#B3D9FF" rx="1"/>
  <rect x="50" y="38" width="35" height="10" fill="white" rx="1"/>
  <text x="67" y="46" text-anchor="middle" fill="#FF6200" font-family="Arial" font-weight="bold" font-size="8">PostNL</text>
  <circle cx="35" cy="67" r="8" fill="#333"/>
  <circle cx="35" cy="67" r="4" fill="#666"/>
  <circle cx="75" cy="67" r="8" fill="#333"/>
  <circle cx="75" cy="67" r="4" fill="#666"/>
  <g opacity="0.5">
    <circle cx="12" cy="50" r="3" fill="#ccc">
      <animate attributeName="cx" from="12" to="5" dur="1s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.5" to="0" dur="1s" repeatCount="indefinite"/>
    </circle>
  </g>
</svg>
`)}`;

class HKIPostNLCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._activeTab = 'onderweg';
        this._selectedParcel = null;
        this._isRendered = false;
    }

    set hass(hass) {
        this._hass = hass;
        if (this.config && this._isRendered) {
            this.updateContent();
        } else if (this.config) {
            this.render();
        }
    }

    setConfig(config) {
        if (!config.entity) {
            throw new Error("Kies een entiteit (bijv. sensor.postnl)");
        }
        this.config = {
            title: 'PostNL',
            days_back: 7,
            show_delivered: true,
            show_sent: true,
            show_animation: true,
            logo_path: '',
            van_path: '',
            header_color: '#602f9c',
            header_text_color: '#ffffff',
            placeholder_background: 'transparent',
            distribution_entity: '',
            ...config
        };
        
        this._logoSrc = this.config.logo_path || POSTNL_LOGO_SVG;
        this._vanSrc = this.config.van_path || VAN_SVG;
        
        if (this._hass) {
            this.render();
        }
    }

    static getConfigElement() {
        return document.createElement("hki-postnl-card-editor");
    }

    static getStubConfig() {
        return { 
            entity: "sensor.postnl",
            distribution_entity: "",
            title: "PostNL",
            days_back: 7,
            show_delivered: true,
            show_sent: true,
            show_animation: true,
            logo_path: '',
            van_path: '',
            header_color: '#602f9c',
            header_text_color: '#ffffff'
        };
    }

    getCardSize() {
        return 4;
    }

    formatDate(dateStr) {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString('nl-NL', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    }

    getData() {
        const entityId = this.config.entity;
        const stateObj = this._hass ? this._hass.states[entityId] : null;

        if (!stateObj) return null;

        const attrs = stateObj.attributes;
        let shipments = [];
        
        if (Array.isArray(attrs)) {
            shipments = attrs;
        } else if (attrs.enroute || attrs.en_route || attrs.delivered) {
            const enrouteArray = Array.isArray(attrs.enroute) ? attrs.enroute : (Array.isArray(attrs.en_route) ? attrs.en_route : []);
            const deliveredArray = Array.isArray(attrs.delivered) ? attrs.delivered : [];
            shipments = [...enrouteArray, ...deliveredArray];
        } else if (attrs.shipments) {
            shipments = attrs.shipments;
        } else if (attrs.parcels) {
            shipments = attrs.parcels;
        } else {
            shipments = Object.values(attrs).filter(item => item && item.key);
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - (this.config.days_back || 7));

        shipments = shipments.filter(item => {
            if (!item.delivered) return true;
            const dDate = new Date(item.delivery_date || item.planned_date || 0);
            return dDate >= cutoffDate;
        });

        return shipments;
    }

    getDistributionData() {
        if (!this.config.distribution_entity) return [];
        
        const stateObj = this._hass ? this._hass.states[this.config.distribution_entity] : null;
        if (!stateObj) return [];

        const attrs = stateObj.attributes;
        let shipments = [];
        
        if (Array.isArray(attrs)) {
            shipments = attrs;
        } else if (attrs.en_route || attrs.delivered || attrs.Enroute || attrs.Delivered) {
            // Support both lowercase (en_route/delivered) and capitalized (Enroute/Delivered) formats
            const enroute = attrs.en_route || attrs.Enroute || [];
            const delivered = attrs.delivered || attrs.Delivered || [];
            shipments = [...enroute, ...delivered];
        } else if (attrs.shipments) {
            shipments = attrs.shipments;
        } else if (attrs.parcels) {
            shipments = attrs.parcels;
        } else {
            shipments = Object.values(attrs).filter(item => item && item.key);
        }

        return shipments;
    }

    getFilteredShipments(shipments, distributionShipments) {
        let filtered = [];
        
        if (this._activeTab === 'onderweg') {
            filtered = shipments.filter(item => !item.delivered);
        } else if (this._activeTab === 'bezorgd') {
            filtered = shipments.filter(item => item.delivered);
        } else if (this._activeTab === 'verzonden') {
            filtered = distributionShipments;
        }

        filtered.sort((a, b) => {
            const dateA = new Date(a.delivery_date || a.planned_date || a.expected_datetime || 0);
            const dateB = new Date(b.delivery_date || b.planned_date || b.expected_datetime || 0);
            return dateB - dateA;
        });

        return filtered;
    }

    handleTabClick(e) {
        const tab = e.currentTarget.dataset.tab;
        if (tab === this._activeTab) return;
        
        this._activeTab = tab;
        this._selectedParcel = null;
        this.updateContent();
    }

    handleParcelClick(e) {
        const key = e.currentTarget.dataset.key;
        
        if (this._selectedParcel === key) {
            this._selectedParcel = null;
        } else {
            this._selectedParcel = key;
        }
        
        this.updateContent();
    }

    updateContent() {
        if (!this._isRendered) return;

        const shipments = this.getData();
        const distributionShipments = this.getDistributionData();
        if (!shipments) return;

        const displayedShipments = this.getFilteredShipments(shipments, distributionShipments);
        const activeCount = shipments.filter(s => !s.delivered).length;
        const recentCount = shipments.filter(s => s.delivered).length;

        const statsEl = this.shadowRoot.querySelector('.header-stats');
        if (statsEl) {
            statsEl.textContent = `${activeCount} onderweg • ${recentCount} recent`;
        }

        this.shadowRoot.querySelectorAll('.tab').forEach(tab => {
            if (tab.dataset.tab === this._activeTab) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        this.updateAnimation(displayedShipments);
        this.updateList(displayedShipments);
    }

    updateAnimation(displayedShipments) {
        const animationEl = this.shadowRoot.querySelector('.header-animation');
        if (!animationEl) return;

        const selectedParcelData = this._selectedParcel 
            ? displayedShipments.find(s => s.key === this._selectedParcel)
            : null;

        if (this.config.show_animation && selectedParcelData) {
            const vanPos = selectedParcelData.delivered ? '75%' : '25%';
            const statusText = selectedParcelData.delivered ? 'Bezorgd' : 'Onderweg';
            
            animationEl.innerHTML = `
                <div class="visual-road">
                    <div class="house-bg">🏠</div>
                    <div class="road-line"></div>
                    <img class="van-img" src="${this._vanSrc}" style="margin-left: ${vanPos};" alt="PostNL Van">
                </div>
                <div class="animation-info">
                    <strong>${selectedParcelData.name}</strong> • ${statusText}
                </div>
            `;
        } else {
            animationEl.innerHTML = `
                <div class="animation-placeholder">
                    <div class="placeholder-text">Selecteer een pakket voor animatie</div>
                </div>
            `;
        }
    }

    updateList(displayedShipments) {
        const listEl = this.shadowRoot.querySelector('.list');
        if (!listEl) return;

        const currentKeys = Array.from(listEl.querySelectorAll('.parcel-header')).map(el => el.dataset.key);
        const newKeys = displayedShipments.map(s => s.key);
        const needsRebuild = JSON.stringify(currentKeys) !== JSON.stringify(newKeys);

        if (displayedShipments.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <ha-icon icon="mdi:package-variant-closed" style="width: 48px; height: 48px; margin-bottom: 10px;"></ha-icon>
                    <div>Geen pakketten in deze categorie</div>
                </div>`;
            return;
        }

        if (needsRebuild) {
            listEl.innerHTML = displayedShipments.map(item => {
                const isDelivered = item.delivered;
                const statusMsg = item.status_message || (isDelivered ? "Bezorgd" : "Onderweg");
                const dateLabel = this.formatDate(item.delivery_date || item.planned_date || item.planned_to);
                
                return `
                <div class="parcel" data-key="${item.key}">
                    <div class="parcel-header" data-key="${item.key}">
                        <div class="ph-left">
                            <span class="ph-name">${item.name || 'Onbekend'}</span>
                            <span class="ph-status">
                                <ha-icon class="ph-status-icon" icon="${isDelivered ? 'mdi:check-circle' : 'mdi:truck-delivery'}" style="width:16px;height:16px;"></ha-icon>
                                ${statusMsg}
                            </span>
                        </div>
                        <div class="ph-right">
                            <div class="ph-date">${dateLabel || ''}</div>
                            <ha-icon class="chevron" icon="mdi:chevron-down"></ha-icon>
                        </div>
                    </div>
                    
                    <div class="details-panel">
                        <div class="detail-row">
                            <strong>Track & Trace:</strong> ${item.key}
                        </div>
                        ${item.shipment_type ? `<div class="detail-row"><strong>Type:</strong> ${item.shipment_type === 'LetterboxParcel' ? 'Brievenbuspakje' : 'Pakket'}</div>` : ''}
                        ${item.delivery_address_type ? `<div class="detail-row"><strong>Bezorging:</strong> ${item.delivery_address_type === 'ServicePoint' ? 'Afhaalpunt' : 'Thuisbezorging'}</div>` : ''}
                        <a href="${item.url}" target="_blank" class="btn-track">OPEN TRACK & TRACE ↗</a>
                    </div>
                </div>`;
            }).join('');

            this.shadowRoot.querySelectorAll('.parcel-header').forEach(el => {
                el.addEventListener('click', this.handleParcelClick.bind(this));
            });
        } else {
            this.shadowRoot.querySelectorAll('.parcel').forEach(parcelEl => {
                const key = parcelEl.dataset.key;
                if (key === this._selectedParcel) {
                    parcelEl.classList.add('selected');
                } else {
                    parcelEl.classList.remove('selected');
                }
            });
        }
    }

    render() {
        const shipments = this.getData();
        const distributionShipments = this.getDistributionData();
        if (!shipments) {
            this.shadowRoot.innerHTML = `<ha-card style="padding:16px; color:red;">Entiteit niet gevonden: ${this.config.entity}</ha-card>`;
            return;
        }

        const displayedShipments = this.getFilteredShipments(shipments, distributionShipments);
        const activeCount = shipments.filter(s => !s.delivered).length;
        const recentCount = shipments.filter(s => s.delivered).length;
        const headerColor = this.config.header_color || '#602f9c';
        const headerTextColor = this.config.header_text_color || '#ffffff';
        const placeholderBg = this.config.placeholder_background || 'transparent';

        const css = `
        <style>
            :host { 
                --postnl-orange: #ed8c00; 
                --postnl-purple: ${headerColor};
                --header-text: ${headerTextColor};
                --placeholder-bg: ${placeholderBg};
                --bg-color: var(--card-background-color, white); 
            }
            ha-card { 
                background: var(--bg-color); 
                color: var(--primary-text-color); 
                overflow: hidden; 
                border-radius: 12px; 
            }
            
            .header { 
                background: var(--postnl-purple);
                padding: 16px; 
                color: var(--header-text); 
                display: flex; 
                align-items: center; 
                gap: 12px; 
            }
            .header img { 
                height: 36px; 
                border-radius: 6px; 
                background: white; 
                padding: 4px; 
            }
            .header-info { 
                display: flex; 
                flex-direction: column; 
                flex: 1;
            }
            .header-title { 
                font-weight: bold; 
                font-size: 1.1em; 
            }
            .header-stats { 
                font-size: 0.8em; 
                opacity: 0.9; 
            }

            .tabs { 
                display: flex; 
                background: var(--secondary-background-color, #f5f5f5); 
                border-bottom: 1px solid var(--divider-color, #eee); 
            }
            .tab { 
                flex: 1; 
                text-align: center; 
                padding: 12px; 
                cursor: pointer; 
                font-size: 0.9em; 
                font-weight: 500; 
                color: var(--secondary-text-color); 
                position: relative; 
                transition: all 0.2s;
                user-select: none;
            }
            .tab:hover {
                background: rgba(237, 140, 0, 0.1);
            }
            .tab.active { 
                color: var(--postnl-orange); 
                font-weight: bold; 
            }
            .tab.active::after { 
                content: ''; 
                position: absolute; 
                bottom: 0; 
                left: 0; 
                right: 0; 
                height: 3px; 
                background: var(--postnl-orange); 
            }

            .header-animation {
                background: var(--placeholder-bg);
                padding: 16px;
                border-bottom: 1px solid var(--divider-color);
                height: 150px;
                box-sizing: border-box;
            }
            .visual-road { 
                position: relative; 
                height: 80px; 
                display: flex; 
                align-items: center; 
                overflow: hidden; 
            }
            .road-line { 
                position: absolute; 
                bottom: 20px; 
                left: 0; 
                right: 0; 
                height: 3px; 
                background: repeating-linear-gradient(
                    to right,
                    #ccc 0px,
                    #ccc 15px,
                    transparent 15px,
                    transparent 30px
                );
                z-index: 1; 
            }
            .house-bg { 
                position: absolute; 
                right: 30px; 
                bottom: 15px; 
                font-size: 36px; 
                opacity: 0.3; 
                z-index: 0; 
            }
            .van-img { 
                height: 50px; 
                z-index: 2; 
                transition: margin-left 1.5s ease-in-out; 
                margin-bottom: 6px; 
                position: relative;
            }
            .animation-info {
                text-align: center;
                margin-top: 8px;
                font-size: 0.85em;
                color: var(--secondary-text-color);
            }
            .animation-info strong {
                color: var(--primary-text-color);
            }

            .animation-placeholder {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 118px;
            }
            .placeholder-text {
                color: var(--secondary-text-color);
                font-size: 0.9em;
                opacity: 0.6;
            }

            .list { 
                padding: 0; 
                margin: 0; 
                max-height: 500px;
                overflow-y: auto;
            }
            .empty-state { 
                padding: 40px; 
                text-align: center; 
                color: var(--secondary-text-color); 
                opacity: 0.7; 
            }
            
            .parcel { 
                border-bottom: 1px solid var(--divider-color, #eee); 
            }
            .parcel.selected {
                background: rgba(237, 140, 0, 0.05);
            }
            .parcel-header { 
                padding: 16px; 
                cursor: pointer; 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                transition: background 0.2s;
                user-select: none;
            }
            .parcel-header:hover { 
                background: var(--secondary-background-color); 
            }
            
            .ph-left { 
                display: flex; 
                flex-direction: column;
                flex: 1;
            }
            .ph-name { 
                font-weight: 600; 
                font-size: 1em;
                margin-bottom: 4px;
            }
            .ph-status { 
                font-size: 0.85em; 
                color: var(--secondary-text-color); 
                display: flex; 
                align-items: center; 
                gap: 6px; 
            }
            .ph-status-icon { 
                color: var(--postnl-orange); 
            }

            .ph-right { 
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 4px;
            }
            .ph-date {
                font-size: 0.85em; 
                color: var(--secondary-text-color); 
            }
            .chevron { 
                transition: transform 0.3s;
                margin-left: 8px;
            }
            .selected .chevron { 
                transform: rotate(180deg); 
                color: var(--postnl-orange);
            }

            .details-panel {
                padding: 12px 16px;
                background: var(--secondary-background-color);
                border-top: 1px solid var(--divider-color);
                font-size: 0.9em;
                color: var(--secondary-text-color);
                display: none;
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease-out;
            }
            .selected .details-panel {
                display: block;
                max-height: 200px;
            }
            .detail-row {
                margin-bottom: 6px;
            }
            .detail-row strong {
                color: var(--primary-text-color);
            }
            .btn-track { 
                background: var(--postnl-orange); 
                color: white; 
                text-decoration: none; 
                padding: 8px 16px; 
                border-radius: 6px; 
                font-size: 0.9em; 
                font-weight: 600; 
                display: inline-block;
                margin-top: 8px;
                transition: all 0.2s;
            }
            .btn-track:hover {
                background: #d17a00;
                box-shadow: 0 2px 8px rgba(237, 140, 0, 0.3);
            }

            .list::-webkit-scrollbar {
                width: 6px;
            }
            .list::-webkit-scrollbar-track {
                background: transparent;
            }
            .list::-webkit-scrollbar-thumb {
                background: var(--divider-color);
                border-radius: 3px;
            }
        </style>
        `;

        let listHtml = '';
        if (displayedShipments.length === 0) {
            listHtml = `
            <div class="empty-state">
                <ha-icon icon="mdi:package-variant-closed" style="width: 48px; height: 48px; margin-bottom: 10px;"></ha-icon>
                <div>Geen pakketten in deze categorie</div>
            </div>`;
        } else {
            listHtml = displayedShipments.map(item => {
                const isDelivered = item.delivered;
                const statusMsg = item.status_message || (isDelivered ? "Bezorgd" : "Onderweg");
                const dateLabel = this.formatDate(item.delivery_date || item.planned_date || item.planned_to);
                
                return `
                <div class="parcel">
                    <div class="parcel-header" data-key="${item.key}">
                        <div class="ph-left">
                            <span class="ph-name">${item.name || 'Onbekend'}</span>
                            <span class="ph-status">
                                <ha-icon class="ph-status-icon" icon="${isDelivered ? 'mdi:check-circle' : 'mdi:truck-delivery'}" style="width:16px;height:16px;"></ha-icon>
                                ${statusMsg}
                            </span>
                        </div>
                        <div class="ph-right">
                            <div class="ph-date">${dateLabel || ''}</div>
                            <ha-icon class="chevron" icon="mdi:chevron-down"></ha-icon>
                        </div>
                    </div>
                    
                    <div class="details-panel">
                        <div class="detail-row">
                            <strong>Track & Trace:</strong> ${item.key}
                        </div>
                        ${item.shipment_type ? `<div class="detail-row"><strong>Type:</strong> ${item.shipment_type === 'LetterboxParcel' ? 'Brievenbuspakje' : 'Pakket'}</div>` : ''}
                        ${item.delivery_address_type ? `<div class="detail-row"><strong>Bezorging:</strong> ${item.delivery_address_type === 'ServicePoint' ? 'Afhaalpunt' : 'Thuisbezorging'}</div>` : ''}
                        <a href="${item.url}" target="_blank" class="btn-track">OPEN TRACK & TRACE ↗</a>
                    </div>
                </div>`;
            }).join('');
        }

        const html = `
            <ha-card>
                <div class="header">
                    <img src="${this._logoSrc}" alt="PostNL Logo">
                    <div class="header-info">
                        <span class="header-title">${this.config.title || 'PostNL'}</span>
                        <span class="header-stats">${activeCount} onderweg • ${recentCount} recent</span>
                    </div>
                </div>
                <div class="tabs">
                    <div class="tab ${this._activeTab === 'onderweg' ? 'active' : ''}" data-tab="onderweg">Onderweg</div>
                    ${this.config.show_delivered ? `<div class="tab ${this._activeTab === 'bezorgd' ? 'active' : ''}" data-tab="bezorgd">Bezorgd</div>` : ''}
                    ${this.config.show_sent ? `<div class="tab ${this._activeTab === 'verzonden' ? 'active' : ''}" data-tab="verzonden">Verzonden</div>` : ''}
                </div>
                <div class="header-animation"></div>
                <div class="list">${listHtml}</div>
            </ha-card>
        `;

        this.shadowRoot.innerHTML = css + html;
        this._isRendered = true;
        
        this.shadowRoot.querySelectorAll('.tab').forEach(el => {
            el.addEventListener('click', this.handleTabClick.bind(this));
        });
        this.shadowRoot.querySelectorAll('.parcel-header').forEach(el => {
            el.addEventListener('click', this.handleParcelClick.bind(this));
        });
    }
}

// EDITOR CLASS - Proper LitElement with imported Lit
class HKIPostNLCardEditor extends LitElement {
    static get properties() {
        return {
            hass: { type: Object },
            _config: { attribute: false }
        };
    }

    constructor() {
        super();
        this._config = {};
    }

    setConfig(config) {
        this._config = {
            entity: '',
            distribution_entity: '',
            title: 'PostNL',
            days_back: 7,
            show_delivered: true,
            show_sent: true,
            show_animation: true,
            logo_path: '',
            van_path: '',
            header_color: '#602f9c',
            header_text_color: '#ffffff',
            placeholder_background: 'transparent',
            ...config
        };
    }

    _renderEntityPicker(label, field, value, helper = "") {
        return html`
            <ha-selector
                .hass=${this.hass}
                .selector=${{ entity: {} }}
                .value=${value || ""}
                .label=${label}
                .helper=${helper}
                @value-changed=${(ev) => this._changed(ev, field)}
            ></ha-selector>
        `;
    }

    _val(ev) {
        return ev.detail?.value ?? ev.target?.value;
    }

    _changed(ev, explicitField = null) {
        ev.stopPropagation();
        const field = explicitField || ev.target?.dataset?.field;
        if (!field || !this._config) return;

        let value = this._val(ev);

        // Handle numeric fields
        const numeric = new Set(['days_back']);
        if (numeric.has(field)) {
            value = parseInt(value, 10);
        }

        // Handle boolean fields
        const bools = new Set(['show_delivered', 'show_sent', 'show_animation']);
        if (bools.has(field)) {
            value = !!(ev.target?.checked ?? value);
        }

        const next = { ...this._config, [field]: value };
        this._config = next;

        this.dispatchEvent(new CustomEvent("config-changed", {
            detail: { config: next },
            bubbles: true,
            composed: true
        }));
    }

    static get styles() {
        return css`
            .card-config {
                padding: 16px;
            }
            .section {
                margin-top: 24px;
                margin-bottom: 12px;
                font-weight: 600;
                font-size: 14px;
                color: var(--primary-text-color);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 2px solid var(--divider-color);
                padding-bottom: 8px;
            }
            .helper-text {
                font-size: 12px;
                color: var(--secondary-text-color);
                margin: 4px 0 16px 0;
                font-style: italic;
            }
            .inline-fields-2 {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-bottom: 16px;
            }
            ha-selector,
            ha-textfield,
            ha-switch {
                width: 100%;
                margin-bottom: 16px;
            }
            .switch-row {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            }
            .switch-row span {
                font-size: 14px;
                color: var(--primary-text-color);
            }
        `;
    }

    render() {
        if (!this._config) return html``;

        return html`
            <div class="card-config">
                <div class="section">Basis Instellingen</div>
                
                ${this._renderEntityPicker(
                    "PostNL Ontvangst Entity",
                    "entity",
                    this._config.entity,
                    "De entity voor ontvangen pakketten (bijv. sensor.postnl)"
                )}

                ${this._renderEntityPicker(
                    "PostNL Verzending Entity (Optioneel)",
                    "distribution_entity",
                    this._config.distribution_entity || "",
                    "De entity voor verzonden pakketten (bijv. sensor.postnl_distribution)"
                )}

                <ha-textfield
                    label="Kaartnaam"
                    .value=${this._config.title || 'PostNL'}
                    placeholder="PostNL"
                    data-field="title"
                    @input=${this._changed}
                ></ha-textfield>
                <div class="helper-text">De naam die bovenaan de kaart wordt weergegeven</div>

                <ha-textfield
                    label="Aantal dagen geschiedenis"
                    type="number"
                    .value=${String(this._config.days_back || 7)}
                    min="1"
                    max="365"
                    data-field="days_back"
                    @input=${this._changed}
                ></ha-textfield>
                <div class="helper-text">Hoeveel dagen terug bezorgde pakketten worden getoond (1-365)</div>

                <div class="section">Weergave Opties</div>

                <div class="switch-row">
                    <ha-switch
                        .checked=${this._config.show_delivered !== false}
                        data-field="show_delivered"
                        @change=${this._changed}
                    ></ha-switch>
                    <span>Toon "Bezorgd" tab</span>
                </div>

                <div class="switch-row">
                    <ha-switch
                        .checked=${this._config.show_sent !== false}
                        data-field="show_sent"
                        @change=${this._changed}
                    ></ha-switch>
                    <span>Toon "Verzonden" tab</span>
                </div>
                <div class="helper-text">Vereist verzending entity om data te tonen</div>

                <div class="switch-row">
                    <ha-switch
                        .checked=${this._config.show_animation !== false}
                        data-field="show_animation"
                        @change=${this._changed}
                    ></ha-switch>
                    <span>Toon bezorganimatie</span>
                </div>
                <div class="helper-text">Toon het bezorgbusje in de header bij geselecteerd pakket</div>

                <div class="section">Uiterlijk</div>

                <div class="inline-fields-2">
                    <ha-textfield
                        label="Header Kleur"
                        type="color"
                        .value=${this._config.header_color || '#602f9c'}
                        data-field="header_color"
                        @input=${this._changed}
                    ></ha-textfield>

                    <ha-textfield
                        label="Header Tekst Kleur"
                        type="color"
                        .value=${this._config.header_text_color || '#ffffff'}
                        data-field="header_text_color"
                        @input=${this._changed}
                    ></ha-textfield>
                </div>
                <div class="helper-text">Kies de kleuren voor de header balk en tekst</div>

                <ha-textfield
                    label="Animatie Achtergrond"
                    .value=${this._config.placeholder_background || 'transparent'}
                    placeholder="transparent"
                    data-field="placeholder_background"
                    @input=${this._changed}
                ></ha-textfield>
                <div class="helper-text">Achtergrondkleur voor het animatie-gebied (bijv. transparent, #f5f5f5, rgba(0,0,0,0.1))</div>

                <ha-textfield
                    label="PostNL Logo Pad (Optioneel)"
                    .value=${this._config.logo_path || ''}
                    placeholder="/local/postnl-logo.png"
                    data-field="logo_path"
                    @input=${this._changed}
                ></ha-textfield>
                <div class="helper-text">Pad naar je eigen PostNL logo - laat leeg voor standaard embedded logo</div>

                <ha-textfield
                    label="Bezorgbusje Afbeelding Pad (Optioneel)"
                    .value=${this._config.van_path || ''}
                    placeholder="/local/postnl-van.gif"
                    data-field="van_path"
                    @input=${this._changed}
                ></ha-textfield>
                <div class="helper-text">Pad naar je eigen bezorgbusje afbeelding - laat leeg voor standaard embedded animatie</div>
            </div>
        `;
    }
}

customElements.define('hki-postnl-card', HKIPostNLCard);
customElements.define('hki-postnl-card-editor', HKIPostNLCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "hki-postnl-card",
    name: "HKI PostNL Card",
    description: "PostNL tracking card met visuele bezorganimatie",
    preview: true
});

console.info(
    '%c HKI-POSTNL-CARD %c v3.0.1 ',
    'color: white; background: #ed8c00; font-weight: bold;',
    'color: #ed8c00; background: white; font-weight: bold;'
);
