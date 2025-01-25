const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const app = express();
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./mydb.sqlite', (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

dotenv.config()

// Middleware to allow cross-origin requests
app.use(cors());



app.get('/create-table', (req, res) => {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS hospital_db (
        name TEXT,
        reference TEXT,
        phone TEXT
      )
    `;

    db.run(createTableSQL, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to create table', details: err.message });
        }

        // Insert 3 records after the table is created
        const insertSQL = `
        INSERT INTO hospital_db (name, reference, phone) VALUES
        ('zubayer_hospital', 'ChIJmyoglmXHVTcRgO98YSykrdQ', '01823323854'),
        ('Jane Smith', 'Ref002', '234-567-8901'),
        ('Mary Johnson', 'Ref003', '345-678-9012')
      `;

        db.run(insertSQL, function (err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to insert data', details: err.message });
            }
            res.status(200).json({ message: 'Table "hospital_db" created and 3 records inserted successfully' });
        });
    });
});




// Define a route to take GPS coordinates via query parameters
app.get('/hospital', async (req, res) => {
    // Extract lat and lon from query parameters
    const { lat, lon } = req.query;

    // Validate that lat and lon are provided and are numbers
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: 'Invalid or missing lat/lon' });
    }

    // Google Maps URL based on the provided coordinates
    // const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;

    try {
        // Google Places API endpoint to search for hospitals
        const goMapsNearbySearchURL = `https://maps.gomaps.pro/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=5000&type=hospital&key=${process.env.GOOGLE_MAPS_API_KEY}`;
        const goMapsNSResponse = await fetch(goMapsNearbySearchURL)
        const hospitalsNear = (await goMapsNSResponse.json()).results
        const hospitalsNearLatLon = hospitalsNear.map(h => h.geometry.location)

        // Googles distance matrix api for calculating travel time
        let destinationsString = ""
        hospitalsNearLatLon.forEach(h => {
            destinationsString += h.lat + "," + h.lng + "|"
        })
        const goMapsDistanceMatrixURL = `https://maps.gomaps.pro/maps/api/distancematrix/json?origins=${lat},${lon}&destinations=${destinationsString}&units=imperial&key=${process.env.GOOGLE_MAPS_API_KEY}`
        const goMapsDMResponseRaw = await fetch(goMapsDistanceMatrixURL)
        const goMapsDMResponse = await goMapsDMResponseRaw.json()
        const allTravelTime = goMapsDMResponse.rows[0].elements.map(e => e.duration.value)
        let minIndex = 0
        let min = allTravelTime[0]
        for (let i = 1; i < allTravelTime.length; i++) {
            if (min > allTravelTime[i]) {
                min = allTravelTime[i]
                minIndex = i
            }
        }
        const selectedHospital = hospitalsNear[minIndex]

        const query = 'SELECT * FROM hospital_db WHERE reference = ?';

        // const reference = "ChIJFe1B2avHVTcRfAScTk7fUfE"
        const reference = selectedHospital.reference

        console.log("ref", reference)

        db.get(query, ["ChIJmyoglmXHVTcRgO98YSykrdQ"], (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch data', details: err.message });
            }
            if (!row) {
                return res.status(404).json({ message: 'Record not found' });
            }
            console.log(row)
            result = row
            res.status(200).json({ phone:  row.phone})
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error fetching data from Google Places API.' });
    }

    // Send the URL back as the response
    // res.json({ p: "34534534563456" })
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});