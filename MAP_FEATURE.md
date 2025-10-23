# Dashboard Map Feature

## Overview
The dashboard now displays an interactive map showing the user's location based on their mailing address.

## Features

### 1. Interactive Map
- **Library:** Leaflet.js 1.9.4 (open-source, no API key required)
- **Map Tiles:** OpenStreetMap
- **Map Size:** 400px height, full width, responsive
- **Zoom:** Interactive zoom controls
- **Pan:** Click and drag to pan around

### 2. Geocoding
- **Service:** Nominatim (OpenStreetMap's geocoding API)
- **Input:** User's mailing address from their profile
- **Output:** Latitude/longitude coordinates
- **Free:** No API key or payment required

### 3. Map Display
- **Location Marker:** Blue pin dropped at the user's address
- **Popup:** Shows "Your Location" with the full address
- **Zoom Level:** Automatically zooms to 15 (street level)
- **Auto-open:** Popup opens automatically when map loads

### 4. Smart Visibility
- **Conditional Display:** Map only shows if user has a mailing address
- **No Address:** No map card appears on dashboard
- **Privacy:** Map only visible to the logged-in user

### 5. Error Handling
- **Geocoding Failure:** Shows friendly message if address can't be found
- **Network Error:** Shows message if map can't load
- **Invalid Address:** Gracefully handles malformed addresses
- **Fallback Messages:** Clear instructions to update address

## User Experience

### When User Has Address:
1. Dashboard loads
2. "Your Location" card appears after stats
3. Address is displayed above map
4. Map loads with OpenStreetMap tiles
5. Address is geocoded to coordinates
6. Map centers on location with marker
7. Popup shows address information

### When User Has No Address:
- No map card appears
- Dashboard shows normally without location section
- User can add address via admin panel (if admin) or by admin editing their profile

## Technical Details

### Technologies Used:
```javascript
- Leaflet.js 1.9.4 - Interactive map library
- OpenStreetMap - Free map tiles
- Nominatim API - Free geocoding service
```

### Map Configuration:
```javascript
Height: 400px
Width: 100% (responsive)
Default Center: San Francisco (37.7749, -122.4194)
Zoom Range: 1-19
Marker Style: Blue pin
```

### Geocoding Process:
1. Extract mailing address from user profile
2. Send request to Nominatim API
3. Parse JSON response for coordinates
4. Center map on coordinates
5. Add marker with popup

### API Endpoint:
```
https://nominatim.openstreetmap.org/search?format=json&q={address}
```

## Privacy & Security

### Privacy Considerations:
- ✅ Map only visible to logged-in user
- ✅ Location not shared with other users
- ✅ No location tracking
- ✅ Static location based on profile address
- ✅ User controls their address in profile

### Security:
- ✅ Address properly escaped in JavaScript
- ✅ No sensitive data exposed
- ✅ External API calls use HTTPS
- ✅ No API keys stored (service is free)

## Usage

### To See Your Location on Map:
1. Admin needs to add your mailing address
2. Go to Admin → Users → Edit your user
3. Fill in the "Mailing Address" field
4. Save the user profile
5. Go to Dashboard
6. Your location map will appear

### Address Format Examples:
- `123 Main St, San Francisco, CA 94102`
- `10 Downing Street, London, UK`
- `1600 Pennsylvania Ave NW, Washington, DC 20500`
- Any standard postal address format works

## Limitations

### Geocoding Limitations:
- Free tier of Nominatim (rate limited)
- Approximately 1 request per second
- Best effort geocoding (may not be 100% accurate)
- Rural addresses may be less precise
- PO Boxes may not geocode accurately

### Map Limitations:
- Requires internet connection
- Loads external resources (Leaflet.js, OpenStreetMap tiles)
- May be slower on slow connections
- Static location (doesn't track movement)

## Benefits

### For Users:
- ✅ Visual confirmation of address
- ✅ Quick reference to location
- ✅ Verify address accuracy
- ✅ Share location context

### For Estate Planning:
- ✅ Document location for executors
- ✅ Verify jurisdiction for legal documents
- ✅ Location-based asset organization
- ✅ Property location reference

## Future Enhancements

### Possible Additions:
- [ ] Multiple addresses (home, work, vacation)
- [ ] Contact locations on map
- [ ] Asset locations (safe deposit boxes, storage)
- [ ] Document physical location markers
- [ ] Distance calculator between locations
- [ ] Print map for offline reference
- [ ] Satellite view option
- [ ] Street view integration
- [ ] Location-based document filtering
- [ ] Emergency contact locations

## Troubleshooting

### Map Not Showing:
1. Check if mailing address is set in user profile
2. Verify internet connection
3. Check browser console for errors
4. Try refreshing the page

### Address Not Found:
1. Update address to be more specific
2. Include city, state, and zip code
3. Use standard address format
4. Try removing apartment/suite numbers

### Map Loading Slowly:
- Normal on first load (downloading tiles)
- Subsequent loads are faster (cached)
- Check internet connection speed

## Dependencies

### External Resources:
```html
<!-- Leaflet CSS -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

<!-- Leaflet JavaScript -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
```

### CDN Used:
- unpkg.com (Leaflet library)
- OpenStreetMap tile servers
- Nominatim API (nominatim.openstreetmap.org)

## Attribution

### Required Attributions:
- OpenStreetMap contributors (displayed on map)
- Leaflet.js (open-source mapping library)
- Nominatim geocoding service

### License:
- Leaflet: BSD 2-Clause License
- OpenStreetMap: ODbL (Open Database License)
- Nominatim: Free to use with attribution
