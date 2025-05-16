import { asyncBufferFromUrl, byteLengthFromUrl, parquetMetadataAsync, parquetRead } from "hyparquet";
import { Protocol } from "pmtiles";
import { compressors } from "hyparquet-compressors";
import maplibregl from "maplibre-gl";

const
  LODES_ORIGIN = "h_geo",
  LODES_JOB_SEGMENT = "S000",
  LODES_YEAR = "2022",
  LODES_GEOGRAPHY = "tract";

const
  LODES_ORIGINS = ["h_geo", "w_geo"],
  LODES_JOB_SEGMENTS = ["S000", "SA01", "SA02", "SA03", "SE01", "SE02", "SE03", "SI01", "SI02", "SI03"],
  LODES_YEARS = ["2002", "2022"],
  LODES_GEOGRAPHIES = ["block_group", "tract", "supertract", "county"];

const CONST_LODES_ORIGINS_LABELS = {
  "w_geo": "Work",
  "h_geo": "Home"
};

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
  MAP_CENTER = [-87.967, 43.064],
  MAP_ZOOM = 10,
  MAP_ZOOM_LIMITS = [2, 14];

// Parameters that get updated by query string or clicking the map
let originParam = LODES_ORIGIN,
  jobSegmentParam = LODES_JOB_SEGMENT,
  yearParam = LODES_YEAR,
  geographyParam = LODES_GEOGRAPHY,
  idParam = null;

let validOrigin = true,
  validJobSegment = true,
  validYear = true,
  validGeography = true,
  validId = true;

const getTilesUrl = function getTilesUrl({
  year = LODES_YEAR,
  geography = LODES_GEOGRAPHY
} = {}) {
  // We always use 2020 tiles as all years of LODES data for Version 8
  // are based on 2020 TIGER/Lines shapes.
  return `${URL_TILES}/year=2020/geography=${geography}/` +
    `tiles-2020-${geography}`;
};

const getLodesUrl = function getLodesUrl({
  year = LODES_YEAR,
  geography = LODES_GEOGRAPHY,
  origin = LODES_ORIGIN,
  state = null
} = {}) {

  if(state !== null) {
    state = FIPS_TO_TIGER_GEO_STATE_ABBR[state]
  }

  return `${URL_LODES}/year=${year}/geography=${geography}/origin=${origin}/` +
    `state=${state}/lodes-${year}-${geography}-${origin}-${state}.parquet`;
};

const setUrlParam = function setUrlParam(name, value) {
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set(name, value);
  window.history.replaceState({}, "", `?${urlParams}${window.location.hash}`);
};

const validJobSegmentInput = function validJobSegmentInput(jobSegment) {
  if (LODES_JOB_SEGMENTS.includes(jobSegment) && jobSegment) { return true; }
  console.warn(`Invalid job segment ${jobSegment}. Must be one of: ${LODES_JOB_SEGMENTS.join(", ")}.`);
  return false;
};

const validOriginInput = function validOriginInput(origin) {
  if (LODES_ORIGINS.includes(origin) && origin) { return true; }
  console.warn(`Invalid origin ${origin}. Must be one of: ${LODES_ORIGINS.join(", ")}.`);
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
    this.originDropdown = this.createDropdown(
      "origin", LODES_ORIGIN, LODES_ORIGINS, CONST_LODES_ORIGINS_LABELS, "Origin"
    );
    this.jobSegmentDropdown = this.createDropdown(
      "job_segment", LODES_JOB_SEGMENT, LODES_JOB_SEGMENTS, CONST_LODES_JOB_SEGMENTS_LABELS, "Job Segment"
    );
    this.geographyDropdown = this.createDropdown(
      "geography", LODES_GEOGRAPHY, LODES_GEOGRAPHIES, {}, "Geography"
    );
    this.yearDropdown = this.createDropdown(
      "year", LODES_YEAR, LODES_YEARS, {}, "Year"
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

    this.scaleContainer.append(this.yearDropdown);
    this.scaleContainer.append(this.originDropdown);
    this.scaleContainer.append(this.geographyDropdown);
    this.scaleContainer.append(this.jobSegmentDropdown);
    this.scaleContainer.append(this.toggleButton);
    map.getContainer().append(this.scaleContainer);
  }

  getColors() {
    return [
      { color: "var(--map-color-1)", label: "1" },
      { color: "var(--map-color-2)", label: "2-10" },
      { color: "var(--map-color-3)", label: "11-20" },
      { color: "var(--map-color-4)", label: "21-30" },
      { color: "var(--map-color-5)", label: "30+" },
    ];
  }

  getColorScale(count, geography) {
    const colors = ["color_1", "color_2", "color_3", "color_4", "color_5"],
      thresholds = this.getThresholdsForGeography(geography);
    for (let index = 0; index < thresholds.length; index += 1) {
      if (count < thresholds[index]) {
        return colors[index];
      }
    }

    return "none";
  }

  getLabelsForGeography(geography) {
    switch (geography) {
      case "county":
        return ["1", "2-100", "101-1,000", "1,001-10,000", "10,000+"];
      case "supertract":
        return ["1", "2-100", "101-1,000", "1,001-10,000", "10,000+"];
      default:
        return ["1", "2-10", "11-20", "21-30", "30+"];
    }
  }

  getThresholdsForGeography(geography) {
    switch (geography) {
      case "county":
        return [1, 2, 101, 1001, 10000];
      case "supertract":
        return [1, 2, 101, 1001, 10000];
      default:
        return [1, 2, 11, 21, 30];
    }
  }

  updateLabels(zoom, geography) {
    const items = this.scaleContainer.querySelectorAll("div > span"),
      labels = this.getLabelsForGeography(geography);
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

    this.selectedPolygonId = LODES_GEOGRAPHIES.reduce((acc, geography) => {
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

      if (feature) {
        this.map.getCanvas().style.cursor = "pointer";
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
        this.updateGeoIdDisplay(feature.properties.id, this.processor.previousResults[geographyParam][feature.properties.id]?.count)
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
      if (!validOrigin || !validGeography || !validYear) { return; }

      // Query the invisible block group layer to get feature id
      const [feature] = this.map.queryRenderedFeatures(
        feat.point,
        { layers: ["geo_fill_query"] }
      );

      const [geometryFeature] = this.map.queryRenderedFeatures(
        feat.point,
        { layers: [`geo_fill_${geographyParam}`] }
      );

      if(geometryFeature) {
        this.updateSelectedFeature(geometryFeature.properties.id)
      }

      if (feature) {
        idParam = feature?.properties.id;
        validId = validIdInput(idParam);

        if (idParam && validId) {
          setUrlParam("id", idParam);
          await this.processor.runQuery(
            this, originParam, jobSegmentParam, yearParam, geographyParam,
            idParam.substring(0, 2), idParam
          );

          this.updateGeoIdDisplay(this.hoveredPolygonId[geographyParam], this.processor.previousResults[geographyParam][geometryFeature.properties.id]?.count)
        }
      }
    });

    this.map.on("moveend", () => {
      // Only update/add the location hash after the first movement
      this.hash._updateHash();

      const urlParams = new URLSearchParams(window.location.search);
      window.history.replaceState({}, "", `${urlParams ? `?${urlParams}` : ""}${window.location.hash}`);
    });
  }

  displayGeoName(geometry) {
    return geometry.split("_").
      map(word => word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()).join(" ");
  }

  truncateId(geography, id) {
    if (geography === "county") {
      return id.substring(0, 5);
    } else if (geography === "supertract") {
      return id.substring(0, 7);
    } else if (geography === "tract") {
      return id.substring(0, 11);
    } else if (geography === "block_group") {
      return id;
    }
    return id;
  }

  updateSelectedFeature(id) {
    if (this.selectedPolygonId[geographyParam] !== null) {
      this.map.setFeatureState(
        {
          id: this.selectedPolygonId[geographyParam],
          source: `protomap-${geographyParam}`,
          sourceLayer: "geometry"
        },
        { selected: false }
      );
    }
    this.selectedPolygonId[geographyParam] = id;

    this.map.setFeatureState(
      {
        id: this.selectedPolygonId[geographyParam],
        source: `protomap-${geographyParam}`,
        sourceLayer: "geometry"
      },
      { selected: true }
    );
  }

  updateGeoIdDisplay(id, count) {
    this.geoIdDisplay.style.display = "block";
    const geoName = this.displayGeoName(geographyParam);
    const truncId = this.truncateId(geographyParam, id);

    if(count) {
      this.geoIdDisplay.innerHTML = `${geoName} ID: ${truncId}<br>${count.toLocaleString()} People`;
    } else {
      this.geoIdDisplay.innerHTML = `${geoName} ID: ${truncId}<br>0 People`;
    }
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
    // getThresholdsForGeography(geography)
    for (const geography of LODES_GEOGRAPHIES) {
      const thresholds = this.colorScale.getThresholdsForGeography(geography)
      const colors = [
        "rgb(253, 231, 37)",
        "rgb(122, 209, 81)",
        "rgb(34, 168, 132)",
        "rgb(42, 120, 142)",
        "rgb(65, 68, 135)"
      ]

      const thresholds_colors = thresholds.map((k, i) => [k, colors[i]]).flat();

      this.map.addLayer({
        filter: ["==", ["geometry-type"], "Polygon"],
        id: `geo_fill_${geography}`,
        layout: { visibility: "none" },
        paint: {
          "fill-color": [
            'interpolate',
            ['linear'],
            ['feature-state', 'geoValue'],
            ...thresholds_colors
          ],
          "fill-opacity": [
            'case',
            ["==", ["feature-state", "geoValue"], null], 0.0,
            0.4,
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
            0.35,
            0.0
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            3,
            1
          ]
        },
        source: `protomap-${geography}`,
        "source-layer": "geometry",
        type: "line",
      }, firstSymbolId);

      this.map.addLayer({
        filter: ["==", ["geometry-type"], "Polygon"],
        id: `geo_line_selected_${geography}`,
        layout: { visibility: "none" },
        paint: {
          "line-color": "#111",
          "line-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.35,
            0.0
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
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
    this.map.setLayoutProperty(`geo_line_selected_${geography}`, "visibility", "visible");

    const otherGeographies = LODES_GEOGRAPHIES.filter(geo => geo !== geography);
    for (const geo of otherGeographies) {
      this.map.setLayoutProperty(`geo_fill_${geo}`, "visibility", "none");
      this.map.setLayoutProperty(`geo_line_${geo}`, "visibility", "none");
      this.map.setLayoutProperty(`geo_line_selected_${geo}`, "visibility", "none");
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
        { geoValue: row.count }
      )
    );
  }

  wipeMapPreviousState(ids, geography) {
    ids.forEach(id =>
      this.map.setFeatureState(
        {
          id: id,
          source: `protomap-${geography}`,
          sourceLayer: "geometry"
        },
        { geoValue: null }
      )
    );
  }
}

class ParquetProcessor {
  constructor() {
    this.previousResults = LODES_GEOGRAPHIES.reduce((acc, geography) => {
      acc[geography] = {};
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

  processParquetRowGroup(map, id, geography, data, results, origin) {
    data.forEach(row => {
      // w_tract, h_tract
      const source = origin == "w_geo" ? 0 : 1
      const destination = origin == "w_geo" ? 1 : 0

      if (row[source] === id) {
        map.map.setFeatureState(
          {
            id: row[destination],
            source: `protomap-${geography}`,
            sourceLayer: "geometry"
          },
          { geoValue: row[2] }
        );
        results[row[destination]] = { count: row[2], id: row[destination] };
      }
    });
  }

  saveResultState(map, results, geography) {
    const filteredPreviousResults = this.previousResults[geography]
    Object.keys(results).forEach(key => delete(filteredPreviousResults[key]));
    map.wipeMapPreviousState(Object.keys(filteredPreviousResults), geography);
    this.previousResults[geography] = results;
  }

  async runQuery(map, origin, job_segment, year, geography, state, id) {
    map.isProcessing = true;
    map.spinner.show();
    const queryUrl = getLodesUrl({ year, geography, origin, state }),
      truncId = map.truncateId(geography, id);

    // Get the count of files given the geography, origin, and state
    const results = await this.updateMapOnQuery(map, queryUrl, truncId, geography, job_segment, origin);
    this.saveResultState(map, results, geography);
    map.updateSelectedFeature(truncId)
    map.isProcessing = false;
    map.spinner.hide();
  }

  async readAndUpdateMap(map, id, geography, file, metadata, rowGroup, results, job_segment, origin) {
    await parquetRead(
      {
        columns: ["w_geo", "h_geo", job_segment],
        compressors,
        file,
        metadata,
        onComplete: data => this.processParquetRowGroup(map, id, geography, data, results, origin),
        rowEnd: rowGroup.endRow,
        rowStart: rowGroup.startRow
      }
    );
  }

  async updateMapOnQuery(map, url, id, geography, job_segment, origin) {
    const urls = [url]
    const results = {};
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
              maxValue = column.meta_data.statistics?.max_value,
              minValue = column.meta_data.statistics?.min_value,
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
      await this.readAndUpdateMap(map, rg.id, geography, rg.file, rg.metadata, rg.rowGroup, results, job_segment, origin);
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

  colorScale.originDropdown.addEventListener("change", async (event) => {
    const urlParams = new URLSearchParams(window.location.search);

    originParam = event.target.value;
    validOrigin = validOriginInput(originParam);
    validGeography = validGeographyInput(geographyParam);

    if (validOrigin && validGeography) {
      colorScale.updateLabels(map.map.getZoom(), geographyParam);
      setUrlParam("origin", originParam);

      idParam = urlParams.get("id");
      validId = validIdInput(idParam);

      if (idParam && validId) {
        await processor.runQuery(
          map, originParam, jobSegmentParam, yearParam, geographyParam,
          idParam.substring(0, 2), idParam
        );

        if(map.hoveredPolygonId[geographyParam]) {
          map.updateGeoIdDisplay(map.hoveredPolygonId[geographyParam], map.processor.previousResults[geographyParam][map.hoveredPolygonId[geographyParam]]?.count)
        }
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
          map, originParam, jobSegmentParam, yearParam, geographyParam,
          idParam.substring(0, 2), idParam
        );

        if(map.hoveredPolygonId[geographyParam]) {
          map.updateGeoIdDisplay(map.hoveredPolygonId[geographyParam], map.processor.previousResults[geographyParam][map.hoveredPolygonId[geographyParam]]?.count)
        }
      }
    }
  });

  colorScale.geographyDropdown.addEventListener("change", async (event) => {
    const urlParams = new URLSearchParams(window.location.search);

    geographyParam = event.target.value;
    validGeography = validGeographyInput(geographyParam);

    if (validGeography) {
      colorScale.updateLabels(map.map.getZoom(), geographyParam);
      map.switchLayerVisibility(geographyParam);
      setUrlParam("geography", geographyParam);

      idParam = urlParams.get("id");
      validId = validIdInput(idParam);

      if (idParam && validId) {
        await processor.runQuery(
          map, originParam, jobSegmentParam, yearParam, geographyParam,
          idParam.substring(0, 2), idParam
        );

        if(map.hoveredPolygonId[geographyParam]) {
          map.updateGeoIdDisplay(map.hoveredPolygonId[geographyParam], map.processor.previousResults[geographyParam][map.hoveredPolygonId[geographyParam]]?.count)
        }
      }
    }
  });

  colorScale.yearDropdown.addEventListener("change", async (event) => {
    const urlParams = new URLSearchParams(window.location.search);

    yearParam = event.target.value;
    validYear = validYearInput(yearParam);

    if (validYear) {
      setUrlParam("year", yearParam);

      idParam = urlParams.get("id");
      validId = validIdInput(idParam);

      if (idParam && validId) {
        await processor.runQuery(
          map, originParam, jobSegmentParam, yearParam, geographyParam,
          idParam.substring(0, 2), idParam
        );

        if(map.hoveredPolygonId[geographyParam]) {
          map.updateGeoIdDisplay(map.hoveredPolygonId[geographyParam], map.processor.previousResults[geographyParam][map.hoveredPolygonId[geographyParam]]?.count)
        }
      }
    }
  });

  map.map.on("load", async () => {
    const urlParams = new URLSearchParams(window.location.search);

    originParam = urlParams.get("origin") || LODES_ORIGIN;
    geographyParam = urlParams.get("geography") || LODES_GEOGRAPHY;
    yearParam = urlParams.get("year") || LODES_YEAR;

    validOrigin = validOriginInput(originParam);
    validYear = validYearInput(yearParam);
    validGeography = validGeographyInput(geographyParam);

    if (validOrigin && validGeography) {
      colorScale.updateLabels(map.map.getZoom(), geographyParam);
      urlParams.set("origin", originParam);
      document.getElementById("origin").value = originParam;
    }

    if (validGeography) {
      map.switchLayerVisibility(geographyParam);
      urlParams.set("geography", geographyParam);
      document.getElementById("geography").value = geographyParam;
    }

    if (validOrigin && validYear && validGeography) {
      idParam = urlParams.get("id");
      validId = validIdInput(idParam);
      document.getElementById("year").value = yearParam;

      if (idParam && validId) {
        await processor.runQuery(
          map, originParam, jobSegmentParam, yearParam, geographyParam,
          idParam.substring(0, 2), idParam
        );

        const truncId = map.truncateId(geographyParam, idParam)
        map.updateGeoIdDisplay(idParam, map.processor.previousResults[geographyParam][truncId]?.count)
      }
    }
  });
})();
