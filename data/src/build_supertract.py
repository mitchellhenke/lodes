import argparse
from pathlib import Path

import geopandas as gpd

def build_supertracts(year: str) -> None:
    output_dir = (
        Path.cwd() / "input" / "cb" / f"year={year}" / f"geography=supertract"
    )
    output_file = output_dir / f"supertract.geojson"
    output_dir.mkdir(parents=True, exist_ok=True)

    tract_file = (
        Path.cwd() / "input" / "cb" / f"year={year}" / "geography=tract/tract.geojson"
    )

    gdf = gpd.read_file(tract_file)
    gdf['id'] = gdf['id'].str[:7]
    gdf = gdf.dissolve(by='id')
    gdf.to_file(output_file, layer="geometry")

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", required=True, type=str)
    args = parser.parse_args()
    build_supertracts(year=args.year)


if __name__ == "__main__":
    main()
