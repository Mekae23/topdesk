const assert = require("node:assert/strict");
const widget = require("../src/topdesk-widget");

const config = widget.deepMerge(widget.DEFAULT_CONFIG, {
  apiBasePath: "/tas/api"
});

const incidentSection = config.sections[0];

const paramUrl = widget.buildUrl(
  config,
  incidentSection,
  "/incidents",
  "751E0A70-5B2B-572D-8CAE-99F52651B6D0",
  "operator.id",
  "params"
);

assert.equal(
  paramUrl,
  "/tas/api/incidents?pageSize=10&dateFormat=iso8601&fields=id%2Cnumber%2CbriefDescription%2CprocessingStatus.name%2Coperator.name%2CtargetDate%2CmodificationDate&operator.id=751E0A70-5B2B-572D-8CAE-99F52651B6D0&completed=false"
);

const queryUrl = widget.buildUrl(
  config,
  incidentSection,
  "/incidents",
  "abc'def",
  "operator.id",
  "query"
);

assert.equal(
  queryUrl,
  "/tas/api/incidents?pageSize=10&dateFormat=iso8601&fields=id%2Cnumber%2CbriefDescription%2CprocessingStatus.name%2Coperator.name%2CtargetDate%2CmodificationDate&query=operator.id%3D%3D%27abc%5C%27def%27%3Bcompleted%3D%3Dfalse"
);

assert.deepEqual(widget.normalizeApiItems([{ id: "1" }]), [{ id: "1" }]);
assert.deepEqual(widget.normalizeApiItems({ results: [{ id: "2" }] }), [{ id: "2" }]);
assert.deepEqual(widget.normalizeApiItems({ _embedded: { items: [{ id: "3" }] } }), [{ id: "3" }]);
assert.deepEqual(widget.normalizeApiItems({}), []);

assert.equal(widget.getPath({ processingStatus: { name: "In behandeling" } }, "processingStatus.name"), "In behandeling");
assert.equal(widget.firstPath({ name: "", briefDescription: "Laptop stuk" }, ["name", "briefDescription"]), "Laptop stuk");

const mappedCard = widget.mapCard(incidentSection, {
  id: "incident-id",
  number: "I 2401 001",
  briefDescription: "Printer doet niets",
  processingStatus: {
    name: "Open"
  },
  targetDate: "2026-06-03T12:00:00Z"
});

assert.deepEqual(mappedCard, {
  id: "incident-id",
  number: "I 2401 001",
  title: "Printer doet niets",
  status: "Open",
  date: "2026-06-03T12:00:00Z",
  url: "/tas/secure/incident?action=show&unid=incident-id"
});

const lookupUrl = widget.buildOperatorLookupUrl(config, {
  email: "beheerder@example.org"
});

assert.equal(
  lookupUrl,
  "/tas/api/operators?query=email%3D%3D%27beheerder%40example.org%27&pageSize=1&dateFormat=iso8601"
);

const absoluteConfig = widget.deepMerge(widget.DEFAULT_CONFIG, {
  apiBasePath: "https://voorbeeld.topdesk.net/tas/api"
});

const absoluteUrl = widget.buildUrl(
  absoluteConfig,
  absoluteConfig.sections[0],
  "/incidents",
  "operator-id",
  "operator.id",
  "params"
);

assert.equal(
  absoluteUrl,
  "https://voorbeeld.topdesk.net/tas/api/incidents?pageSize=10&dateFormat=iso8601&fields=id%2Cnumber%2CbriefDescription%2CprocessingStatus.name%2Coperator.name%2CtargetDate%2CmodificationDate&operator.id=operator-id&completed=false"
);

const absoluteLookupUrl = widget.buildOperatorLookupUrl(absoluteConfig, {
  email: "beheerder@example.org"
});

assert.equal(
  absoluteLookupUrl,
  "https://voorbeeld.topdesk.net/tas/api/operators?query=email%3D%3D%27beheerder%40example.org%27&pageSize=1&dateFormat=iso8601"
);

console.log("Alle TOPdesk-widgettests zijn geslaagd.");
