#!/usr/bin/env python3
import argparse
import json
import os
import re
import subprocess
from datetime import datetime


def generate_xenium_cache(
    bucket="cholab-xenium-explorer-storage/sopa", output_file="xenium_cache.json"
):
    """Generate a cache of all experiment.xenium files in the bucket with extracted metadata."""
    try:
        # Fetch all files in bucket
        cmd = ["aws", "s3", "ls", f"s3://{bucket}/", "--recursive"]
        print(f"Fetching all files from s3://{bucket}/...")
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        all_files = result.stdout.splitlines()
    except subprocess.CalledProcessError as e:
        print(f"Error accessing S3 bucket: {e}")
        print(f"Error details: {e.stderr}")
        return False

    # Find experiment.xenium files and extract metadata
    xenium_files = []
    skipped_files = 0

    for file_info in all_files:
        # Skip files in .zarr directories
        if re.search(r"\.zarr/", file_info):
            skipped_files += 1
            continue

        if "experiment.xenium" in file_info:
            # Extract path and metadata
            parts = file_info.split()
            if len(parts) >= 4:
                date = parts[0]
                time = parts[1]
                size = parts[2]
                path = " ".join(parts[3:])
                s3_uri = f"s3://{bucket}/{path}"

                # Extract metadata from path
                metadata = extract_metadata_from_path(path)

                # Store file info with metadata
                xenium_files.append(
                    {
                        "date": date,
                        "time": time,
                        "size": size,
                        "s3_uri": s3_uri,
                        "path": path,
                        "metadata": metadata,
                    }
                )

    # Create cache with metadata
    cache = {
        "last_updated": datetime.now().isoformat(),
        "bucket": bucket,
        "file_count": len(xenium_files),
        "files": xenium_files,
    }

    # Write cache to file
    with open(output_file, "w") as f:
        json.dump(cache, f, indent=2)

    print(f"Cache generated with {len(xenium_files)} experiment.xenium files")
    print(f"Skipped {skipped_files} files in .zarr directories")
    print(f"Cache saved to {output_file}")

    return True


def extract_metadata_from_path(path):
    """Extract metadata fields from the path."""
    metadata = {
        "project": None,
        "brp_id": None,
        "panel": None,
        "full_experiment_id": None,
    }

    # Extract project (typically second component)
    path_parts = path.split("/")
    if len(path_parts) >= 2:
        metadata["project"] = path_parts[1]

    # Extract experiment ID components from folder names
    for part in path_parts:
        # Look for patterns like 50006A-TUQ97N-EA_2025-02-04-0920
        if re.match(r"^\w+\-\w+\-\w+\_", part):
            metadata["full_experiment_id"] = part
            # Extract BRP_ID (e.g., 50006A)
            brp_match = re.match(r"^(\w+)\-", part)
            if brp_match:
                metadata["brp_id"] = brp_match.group(1)

            # Extract Panel (e.g., TUQ97N)
            panel_match = re.match(r"^\w+\-(\w+)\-", part)
            if panel_match:
                metadata["panel"] = panel_match.group(1)

    return metadata


def main():
    parser = argparse.ArgumentParser(
        description="Generate cache of experiment.xenium files"
    )
    parser.add_argument(
        "--bucket", default="cholab-xenium-explorer-storage/sopa", help="S3 bucket name"
    )
    parser.add_argument(
        "--output", default="xenium_cache.json", help="Output cache file path"
    )
    args = parser.parse_args()

    generate_xenium_cache(args.bucket, args.output)


if __name__ == "__main__":
    main()
