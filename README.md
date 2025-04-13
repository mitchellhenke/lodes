# LODESMap

[LODESMap](https://lodesmap.com/) builds an interactive map for exploring the United States Census Bureau's [Longitudinal Employer-Household Dynamics](https://lehd.ces.census.gov/data/) (LEHD) data. The LEHD Origin-Destination Employment Statistics (LODES) dataset shows where people live and work on the very granular Census block level.

## Setup

Input and intermediate data is stored using [dvc](https://dvc.org/). Both Python and R are needed. Python is managed with [uv](https://github.com/astral-sh/uv).

1. [Install uv](https://docs.astral.sh/uv/getting-started/installation/)
1. [Install R](https://www.r-project.org)
1. Run `uv run dvc exp run data/dvc.yaml`
  - This will prepare all of the input and intermediate data, including LODES data and the data necessary to build [Protomaps](https://protomaps.com) tiles.
1. Run `uv run dvc exp run data/dvc.yaml`


### Tiles
