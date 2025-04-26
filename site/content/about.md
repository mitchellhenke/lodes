+++
title = "About"
+++

# What is LODESMap?


[LODESMap](https://lodesmap.com/) is an interactive map for exploring the United States Census Bureau's [Longitudinal Employer-Household Dynamics](https://lehd.ces.census.gov/data/) (LEHD) data. The LEHD Origin-Destination Employment Statistics (LODES) dataset shows where people live and work on the very granular Census block level. The map allows viewing both directions of travel for a given Census block group, tract, or county:

- Clicking on a geography with "Home" as the origin will show where people that live there go to work
- Clicking on a geography with "Work" as the origin will show where people that work there live

Everything is open-source and available on [GitHub](https://github.com/mitchellhenke/lodesmap).
See the [README](https://github.com/mitchellhenke/lodesmap?tab=readme-ov-file) for more.

A significant portion of this work is based on [OpenTimes](https://github.com/dfsnow/opentimes) by Dan Snow.

### Goals

---

## FAQs

<details>
<summary>Technology</summary>

For a more in-depth technical overview of the project, visit the LODESMap [GitHub](https://github.com/mitchellhenke/lodes) page.

#### What input data is used?

LODESMap currently uses two major data inputs:

1. United States Census Bureau's [TIGER/Line](https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html)
  shapefiles, which are used to construct origin and destination points.
1. United States Census Bureau's  [Longitudinal Employer-Household Dynamics](https://lehd.ces.census.gov/data/) (LEHD) data. The LEHD Origin-Destination Employment Statistics (LODES) dataset shows where people live and work on the very granular Census block level.

Input and intermediate data are built and cached by [DVC](https://dvc.org).
The total size of all input and intermediate data is around 300 GB.

#### How is the data served?

Data is served via Parquet files sitting in a public Cloudflare R2 bucket. The public site is hosted on GitHub Pages.

#### How much does this all cost to host?

It's surprisingly cheap. Basically the only cost is
[R2 storage](https://www.cloudflare.com/developer-platform/r2/) from
Cloudflare. Right now, total costs are under $15 per month.

#### What map stack do you use for the homepage?

The homepage uses [Maplibre GL JS](https://github.com/maplibre/maplibre-gl-js)
to show maps. The basemap is [OpenFreeMap's](https://openfreemap.org) Positron.
The tract-level boundaries are [TIGER/Line](https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html) cartographic boundaries converted to [PMTiles](https://github.com/protomaps/PMTiles) using [Tippecanoe](https://github.com/felt/tippecanoe) and hosted on R2.

When you click the map, your browser queries the Parquet files on the public
bucket using [hyparquet](https://github.com/hyparam/hyparquet). It then updates
the map fill using the returned destination IDs and population count.

</details>
---

## Colophon

### Who is behind this project?

### Why did you build this?
