document.addEventListener('DOMContentLoaded', () => {
    const pincodeInput = document.getElementById('pincode-input');
    const allocateBtn = document.getElementById('allocate-btn');
    const resultSection = document.getElementById('result-section');
    const centreListDiv = document.getElementById('centre-list');

    let testCentres = [];
    let pincodeData = new Map();

    // 1. Fetch and process data
    async function loadData() {
        try {
            // Fetch test centres from CSV
            const centresResponse = await fetch('test_centres.csv');
            const centresText = await centresResponse.text();
            testCentres = parseCSV(centresText);
            
            // Fetch pincode coordinates from JSON
            const pincodeResponse = await fetch('pincode_coordinates.json');
            const pincodeJson = await pincodeResponse.json();
            pincodeJson.forEach(item => {
                pincodeData.set(item.pincode, {
                    lat: item.coordinates[1],
                    lon: item.coordinates[0]
                });
            });

            populateCentreList();
        } catch (error) {
            console.error("Error loading data:", error);
            centreListDiv.innerHTML = '<p class="error">Could not load test centre data. Please refresh the page.</p>';
        }
    }

    function parseCSV(text) {
        const rows = text.split('\n').slice(1); // Skip header row
        return rows.map(row => {
            const columns = row.split(',');
            return {
                state: columns[0].trim(),
                city: columns[1].trim(),
                pincode: columns[2].trim()
            };
        }).filter(centre => centre.pincode); // Filter out empty rows
    }

    // 2. Populate the scrollable list of available centres
    function populateCentreList() {
        if (!testCentres.length) return;
        centreListDiv.innerHTML = ''; // Clear loader
        testCentres.forEach(centre => {
            const item = document.createElement('div');
            item.className = 'centre-item';
            item.innerHTML = `<span class="city">${centre.city}</span> <span class="state">${centre.state}</span>`;
            centreListDiv.appendChild(item);
        });
    }

    // 3. Haversine formula to calculate distance
    function getDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    }

    // 4. Handle the allocation logic
    function handleAllocation() {
        const inputPincode = pincodeInput.value;
        resultSection.innerHTML = '';

        // Validate input
        if (!/^\d{6}$/.test(inputPincode)) {
            resultSection.innerHTML = '<p class="error">Please enter a valid 6-digit pincode.</p>';
            return;
        }

        const userCoords = pincodeData.get(inputPincode);
        if (!userCoords) {
            resultSection.innerHTML = '<p class="error">Pincode not found. Please try another one.</p>';
            return;
        }
        
        // Find the nearest city
        let nearestCity = null;
        let minDistance = Infinity;

        testCentres.forEach(centre => {
            const centreCoords = pincodeData.get(centre.pincode);
            if (centreCoords) {
                const distance = getDistance(userCoords.lat, userCoords.lon, centreCoords.lat, centreCoords.lon);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestCity = centre;
                }
            }
        });

        if (!nearestCity) {
            resultSection.innerHTML = '<p class="error">Could not determine the nearest city.</p>';
            return;
        }

        // Get a random city that is NOT the nearest one
        let randomCity = null;
        do {
            const randomIndex = Math.floor(Math.random() * testCentres.length);
            randomCity = testCentres[randomIndex];
        } while (randomCity.city === nearestCity.city && testCentres.length > 1);

        // Display results
        resultSection.innerHTML = `
            <p class="nearest">Your nearest city is ${nearestCity.city}.</p>
            <p class="nearest">NO. This city will not be allotted to you.</p>
            <hr>
            <p>Your allocated examination city is:</p>
            <p class="allocated">${randomCity.city}</p>
        `;
    }

    // Event Listener for the button
    allocateBtn.addEventListener('click', handleAllocation);

    // Allow pressing Enter to trigger allocation
    pincodeInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            handleAllocation();
        }
    });

    // Initial data load
    loadData();
});