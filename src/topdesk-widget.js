(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.TopdeskAssignedWorkWidget = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  var DEFAULT_CONFIG = {
    apiBasePath: "/tas/api",
    pageSize: 10,
    refreshIntervalMs: 5 * 60 * 1000,
    dateFormat: "iso8601",
    currentOperatorEndpoint: "/operators/current",
    currentPersonEndpoint: "/persons/current",
    operatorLookupEndpoint: "/operators",
    operatorLookupField: "email",
    requestTimeoutMs: 15000,
    requestHeaders: {
      Accept: "application/json"
    },
    sections: [
      {
        id: "incidents",
        title: "Incidenten",
        emptyText: "Geen toegewezen incidenten gevonden.",
        endpointCandidates: ["/incidents"],
        filterCandidates: ["operator.id"],
        filterStyles: ["params", "query"],
        paramFilters: {
          completed: "false"
        },
        queryFilters: ["completed==false"],
        fields: [
          "id",
          "number",
          "briefDescription",
          "processingStatus.name",
          "operator.name",
          "targetDate",
          "modificationDate"
        ],
        linkTemplate: "/tas/secure/incident?action=show&unid={id}",
        titlePaths: ["briefDescription", "request", "description"],
        numberPaths: ["number"],
        statusPaths: ["processingStatus.name", "status.name"],
        datePaths: ["targetDate", "modificationDate", "creationDate"]
      },
      {
        id: "changes",
        title: "Wijzigingen",
        emptyText: "Geen toegewezen wijzigingen gevonden.",
        endpointCandidates: ["/changes", "/operatorChanges"],
        filterCandidates: ["operator.id", "coordinator.id", "assignee.id"],
        filterStyles: ["query", "params"],
        fields: [
          "id",
          "number",
          "briefDescription",
          "status.name",
          "operator.name",
          "coordinator.name",
          "targetDate",
          "modificationDate"
        ],
        linkTemplate: "/tas/secure/change?action=show&unid={id}",
        titlePaths: ["briefDescription", "request", "description"],
        numberPaths: ["number"],
        statusPaths: ["status.name", "processingStatus.name", "currentPhase.name"],
        datePaths: ["targetDate", "modificationDate", "creationDate"]
      },
      {
        id: "operational-activities",
        title: "Operationele taken",
        emptyText: "Geen toegewezen operationele taken gevonden.",
        endpointCandidates: ["/operationalActivities"],
        filterCandidates: ["operator.id", "assignee.id", "responsibleOperator.id"],
        filterStyles: ["query", "params"],
        fields: [
          "id",
          "number",
          "briefDescription",
          "name",
          "status.name",
          "operator.name",
          "assignee.name",
          "plannedDate",
          "targetDate",
          "modificationDate"
        ],
        linkTemplate: "/tas/secure/operationalActivity?action=show&unid={id}",
        titlePaths: ["briefDescription", "name", "description"],
        numberPaths: ["number"],
        statusPaths: ["status.name", "processingStatus.name"],
        datePaths: ["plannedDate", "targetDate", "modificationDate", "creationDate"]
      }
    ]
  };

  function deepMerge(base, override) {
    if (!override) {
      return clone(base);
    }

    var output = clone(base);
    Object.keys(override).forEach(function (key) {
      var overrideValue = override[key];

      if (Array.isArray(overrideValue)) {
        output[key] = clone(overrideValue);
        return;
      }

      if (isPlainObject(overrideValue) && isPlainObject(output[key])) {
        output[key] = deepMerge(output[key], overrideValue);
        return;
      }

      output[key] = overrideValue;
    });

    return output;
  }

  function clone(value) {
    if (Array.isArray(value)) {
      return value.map(clone);
    }

    if (isPlainObject(value)) {
      return Object.keys(value).reduce(function (memo, key) {
        memo[key] = clone(value[key]);
        return memo;
      }, {});
    }

    return value;
  }

  function isPlainObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
  }

  function getPath(source, path) {
    if (!source || !path) {
      return undefined;
    }

    return path.split(".").reduce(function (value, key) {
      if (value === undefined || value === null) {
        return undefined;
      }

      return value[key];
    }, source);
  }

  function firstPath(source, paths) {
    for (var index = 0; index < paths.length; index += 1) {
      var value = getPath(source, paths[index]);
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value;
      }
    }

    return undefined;
  }

  function normalizeApiItems(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (!payload || typeof payload !== "object") {
      return [];
    }

    var candidates = [
      payload.results,
      payload.items,
      payload.data,
      payload.content,
      payload.records,
      payload.cards
    ];

    if (payload._embedded) {
      candidates.push(payload._embedded.items);
      candidates.push(payload._embedded.results);
      candidates.push(payload._embedded.cards);
    }

    for (var index = 0; index < candidates.length; index += 1) {
      if (Array.isArray(candidates[index])) {
        return candidates[index];
      }
    }

    return [];
  }

  function normalizeBasePath(basePath) {
    if (!basePath) {
      return "";
    }

    return String(basePath).replace(/\/+$/, "");
  }

  function normalizeEndpoint(endpoint) {
    return "/" + String(endpoint || "").replace(/^\/+/, "");
  }

  function encodeFiqlValue(value) {
    if (typeof value === "boolean") {
      return String(value);
    }

    if (typeof value === "number") {
      return String(value);
    }

    return "'" + String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
  }

  function buildUrl(config, section, endpoint, operatorId, filterField, filterStyle) {
    var url = new URL(
      normalizeBasePath(config.apiBasePath) + normalizeEndpoint(endpoint),
      getWindowLocationOrigin()
    );
    var pageSize = section.pageSize || config.pageSize;
    var fields = section.fields || [];
    var queryFilters = section.queryFilters || [];
    var paramFilters = section.paramFilters || {};

    if (pageSize) {
      url.searchParams.set(section.pageSizeParam || config.pageSizeParam || "pageSize", String(pageSize));
    }

    if (config.dateFormat) {
      url.searchParams.set("dateFormat", config.dateFormat);
    }

    if (fields.length > 0) {
      url.searchParams.set("fields", fields.join(","));
    }

    if (filterStyle === "query") {
      var parts = [filterField + "==" + encodeFiqlValue(operatorId)].concat(queryFilters);
      url.searchParams.set("query", parts.join(";"));
    } else {
      url.searchParams.set(filterField, operatorId);
      Object.keys(paramFilters).forEach(function (key) {
        url.searchParams.set(key, paramFilters[key]);
      });
    }

    return url.pathname + url.search;
  }

  function getWindowLocationOrigin() {
    if (typeof window !== "undefined" && window.location && window.location.origin) {
      return window.location.origin;
    }

    return "https://topdesk.invalid";
  }

  function buildOperatorLookupUrl(config, person) {
    var lookupValue = person.email || person.emailAddress || person.loginName || person.networkLoginName;
    if (!lookupValue) {
      return null;
    }

    var url = new URL(
      normalizeBasePath(config.apiBasePath) + normalizeEndpoint(config.operatorLookupEndpoint),
      getWindowLocationOrigin()
    );
    url.searchParams.set("query", config.operatorLookupField + "==" + encodeFiqlValue(lookupValue));
    url.searchParams.set("pageSize", "1");
    url.searchParams.set("dateFormat", config.dateFormat);

    return url.pathname + url.search;
  }

  function createApiClient(config) {
    return {
      getJson: function (path) {
        return getJson(path, config);
      }
    };
  }

  function getJson(path, config) {
    if (typeof fetch !== "function") {
      return Promise.reject(new Error("Deze browser ondersteunt fetch() niet."));
    }

    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timeoutId = null;

    if (controller && config.requestTimeoutMs) {
      timeoutId = setTimeout(function () {
        controller.abort();
      }, config.requestTimeoutMs);
    }

    return fetch(path, {
      credentials: "include",
      cache: "no-store",
      headers: config.requestHeaders,
      signal: controller ? controller.signal : undefined
    })
      .then(function (response) {
        if (!response.ok) {
          var message = "TOPdesk API gaf HTTP " + response.status + " terug voor " + path;
          var error = new Error(message);
          error.status = response.status;
          error.path = path;
          throw error;
        }

        return response.json();
      })
      .finally(function () {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
  }

  function resolveCurrentOperator(api, config) {
    return api
      .getJson(normalizeBasePath(config.apiBasePath) + normalizeEndpoint(config.currentOperatorEndpoint))
      .then(function (operator) {
        if (operator && operator.id) {
          return normalizeOperator(operator);
        }

        throw new Error("De huidige behandelaar bevat geen id.");
      })
      .catch(function (operatorError) {
        return api
          .getJson(normalizeBasePath(config.apiBasePath) + normalizeEndpoint(config.currentPersonEndpoint))
          .then(function (person) {
            if (person && person.id && !buildOperatorLookupUrl(config, person)) {
              return normalizeOperator(person);
            }

            var lookupUrl = buildOperatorLookupUrl(config, person || {});
            if (!lookupUrl) {
              throw operatorError;
            }

            return api.getJson(lookupUrl).then(function (lookupPayload) {
              var operators = normalizeApiItems(lookupPayload);
              if (operators.length === 0 || !operators[0].id) {
                throw new Error("Geen behandelaar gevonden voor de ingelogde gebruiker.");
              }

              return normalizeOperator(operators[0]);
            });
          });
      });
  }

  function normalizeOperator(operator) {
    return {
      id: operator.id,
      name:
        operator.name ||
        operator.dynamicName ||
        [operator.firstName, operator.surName || operator.lastName].filter(Boolean).join(" ") ||
        operator.email ||
        operator.loginName ||
        "Ingelogde behandelaar"
    };
  }

  function loadSection(api, config, section, operator) {
    var attempts = [];
    var endpoints = section.endpointCandidates || [section.endpoint];
    var filterFields = section.filterCandidates || [section.filterField || "operator.id"];
    var filterStyles = section.filterStyles || ["query", "params"];

    endpoints.forEach(function (endpoint) {
      filterFields.forEach(function (filterField) {
        filterStyles.forEach(function (filterStyle) {
          attempts.push({
            endpoint: endpoint,
            filterField: filterField,
            filterStyle: filterStyle
          });
        });
      });
    });

    return trySectionAttempt(api, config, section, operator, attempts, 0);
  }

  function trySectionAttempt(api, config, section, operator, attempts, index) {
    if (index >= attempts.length) {
      throw new Error("Geen werkende TOPdesk API-route gevonden voor " + section.title + ".");
    }

    var attempt = attempts[index];
    var path = buildUrl(config, section, attempt.endpoint, operator.id, attempt.filterField, attempt.filterStyle);

    return api
      .getJson(path)
      .then(function (payload) {
        return {
          section: section,
          items: normalizeApiItems(payload).map(function (item) {
            return mapCard(section, item);
          }),
          requestPath: path
        };
      })
      .catch(function (error) {
        if (shouldTryNextAttempt(error)) {
          return trySectionAttempt(api, config, section, operator, attempts, index + 1);
        }

        throw error;
      });
  }

  function shouldTryNextAttempt(error) {
    return error && (error.status === 400 || error.status === 404 || error.status === 405);
  }

  function mapCard(section, item) {
    var id = firstPath(item, ["id", "unid"]);
    var number = firstPath(item, section.numberPaths || ["number"]);
    var title = firstPath(item, section.titlePaths || ["briefDescription", "name", "description"]);
    var status = firstPath(item, section.statusPaths || ["status.name", "processingStatus.name"]);
    var date = firstPath(item, section.datePaths || ["targetDate", "modificationDate", "creationDate"]);

    return {
      id: id,
      number: number || "",
      title: title || "Geen omschrijving",
      status: status || "",
      date: date || "",
      url: buildCardUrl(section, item, id)
    };
  }

  function buildCardUrl(section, item, id) {
    var directUrl = firstPath(item, ["url", "href", "_links.self.href"]);
    if (directUrl) {
      return directUrl;
    }

    if (!section.linkTemplate || !id) {
      return "";
    }

    return section.linkTemplate.replace(/\{id\}/g, encodeURIComponent(id));
  }

  function createWidget(rootElement, userConfig) {
    if (!rootElement) {
      throw new Error("Geen root-element gevonden voor de TOPdesk-widget.");
    }

    var config = deepMerge(DEFAULT_CONFIG, userConfig || {});
    var api = createApiClient(config);
    var state = {
      config: config,
      api: api,
      operator: null,
      sectionResults: [],
      error: null,
      isLoading: false,
      timerId: null
    };

    function refresh() {
      state.isLoading = true;
      state.error = null;
      render(rootElement, state, refresh);

      return resolveCurrentOperator(api, config)
        .then(function (operator) {
          state.operator = operator;
          return Promise.all(
            config.sections.map(function (section) {
              return loadSection(api, config, section, operator).catch(function (error) {
                return {
                  section: section,
                  items: [],
                  error: error
                };
              });
            })
          );
        })
        .then(function (sectionResults) {
          state.sectionResults = sectionResults;
        })
        .catch(function (error) {
          state.error = error;
          state.sectionResults = [];
        })
        .finally(function () {
          state.isLoading = false;
          render(rootElement, state, refresh);
        });
    }

    refresh();

    if (config.refreshIntervalMs > 0) {
      state.timerId = setInterval(refresh, config.refreshIntervalMs);
    }

    return {
      refresh: refresh,
      destroy: function () {
        if (state.timerId) {
          clearInterval(state.timerId);
        }
      },
      getState: function () {
        return state;
      }
    };
  }

  function render(rootElement, state, onRefresh) {
    clearElement(rootElement);
    rootElement.className = "td-assigned-work-widget";
    rootElement.setAttribute("data-loading", state.isLoading ? "true" : "false");

    var header = createElement("header", "td-widget-header");
    var headingGroup = createElement("div");
    var title = createElement("h1");
    title.textContent = "Mijn TOPdesk-werk";
    var subtitle = createElement("p", "td-widget-subtitle");
    subtitle.textContent = state.operator
      ? "Toegekend aan " + state.operator.name
      : "Incidenten, wijzigingen en operationele taken";

    headingGroup.appendChild(title);
    headingGroup.appendChild(subtitle);

    var refreshButton = createElement("button", "td-refresh-button");
    refreshButton.type = "button";
    refreshButton.textContent = state.isLoading ? "Laden..." : "Verversen";
    refreshButton.disabled = state.isLoading;
    refreshButton.addEventListener("click", onRefresh);

    header.appendChild(headingGroup);
    header.appendChild(refreshButton);
    rootElement.appendChild(header);

    if (state.error) {
      rootElement.appendChild(renderGlobalError(state.error));
      return;
    }

    if (state.isLoading && state.sectionResults.length === 0) {
      rootElement.appendChild(renderLoading());
      return;
    }

    var sectionsElement = createElement("div", "td-sections");
    state.sectionResults.forEach(function (sectionResult) {
      sectionsElement.appendChild(renderSection(sectionResult));
    });
    rootElement.appendChild(sectionsElement);
  }

  function renderLoading() {
    var loading = createElement("div", "td-loading");
    loading.textContent = "TOPdesk-gegevens worden geladen...";
    return loading;
  }

  function renderGlobalError(error) {
    var wrapper = createElement("div", "td-error");
    var title = createElement("strong");
    title.textContent = "Kan de ingelogde behandelaar niet ophalen.";
    var details = createElement("p");
    details.textContent =
      error.status === 401 || error.status === 403
        ? "Controleer of deze widget vanaf dezelfde TOPdesk-omgeving draait en of de ingelogde gebruiker API-leesrechten heeft."
        : error.message;

    wrapper.appendChild(title);
    wrapper.appendChild(details);
    return wrapper;
  }

  function renderSection(sectionResult) {
    var section = sectionResult.section;
    var wrapper = createElement("section", "td-section");
    var header = createElement("div", "td-section-header");
    var title = createElement("h2");
    title.textContent = section.title;
    var count = createElement("span", "td-count");
    count.textContent = String(sectionResult.items.length);
    header.appendChild(title);
    header.appendChild(count);
    wrapper.appendChild(header);

    if (sectionResult.error) {
      var error = createElement("p", "td-section-error");
      error.textContent = sectionResult.error.message;
      wrapper.appendChild(error);
      return wrapper;
    }

    if (sectionResult.items.length === 0) {
      var empty = createElement("p", "td-empty");
      empty.textContent = section.emptyText || "Geen items gevonden.";
      wrapper.appendChild(empty);
      return wrapper;
    }

    var list = createElement("ul", "td-card-list");
    sectionResult.items.forEach(function (item) {
      list.appendChild(renderCard(item));
    });
    wrapper.appendChild(list);

    return wrapper;
  }

  function renderCard(item) {
    var listItem = createElement("li", "td-card");
    var content = createElement(item.url ? "a" : "div", "td-card-link");

    if (item.url) {
      content.href = item.url;
      content.target = "_top";
    }

    var titleRow = createElement("div", "td-card-title-row");
    var number = createElement("span", "td-card-number");
    number.textContent = item.number || "-";
    var title = createElement("span", "td-card-title");
    title.textContent = item.title;
    titleRow.appendChild(number);
    titleRow.appendChild(title);
    content.appendChild(titleRow);

    var meta = createElement("div", "td-card-meta");
    if (item.status) {
      var status = createElement("span");
      status.textContent = item.status;
      meta.appendChild(status);
    }
    if (item.date) {
      var date = createElement("time");
      date.dateTime = item.date;
      date.textContent = formatDate(item.date);
      meta.appendChild(date);
    }
    content.appendChild(meta);

    listItem.appendChild(content);
    return listItem;
  }

  function formatDate(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("nl-NL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date);
  }

  function createElement(tagName, className) {
    var element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    return element;
  }

  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  return {
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    buildOperatorLookupUrl: buildOperatorLookupUrl,
    buildUrl: buildUrl,
    createWidget: createWidget,
    deepMerge: deepMerge,
    encodeFiqlValue: encodeFiqlValue,
    firstPath: firstPath,
    getPath: getPath,
    mapCard: mapCard,
    normalizeApiItems: normalizeApiItems
  };
});
