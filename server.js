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

db.serialize(() => {
   db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)');
});

app.get('/users', (req, res) => {
   db.all('SELECT * FROM users', [], (err, rows) => {
     if (err) {
       res.status(500).json({ error: err.message });
       return;
     }
     res.json(rows);
   });
});

dotenv.config()

// Middleware to allow cross-origin requests
app.use(cors());

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
      const hospitalsNearLatLng = hospitalsNear.map(h => h.geometry.location)
      console.log(hospitalsNearLatLng)

      // Googles distance matrix api for calculating travel time
      let destinationsString = ""
      hospitalsNearLatLng.forEach(h => {
         destinationsString += h.lat + "," + h.lng + "|"
      })
      const goMapsDistanceMatrixURL = `https://maps.gomaps.pro/maps/api/distancematrix/json?origins=${lat},${lon}&destinations=${destinationsString}&units=imperial&key=${process.env.GOOGLE_MAPS_API_KEY}`
      const goMapsDMResponseRaw = await fetch(goMapsDistanceMatrixURL)
      const goMapsDMResponse = await goMapsDMResponseRaw.json()
      const allTravelTime = goMapsDMResponse.rows[0].elements.map(e => e.duration.value)
      let minIndex = 0
      let min = allTravelTime[0]
      for (let i = 1; i < allTravelTime.length; i++){
         if (min > allTravelTime[i]){
            min = allTravelTime[i]
            minIndex = i
         }
      }
      const selectedHospital = hospitalsNear[minIndex]
      

      res.json({ res: goMapsDMResponse, near: hospitalsNear })
   } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error fetching data from Google Places API.' });
   }

  // Send the URL back as the response
//   res.json({ p: "34534534563456" })
});



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});














const test = {
  "business_status" : "OPERATIONAL",
  "geometry" : 
  {
     "location" : 
     {
        "lat" : 23.7528438,
        "lng" : 90.38155979999999
     },
     "viewport" : 
     {
        "northeast" : 
        {
           "lat" : 23.75413638029151,
           "lng" : 90.3829287302915
        },
        "southwest" : 
        {
           "lat" : 23.7514384197085,
           "lng" : 90.38023076970849
        }
     }
  },
  "icon" : "https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/hospital-71.png",
  "icon_background_color" : "#F88181",
  "icon_mask_base_uri" : "https://maps.gstatic.com/mapfiles/place_api/icons/v2/hospital-H_pinlet",
  "name" : "Square Hospital",
  "opening_hours" : 
  {
     "open_now" : true
  },
  "photos" : 
  [
     {
        "height" : 1707,
        "html_attributions" : 
        [
           "\u003ca href=\"https://maps.google.com/maps/contrib/113853919900188376048\"\u003eSquare Hospitals Ltd.\u003c/a\u003e"
        ],
        "photo_reference" : "AWYs27wAxrFujV4F5ggZhtGkrz8BAzNsDFlgow4MCRBXwr24q6uwbLFWm8swnAfeXR8VEoVa7yrXGs0iiuh3Aq9X82bIpsyCIDjwxSXo9TR4K3IbhjIzmo4jb42vPI_mnk9emmoWxzzzH3rgbGd7d8loPlIKgWND6ZrDkIcXsXj11n04Aam-",
        "width" : 2560
     }
  ],
  "place_id" : "ChIJvepSTq64VTcRwcKpyXMYOxE",
  "plus_code" : 
  {
     "compound_code" : "Q93J+4J Dhaka, Bangladesh",
     "global_code" : "7MMGQ93J+4J"
  },
  "rating" : 4.1,
  "reference" : "ChIJvepSTq64VTcRwcKpyXMYOxE",
  "scope" : "GOOGLE",
  "types" : 
  [
     "hospital",
     "point_of_interest",
     "health",
     "establishment"
  ],
  "user_ratings_total" : 2701,
  "vicinity" : "18 Bir Uttam Qazi Nuruzzaman Sarak West, Panthapath, Dhaka"
}


// https://maps.gomaps.pro/maps/api/distancematrix/json?origins=23.780395,90.408091&destinations=23.7528438,90.38155979999999&units=imperial&key=AlzaSyBCPugvhQ4oJrzjN547wOSAFJBZ4w2kzfS