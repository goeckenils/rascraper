// run.js
require('dotenv').config();
const { fetchEventsFromPromoter } = require('./services/ra');
const { fetchAllEvents, addEvents } = require('./services/cockpit');

async function main() {
  console.log('🚀 Starte RA-Cockpit-Sync...');

  const promoterId = process.env.RA_PROMOTER_ID;
  if (!promoterId) {
    console.error('❌ RA_PROMOTER_ID ist nicht in der .env-Datei gesetzt. Breche ab.');
    return;
  }

  // 1. Alle zukünftigen Events von Resident Advisor holen
  const raEvents = await fetchEventsFromPromoter(promoterId);
  if (raEvents.length === 0) {
    console.log('🏁 Keine Events von RA erhalten. Beende den Vorgang.');
    return;
  }

  // 2. Alle bereits gespeicherten Events aus Cockpit holen
  const cockpitEvents = await fetchAllEvents();

  // 3. Neue Events durch Vergleich finden
  const existingEventUrls = new Set(cockpitEvents.map(event => event.eventURL));
  const newEvents = raEvents.filter(event => !existingEventUrls.has(event.eventURL));

  console.log('---');
  console.log('📊 Vergleichsergebnis:');
  console.log(`   - Events von RA: ${raEvents.length}`);
  console.log(`   - Events in Cockpit: ${cockpitEvents.length}`);
  console.log(`   - Neue Events zum Hinzufügen: ${newEvents.length}`);
  console.log('---');

  // 4. Nur die neuen Events zu Cockpit hinzufügen
  if (process.env.DRY_RUN === 'true') {
    console.log('💡 DRY RUN ist aktiviert. Es werden keine Daten an Cockpit gesendet.');
    if (newEvents.length > 0) {
      console.log('Folgende Events würden hinzugefügt werden:');
      newEvents.forEach(event => console.log(`   - ${event.eventTitle} (${event.eventDate})`));
    }
  } else {
    await addEvents(newEvents);
  }

  console.log('🏁 Sync-Vorgang abgeschlossen.');
}

main().catch(error => {
  console.error('Ein unerwarteter Fehler ist im Hauptprozess aufgetreten:', error);
});