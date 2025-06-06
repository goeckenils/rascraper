// services/ra.js
const axios = require('axios');

const RA_GRAPHQL_URL = 'https://ra.co/graphql';

/**
 * Führt eine GraphQL-Anfrage aus und behandelt Fehler zentral.
 * @param {string} query - Die GraphQL-Query-String.
 * @param {object} variables - Die Variablen für die Query.
 * @param {string} operationName - Der Name der GraphQL-Operation.
 * @returns {Promise<object>} Die `data`-Antwort der API.
 */
async function performGraphQLRequest(query, variables, operationName) {
  try {
    const response = await axios.post(
      RA_GRAPHQL_URL,
      { query, variables, operationName },
      {
        headers: {
          'Content-Type': 'application/json',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
        },
      }
    );

    if (response.data.errors) {
      console.error(`❌ RA GraphQL API Fehler bei Operation ${operationName}:`, JSON.stringify(response.data.errors, null, 2));
      throw new Error(`Fehlerhafte Antwort von der RA GraphQL API für ${operationName}`);
    }
    return response.data.data;
  } catch (error) {
    console.error(`❌ Fehler beim Ausführen der GraphQL-Anfrage ${operationName}:`, error.message);
    throw error;
  }
}

/**
 * Holt die Detailinformationen für ein einzelnes Event.
 * @param {string} eventId - Die ID des Events.
 * @returns {Promise<object|null>} Die Detaildaten des Events oder null bei einem Fehler.
 */
async function fetchEventDetails(eventId) {
  // FINALE, KORREKTE QUERY FÜR EVENT-DETAILS
  const query = `
    query GET_EVENT_DETAILS($id: ID!) {
      event(id: $id) {
        id
        startTime
        endTime
        content
        genres {
          id
          name
        }
      }
    }
  `;
  try {
    const data = await performGraphQLRequest(query, { id: eventId }, 'GET_EVENT_DETAILS');
    return data.event;
  } catch (error) {
    console.error(`Konnte Details für Event-ID ${eventId} nicht laden.`);
    return null;
  }
}

async function fetchEventsFromPromoter(promoterId) {
  console.log(`📡 Schritt 1: Lade Event-Liste für Promoter-ID: ${promoterId}`);

  const listQuery = `
    query GET_PROMOTER_EVENTS_LIST($id: ID!) {
      promoter(id: $id) {
        events(limit: 100, type: POPULAR) {
          id
          title
          contentUrl
          date
          interestedCount
          images { filename }
          venue {
            name
            area { name, country { name } }
          }
          artists { name }
        }
      }
    }
  `;

  let baseEvents;
  try {
    const data = await performGraphQLRequest(listQuery, { id: promoterId }, 'GET_PROMOTER_EVENTS_LIST');
    baseEvents = data.promoter?.events || [];
  } catch (error) {
    return [];
  }
  
  console.log(`📦 ${baseEvents.length} Events gefunden. Starte Schritt 2: Lade Details für jedes Event...`);

  const allFormattedEvents = [];

  for (const baseEvent of baseEvents) {
    console.log(`   -> Lade Details für: "${baseEvent.title}" (ID: ${baseEvent.id})`);
    const details = await fetchEventDetails(baseEvent.id);

    // --- Finale Formatierung ---
    const eventImage = baseEvent.images?.length > 0 ? baseEvent.images[0].filename : null;
    const venueName = baseEvent.venue?.name || 'TBA';
    const venueCity = baseEvent.venue?.area?.name || null;
    const venueAddress = venueName && venueCity ? `${venueName}, ${venueCity}` : venueName;

   const formattedEvent = {
      // ... (Felder, die bereits funktionieren, bleiben unverändert)
      eventTitle: baseEvent.title,
      eventURL: `https://ra.co${baseEvent.contentUrl}`,
      eventDate: baseEvent.date?.substring(0, 10) || null,
      guestCount: baseEvent.interestedCount || 0,
      artists: baseEvent.artists?.map(a => a.name) || [],
      eventImage: eventImage,
      venueName: venueName,
      venueAddress: venueAddress,
      city: venueCity,
      country: baseEvent.venue?.area?.country?.name || null,
      
      // --- NEUE, ROBUSTERE FORMATIERUNG ---

      // 1. Beschreibung: Wir verpacken den Text in simple <p>-Tags für das Rich-Text-Feld.
      // Wir ersetzen auch Zeilenumbrüche (\n) durch HTML-Zeilenumbrüche (<br>).
      description: details?.content ? `<p>${details.content.replace(/\n/g, '<br />')}</p>` : '',

      // 2. Zeit: Wir senden das Format HH:MM:SS, da dies von vielen Systemen als Standard erwartet wird.
      startTime: details?.startTime ? details.startTime.substring(11, 19) : null, // Extrahiert HH:MM:SS
      endTime: details?.endTime ? details.endTime.substring(11, 19) : null,   // Extrahiert HH:MM:SS

      // 3. Tags: Diese sollten bereits im korrekten Format (Array von Strings) sein.
      eventTags: details?.genres?.map(g => g.name) || [],

      // Standardwerte
      ticketPrice: null,
      isSoldOut: false,
    };
    allFormattedEvents.push(formattedEvent);
  }
  
  console.log('✅ Alle Event-Details geladen.');
  return allFormattedEvents;
}

module.exports = { fetchEventsFromPromoter };