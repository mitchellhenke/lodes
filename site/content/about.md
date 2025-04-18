+++
title = "About"
+++

# What is LODESMap?

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
the map fill using the returned destination IDs and times.

#### Why is the homepage slow sometimes?

The big Parquet files that it queries are supposed to be cached by Cloudflare's
CDN. However, Cloudflare doesn't like large files sitting in its caches,
so the files are constantly getting evicted.

If you click the map and it's slow, it's likely that you're hitting a cold cache.
Click again and it should be much faster. Each state has its own file, so
if you're switching between states you're more likely to encounter a cold cache.

</details>

<details>
<summary>Usage</summary>

#### Are there any usage limits?

No. However, note that the data is hosted by
[Cloudflare](https://www.cloudflare.com), which may impose its own limits if
it determines you're acting maliciously.

#### How do I cite this data?

Attribution is required when using OpenTimes data.

Please see the
[CITATION file on GitHub](https://github.com/dfsnow/opentimes/blob/master/CITATION.cff).
You can also generate APA and BibTeX citations directly from the
project's [GitHub page](https://github.com/dfsnow/opentimes?tab=readme-ov-file#opentimes).

#### What license do you use?

OpenTimes uses the [MIT](https://www.tldrlegal.com/license/mit-license) license.
Input data is from [OpenStreetMap](https://www.openstreetmap.org) and the
[U.S. Census](https://www.census.gov). The basemap on the homepage is
from [OpenFreeMap](https://openfreemap.org). Times are calculated using
[OSRM](https://project-osrm.org).

</details>

---

## Colophon

### Who is behind this project?

I'm Dan Snow, a data scientist/policy wonk currently living in San Francisco.
My blog is at [sno.ws](https://sno.ws).

I spent some time during graduate school as an RA at the
[Center for Spatial Data Science](https://spatial.uchicago.edu), where I helped
calculate lots of travel times. OpenTimes is sort of the spiritual successor to
that work.

I built most of OpenTimes during a six-week programming retreat at the
[Recurse Center](https://www.recurse.com/scout/click?t=e5f3c6558aa58965ec2efe48b1b486af),
which I highly recommend. If you need to contact me about this project, please
reach out [via email](mailto:info@opentimes.org).

### Why did you build this?

A few reasons:

- Bulk travel times are really useful for quantifying access to amenities. In
  academia, they're used to measure spatial access to
  [primary care](https://sno.ws/rural-docs/),
  [abortion](https://www.nytimes.com/interactive/2019/05/31/us/abortion-clinics-map.html),
  and [grocery stores](https://doi.org/10.1186/1476-072X-8-9). In industry,
  they're used to construct [indices for urban amenity access](https://www.walkscore.com)
  and as features for predictive models for real estate prices.
- There's a gap in the open-source spatial ecosystem. The number of open-source
  routing engines, spatial analysis tools, and web mapping libraries has exploded
  in the last decade, but bulk travel times are still difficult to get and/or expensive.
- It's a fun technical challenge to calculate and serve billions of records.
- I was inspired by the [OpenFreeMap](https://openfreemap.org) project and
  wanted to use my own domain knowledge to do something similar.
