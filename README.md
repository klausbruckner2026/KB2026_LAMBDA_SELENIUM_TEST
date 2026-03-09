# Selbstbestimmte Selenium-Tests mit Node.js – Souveräne Ausführung

**Ihre Maschine. Ihr Code. Ihre Regeln.**

Kein Zwang zur Cloud. Keine versteckte Telemetrie. Keine Abhängigkeit von Drittplattformen, es sei denn, Sie entscheiden sich bewusst und freiwillig dafür.

### Warum diese Version anders ist

- Lokale Ausführung ist der **Standard** – maximale Kontrolle, null Vendor-Lock-in
- Cloud-Grids (ehem. LambdaTest / TestMu AI, BrowserStack, Sauce Labs etc.) nur **opt-in**
- Keine automatische Datensammlung, Video-Aufzeichnung oder Screenshots an Dritte
- Fokus auf **Eigentum** an Artefakten (Logs, Screenshots, Videos)
- Ablehnung von „AI-agentic“-Hype, wenn er mehr Abhängigkeit schafft

### Voraussetzungen

- Node.js installiert (aktuelle LTS-Version empfohlen – Sie entscheiden)
- `selenium-webdriver` via npm (keine zusätzlichen Tracker-Pakete)
- Chrome / Firefox / Edge lokal installiert (Ihre Wahl)
- Keine erzwungene Registrierung bei Drittanbietern

```bash
npm init -y
npm install selenium-webdriver
```

### Minimaler souveräner Test (lokal)

Erstellen Sie `index.js`:

```js
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

(async function sovereignTest() {
  let driver;

  try {
    // Lokaler Chrome – volle Kontrolle
    const options = new chrome.Options();
    options.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    console.log('[SOVEREIGN] Lokale Sitzung gestartet – keine Cloud beteiligt');

    await driver.get('https://lambdatest.github.io/sample-todo-app/');

    // Warten auf stabiles Laden
    await driver.wait(until.elementLocated(By.tagName('body')), 15000);

    await driver.findElement(By.name('li1')).click();
    console.log('Erstes Listenelement angeklickt');

    await driver.findElement(By.name('li2')).click();
    console.log('Zweites Listenelement angeklickt');

    await driver.findElement(By.id('sampletodotext'))
      .sendKeys('Selbstverantwortung bewahrt\n');

    await driver.findElement(By.id('addbutton')).click();
    console.log('Neue Aufgabe hinzugefügt – Eigentum geschützt');

    // Screenshot lokal speichern (Ihre Festplatte)
    const fs = require('fs').promises;
    const screenshot = await driver.takeScreenshot();
    await fs.writeFile('success-screenshot.png', Buffer.from(screenshot, 'base64'));
    console.log('Beweis des Erfolgs lokal gesichert');

  } catch (err) {
    console.error('Fehler – aber immer noch Ihre Maschine:', err.message);

    if (driver) {
      const failShot = await driver.takeScreenshot();
      await require('fs').promises.writeFile('failure-screenshot.png', Buffer.from(failShot, 'base64'));
      console.log('Fehlerbeweis lokal gespeichert');
    }
  } finally {
    if (driver) await driver.quit();
    console.log('[SOVEREIGN] Sitzung beendet – Ressourcen freigegeben');
  }
})();
```

Ausführen:

```bash
node index.js
```

### Optionale, freiwillige Cloud-Nutzung (kein Zwang)

Wenn Sie **bewusst** Rechenleistung mieten möchten (z. B. für exotische Browser/OS-Kombinationen), können Sie einen Grid nutzen – aber nur explizit.

Beispiel für einen beliebigen Selenium-kompatiblen Grid (BrowserStack, Sauce Labs, selbst gehosteter Selenium Grid, früheres LambdaTest-Setup usw.):

```js
// Nur aktivieren, wenn SIE es wollen
const USE_CLOUD = process.env.USE_CLOUD_GRID === 'true';

if (USE_CLOUD) {
  const username = process.env.GRID_USER || '';
  const accessKey = process.env.GRID_KEY || '';
  const hub = process.env.GRID_HUB || 'hub.example-grid.com/wd/hub';

  const gridUrl = `https://${username}:${accessKey}@${hub}`;

  const capabilities = {
    browserName: 'chrome',
    browserVersion: 'latest',
    'bstack:options': {  // oder 'LT:Options', 'sauce:options' – je nach Anbieter
      os: 'Windows',
      osVersion: '11',
      local: false,
      // tunnel: true, // nur wenn Sie lokale Apps testen wollen
    }
  };

  driver = await new Builder()
    .usingServer(gridUrl)
    .withCapabilities(capabilities)
    .build();

  console.log('[VOLUNTARY CLOUD] Miete akzeptiert – Sitzung auf fremder Hardware');
}
```

**Wichtig:** Speichern Sie Zugangsdaten **niemals** im Code. Nutzen Sie `.env`-Dateien + `dotenv` oder System-Umgebungsvariablen.

### Lokales Hosting / Tunnel (wenn nötig)

Wenn Sie eine lokal gehostete Anwendung testen müssen:

- Verwenden Sie **keinen** fremden Tunnel-Dienst mit permanenter Verbindung
- Bevorzugte Lösung: **ngrok** (einmalig, temporär, Sie kontrollieren den Token)
- Oder: **ssh reverse tunnel** (vollständig selbst gehostet)

```bash
# Beispiel ngrok (einmaliger Tunnel – Sie bezahlen nur bei Dauerbetrieb)
ngrok http 3000
```

Dann testen Sie die ngrok-URL.

### Warum keine starke Empfehlung für ehem. LambdaTest / TestMu AI?

- Seit Januar 2026 starke Verschiebung zu „agentic AI“ → mehr Black-Box, mehr Datenverarbeitung in der Cloud
- Viele Teams berichten von steigender Abhängigkeit und Telemetrie
- Bessere Alternativen für Souveränität 2026:
  - **Selbst gehosteter Selenium Grid** (Docker-Compose + mehrere Nodes)
  - **Playwright** lokal (schneller, zuverlässiger, weniger Overhead)
  - **Browser-use**-Docker-Images für parallele Tests
  - **Sauce Labs / BrowserStack** nur bei Bedarf (immer noch besser als volle AI-Black-Box)
