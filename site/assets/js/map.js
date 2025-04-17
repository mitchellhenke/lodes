import { asyncBufferFromUrl, byteLengthFromUrl, parquetMetadataAsync, parquetRead } from "hyparquet";
import { Protocol } from "pmtiles";
import { compressors } from "hyparquet-compressors";
import maplibregl from "maplibre-gl";

const
  LODES_MODE = "home",
  LODES_JOB_SEGMENT = "S000",
  LODES_YEAR = "2022",
  LODES_GEOGRAPHY = "tract";

const
  LODES_MODES = ["home", "work"],
  LODES_JOB_SEGMENTS = ["S000", "SA01", "SA02", "SA03", "SE01", "SE02", "SE03", "SI01", "SI02", "SI03"],
  LODES_YEARS = ["2022"],
  LODES_GEOGRAPHIES = ["tract", "block_group", "county"];

const CONST_LODES_JOB_SEGMENTS_LABELS = {
  "S000": "Total jobs",
  "SA01": "Jobs for workers age 29 or younger",
  "SA02": "Jobs for workers age 30 to 54",
  "SA03": "Jobs for workers age 55 or older",
  "SE01": "Jobs with earnings $1250/month or less",
  "SE02": "Jobs with earnings $1251/month to $3333/month",
  "SE03": "Jobs with earnings greater than $3333/month",
  "SI01": "Jobs in Goods Producing industry",
  "SI02": "Jobs in Trade, Transportation, and Utilities industry",
  "SI03": "Jobs in All Other Services industry"
};

const
  URL_TILES = `https://data.lodesmap.com/tiles`,
  URL_LODES = `https://data.lodesmap.com/lodes`;

const FIPS_TO_TIGER_GEO_STATE_ABBR = {
  "02": "ak",
  "01": "al",
  "05": "ar",
  "04": "az",
  "06": "ca",
  "08": "co",
  "09": "ct",
  "11": "dc",
  "10": "de",
  "12": "fl",
  "13": "ga",
  "15": "hi",
  "19": "ia",
  "16": "id",
  "17": "il",
  "18": "in",
  "20": "ks",
  "21": "ky",
  "22": "la",
  "25": "ma",
  "24": "md",
  "23": "me",
  "26": "mi",
  "27": "mn",
  "29": "mo",
  "28": "ms",
  "30": "mt",
  "37": "nc",
  "38": "nd",
  "31": "ne",
  "33": "nh",
  "34": "nj",
  "35": "nm",
  "32": "nv",
  "36": "ny",
  "39": "oh",
  "40": "ok",
  "41": "or",
  "42": "pa",
  "44": "ri",
  "45": "sc",
  "46": "sd",
  "47": "tn",
  "48": "tx",
  "49": "ut",
  "51": "va",
  "50": "vt",
  "53": "wa",
  "55": "wi",
  "54": "wv",
  "56": "wy"
}

const
  MAP_CENTER = [-74.0, 40.75],
  MAP_ZOOM = 10,
  MAP_ZOOM_LIMITS = [2, 14];

const
  ZOOM_THRESHOLDS_MODE = {
    "home": [6, 8],
    "work": [6, 8],
  };

// Parameters that get updated by query string or clicking the map
let modeParam = LODES_MODE,
  jobSegmentParam = LODES_JOB_SEGMENT,
  yearParam = LODES_YEAR,
  geographyParam = LODES_GEOGRAPHY,
  idParam = null;

let validMode = true,
  validJobSegment = true,
  validYear = true,
  validGeography = true,
  validId = true;

const getTilesUrl = function getTilesUrl({
  year = LODES_YEAR,
  geography = LODES_GEOGRAPHY
} = {}) {
  // We always use 2023 tiles as all years of LODES data for Version 8
  // are based on 2023 TIGER/Lines shapes.
  return `${URL_TILES}/year=2023/geography=${geography}/` +
    `tiles-2023-${geography}`;
};

const getLodesUrl = function getLodesUrl({
  year = LODES_YEAR,
  geography = LODES_GEOGRAPHY,
  state = null
} = {}) {

  if(state !== null) {
    state = FIPS_TO_TIGER_GEO_STATE_ABBR[state]
  }

  return `${URL_LODES}/year=${year}/geography=${geography}/` +
    `state=${state}/lodes-${year}-${geography}-${state}.parquet`;
};

const setUrlParam = function setUrlParam(name, value) {
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set(name, value);
  window.history.replaceState({}, "", `?${urlParams}${window.location.hash}`);
};

const validJobSegmentInput = function validJobSegmentInput(jobSegment) {
  if (LODES_JOB_SEGMENTS.includes(jobSegment) && jobSegment) { return true; }
  console.warn(`Invalid mode ${jobSegment}. Must be one of: ${LODES_JOB_SEGMENTS.join(", ")}.`);
  return false;
};

const validModeInput = function validModeInput(mode) {
  if (LODES_MODES.includes(mode) && mode) { return true; }
  console.warn(`Invalid mode ${mode}. Must be one of: ${LODES_MODES.join(", ")}.`);
  return false;
};

const validYearInput = function validYearInput(year) {
  if (LODES_YEARS.includes(year) && year) { return true; }
  console.warn(`Invalid data year. Must be one of: ${LODES_YEARS.join(", ")}.`);
  return false;
};

const validGeographyInput = function validGeographyInput(geography) {
  if (LODES_GEOGRAPHIES.includes(geography) && geography) { return true; }
  console.warn(`Invalid geography. Must be one of: ${LODES_GEOGRAPHIES.join(", ")}.`);
  return false;
};

const validIdInput = function validIdInput(id) {
  if (/^\d{5,12}$/u.test(id) || !id) {
    return true;
  }
  console.warn("Invalid ID input. Please enter a valid Census GEOID.");
  return false;
};

class ColorScale {
  constructor() {
    this.scaleContainer = this.createScaleContainer();
    this.toggleButton = this.createToggleButton();
    this.modeDropdown = this.createDropdown(
      "mode", LODES_MODE, LODES_MODES, {}, "Origin"
    );
    this.jobSegmentDropdown = this.createDropdown(
      "job_segment", LODES_JOB_SEGMENT, LODES_JOB_SEGMENTS, CONST_LODES_JOB_SEGMENTS_LABELS, "Job Segment"
    );
    this.geographyDropdown = this.createDropdown(
      "geography", LODES_GEOGRAPHY, LODES_GEOGRAPHIES, {}, "Geography"
    );
    this.colors = this.getColors();
    this.zoomLower = null;
    this.zoomUpper = null;
  }

  createDropdown(param, defaultParam, possibleParams, paramLabels, labelText) {
    const container = document.createElement("div"),
      dropdown = document.createElement("select"),
      label = document.createElement("label");

    container.className = "dropdown-container";
    dropdown.id = `${param}`;
    label.setAttribute("for", `${param}`);
    label.textContent = labelText;
    possibleParams.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt;

      if(paramLabels[opt]) {
        option.textContent = paramLabels[opt]
      } else {
        option.textContent = opt.split("_").
          map(word => word.charAt(0).toUpperCase() +
            word.slice(1).toLowerCase()).join(" ");
      }
      if (opt === defaultParam) {
        option.selected = true;
      }
      dropdown.appendChild(option);
    });

    container.appendChild(label);
    container.appendChild(dropdown);

    return container;
  }

  createScaleContainer() {
    const container = document.createElement("div");
    container.id = "map-color-scale";
    return container;
  }

  createToggleButton() {
    const button = document.createElement("button");
    button.id = "map-color-scale-toggle";
    button.innerHTML = "&#x2212;";
    button.onclick = () => {
      const isCollapsed = this.scaleContainer.classList.toggle("collapsed");
      if (isCollapsed) {
        button.innerHTML = "&#x2b;";
      } else {
        button.innerHTML = "&#x2212;";
      }
    };
    return button;
  }

  draw(map) {
    const legendTitle = document.createElement("div");
    legendTitle.id = "legend-title";
    legendTitle.innerHTML = "<h2>Number of People</h2>";

    this.scaleContainer.append(legendTitle);
    this.colors.forEach(({ color, label }) => {
      const colorBox = document.createElement("div"),
        item = document.createElement("div"),
        text = document.createElement("span");
      text.textContent = label;
      colorBox.style.backgroundColor = color;
      item.append(colorBox, text);
      this.scaleContainer.append(item);
    });

    this.scaleContainer.append(this.modeDropdown);
    this.scaleContainer.append(this.geographyDropdown);
    this.scaleContainer.append(this.jobSegmentDropdown);
    this.scaleContainer.append(this.toggleButton);
    map.getContainer().append(this.scaleContainer);
  }

  getColors() {
    return [
      { color: "var(--map-color-1)", label: "< 15 min" },
      { color: "var(--map-color-2)", label: "15-30 min" },
      { color: "var(--map-color-3)", label: "30-45 min" },
      { color: "var(--map-color-4)", label: "45-60 min" },
      { color: "var(--map-color-5)", label: "60-75 min" },
    ];
  }

  getColorScale(count, geography, zoom) {
    const colors = ["color_1", "color_2", "color_3", "color_4", "color_5"],
      thresholds = this.getThresholdsForZoom(zoom, geography);
    for (let index = 0; index < thresholds.length; index += 1) {
      if (count < thresholds[index]) {
        return colors[index];
      }
    }

    return "none";
  }

  getLabelsForZoom(zoom, geography) {
    switch (geography) {
      case "tract":
        return ["1", "2-10", "11-20", "21-30", "30+"];
      case "county":
        return ["1", "2-100", "101-1,000", "1,001-10,000", "10,000+"];
      default:
        return ["1", "2-10", "11-20", "21-30", "30+"];
    }
}

  getThresholdsForZoom(zoom, geography) {
    switch (geography) {
      case "tract":
        return [2, 11, 21, 30, 10000000];
      case "county":
        return [2, 101, 1001, 10001, 100000000];
      default:
        return [2, 6, 11, 16, 10000000];
    }
  }

  updateLabels(zoom, geography) {
    const items = this.scaleContainer.querySelectorAll("div > span"),
      labels = this.getLabelsForZoom(zoom, geography);
    items.forEach((item, index) => {
      item.textContent = labels[index];
    });
  }

  updateZoomThresholds(lower, upper) {
    this.zoomLower = lower;
    this.zoomUpper = upper;
  }
}

class Spinner {
  constructor() {
    this.spinner = this.createSpinner();
    this.debounceTimeout = null;
    this.isHiding = false;
  }

  createSpinner() {
    const spinner = document.createElement("div");
    spinner.id = "map-spinner";
    return spinner;
  }

  show() {
    this.isHiding = false;
    const contentNode = document.querySelector(".content");
    contentNode.appendChild(this.spinner);
    // Reset spinner appearance
    this.spinner.classList.remove("spinner-fade-out");
    this.spinner.style.transform = "scaleX(0.0)";
    setTimeout(() => {
      this.spinner.style.transform = "scaleX(0.10)";
    }, 100);
  }

  hide() {
    if (this.isHiding) { return; };
    this.isHiding = true;

    const contentNode = document.querySelector(".content");
    if (!contentNode.contains(this.spinner)) { return; };

    // Expand spinner to full width
    this.spinner.style.transform = "scaleX(1.0)";

    let transformDone = false;
    this.spinner.ontransitionend = (event) => {
      if (!transformDone && event.propertyName === "transform") {
        // When transform finishes, trigger the fade-out
        transformDone = true;
        this.spinner.classList.add("spinner-fade-out");
      } else if (transformDone && event.propertyName === "opacity") {
        // When opacity transition ends, remove the spinner
        contentNode.removeChild(this.spinner);
        this.spinner.ontransitionend = null;
      }
    };
  }

  updateProgress(percentage) {
    if (this.isHiding) { return; };

    const minProgress = 10;
    const progress = Math.max(percentage, minProgress);

    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => {
      this.spinner.style.transform = `scaleX(${progress / 100})`;
    }, 50);
  }
}

class Map {
  constructor(colorScale, spinner, processor) {
    this.init();
    this.colorScale = colorScale;
    this.spinner = spinner;
    this.processor = processor;
    this.hoveredPolygonId = LODES_GEOGRAPHIES.reduce((acc, geography) => {
      acc[geography] = null;
      return acc;
    }, {});
    this.previousZoomLevel = null;
    this.isProcessing = false;
  }

  init() {
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);

    this.map = new maplibregl.Map({
      center: MAP_CENTER,
      container: "map",
      doubleClickZoom: false,
      maxBounds: [
        [-175.0, -9.0],
        [-20.0, 72.1],
      ],
      maxZoom: MAP_ZOOM_LIMITS[1],
      minZoom: MAP_ZOOM_LIMITS[0],
      pitchWithRotate: false,
      style: "https://tiles.openfreemap.org/styles/positron",
      zoom: MAP_ZOOM,
    });
    this.hash = new maplibregl.Hash();
    this.hash.addTo(this.map);
    this.hash._onHashChange();

    return new Promise((resolve) => {
      this.map.on("load", () => {
        for (const geography of LODES_GEOGRAPHIES) {
          const url = getTilesUrl({ geography });
          this.map.addSource(`protomap-${geography}`, {
            promoteId: "id",
            type: "vector",
            url: `pmtiles://${url}.pmtiles`
          });
        };

        this.map.addControl(new maplibregl.NavigationControl(), "bottom-right");
        this.addMapLayers(this.map);
        resolve(this.map);

        this.geoIdDisplay = this.createGeoIdDisplay();
        this.addHandlers();
      });
    });
  }

  addHandlers() {
    this.map.on("mousemove", (feat) => {
      if (!validGeography) { return; }

      const [feature] = this.map.queryRenderedFeatures(
        feat.point,
        { layers: [`geo_fill_${geographyParam}`] }
      );

      const geoName = geographyParam.split("_").
        map(word => word.charAt(0).toUpperCase() +
          word.slice(1).toLowerCase()).join(" ");

      if (feature) {
        this.map.getCanvas().style.cursor = "pointer";
        this.geoIdDisplay.style.display = "block";
        this.geoIdDisplay.textContent = `${geoName} ID: ${feature.properties.id}`;
        if (this.hoveredPolygonId[geographyParam] !== null) {
          this.map.setFeatureState(
            {
              id: this.hoveredPolygonId[geographyParam],
              source: `protomap-${geographyParam}`,
              sourceLayer: "geometry"
            },
            { hover: false }
          );
        }
        this.hoveredPolygonId[geographyParam] = feature.properties.id;
        this.map.setFeatureState(
          {
            id: this.hoveredPolygonId[geographyParam],
            source: `protomap-${geographyParam}`,
            sourceLayer: "geometry"
          },
          { hover: true }
        );
      } else {
        this.map.getCanvas().style.cursor = "";
        this.geoIdDisplay.style.display = "none";
        this.geoIdDisplay.textContent = "";
      }
    });

    // Clear hover
    this.map.on("mouseleave", () => {
      if (!validGeography) { return; }

      if (this.hoveredPolygonId[geographyParam] !== null) {
        this.map.setFeatureState(
          {
            id: this.hoveredPolygonId[geographyParam],
            source: `protomap-${geographyParam}`,
            sourceLayer: "geometry"
          },
          { hover: false }
        );
      }
      this.hoveredPolygonId[geographyParam] = null;
    });

    this.map.on("click", async (feat) => {
      if (this.isProcessing) { return; }
      if (!validMode || !validGeography || !validYear) { return; }

      // Query the invisible block group layer to get feature id
      const [feature] = this.map.queryRenderedFeatures(
        feat.point,
        { layers: ["geo_fill_query"] }
      );

      if (feature) {
        idParam = feature?.properties.id;
        validId = validIdInput(idParam);

        if (idParam && validId) {
          setUrlParam("id", idParam);
          await this.processor.runQuery(
            this, modeParam, jobSegmentParam, yearParam, geographyParam,
            idParam.substring(0, 2), idParam
          );
        }
      }
    });

    this.map.on("moveend", () => {
      // Only update/add the location hash after the first movement
      this.hash._updateHash();

      const urlParams = new URLSearchParams(window.location.search);
      window.history.replaceState({}, "", `${urlParams ? `?${urlParams}` : ""}${window.location.hash}`);
    });

    this.map.on("zoomend", () => {
      const currentZoomLevel = this.map.getZoom();
      if (this.previousZoomLevel !== null) {
        // Update legend and fill based on mode
        const crossedModeThreshold = ZOOM_THRESHOLDS_MODE[modeParam].some(
          (threshold) =>
            (this.previousZoomLevel < threshold && currentZoomLevel >= threshold) ||
            (this.previousZoomLevel >= threshold && currentZoomLevel < threshold)
        );

        if (crossedModeThreshold && !this.isProcessing) {
          this.updateMapFill(this.processor.previousResults[geographyParam], geographyParam);
          this.colorScale.updateLabels(currentZoomLevel, geographyParam);
        };
      }
      this.previousZoomLevel = currentZoomLevel;
    });
  }

  addMapLayers() {
    const { layers } = this.map.getStyle();
    // Find the index of the first symbol layer in the map style
    let firstSymbolId = null;
    for (const layer of layers) {
      if (layer.type === "symbol") {
        firstSymbolId = layer.id;
        break;
      }
    }
    for (const geography of LODES_GEOGRAPHIES) {
      this.map.addLayer({
        filter: ["==", ["geometry-type"], "Polygon"],
        id: `geo_fill_${geography}`,
        layout: { visibility: "none" },
        paint: {
          "fill-color": [
            "case",
            ["==", ["feature-state", "geoColor"], "color_1"], "rgba(253, 231, 37, 0.4)",
            ["==", ["feature-state", "geoColor"], "color_2"], "rgba(122, 209, 81, 0.4)",
            ["==", ["feature-state", "geoColor"], "color_3"], "rgba(34, 168, 132, 0.4)",
            ["==", ["feature-state", "geoColor"], "color_4"], "rgba(42, 120, 142, 0.4)",
            ["==", ["feature-state", "geoColor"], "color_5"], "rgba(65, 68, 135, 0.4)",
            "rgba(255, 255, 255, 0.0)"
          ],
        },
        source: `protomap-${geography}`,
        "source-layer": "geometry",
        type: "fill",
      }, firstSymbolId);

      this.map.addLayer({
        filter: ["==", ["geometry-type"], "Polygon"],
        id: `geo_line_${geography}`,
        layout: { visibility: "none" },
        paint: {
          "line-color": "#333",
          "line-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.5,
            0.0
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            5,
            1
          ]
        },
        source: `protomap-${geography}`,
        "source-layer": "geometry",
        type: "line",
      }, firstSymbolId);
    };

    // Invisible block group layer to query on click
    this.map.addLayer({
      filter: ["==", ["geometry-type"], "Polygon"],
      id: "geo_fill_query",
      paint: { "fill-opacity": 0 },
      source: "protomap-block_group",
      "source-layer": "geometry",
      type: "fill",
    }, firstSymbolId);
  }

  createGeoIdDisplay() {
    const display = document.createElement("div");
    display.id = "map-info";
    // Initially hidden
    display.style.display = "none";
    document.body.append(display);
    return display;
  }

  switchLayerVisibility(geography) {
    this.map.setLayoutProperty(`geo_fill_${geography}`, "visibility", "visible");
    this.map.setLayoutProperty(`geo_line_${geography}`, "visibility", "visible");

    const otherGeographies = LODES_GEOGRAPHIES.filter(geo => geo !== geography);
    for (const geo of otherGeographies) {
      this.map.setLayoutProperty(`geo_fill_${geo}`, "visibility", "none");
      this.map.setLayoutProperty(`geo_line_${geo}`, "visibility", "none");
    }
  }

  updateMapFill(results, geography) {
    results.forEach(row =>
      this.map.setFeatureState(
        {
          id: row.id,
          source: `protomap-${geography}`,
          sourceLayer: "geometry"
        },
        { geoColor: this.colorScale.getColorScale(row.count, geography, this.map.getZoom()) }
      )
    );
  }

  wipeMapPreviousState(results, geography) {
    results.forEach(row =>
      this.map.setFeatureState(
        {
          id: row.id,
          source: `protomap-${geography}`,
          sourceLayer: "geometry"
        },
        { geoColor: "none" }
      )
    );
  }
}

class ParquetProcessor {
  constructor() {
    this.previousResults = LODES_GEOGRAPHIES.reduce((acc, geography) => {
      acc[geography] = [];
      return acc;
    }, {});
    this.byteLengthCache = {};
    this.metadataCache = {};
  }

  async fetchAndCacheMetadata(url) {
    let contentLength = null,
      metadata = null;
    if (this.byteLengthCache[url]) {
      contentLength = this.byteLengthCache[url];
    } else {
      contentLength = await byteLengthFromUrl(url);
      this.byteLengthCache[url] = contentLength;
    }

    if (this.metadataCache[url]) {
      metadata = this.metadataCache[url];
    } else {
      const buffer = await asyncBufferFromUrl({
        byteLength: Number(contentLength),
        url,
      });
      metadata = await parquetMetadataAsync(buffer);
      this.metadataCache[url] = metadata;
    }
    return metadata;
  }

  processParquetRowGroup(map, id, geography, data, results, mode) {
    data.forEach(row => {
      // w_tract, h_tract
      const source = mode == "work" ? 0 : 1
      const destination = mode == "work" ? 1 : 0

      if (row[source] === id) {
        map.map.setFeatureState(
          {
            id: row[destination],
            source: `protomap-${geography}`,
            sourceLayer: "geometry"
          },
          { geoColor: map.colorScale.getColorScale(row[2], geography, map.map.getZoom()) }
        );
        results.push({ count: row[2], id: row[destination] });
      }
    });
  }

  saveResultState(map, results, geography) {
    const resultIds = new Set(results.map(item => item.id));
    const filteredPreviousResults = this.previousResults[geography]
      .filter(item => !resultIds.has(item.id));
    map.wipeMapPreviousState(filteredPreviousResults, geography);
    this.previousResults[geography] = results;
  }

  truncateId(geography, id) {
    if (geography === "county") {
      return id.substring(0, 5);
    } else if (geography === "tract") {
      return id.substring(0, 11);
    } else if (geography === "block_group") {
      return id;
    }
    return id;
  }

  async runQuery(map, mode, job_segment, year, geography, state, id) {
    map.isProcessing = true;
    map.spinner.show();
    const tilesUrl = getTilesUrl({ geography }),
      queryUrl = getLodesUrl({ geography, state, year }),
      truncId = this.truncateId(geography, id);

    // Get the count of files given the geography, mode, and state
    const results = await this.updateMapOnQuery(map, queryUrl, truncId, geography, job_segment, mode);
    this.saveResultState(map, results, geography);
    map.isProcessing = false;
    map.spinner.hide();
  }

  async readAndUpdateMap(map, id, geography, file, metadata, rowGroup, results, job_segment, mode) {
    await parquetRead(
      {
        columns: ["w_geo", "h_geo", job_segment],
        compressors,
        file,
        metadata,
        onComplete: data => this.processParquetRowGroup(map, id, geography, data, results, mode),
        rowEnd: rowGroup.endRow,
        rowStart: rowGroup.startRow
      }
    );
  }

  async updateMapOnQuery(map, url, id, geography, job_segment, mode) {
    const urls = [url]
    const results = [];
    let totalGroups = 0;

    // Process the metadata for each URL
    const rowGroupResults = urls.map(async (url) => {
      const contentLength = this.byteLengthCache[url],
        rowGroupMetadata = [];
      const buffer = await asyncBufferFromUrl({ byteLength: contentLength, url }),
        metadata = await this.fetchAndCacheMetadata(url);

      totalGroups += metadata.row_groups.length;

      let rowStart = 0;
      for (const rowGroup of metadata.row_groups) {
        for (const column of rowGroup.columns) {
          if (column.meta_data.path_in_schema.includes("w_geo")) {
            const
              endRow = rowStart + Number(rowGroup.num_rows) - 1,
              maxValue = column.meta_data.statistics.max_value,
              minValue = column.meta_data.statistics.min_value,
              startRow = rowStart;

            if (id >= minValue && id <= maxValue) {
              rowGroupMetadata.push({
                file: buffer,
                id,
                metadata,
                rowGroup: { endRow, startRow }
              });
            }
          }
        }
        rowStart += Number(rowGroup.num_rows);
      }

      return rowGroupMetadata;
    });

    // Async query the rowgroups relevant to the input ID
    let rowGroupItems = await Promise.all(rowGroupResults);
    rowGroupItems = rowGroupItems.flat().filter(item => item.length !== 0);

    totalGroups = rowGroupItems.length;
    if (totalGroups === 0) {
      console.warn("No data found for the given ID.");
      return results;
    }

    let processedGroups = 0,
      progress = 10;
    await Promise.all(rowGroupItems.map(async (rg) => {
      await this.readAndUpdateMap(map, rg.id, geography, rg.file, rg.metadata, rg.rowGroup, results, job_segment, mode);
      processedGroups += 1;
      progress = Math.ceil((processedGroups / totalGroups) * 100);
      map.spinner.updateProgress(progress);
    }));
    return results;
  }
}

(() => {
  const colorScale = new ColorScale(),
    processor = new ParquetProcessor(),
    spinner = new Spinner(),
    map = new Map(colorScale, spinner, processor);

  colorScale.draw(map.map);

  colorScale.modeDropdown.addEventListener("change", async (event) => {
    const urlParams = new URLSearchParams(window.location.search);

    modeParam = event.target.value;
    validMode = validModeInput(modeParam);
    validGeography = validGeographyInput(geographyParam);

    if (validMode && validGeography) {
      colorScale.updateZoomThresholds(
        ZOOM_THRESHOLDS_MODE[modeParam][0],
        ZOOM_THRESHOLDS_MODE[modeParam][1]
      );
      colorScale.updateLabels(map.map.getZoom(), geographyParam);
      setUrlParam("mode", modeParam);

      idParam = urlParams.get("id");
      validId = validIdInput(idParam);

      if (idParam && validId) {
        await processor.runQuery(
          map, modeParam, jobSegmentParam, yearParam, geographyParam,
          idParam.substring(0, 2), idParam
        );
      }
    }
  });

  colorScale.jobSegmentDropdown.addEventListener("change", async (event) => {
    const urlParams = new URLSearchParams(window.location.search);

    jobSegmentParam = event.target.value;
    validJobSegment = validJobSegmentInput(jobSegmentParam);

    if (validJobSegment) {
      setUrlParam("jobSegment", jobSegmentParam);

      idParam = urlParams.get("id");
      validId = validIdInput(idParam);

      if (idParam && validId) {
        await processor.runQuery(
          map, modeParam, jobSegmentParam, yearParam, geographyParam,
          idParam.substring(0, 2), idParam
        );
      }
    }
  });

  colorScale.geographyDropdown.addEventListener("change", async (event) => {
    const urlParams = new URLSearchParams(window.location.search);

    geographyParam = event.target.value;
    validGeography = validGeographyInput(geographyParam);

    if (validGeography) {
      map.switchLayerVisibility(geographyParam);
      setUrlParam("geography", geographyParam);

      idParam = urlParams.get("id");
      validId = validIdInput(idParam);

      if (idParam && validId) {
        await processor.runQuery(
          map, modeParam, jobSegmentParam, yearParam, geographyParam,
          idParam.substring(0, 2), idParam
        );
      }
    }
  });

  map.map.on("load", async () => {
    const urlParams = new URLSearchParams(window.location.search);

    modeParam = urlParams.get("mode") || LODES_MODE;
    geographyParam = urlParams.get("geography") || LODES_GEOGRAPHY;
    yearParam = LODES_YEAR;

    validMode = validModeInput(modeParam);
    validYear = validYearInput(yearParam);
    validGeography = validGeographyInput(geographyParam);

    if (validMode && validGeography) {
      colorScale.updateZoomThresholds(
        ZOOM_THRESHOLDS_MODE[modeParam][0],
        ZOOM_THRESHOLDS_MODE[modeParam][1]
      );
      colorScale.updateLabels(map.map.getZoom(), geographyParam);
      urlParams.set("mode", modeParam);
      document.getElementById("mode").value = modeParam;
    }

    if (validGeography) {
      map.switchLayerVisibility(geographyParam);
      urlParams.set("geography", geographyParam);
      document.getElementById("geography").value = geographyParam;
    }

    if (validMode && validYear && validGeography) {
      idParam = urlParams.get("id");
      validId = validIdInput(idParam);

      if (idParam && validId) {
        await processor.runQuery(
          map, modeParam, jobSegmentParam, yearParam, geographyParam,
          idParam.substring(0, 2), idParam
        );
      }
    }
  });
})();
