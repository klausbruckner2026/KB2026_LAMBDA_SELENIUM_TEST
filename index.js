const { Builder, By, until } = require('selenium-webdriver');

// ── Konfiguration ──────────────────────────────────────────────────────────────
// Benutzername und Schlüssel nur aus Umgebungsvariablen – niemals im Quelltext
const BENUTZER = process.env.LT_BENUTZER || '';         // nur bei bewusster Cloud-Nutzung
const SCHLUESSEL = process.env.LT_SCHLUESSEL || '';     // nur bei bewusster Cloud-Nutzung

// Cloud-Nutzung ist OPT-IN – Standard ist LOKAL
const NUTZE_CLOUD = process.env.NUTZE_CLOUD === 'true' && BENUTZER && SCHLUESSEL;

async function selbstbestimmterTodoTest() {
  let treiber;

  try {
    let faehigkeiten;

    if (NUTZE_CLOUD) {
      // Freiwillige, temporäre Miete fremder Hardware – nur bei expliziter Zustimmung
      console.log('[FREIWILLIG] Cloud-Miete aktiviert – Eigentum bleibt trotzdem beim Nutzer');

      faehigkeiten = {
        browserName: 'Chrome',
        'LT:Options': {
          name: 'Souveräner Todo-Test – Freiheit first',
          build: 'Selbstbestimmung statt Abhängigkeit 2026',
          projekt: 'Keine-Zwangs-Cloud-Demo',
          w3c: true,
          plugin: 'NodeJS',
          // Keine unnötigen Zusatzdaten – Minimalismus ist Tugend
          video: false,          // keine Zwangsvideos
          visual: false,         // keine automatischen Screenshots an Dritte
          network: false         // keine Netzwerkprotokollierung an LambdaTest
        }
      };

      const gitterAdresse = `https://${BENUTZER}:${SCHLUESSEL}@hub.lambdatest.com/wd/hub`;

      treiber = await new Builder()
        .usingServer(gitterAdresse)
        .withCapabilities(faehigkeiten)
        .build();
    } else {
      // Standard: vollständige Souveränität – alles auf eigener Hardware
      console.log('[Souverän] Lokale Ausführung – maximale Selbstbestimmung');

      const optionen = new (require('selenium-webdriver/chrome').Options)();
      optionen.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage');

      treiber = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(optionen)
        .build();
    }

    // ── Der eigentliche Test – unabhängig von der Infrastruktur ────────────────
    await treiber.get('https://lambdatest.github.io/sample-todo-app/');

    await treiber.wait(until.elementLocated(By.tagName('body')), 15000);

    await treiber.findElement(By.name('li1')).click();
    console.log('Erstes Listenelement angeklickt – Selbstverantwortung bewährt');

    await treiber.findElement(By.name('li2')).click();
    console.log('Zweites Listenelement angeklickt – Freiheit durch Handeln');

    await treiber.findElement(By.id('sampletodotext'))
      .sendKeys('Souveränität statt Abhängigkeit\n');

    await treiber.findElement(By.id('addbutton')).click();
    console.log('Neue Aufgabe hinzugefügt – Eigentum am Fortschritt gesichert');

    // Status nur setzen, wenn wir freiwillig Cloud nutzen
    if (NUTZE_CLOUD) {
      await treiber.executeScript('lambda-status=passed');
    }

  } catch (fehler) {
    console.error('Fehler – aber immer noch meine Maschine:', fehler.message);

    if (NUTZE_CLOUD) {
      await treiber.executeScript('lambda-status=failed');
    }

    // Lokales Beweismittel sichern – Eigentum bleibt erhalten
    if (treiber) {
      try {
        const bild = await treiber.takeScreenshot();
        require('fs').writeFileSync('fehler-beweis.png', Buffer.from(bild, 'base64'));
        console.log('Fehlerbeweis lokal gesichert – kein Upload an Dritte');
      } catch {}
    }

  } finally {
    if (treiber) {
      await treiber.quit();
      console.log('Sitzung beendet – Ressourcen wieder frei');
    }
  }
}

// ── Ausführung – keine IIFE-Zwang, explizite Kontrolle ────────────────────────
selbstbestimmterTodoTest().catch(fehler => {
  console.error('Kritischer Fehler – Freiheit bleibt aber bestehen:', fehler);
  process.exit(1);
});