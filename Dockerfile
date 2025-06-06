# Schritt 1: Basis-Image mit Node.js
FROM node:18-slim

# Schritt 2: Cron-Dienst installieren
# Wir führen ein Update durch, installieren cron und ein Tool zum Bearbeiten von Textdateien (falls nötig).
# Anschließend räumen wir auf, um das Image klein zu halten.
RUN apt-get update && apt-get -y install cron && rm -rf /var/lib/apt/lists/*

# Schritt 3: Anwendungsverzeichnis erstellen
WORKDIR /usr/src/app

# Schritt 4: Abhängigkeiten installieren
# Wir kopieren nur package.json und package-lock.json, um den Docker-Cache optimal zu nutzen.
COPY package*.json ./
RUN npm install

# Schritt 5: Den gesamten App-Code kopieren
COPY . .

# Schritt 6: Die Cron-Datei hinzufügen und Berechtigungen setzen
# Kopiere unsere crontab-Datei in das Verzeichnis, wo cron sie erwartet.
COPY crontab /etc/cron.d/sync-cron

# Gib der Cron-Datei die richtigen Berechtigungen.
RUN chmod 0644 /etc/cron.d/sync-cron

# Erstelle die Log-Datei, auf die Cron schreiben kann (manchmal erforderlich).
RUN touch /var/log/cron.log

# Schritt 7: Den Cron-Dienst als Hauptprozess starten
# Dieser Befehl startet den Cron-Dienst im Vordergrund und gibt uns die Logs aus.
CMD ["cron", "-f", "-L", "/var/log/cron.log"]