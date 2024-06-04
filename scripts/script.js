document.addEventListener("DOMContentLoaded", function () {
    const sourceInput = document.getElementById('source-location');
    const destinationInput = document.getElementById('destination-location');
    const sourceSuggestionsContainer = document.getElementById('source-suggestions');
    const destinationSuggestionsContainer = document.getElementById('destination-suggestions');
    var routingControl = null;
    var sourceMarker = null;
    var destinationMarker = null;
    var accidentMarkers = [];

    // Show the form when the logo is clicked
    document.getElementById('form-logo').addEventListener('click', function () {
        const formContainer = document.getElementById('form-container');
        formContainer.style.display = formContainer.style.display === 'none' ? 'block' : 'none';
    });

    // Handle form submission
    document.getElementById('accident-form').addEventListener('submit', function (event) {
        event.preventDefault();

        const image = document.getElementById('accident-image').files[0];
        const title = document.getElementById('accident-title').value;
        const description = document.getElementById('accident-description').value;

        // Handle form data submission (e.g., send to server or process locally)
        console.log('Form submitted:', { image, title, description });

        // Close the form
        document.getElementById('form-container').style.display = 'none';
    });

    // Ensure the form is hidden on load
    document.getElementById('form-container').style.display = 'none';

    const addMarkersFromJSON = (map) => {
        fetch('/static/data.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                data.forEach(point => {
                    var latitude = point.Latitude;
                    var longitude = point.Longitude;
                    if (!isNaN(latitude) && !isNaN(longitude)) {
                        var customIcon = L.divIcon({
                            className: 'custom-marker',
                            html: '<div class="circle"></div>',
                            iconSize: [20, 20]
                        });

                        var marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);
                        marker.bindPopup(`<b>Accident:</b><br>Latitude: ${latitude}, Longitude: ${longitude}`);
                        accidentMarkers.push(marker);
                    } else {
                        console.error('Invalid coordinates for data point:', point);
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching JSON data:', error);
            });
    };

    // Leaflet map initialization
    const initializeMap = () => {
        const map = L.map('map').setView([53.8008, -1.5491], 12);
        const mapLink = "<a href='http://openstreetmap.org'>OpenStreetMap</a>";

        L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: `Leaflet &copy; ${mapLink}, contribution`,
            maxZoom: 20
        }).addTo(map);

        const terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: 'Terrain layer'
        });

        const trafficLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Traffic layer'
        });

        const baseLayers = {
            "Standard": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
            "Terrain": terrainLayer,
            "Traffic": trafficLayer
        };

        L.control.layers(baseLayers).addTo(map);

        return map;
    };

    const map = initializeMap();
    addMarkersFromJSON(map);

    const removeAccidentMarkers = () => {
        accidentMarkers.forEach(marker => {
            map.removeLayer(marker);
        });
        accidentMarkers = [];
    };

    const updateSuggestions = async (input, suggestionsContainer) => {
        const query = input.value.trim();
        suggestionsContainer.innerHTML = '';

        if (query.length === 0) {
            return;
        }

        try {
            const response = await fetch(`https://.opennominatimstreetmap.org/search?q=${query}&format=json`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            data.forEach(item => {
                const suggestion = document.createElement('div');
                suggestion.textContent = item.display_name;
                suggestion.classList.add('suggestion');
                suggestion.addEventListener('click', () => {
                    input.value = item.display_name;
                    suggestionsContainer.innerHTML = '';
                    const latLng = [parseFloat(item.lat), parseFloat(item.lon)];
                    map.setView(latLng, 13);

                    if (input.id === 'source-location') {
                        if (sourceMarker) map.removeLayer(sourceMarker);
                        sourceMarker = L.marker(latLng).addTo(map);
                    } else if (input.id === 'destination-location') {
                        if (destinationMarker) map.removeLayer(destinationMarker);
                        destinationMarker = L.marker(latLng).addTo(map);
                    }
                });
                suggestionsContainer.appendChild(suggestion);
            });
        } catch (error) {
            console.error('Error fetching location suggestions:', error);
        }
    };

    sourceInput.addEventListener('input', () => updateSuggestions(sourceInput, sourceSuggestionsContainer));
    destinationInput.addEventListener('input', () => updateSuggestions(destinationInput, destinationSuggestionsContainer));

    const fetchPhotos = async (placeId) => {
        try {
            const response = await fetch(`/fetch-photos?placeId=${placeId}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching photos:', error);
            return null;
        }
    };

    const handleMapClick = async (event) => {
        const clickedLatLng = event.latlng;
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${clickedLatLng.lat}&lon=${clickedLatLng.lng}&zoom=18&addressdetails=1`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            const placeId = data.place_id;
            const address = data.display_name;

            const photosData = await fetchPhotos(placeId);
            if (photosData && photosData.query && photosData.query.pages) {
                const images = photosData.query.pages[Object.keys(photosData.query.pages)[0]].images;
                if (images && images.length > 0) {
                    const photoTitle = images[0].title;
                    const photoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${photoTitle}&prop=imageinfo&iiprop=url&format=json`;

                    let popupContent = `<b>${address}</b><br>`;
                    images.forEach(image => {
                        const imageUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${image.title}&prop=imageinfo&iiprop=url&format=json`;
                        popupContent += `<img src="${imageUrl}" alt="Photo" width="200"><br>`;
                    });

                    const marker = L.marker(clickedLatLng).addTo(map);
                    marker.bindPopup(popupContent);
                    marker.openPopup();
                } else {
                    L.popup()
                        .setLatLng(clickedLatLng)
                        .setContent(address)
                        .openOn(map);
                }
            } else {
                L.popup()
                    .setLatLng(clickedLatLng)
                    .setContent(address)
                    .openOn(map);
            }
        } catch (error) {
            console.error('Error handling map click event:', error);
        }
    };

    const geocodeAddress = async (address) => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${address}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                return [parseFloat(lat), parseFloat(lon)];
            } else {
                throw new Error('Geocoding response did not contain valid data');
            }
        } catch (error) {
            console.error('Error geocoding address:', error);
            return null;
        }
    };

    let accidentData = [];
    fetch('/static/data.json')
        .then(response => response.json())
        .then(data => {
            accidentData = data;
        })
        .catch(error => console.error('Error loading accident data:', error));

    const findRoute = async (map) => {
        const sourceLocation = document.getElementById('source-location').value;
        const destinationLocation = document.getElementById('destination-location').value;
        const [sourceCoordinates, destinationCoordinates] = await Promise.all([
            geocodeAddress(sourceLocation),
            geocodeAddress(destinationLocation)
        ]);

        if (sourceMarker) map.removeLayer(sourceMarker);
        if (destinationMarker) map.removeLayer(destinationMarker);
        if (routingControl) map.removeControl(routingControl);
        removeAccidentMarkers();

        if (sourceCoordinates && destinationCoordinates) {
            sourceMarker = L.marker(sourceCoordinates).addTo(map);
            destinationMarker = L.marker(destinationCoordinates).addTo(map);

            const waypoints = [
               L .latLng(sourceCoordinates[0], sourceCoordinates[1]),
                L.latLng(destinationCoordinates[0], destinationCoordinates[1])
            ];

            routingControl = L.Routing.control({
                waypoints: waypoints,
                routeWhileDragging: true,
                show: true,
                showAlternatives: true,
                lineOptions: {
                    styles: [{ color: 'blue', opacity: 0.8, weight: 8 }]
                }
            }).addTo(map);

            routingControl.on('routesfound', function (e) {
                const route = e.routes[0];
                displayAccidentPointsNearRoute(route, 0.5);
            });

            routingControl.route();
        }
    };

    const displayAccidentPointsNearRoute = (route, radius) => {
        const routeCoordinates = route.coordinates;
        const radiusInMeters = radius * 1000;

        accidentData.forEach(point => {
            const pointLatLng = L.latLng(point.Latitude, point.Longitude);
            for (let i = 0; i < routeCoordinates.length; i++) {
                const routePointLatLng = L.latLng(routeCoordinates[i].lat, routeCoordinates[i].lng);
                if (pointLatLng.distanceTo(routePointLatLng) <= radiusInMeters) {
                    addAccidentMarker(point, 0.19);
                    break;
                }
            }
        });
    };

    const addAccidentMarker = (point, bufferRadius) => {
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div class="circle"></div>',
            iconSize: [20, 20]
        });

        const marker = L.marker([point.Latitude, point.Longitude], { icon: customIcon }).addTo(map);
        marker.bindPopup(`<b>Accident Reference:</b><br>Latitude: ${point.Latitude}, Longitude: ${point.Longitude}`);

        const buffer = L.circle([point.Latitude, point.Longitude], {
            radius: bufferRadius * 1000,
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.5
        }).addTo(map);
    };

    map.on('click', handleMapClick);

    document.getElementById('find-route-button').addEventListener('click', () => {
        findRoute(map);
        removeAccidentMarkers();
    });
});
