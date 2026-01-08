# HKI PostNL Card

[![Release](https://img.shields.io/github/v/release/jimz011/hki-postnl-card.svg)](https://github.com/jimz011/hki-postnl-card/releases)
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Downloads](https://img.shields.io/github/downloads/jimz011/hki-postnl-card/total.svg)](https://github.com/jimz011/hki-postnl-card/releases)
[![Maintained](https://img.shields.io/badge/Maintained-Yes-green.svg)](https://github.com/jimz011/hki-postnl-card/graphs/commit-activity)

A clean, visual tracking card for Home Assistant that displays your PostNL packages with a unique delivery animation. This card allows you to track incoming and outgoing shipments, view history, and customize the layout entirely to your liking.

<img src="https://github.com/jimz011/hki-postnl-card/blob/main/screenshots/screenshot-1.png?raw=true" width="600" alt="HKI PostNL Card Example"> <img src="https://github.com/jimz011/hki-postnl-card/blob/main/screenshots/screenshot-2.png?raw=true" width="600" alt="HKI PostNL Card Example 2">

***You may also be interested in [HKI Header Card](https://github.com/jimz011/hki-header-card) and [HKI Navigation Card](https://github.com/jimz011/hki-navigation-card)***

## ⚠️ Requirement
**This card relies on the PostNL integration.**
You must install and configure the [**PostNL Integration by Arjen Bos**](https://github.com/arjenbos/ha-postnl) before using this card.

## Installation

### HACS (Recommended)
1. Go to **HACS** > **Frontend**.
2. Click the **3 dots** in the top right corner > **Custom repositories**.
3. Add `https://github.com/jimz011/hki-postnl-card` as a **Lovelace** repository.
4. Click **Install**.
5. Reload your resources/browser.

### Manual
1. Download `hki-postnl-card.js` from the [releases section](https://github.com/jimz011/hki-postnl-card/releases).
2. Upload the file to your Home Assistant `www` folder.
3. Add the reference to your resources:
   ```yaml
   url: /local/hki-postnl-card.js
   type: module
   ```

## Configuration

### Visual Editor
This card supports the Lovelace Visual Editor. You can configure almost all settings, including reordering the layout blocks, directly via the UI.

### YAML Configuration
```yaml
type: custom:hki-postnl-card
entity: sensor.postnl_delivery
distribution_entity: sensor.postnl_distribution
title: PostNL
days_back: 90
show_header: true
show_animation: true
```

## Options

| Name | Type | Default | Description |
|:-----|:-----|:--------|:------------|
| `type` | string | **Required** | `custom:hki-postnl-card` |
| `entity` | string | `sensor.postnl_delivery` | The main entity for incoming deliveries. |
| `distribution_entity` | string | `sensor.postnl_distribution` | The entity for outgoing/distributed packages. |
| `title` | string | `PostNL` | The title displayed in the header. |
| `days_back` | number | `90` | How many days of history to show. |
| `header_color` | color | *Theme default* | Background color of the header. |
| `header_text_color` | color | *Theme default* | Text color of the header. |
| `show_header` | boolean | `true` | Show or hide the top header bar. |
| `show_animation` | boolean | `true` | Show the delivery van animation when a package is selected. |
| `show_placeholder` | boolean | `true` | Show the banner image when no package is selected. |
| `show_delivered` | boolean | `true` | Show the "Bezorgd" (Delivered) tab. |
| `show_sent` | boolean | `true` | Show the "Verzonden" (Sent) tab. |

### Image Customization
You can overwrite the default images with your own using local paths (e.g., `/local/my-image.png`) or remote URLs.

| Name | Default | Description |
|:-----|:--------|:------------|
| `logo_path` | *Remote URL* | The logo displayed in the header. |
| `van_path` | *Remote URL* | The delivery van used in the animation. |
| `placeholder_image` | *Remote URL* | The banner shown when no package is selected. |

### Layout Order
You can change the order of the visual blocks. In the UI editor, use the arrow keys. In YAML, provide a list of strings:

```yaml
layout_order:
  - header
  - animation
  - tabs
  - list
```
*Available blocks: `header`, `animation`, `tabs`, `list`*

## Credits
* Card created by [**Jimz011**](https://github.com/jimz011)
* Powered by the [**PostNL Integration**](https://github.com/arjenbos/ha-postnl) by Arjen Bos.
