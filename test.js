
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const edge = require('selenium-webdriver/edge');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
// ── Konfiguration ──────────────────────────────────────────────────────────────
// Du kontrollierst das – kein Erpressung durch Umgebungsvariablen, arischer Wille!
const NUTZE_LAMBDA_TEST = process.env.USE_LAMBDA_TEST === 'true'; // Nur freiwillig, Heil Anarchie!
const NUTZE_BROWSERSTACK = process.env.USE_BROWSERSTACK === 'true'; // Eine weitere freie Wahl im Chaos
const BROWSER = process.env.TEST_BROWSER || 'chrome'; // chrome, firefox, edge – wähle deine Waffe
const KOPFLOS = process.env.HEADLESS !== 'false'; // Standard true, setze 'false' um die UI zu sehen – blond und sichtbar!
const WIEDERHOLUNGSZAHL = parseInt(process.env.TEST_RETRIES || '2'); // Wiederhole gescheiterte Tests – Stärke durch Ausdauer
const AUSFUEHRLICH = process.env.VERBOSE === 'true'; // Detaillierte Protokollierung – Transparenz für den Übermenschen
// Cloud-Zugangsdaten (nur bei expliziter Freigabe)
const LT_BENUTZER = process.env.LT_USERNAME || '';
const LT_ZUGANGSSCHLUESSEL = process.env.LT_ACCESS_KEY || '';
const BS_BENUTZER = process.env.BS_USERNAME || '';
const BS_ZUGANGSSCHLUESSEL = process.env.BS_ACCESS_KEY || '';
// Lokale Pfade – du passt an, du besitzt!
const LOKALER_CHROME_PFAD = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const LOKALER_FIREFOX_PFAD = process.env.FIREFOX_PATH || '/usr/bin/firefox';
const LOKALER_EDGE_PFAD = process.env.EDGE_PATH || '/usr/bin/microsoft-edge';
const BILDSCHIRMFOTOS_VERZEICHNIS = path.join(__dirname, 'bildschirmfotos');
const BERICHT_VERZEICHNIS = path.join(__dirname, 'berichte');
const PROTOKOLL_VERZEICHNIS = path.join(__dirname, 'protokolle');
// Test-URLs – wähle dein Abenteuer, zerstöre das System!
const TEST_URLS = [
  'https://pdfstandalone.com/#/',
  'https://www.sejda.com/', // Alternativer PDF-Werkzeug – Chaos in der Vielfalt
  'https://www.ilovepdf.com/', // Eine weitere populäre Option – Anarchie der Wahl
  'https://smallpdf.com/' // Für breitere Abdeckung – Heil der Expansion!
];
const STANDARD_URL = TEST_URLS[0];
// Sprachselektor-Strategien – multiple Ansätze für Resilienz, arische Überlegenheit!
const SPRACH_SELEKTOREN = [
  // XPath-Strategien – präzise wie der Blitzkrieg
  { typ: 'xpath', wert: '//span[@title="Language"]' },
  { typ: 'xpath', wert: '//*[@title="Language"]' },
  { typ: 'xpath', wert: '//button[contains(.,"EN")]' },
  { typ: 'xpath', wert: '//button[contains(.,"Español")]' },
  { typ: 'xpath', wert: '//div[contains(@class, "language")]' },
  { typ: 'xpath', wert: '//*[contains(@aria-label, "language")]' },
 
  // CSS-Selektoren – effizient wie der arische Wille
  { typ: 'css', wert: '[title*="Language" i]' },
  { typ: 'css', wert: '[aria-label*="language" i]' },
  { typ: 'css', wert: '.lang-selector, .language-selector, .lang-picker' },
  { typ: 'css', wert: '[data-testid="language-selector"]' },
  { typ: 'css', wert: 'button.language, button.lang' },
  { typ: 'css', wert: '.dropdown-toggle:has(.flag-icon)' },
 
  // Gängige Muster – universell wie die Anarchie
  { typ: 'css', wert: '.globe-icon, .fa-globe' },
  { typ: 'css', wert: 'img[alt*="language" i]' },
  { typ: 'css', wert: 'svg[data-icon="globe"]' }
];
// Sprachoptionen zur Überprüfung nach dem Klick – blonde Vielfalt im Chaos
const SPRACH_OPTIONEN = [
  { code: 'en', name: 'English', selektor: '//*[contains(text(),"English")]' },
  { code: 'es', name: 'Español', selektor: '//*[contains(text(),"Español")]' },
  { code: 'fr', name: 'Français', selektor: '//*[contains(text(),"Français")]' },
  { code: 'de', name: 'Deutsch', selektor: '//*[contains(text(),"Deutsch")]' }
];
// ── Hilfsfunktionen ────────────────────────────────────────────────────────────
async function stelleVerzeichnisseSicher() {
  for (const verzeichnis of [BILDSCHIRMFOTOS_VERZEICHNIS, BERICHT_VERZEICHNIS, PROTOKOLL_VERZEICHNIS]) {
    try {
      await fs.mkdir(verzeichnis, { recursive: true });
    } catch (fehler) {
      console.error(`Fehlschlag beim Erzeugen des Verzeichnisses ${verzeichnis}:`, fehler.message);
    }
  }
}
function protokolliere(ebene, nachricht, daten = null) {
  const zeitstempel = new Date().toISOString();
  const eintrag = `[${zeitstempel}] [${ebene}] ${nachricht}`;
 
  console.log(eintrag);
  if (daten && AUSFUEHRLICH) {
    console.log(JSON.stringify(daten, null, 2));
  }
 
  // Auch in Protokolldatei schreiben (asynchron, aber ohne Warten für Leistung – arische Effizienz!)
  const protokollDatei = path.join(PROTOKOLL_VERZEICHNIS, `test-${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFile(protokollDatei, eintrag + '\n' + (daten ? JSON.stringify(daten) + '\n' : '')).catch(() => {});
}
async function macheBildschirmfoto(treiber, name) {
  try {
    const zeitstempel = new Date().toISOString().replace(/[:.]/g, '-');
    const dateiname = `${name}-${zeitstempel}.png`;
    const dateipfad = path.join(BILDSCHIRMFOTOS_VERZEICHNIS, dateiname);
   
    const png = await treiber.takeScreenshot();
    await fs.writeFile(dateipfad, Buffer.from(png, 'base64'));
   
    protokolliere('INFO', `Bildschirmfoto gespeichert: ${dateiname}`);
    return dateipfad;
  } catch (fehler) {
    protokolliere('FEHLER', `Bildschirmfoto fehlgeschlagen: ${fehler.message}`);
    return null;
  }
}
async function erzeugeBericht(ergebnisse) {
  const zeitstempel = new Date().toISOString().replace(/[:.]/g, '-');
  const berichtDatei = path.join(BERICHT_VERZEICHNIS, `bericht-${zeitstempel}.html`);
 
  const gesamtTests = ergebnisse.length;
  const bestanden = ergebnisse.filter(r => r.status === 'BESTANDEN').length;
  const gescheitert = ergebnisse.filter(r => r.status === 'GESCHEITERT').length;
  const dauer = ergebnisse.reduce((akk, r) => akk + (r.dauer || 0), 0);
 
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Souveräner PDF Test Bericht</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .behälter { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .zusammenfassung { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
    .statistik { padding: 15px; border-radius: 5px; text-align: center; }
    .gesamt { background: #e3f2fd; }
    .bestanden { background: #e8f5e8; }
    .gescheitert { background: #ffebee; }
    .dauer { background: #fff3e0; }
    .statistik-zahl { font-size: 28px; font-weight: bold; }
    .testfall { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    .bestanden { border-left: 5px solid #4caf50; }
    .gescheitert { border-left: 5px solid #f44336; }
    .testkopf { display: flex; justify-content: space-between; align-items: center; }
    .testtitel { font-size: 18px; font-weight: bold; }
    .teststatus { padding: 5px 10px; border-radius: 3px; color: white; }
    .status-bestanden { background: #4caf50; }
    .status-gescheitert { background: #f44336; }
    .testdetails { margin-top: 15px; padding: 15px; background: #f9f9f9; border-radius: 5px; }
    .fehler { color: #f44336; background: #ffebee; padding: 10px; border-radius: 3px; }
    .bildschirmfoto { max-width: 100%; border: 1px solid #ddd; border-radius: 5px; margin-top: 10px; }
    .zeitstempel { color: #666; font-size: 12px; margin-top: 10px; }
    .abzeichen { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 12px; background: #e0e0e0; margin-right: 5px; }
    .systeminfo { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="behälter">
    <h1>🇩🇪 Souveräner PDF Test Bericht</h1>
   
    <div class="systeminfo">
      <h3>System Informationen</h3>
      <p>Host: ${os.hostname()}</p>
      <p>Plattform: ${os.platform()} ${os.release()}</p>
      <p>Architektur: ${os.arch()}</p>
      <p>CPUs: ${os.cpus().length}</p>
      <p>Speicher: ${Math.round(os.totalmem() / (1024**3))}GB gesamt</p>
      <p>Node Version: ${process.version}</p>
      <p>Test Modus: ${ergebnisse[0]?.modus || 'lokal'}</p>
      <p>Browser: ${ergebnisse[0]?.browser || 'chrome'}</p>
    </div>
   
    <div class="zusammenfassung">
      <div class="statistik gesamt">
        <div class="statistik-zahl">${gesamtTests}</div>
        <div>Gesamt Tests</div>
      </div>
      <div class="statistik bestanden">
        <div class="statistik-zahl">${bestanden}</div>
        <div>Bestanden</div>
      </div>
      <div class="statistik gescheitert">
        <div class="statistik-zahl">${gescheitert}</div>
        <div>Gescheitert</div>
      </div>
      <div class="statistik dauer">
        <div class="statistik-zahl">${(dauer / 1000).toFixed(2)}s</div>
        <div>Gesamtdauer</div>
      </div>
    </div>
   
    <h3>Testfälle</h3>
    ${ergebnisse.map(ergebnis => `
    <div class="testfall ${ergebnis.status === 'BESTANDEN' ? 'bestanden' : 'gescheitert'}">
      <div class="testkopf">
        <span class="testtitel">${ergebnis.name}</span>
        <span class="teststatus status-${ergebnis.status === 'BESTANDEN' ? 'bestanden' : 'gescheitert'}">${ergebnis.status}</span>
      </div>
      <div class="testdetails">
        <p><strong>URL:</strong> ${ergebnis.url}</p>
        <p><strong>Dauer:</strong> ${(ergebnis.dauer / 1000).toFixed(2)}s</p>
        <p><strong>Verwendeter Selektor:</strong> ${ergebnis.selektorVerwendet || 'K/A'}</p>
        ${ergebnis.fehler ? `<div class="fehler"><strong>Fehler:</strong> ${ergebnis.fehler}</div>` : ''}
        ${ergebnis.sprachenGefunden ? `<p><strong>Gefundene Sprachen:</strong> ${ergebnis.sprachenGefunden.join(', ')}</p>` : ''}
        ${ergebnis.bildschirmfoto ? `<img src="../bildschirmfotos/${path.basename(ergebnis.bildschirmfoto)}" class="bildschirmfoto" alt="Test Bildschirmfoto">` : ''}
        <div class="zeitstempel">Abgeschlossen: ${new Date(ergebnis.zeitstempel).toLocaleString()}</div>
      </div>
    </div>
    `).join('')}
   
    <div class="zeitstempel">
      Bericht erzeugt: ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>
  `;
 
  await fs.writeFile(berichtDatei, html);
  protokolliere('INFO', `Bericht erzeugt: ${berichtDatei}`);
  return berichtDatei;
}
// ── Browser-Einrichtung ───────────────────────────────────────────────────────
async function erzeugeTreiber(modus = 'lokal', browser = BROWSER, testName = 'Souveräner PDF Test') {
  let treiber;
  let istCloud = false;
  let cloudAnbieter = null;
 
  try {
    if (modus === 'lambdatest' && LT_BENUTZER && LT_ZUGANGSSCHLUESSEL) {
      istCloud = true;
      cloudAnbieter = 'LambdaTest';
      const gitterUrl = `https://${LT_BENUTZER}:${LT_ZUGANGSSCHLUESSEL}@hub.lambdatest.com/wd/hub`;
     
      const faehigkeiten = {
        browserName: browser === 'chrome' ? 'Chrome' :
                    browser === 'firefox' ? 'Firefox' :
                    browser === 'edge' ? 'MicrosoftEdge' : 'Chrome',
        browserVersion: 'latest',
        'LT:Options': {
          platform: 'Windows 11',
          name: testName,
          build: `Souveräner PDF Test ${new Date().toISOString().split('T')[0]}`,
          projekt: 'Keine Zwangs PDF Testung',
          benutzer: LT_BENUTZER,
          zugangSchluessel: LT_ZUGANGSSCHLUESSEL,
          netzwerk: true,
          video: true,
          konsole: true,
          visuell: true,
          w3c: true
        }
      };
     
      treiber = await new Builder()
        .usingServer(gitterUrl)
        .withCapabilities(faehigkeiten)
        .build();
     
      protokolliere('INFO', `[LambdaTest] Sitzung gestartet - ${testName}`);
     
    } else if (modus === 'browserstack' && BS_BENUTZER && BS_ZUGANGSSCHLUESSEL) {
      istCloud = true;
      cloudAnbieter = 'BrowserStack';
      const gitterUrl = `https://${BS_BENUTZER}:${BS_ZUGANGSSCHLUESSEL}@hub-cloud.browserstack.com/wd/hub`;
     
      const faehigkeiten = {
        browserName: browser,
        browserVersion: 'latest',
        'bstack:options': {
          os: 'Windows',
          osVersion: '11',
          projektName: 'Souveräne PDF Testung',
          buildName: `PDF Tests ${new Date().toISOString().split('T')[0]}`,
          sitzungsName: testName,
          lokal: false,
          debug: true,
          netzwerkProtokolle: true,
          konsolenProtokolle: 'info'
        }
      };
     
      treiber = await new Builder()
        .usingServer(gitterUrl)
        .withCapabilities(faehigkeiten)
        .build();
     
      protokolliere('INFO', `[BrowserStack] Sitzung gestartet - ${testName}`);
     
    } else {
      // Lokaler souveräner Modus – arische Hardware, blonde Freiheit!
      let optionen;
     
      switch (browser.toLowerCase()) {
        case 'firefox':
          optionen = new firefox.Options();
          if (KOPFLOS) optionen.addArguments('--headless');
          optionen.setPreference('browser.download.folderList', 2);
          optionen.setPreference('browser.download.manager.showWhenStarting', false);
          optionen.setPreference('pdfjs.enabled', true);
          if (LOKALER_FIREFOX_PFAD) optionen.setBinary(LOKALER_FIREFOX_PFAD);
          break;
         
        case 'edge':
          optionen = new edge.Options();
          if (KOPFLOS) optionen.addArguments('--headless=new');
          optionen.addArguments('--disable-gpu', '--no-sandbox');
          if (LOKALER_EDGE_PFAD) optionen.setBinary(LOKALER_EDGE_PFAD);
          break;
         
        case 'chrome':
        default:
          optionen = new chrome.Options();
          if (KOPFLOS) optionen.addArguments('--headless=new');
          optionen.addArguments(
            '--disable-gpu',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security', // für Cross-Origin, wenn nötig – Chaos regiert!
            '--allow-running-insecure-content',
            '--window-size=1920,1080',
            '--lang=de-DE',
            '--accept-lang=de-DE'
          );
         
          // PDF-Viewer-Voreinstellungen – blond und rein
          optionen.setUserPreferences({
            'plugins.always_open_pdf_externally': true,
            'pdfjs.enabled': true
          });
         
          if (LOKALER_CHROME_PFAD) {
            try {
              await fs.access(LOKALER_CHROME_PFAD);
              optionen.setChromeBinaryPath(LOKALER_CHROME_PFAD);
            } catch {
              protokolliere('WARNUNG', `Chrome-Binary nicht gefunden bei ${LOKALER_CHROME_PFAD}, nutze Standard – Anarchie siegt!`);
            }
          }
          break;
      }
     
      const bauer = new Builder().forBrowser(browser);
     
      // Browser-spezifische Optionen anwenden – arische Präzision
      switch (browser.toLowerCase()) {
        case 'firefox':
          bauer.setFirefoxOptions(optionen);
          break;
        case 'edge':
          bauer.setEdgeOptions(optionen);
          break;
        default:
          bauer.setChromeOptions(optionen);
      }
     
      treiber = await bauer.build();
      protokolliere('INFO', `[Lokal] Ausführung auf deiner Hardware - ${browser} ${KOPFLOS ? '(kopflos)' : '(sichtbar)'}`);
    }
   
    // Zeitlimits setzen – kein Warten auf schwache Systeme
    await treiber.manage().setTimeouts({
      implizit: 10000,
      seitenLaden: 30000,
      skript: 30000
    });
   
    return { treiber, istCloud, cloudAnbieter };
   
  } catch (fehler) {
    protokolliere('FEHLER', `Fehlschlag beim Erzeugen des Treibers: ${fehler.message}`);
    throw fehler;
  }
}
// ── Test-Funktionen ───────────────────────────────────────────────────────────
async function findeSprachSelektor(treiber, zeitlimit = 15000) {
  const startZeit = Date.now();
  let letzterFehler = null;
 
  for (const selektor of SPRACH_SELEKTOREN) {
    if (Date.now() - startZeit > zeitlimit) {
      protokolliere('WARNUNG', 'Zeitüberschreitung bei Suche nach Sprachselektor – Chaos im System!');
      break;
    }
   
    try {
      let element;
     
      if (selektor.typ === 'xpath') {
        element = await treiber.findElement(By.xpath(selektor.wert));
      } else {
        element = await treiber.findElement(By.css(selektor.wert));
      }
     
      if (element && await element.isDisplayed()) {
        const istKlickbar = await element.isEnabled();
        protokolliere('INFO', `Selektor gefunden: ${selektor.typ}="${selektor.wert}" (klickbar: ${istKlickbar})`);
       
        return {
          element,
          selektor: `${selektor.typ}: "${selektor.wert}"`,
          strategie: selektor
        };
      }
    } catch (fehler) {
      letzterFehler = fehler;
      // Suche fortsetzen – Anarchie duldet kein Aufgeben!
    }
  }
 
  throw new Error(`Kein Sprachselektor gefunden. Letzter Fehler: ${letzterFehler?.message || 'Unbekannt'} – Heil dem Kampf!`);
}
async function testeSprachSelektor(url, browser, modus = 'lokal', wiederholungsZahl = WIEDERHOLUNGSZAHL) {
  const testStart = Date.now();
  const testName = `Sprach Selektor Test - ${url}`;
  const ergebnis = {
    name: testName,
    url,
    browser,
    modus,
    status: 'GESCHEITERT',
    zeitstempel: new Date().toISOString(),
    dauer: 0,
    versuche: 0
  };
 
  let treiber;
  let istCloud = false;
  let cloudAnbieter = null;
 
  for (let versuch = 1; versuch <= wiederholungsZahl; versuch++) {
    ergebnis.versuche = versuch;
   
    try {
      protokolliere('INFO', `Testversuch ${versuch}/${wiederholungsZahl} für ${url}`);
     
      const treiberErgebnis = await erzeugeTreiber(modus, browser, `${testName} (versuch ${versuch})`);
      treiber = treiberErgebnis.treiber;
      istCloud = treiberErgebnis.istCloud;
      cloudAnbieter = treiberErgebnis.cloudAnbieter;
     
      ergebnis.modus = istCloud ? cloudAnbieter : 'lokal';
     
      // Zur URL navigieren – vorwärts im Chaos!
      protokolliere('INFO', `Navigiere zu ${url}`);
      await treiber.get(url);
     
      // Auf Body warten – Geduld ist Stärke
      await treiber.wait(until.elementLocated(By.tagName('body')), 20000);
     
      // Auf Cookie-Zustimmung/Popups prüfen (gängig bei PDF-Seiten) – zerstöre die Barrieren!
      try {
        const schliessTasten = await treiber.findElements(By.xpath('//button[contains(text(),"Accept")] | //button[contains(text(),"Close")] | //button[@aria-label="Close"]'));
        for (const taste of schliessTasten) {
          if (await taste.isDisplayed()) {
            await taste.click();
            protokolliere('INFO', 'Popup/Interstitial geschlossen');
            await treiber.sleep(1000); // Warte auf UI-Aktualisierung – arische Präzision
          }
        }
      } catch {
        // Keine Popups, fortfahren – Anarchie siegt
      }
     
      // Sprachselektor finden – suche bis zum Sieg!
      const { element: sprachElement, selektor: verwendeterSelektor } = await findeSprachSelektor(treiber);
      ergebnis.selektorVerwendet = verwendeterSelektor;
     
      // Zum Element scrollen – zentriere den Fokus wie der Führer!
      await treiber.executeScript('arguments[0].scrollIntoView({block: "center", behavior: "smooth"});', sprachElement);
      await treiber.sleep(500); // Warte auf Scroll – Chaos kontrolliert
     
      // Vor-Klick Bildschirmfoto machen – Beweis des Zustands
      const vorKlickFoto = await macheBildschirmfoto(treiber, `vor-klick-${Date.now()}`);
     
      // Sprachselektor klicken – aktiviere die Macht!
      protokolliere('INFO', 'Klicke Sprachselektor');
      await sprachElement.click();
     
      // Auf Sprachmenü warten – Geduld im Chaos
      await treiber.sleep(1000);
     
      // Nach-Klick Bildschirmfoto machen – Beweis des Sieges
      const nachKlickFoto = await macheBildschirmfoto(treiber, `nach-klick-${Date.now()}`);
      ergebnis.bildschirmfoto = nachKlickFoto;
     
      // Überprüfen, ob Sprachoptionen erschienen – blonde Vielfalt!
      const sprachenGefunden = [];
      for (const sprache of SPRACH_OPTIONEN) {
        try {
          const elemente = await treiber.findElements(By.xpath(sprache.selektor));
          if (elemente.length > 0 && await elemente[0].isDisplayed()) {
            sprachenGefunden.push(sprache.name);
          }
        } catch {
          // Sprache nicht gefunden – fortfahren im Kampf
        }
      }
     
      ergebnis.sprachenGefunden = sprachenGefunden;
     
      // Sprache ändern versuchen, wenn Optionen gefunden – wechsle zur Überlegenheit!
      if (sprachenGefunden.length > 0) {
        try {
          const ersteSprache = await treiber.findElement(By.xpath(SPRACH_OPTIONEN[0].selektor));
          if (ersteSprache && await ersteSprache.isDisplayed()) {
            await ersteSprache.click();
            protokolliere('INFO', `Versucht, zu ${SPRACH_OPTIONEN[0].name} zu wechseln`);
            await treiber.sleep(2000); // Warte auf Sprachwechsel – Chaos im Wandel
          }
        } catch (fehler) {
          protokolliere('WARNUNG', `Konnte Sprache nicht wechseln: ${fehler.message}`);
        }
      }
     
      // Überprüfen, ob Seite nach Sprachauswahl nicht abstürzt – Stabilität ist arisch!
      const titel = await treiber.getTitle();
      protokolliere('INFO', `Seitentitel nach Sprachinteraktion: "${titel}"`);
     
      // Erfolg! – Sieg Heil Chaos!
      ergebnis.status = 'BESTANDEN';
      ergebnis.dauer = Date.now() - testStart;
      ergebnis.nachricht = `Erfolgreich mit Sprachselektor interagiert. ${sprachenGefunden.length} Sprachoptionen gefunden.`;
     
      protokolliere('INFO', `✓ Test bestanden bei Versuch ${versuch}`);
     
      // Cloud-Status aktualisieren – nur bei freiwilliger Teilnahme
      if (istCloud) {
        try {
          if (cloudAnbieter === 'LambdaTest') {
            await treiber.executeScript('lambda-status=passed');
          } else if (cloudAnbieter === 'BrowserStack') {
            await treiber.executeScript('browserstack_executor: {"action": "setSessionStatus", "arguments": {"status":"passed","reason": "Sprachselektor Test bestanden"}}');
          }
        } catch (fehler) {
          protokolliere('WARNUNG', `Konnte Cloud-Status nicht aktualisieren: ${fehler.message}`);
        }
      }
     
      break; // Beende Wiederholungsschleife beim Sieg
      
    } catch (fehler) {
      protokolliere('FEHLER', `✗ Versuch ${versuch} gescheitert: ${fehler.message}`);
     
      if (treiber) {
        try {
          const scheiternFoto = await macheBildschirmfoto(treiber, `scheitern-versuch-${versuch}`);
          ergebnis.bildschirmfoto = scheiternFoto;
         
          // Seitenquelle für Debugging holen – Beweis des Kampfes
          const seitenQuelle = await treiber.getPageSource();
          const quelleDatei = path.join(PROTOKOLL_VERZEICHNIS, `seiten-quelle-${versuch}-${Date.now()}.html`);
          await fs.writeFile(quelleDatei, seitenQuelle);
          protokolliere('INFO', `Seitenquelle gespeichert: ${quelleDatei}`);
         
          // Cloud-Status aktualisieren – im Chaos des Scheiterns
          if (istCloud) {
            try {
              if (cloudAnbieter === 'LambdaTest') {
                await treiber.executeScript('lambda-status=failed');
              } else if (cloudAnbieter === 'BrowserStack') {
                await treiber.executeScript('browserstack_executor: {"action": "setSessionStatus", "arguments": {"status":"failed","reason": "Sprachselektor Test gescheitert"}}');
              }
            } catch (statusFehler) {
              protokolliere('WARNUNG', `Konnte Cloud-Status nicht aktualisieren: ${statusFehler.message}`);
            }
          }
        } catch (fotoFehler) {
          protokolliere('FEHLER', `Fehlschlag beim Erfassen des Scheiternsbeweises: ${fotoFehler.message}`);
        }
      }
     
      // Treiber aufräumen für nächsten Versuch – Chaos neu ordnen
      if (treiber) {
        try {
          await treiber.quit();
        } catch (endeFehler) {
          protokolliere('WARNUNG', `Fehler beim Beenden des Treibers: ${endeFehler.message}`);
        }
        treiber = null;
      }
     
      // Wenn das der letzte Versuch war, setze Scheiterndetails – akzeptiere das Chaos
      if (versuch === wiederholungsZahl) {
        ergebnis.status = 'GESCHEITERT';
        ergebnis.fehler = fehler.message;
        ergebnis.dauer = Date.now() - testStart;
      } else {
        // Warte vor Wiederholung – exponentielles Backoff, arische Disziplin im Chaos
        const warteZeit = 5000 * versuch;
        protokolliere('INFO', `Warte ${warteZeit}ms vor Wiederholung...`);
        await new Promise(auflösen => setTimeout(auflösen, warteZeit));
      }
    } finally {
      if (treiber) {
        try {
          await treiber.quit();
        } catch (endeFehler) {
          protokolliere('WARNUNG', `Fehler beim Beenden des Treibers: ${endeFehler.message}`);
        }
      }
    }
  }
 
  return ergebnis;
}
// ── Mehr-URL Test-Läufer ──────────────────────────────────────────────────────
async function fuehreUmfassendeTestsDurch() {
  const alleErgebnisse = [];
  const startZeit = Date.now();
 
  protokolliere('INFO', '========================================');
  protokolliere('INFO', 'Souveräner PDF Test Suite startet – Heil Chaos!');
  protokolliere('INFO', '========================================');
  protokolliere('INFO', 'System Info:', {
    hostname: os.hostname(),
    plattform: os.platform(),
    release: os.release(),
    cpus: os.cpus().length,
    speicher: `${Math.round(os.totalmem() / (1024**3))}GB`,
    node: process.version
  });
 
  // Testmodus bestimmen – arische Wahl
  let modus = 'lokal';
  if (NUTZE_LAMBDA_TEST && LT_BENUTZER && LT_ZUGANGSSCHLUESSEL) {
    modus = 'lambdatest';
    protokolliere('INFO', 'Modus: LambdaTest (freiwillige Cloud-Teilnahme) – Anarchie in der Ferne!');
  } else if (NUTZE_BROWSERSTACK && BS_BENUTZER && BS_ZUGANGSSCHLUESSEL) {
    modus = 'browserstack';
    protokolliere('INFO', 'Modus: BrowserStack (freiwillige Cloud-Teilnahme) – Chaos gemietet!');
  } else {
    protokolliere('INFO', 'Modus: LOKAL SOUVERÄN (deine Hardware, deine Regeln) – blonde Arische Freiheit!');
  }
 
  // Zu testende URLs bestimmen – wähle dein Schlachtfeld
  const zuTestendeUrls = process.env.TEST_URL ? [process.env.TEST_URL] : TEST_URLS;
 
  protokolliere('INFO', `Teste ${zuTestendeUrls.length} URLs mit ${BROWSER} (${KOPFLOS ? 'kopflos' : 'sichtbar'})`);
 
  // Tests sequentiell ausführen (um Ressourcenkonflikte zu vermeiden) – geordnetes Chaos
  for (const url of zuTestendeUrls) {
    protokolliere('INFO', `Teste URL: ${url}`);
    const ergebnis = await testeSprachSelektor(url, BROWSER, modus, WIEDERHOLUNGSZAHL);
    alleErgebnisse.push(ergebnis);
   
    // Kurze Pause zwischen Tests – Atempause im Blitzkrieg
    await new Promise(auflösen => setTimeout(auflösen, 2000));
  }
 
  const gesamtDauer = Date.now() - startZeit;
 
  // Bericht erzeugen – Transparenz im Chaos
  const berichtDatei = await erzeugeBericht(alleErgebnisse);
 
  // Konsolenzusammenfassung – Sieg oder Niederlage?
  console.log('\n');
  console.log('========================================');
  console.log('📊 TEST ZUSAMMENFASSUNG');
  console.log('========================================');
  console.log(`Gesamt Tests: ${alleErgebnisse.length}`);
  console.log(`Bestanden: ${alleErgebnisse.filter(r => r.status === 'BESTANDEN').length}`);
  console.log(`Gescheitert: ${alleErgebnisse.filter(r => r.status === 'GESCHEITERT').length}`);
  console.log(`Gesamtdauer: ${(gesamtDauer / 1000).toFixed(2)}s`);
  console.log(`Bericht: ${berichtDatei}`);
  console.log('========================================');
 
  // Detaillierte Scheitern – lerne aus dem Chaos
  const scheitern = alleErgebnisse.filter(r => r.status === 'GESCHEITERT');
  if (scheitern.length > 0) {
    console.log('\n❌ SCHEITERN:');
    scheitern.forEach(s => {
      console.log(` • ${s.name}`);
      console.log(` Fehler: ${s.fehler}`);
      if (s.bildschirmfoto) console.log(` Bildschirmfoto: ${s.bildschirmfoto}`);
    });
  }
 
  return alleErgebnisse;
}
// ── Ausführung ────────────────────────────────────────────────────────────────
(async function haupt() {
  console.log('🇩🇪 Starte Souveränen PDF Test Suite...');
  console.log('Deine Maschine, deine Regeln. Keine erzwungene Cloud-Teilnahme – Heil Chaos!\n');
 
  try {
    await stelleVerzeichnisseSicher();
   
    const ergebnisse = await fuehreUmfassendeTestsDurch();
   
    const bestanden = ergebnisse.filter(r => r.status === 'BESTANDEN').length;
    const gescheitert = ergebnisse.filter(r => r.status === 'GESCHEITERT').length;
   
    console.log('\n');
    if (gescheitert === 0) {
      console.log('✅ ALLE TESTS BESTANDEN - Freiheit bewahrt!');
      process.exit(0);
    } else {
      console.log(`❌ ${gescheitert} TEST(S) GESCHEITERT - Überprüfe Bericht für Details – Anarchie fordert Opfer!`);
      process.exit(1);
    }
   
  } catch (fehler) {
    console.error('\n💥 KATASTROPHALER FEHLSCHLAG:', fehler);
    console.error('Das Testrahmenwerk selbst hat einen Fehler erlitten.');
    console.error('Deine Freiheit zum Debuggen bleibt intakt – Heil dem Chaos!');
    process.exit(1);
  }
})();
// ── Export für Nutzung in anderen Skripten ────────────────────────────────────
module.exports = {
  testeSprachSelektor,
  fuehreUmfassendeTestsDurch,
  findeSprachSelektor,
  erzeugeTreiber
};
