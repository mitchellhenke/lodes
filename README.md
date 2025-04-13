# LODESMap

[LODESMap](https://lodesmap.com/) builds an interactive map for exploring the United States Census Bureau's [Longitudinal Employer-Household Dynamics](https://lehd.ces.census.gov/data/) (LEHD) data. The LEHD Origin-Destination Employment Statistics (LODES) dataset shows where people live and work on the very granular Census block level.

A significant portion of this work is based on [OpenTimes](https://github.com/dfsnow/opentimes) by Dan Snow.

As an example from the raw data, the below table shows two rows of the data for Census blocks near one another in downtown Milwaukee. `w_geocode` represents the Census block where the job is and `h_geocode` represents the home Census block. `S000` is the total number of jobs. In the first row, there is one person that lives in Census block `550791874002040` and they work in Census block `550790144001016`. The second row shows that one person lives and works in Census block `550790144002007`.

|w_geocode      |h_geocode      |S000|SA01|SA02|SA03|SE01|SE02|SE03|SI01|SI02|SI03|createdate|
|---------------|---------------|----|----|----|----|----|----|----|----|----|----|----------|
|550790144001016|550791874002040|1   |1   |0   |0   |0   |0   |1   |0   |0   |1   |20240920  |
|550790144002007|550790144002007|1   |1   |0   |0   |0   |0   |1   |0   |0   |1   |20240920  |


By aggregating this data across larger geometries like Census tracts, Census block groups, counties, and Zip Code Tabulation Areas (ZCTAs), we can visualize where people travel from for work. For an example of what the data looks like after aggregation, the below row shows that there are 149 people that both live and work in the Census tract `55079014400` in downtown Milwaukee.

|w_tract    |h_tract    |S000|SA01|SA02|SA03|SE01|SE02|SE03|SI01|SI02|SI03|
|-----------|-----------|----|----|----|----|----|----|----|----|----|----|
|55079014400|55079014400|149 |71  |54  |24  |36  |27  |86  |1   |5   |143 |

The data across the different geometries is published in [Parquet files](https://en.wikipedia.org/wiki/Apache_Parquet) and can be downloaded for each individual State or federal district where LODES data is available. Alaska, Michigan and Mississippi currently do not.

The Census Bureau also publishes this data from previous years, allowing us to see how these patterns change over time.

## Setup / Development

Input and intermediate data is stored using [dvc](https://dvc.org/). Both Python and R are needed. Python is managed with [uv](https://github.com/astral-sh/uv).

The data is managed within the `data` directory and related sub-directories.

1. [Install uv](https://docs.astral.sh/uv/getting-started/installation/)
1. [Install R](https://www.r-project.org)
1. Run `uv run dvc exp run data/dvc.yaml`
  1. This will prepare all of the input and intermediate data, including LODES data and the data necessary to build [Protomaps](https://protomaps.com) tiles.
  1. (Optional) Upload data to public bucket for a given dataset, geography and year with `uv run src/upload_aggregate_lodes.py --dataset lodes --geography tract --year 2022`


### Tiles

LODES Version 8.3 is based on 2023 TIGER/Line shapefiles and 2020 Census blocks. [tippecanoe](https://github.com/felt/tippecanoe) is used for building the tilesets.

To build the tilesets:

1. [Install tippecanoe](https://github.com/felt/tippecanoe#installation)
1. Run `./src/create_tiles.sh 2023 block_group`
  1. (Optional) Upload the tiles to S3/R2 with `./src/upload_tiles.sh 2023 block_group`
1. Run `./src/create_tiles.sh 2023 tract`
  1. (Optional) Upload the tiles to S3/R2 with `./src/upload_tiles.sh 2023 tract`
