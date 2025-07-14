import argparse
import shutil
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import geopandas as gpd
import pandas as pd
import requests as r
import yaml

with open("params.yaml") as file:
    params = yaml.safe_load(file)

TIGER_BASE_URL = "https://www2.census.gov/geo/tiger/"
# Translate geography names to their TIGER equivalents
TIGER_GEO_NAMES = {
    "state": {"type": "national", "name": "state"},
    "county": {"type": "national", "name": "county"},
    "zcta": {"type": "national", "name": "zcta520"},
    "county_subdivision": {"type": "state", "name": "cousub"},
    "tract": {"type": "state", "name": "tract"},
    "block_group": {"type": "state", "name": "bg"},
}

TIGER_GEO_STATE_ABBR_TO_FIPS = {
  "ak": "02",
  "al": "01",
  "ar": "05",
  "az": "04",
  "ca": "06",
  "co": "08",
  "ct": "09",
  "dc": "11",
  "de": "10",
  "fl": "12",
  "ga": "13",
  "hi": "15",
  "ia": "19",
  "id": "16",
  "il": "17",
  "in": "18",
  "ks": "20",
  "ky": "21",
  "la": "22",
  "ma": "25",
  "md": "24",
  "me": "23",
  "mi": "26",
  "mn": "27",
  "mo": "29",
  "ms": "28",
  "mt": "30",
  "nc": "37",
  "nd": "38",
  "ne": "31",
  "nh": "33",
  "nj": "34",
  "nm": "35",
  "nv": "32",
  "ny": "36",
  "oh": "39",
  "ok": "40",
  "or": "41",
  "pa": "42",
  "ri": "44",
  "sc": "45",
  "sd": "46",
  "tn": "47",
  "tx": "48",
  "ut": "49",
  "va": "51",
  "vt": "50",
  "wa": "53",
  "wi": "55",
  "wv": "54",
  "wy": "56"
}


def download_and_load_shapefile(
    year: str, geography: str, state: str | None, temp_dir: Path
):
    if not state:
        geo_prefix = "_us_"
    else:
        geo_prefix = f"_{state}_"

    remote_file_name = (
        f"cb_{year}{geo_prefix}{TIGER_GEO_NAMES[geography]['name']}_500k.zip"
    )
    url = f"{TIGER_BASE_URL}GENZ{year}/shp/{remote_file_name}"
    temp_file = Path(temp_dir) / remote_file_name

    try:
        response = r.get(url, stream=True)
        response.raise_for_status()

        with open(temp_file, "wb") as file:
            for chunk in response.iter_content(chunk_size=8192):
                file.write(chunk)

        gdf = load_shapefile(temp_file)
        return gdf

    except r.exceptions.RequestException as e:
        print(e)
        return None


def fetch_cb_shapefile(
    year: str,
    geography: str,
    temp_dir: str = tempfile.gettempdir(),
) -> None:
    """
    Fetch TIGER/Line cartographic boundary shapefiles for a
    given year, geography, and state.

    Args:
        year: The year of the TIGER/Line data.
        geography: The Census geography type of the shapefile.
    """
    if TIGER_GEO_NAMES[geography]["type"] == "national":
        states = [None]
    else:
        states = list(map(lambda x: TIGER_GEO_STATE_ABBR_TO_FIPS[x], params["input"]["state"]))

    output_dir = (
        Path.cwd() / "input" / "cb" / f"year={year}" / f"geography={geography}"
    )
    output_file = output_dir / f"{geography}.geojson"
    output_dir.mkdir(parents=True, exist_ok=True)

    gdf_list = []
    with tempfile.TemporaryDirectory() as temp_dir:
        with ThreadPoolExecutor() as executor:
            future_to_geoid = {
                executor.submit(
                    download_and_load_shapefile,
                    year,
                    geography,
                    state,
                    Path(temp_dir),
                ): state
                for state in states
            }
            for future in as_completed(future_to_geoid):
                gdf = future.result()
                if gdf is not None:
                    gdf_list.append(gdf)

    gdf_concat = pd.concat(gdf_list, ignore_index=True)
    gdf_concat = gdf_concat.to_crs(epsg=4326)
    columns = ["geoid", "geometry"]
    if geography in ["county", "county_subdivision"]:
        columns = ["geoid", "geometry", "name"]
    gdf_concat = gdf_concat[columns].rename(
        columns={"geoid": "id"}
    )
    gdf_concat.to_file(output_file, layer="geometry")

def load_shapefile(path: str | Path) -> gpd.GeoDataFrame:
    """
    Load a shapefile into as a GeoDataFrame by first unpacking into a
    temporary directory.

    Args:
        path: Path to the shapefile.

    Returns:
        A GeoDataFrame containing the shapefile contents.
    """
    with tempfile.TemporaryDirectory() as tmpdirname:
        shutil.unpack_archive(path, tmpdirname)
        tmpdir_path = Path(tmpdirname)

        shapefile_path = next(tmpdir_path.rglob("*.shp"), None)
        if shapefile_path is None:
            raise FileNotFoundError("Shapefile not found in file")

        gdf = gpd.read_file(shapefile_path)
        gdf.columns = gdf.columns.str.lower().str.replace(
            r"\d+", "", regex=True
        )
        return gdf


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", required=True, type=str)
    parser.add_argument("--geography", required=False, type=str)
    args = parser.parse_args()
    fetch_cb_shapefile(year=args.year, geography=args.geography)


if __name__ == "__main__":
    main()
