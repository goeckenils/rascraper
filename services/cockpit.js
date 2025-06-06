// services/cockpit.js
const axios = require('axios');

const API_URL = process.env.COCKPIT_API_URL;
const API_KEY = process.env.COCKPIT_API_KEY;
const COLLECTION_NAME = 'raevents'; // Collection-Name hier zentral definieren

if (!API_URL || !API_KEY) {
  throw new Error('COCKPIT_API_URL und COCKPIT_API_KEY müssen in der .env-Datei gesetzt sein.');
}

const cockpitApi = axios.create({
  baseURL: API_URL,
  headers: {
    'api-key': API_KEY, // Korrekter Header für die Authentifizierung
    'Content-Type': 'application/json',
  },
});

/**
 * Holt alle existierenden Events aus der Cockpit Collection.
 * @returns {Promise<Array>} Eine Liste der Events.
 */
async function fetchAllEvents() {
  console.log(`📡 Lade existierende Events aus Cockpit...`);
  try {
    const response = await cockpitApi.get(`content/items/${COLLECTION_NAME}`);
    console.log(`📦 ${response.data.length} Events aus Cockpit geladen.`);
    return response.data;
  } catch (error) {
    console.error('❌ Fehler beim Laden der Events aus Cockpit:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Fügt neue Events zur Cockpit Collection hinzu.
 * @param {Array<object>} events - Die Liste der neuen Events, die hinzugefügt werden sollen.
 */
async function addEvents(events) {
  if (events.length === 0) {
    console.log('✅ Keine neuen Events zum Hinzufügen.');
    return;
  }

  console.log(`➕ Füge ${events.length} neue Events zu Cockpit hinzu...`);

  for (const event of events) {
    try {
      // Der Body für die /api/items/{collection} Route ist { "data": {...} }
      await cockpitApi.post(`content/item/${COLLECTION_NAME}`, { data: event });
      console.log(`   -> ✅ Erfolgreich hinzugefügt: "${event.eventTitle}"`);
    } catch (error) {
      console.error(`   -> ❌ Fehler beim Hinzufügen von "${event.eventTitle}":`, error.response?.data || error.message);
    }
  }
}

module.exports = {
  fetchAllEvents,
  addEvents,
};