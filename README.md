# TOPdesk webwidget: mijn toegewezen werk

Deze repository bevat een kleine standalone webwidget voor het TOPdesk
behandelaarsgedeelte. De widget toont voor de ingelogde behandelaar:

- incidenten;
- wijzigingen;
- operationele taken.

De widget gebruikt client-side `fetch()` met `credentials: "include"`, zodat een
pagina die binnen dezelfde TOPdesk-origin draait de bestaande TOPdesk-sessie kan
meesturen naar `/tas/api/...`.

## Bestanden

- `index.html` - voorbeeldpagina voor de webwidget.
- `styles.css` - styling voor desktop en mobiel.
- `src/topdesk-widget.js` - API-, fallback- en renderlogica.
- `tests/topdesk-widget.test.js` - kleine unit-tests voor de pure hulpfuncties.

## Plaatsen in TOPdesk

1. Host deze bestanden op een plek die door TOPdesk als webwidget geopend kan
   worden.
2. Gebruik bij voorkeur dezelfde origin als je TOPdesk-omgeving. Dan kan de
   browser de ingelogde sessie meesturen naar de API.
3. Voeg in TOPdesk een webwidget toe met de URL naar `index.html`.
4. Controleer in de browserconsole of de API-routes voor jouw TOPdesk-versie
   beschikbaar zijn.

> Let op: als de widget vanaf een andere origin draait, kan TOPdesk de sessie
> door browserbeveiliging en CORS meestal niet delen. Gebruik dan geen
> applicatiewachtwoord in deze frontendcode; plaats liever een kleine backend of
> reverse proxy tussen de widget en TOPdesk.

## Configuratie

In `index.html` staat:

```html
<script>
  window.TOPDESK_ASSIGNED_WORK_CONFIG = {
    apiBasePath: "/tas/api",
    pageSize: 10
  };
</script>
```

Belangrijke opties:

| Optie | Beschrijving |
| --- | --- |
| `apiBasePath` | TOPdesk API-basispad. Relatief (`/tas/api`) bij dezelfde origin. |
| `pageSize` | Maximaal aantal kaarten per sectie. |
| `refreshIntervalMs` | Automatisch verversen in milliseconden. Standaard 5 minuten. |
| `sections` | Overschrijf per kaarttype endpoint, filtervelden, velden of linktemplates. |

### Externe hosting, zoals tjaws.com

Als je de widget host op bijvoorbeeld `https://tjaws.com/topdesk/`, dan gaat
`apiBasePath: "/tas/api"` naar:

```text
https://tjaws.com/tas/api/...
```

Dat is niet jouw TOPdesk API en geeft vaak fouten zoals HTTP 503. Je kunt de
widget dan technisch naar TOPdesk laten wijzen met:

```js
window.TOPDESK_ASSIGNED_WORK_CONFIG = {
  apiBasePath: "https://jouworganisatie.topdesk.net/tas/api"
};
```

Maar in veel TOPdesk-omgevingen blokkeert de browser daarna alsnog de request,
omdat de widget op `tjaws.com` draait en TOPdesk op een andere origin. Daarvoor
moet TOPdesk CORS met credentials toestaan of moet `tjaws.com` een server-side
reverse proxy aanbieden, bijvoorbeeld:

```js
window.TOPDESK_ASSIGNED_WORK_CONFIG = {
  apiBasePath: "https://tjaws.com/topdesk-api"
};
```

Die proxy stuurt requests dan server-side door naar
`https://jouworganisatie.topdesk.net/tas/api`. Zet geen TOPdesk
applicatietoken of wachtwoord in `index.html` of `src/topdesk-widget.js`, want
frontendcode is zichtbaar voor iedereen die de pagina opent.

De standaardconfiguratie probeert meerdere gangbare TOPdesk-varianten. Voor
incidenten gebruikt de widget standaard `/tas/api/incidents` met
`operator.id=<behandelaar-id>` en `completed=false`. Voor wijzigingen en
operationele taken gebruikt de widget configureerbare endpoint- en
filterkandidaten, omdat TOPdesk-versies en ingeschakelde modules daarin kunnen
verschillen.

Voorbeeld om een tenant-specifiek endpoint of filterveld te forceren:

```html
<script>
  window.TOPDESK_ASSIGNED_WORK_CONFIG = {
    apiBasePath: "/tas/api",
    sections: [
      {
        id: "incidents",
        title: "Incidenten",
        endpointCandidates: ["/incidents"],
        filterCandidates: ["operator.id"],
        filterStyles: ["params"]
      },
      {
        id: "changes",
        title: "Wijzigingen",
        endpointCandidates: ["/changes"],
        filterCandidates: ["coordinator.id"],
        filterStyles: ["query"]
      },
      {
        id: "operational-activities",
        title: "Operationele taken",
        endpointCandidates: ["/operationalActivities"],
        filterCandidates: ["responsibleOperator.id"],
        filterStyles: ["query"]
      }
    ]
  };
</script>
```

## Rechten

De ingelogde behandelaar moet in TOPdesk minimaal leesrechten hebben op:

- REST API;
- incidenten;
- wijzigingen;
- operationele activiteiten;
- supporting files/operators, zodat `/tas/api/operators/current` of de fallback
  via `/tas/api/persons/current` werkt.

## Lokaal controleren

De widget heeft geen buildstap of externe dependencies.

```sh
npm test
```

Voor een echte functionele test moet de widget in of naast een TOPdesk-omgeving
draaien, omdat de API-aanroepen afhankelijk zijn van de TOPdesk-sessie en
tenantrechten.
