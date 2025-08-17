+++
title = "About"
+++

# What is LODESMap?

[LODESMap](https://lodesmap.com/) is an interactive map for exploring the United States Census Bureau's [Longitudinal Employer-Household Dynamics](https://lehd.ces.census.gov/data/) (LEHD) data. The LEHD Origin-Destination Employment Statistics (LODES) dataset shows where people live and work on the very granular Census block level. The map allows viewing both directions of travel for a given Census block group, tract, county subdivision, or county:

- Clicking on a geography with "Home" as the origin will show where people that live there go to work
- Clicking on a geography with "Work" as the origin will show where people that work there live

The Job Segment filter can be used to filter workers by age, wage, or industry type, and the Year filter can be used to see changes over time.

We have intentionally made it easy to share maps. Copying the URL to bookmark it or send it to someone should preserve everything you've selected and present the exact same map when it is opened again.

Everything is open-source and available on [GitHub](https://github.com/mitchellhenke/lodes). See the [README](https://github.com/mitchellhenke/lodes?tab=readme-ov-file) for more.

A significant portion of this work is based on [OpenTimes](https://github.com/dfsnow/opentimes) by Dan Snow.

---

## FAQs

<details>
<summary>Data and Mapping</summary>

#### Why does it seem like some data is missing?

Not all states have data available each year. For example, in 2022 data is missing for people living in Michigan, Mississippi, and Alaska.

#### What's up with county subdivisions?

In the [Standard Hierarchy of Census Geographic Entities](https://www.census.gov/newsroom/blogs/random-samplings/2014/07/understanding-geographic-relationships-counties-places-tracts-and-more.html), county subdivisions are beneath counties, which means that each county subdivision must fit within a county. Sometimes, this can be an entire municipality. The City of Milwaukee is a good example. It sits entirely within Milwaukee County, so all of the City of Milwaukee can be represented in one county subdivision.

On the other hand, some municipal boundaries cross multiple counties. Wisconsin Dells, Wisconsin is one such case. It is a city in four different counties: Adams, Columbia, Juneau and Sauk. The result of this looks kind of odd in that there are four county subdivisions that represent Wisconsin Dells.

In less populated areas, a county subdivision can include multiple municipalities.

</details>

<details>
<summary>Technology</summary>

For a more in-depth technical overview of the project, visit the LODESMap [GitHub](https://github.com/mitchellhenke/lodes) page.

#### What input data is used?

LODESMap currently uses two major data inputs:

1. United States Census Bureau's [TIGER/Line](https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html)
  shapefiles, which are used to construct origin and destination geometries.
1. United States Census Bureau's [Longitudinal Employer-Household Dynamics](https://lehd.ces.census.gov/data/) (LEHD) Origin-Destination Employment Statistics (LODES) data.

The LODES data program collects information on employee addresses and workplaces from state unemployment insurance programs. It includes all workers who are on a normal payroll, but it does not include self-employed people. Every job is paired with a worksite, even if the employee works remotely. In this way, the LODES data can reveal remote workers in distant city-pairs. See the official LODES documentation for further details.

Input data is built and cached by [DVC](https://dvc.org). The total size of all input and output data is around 50 GB.

#### How is the data served?

Data is served via Parquet files in a public Cloudflare R2 bucket. The public site is hosted on GitHub Pages.

#### What map stack do you use for the homepage?

The map uses [Maplibre GL JS](https://github.com/maplibre/maplibre-gl-js) to show maps. The basemap is [OpenFreeMap's](https://openfreemap.org) Positron. The boundaries are [TIGER/Line](https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html) geometries converted to [PMTiles](https://github.com/protomaps/PMTiles) using [Tippecanoe](https://github.com/felt/tippecanoe).

When you click the map, your browser queries the Parquet files on the public bucket using [hyparquet](https://github.com/hyparam/hyparquet).
</details>

---

### Who is behind this project?

[John Johnson](https://johndjohnson.info) and [Mitchell Henke](https://www.mitchellhenke.com)

### Why did you build this?

LODES data is an incredible dataset that lacks an accessible interface and it is relatively unique in that past data is available in current Census geometries. We hope LODESMap makes it easier to understand where people live and work and how that has changed over time.
