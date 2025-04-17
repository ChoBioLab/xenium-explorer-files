#!/usr/bin/env python3
import json
import logging
import os
import re
import subprocess
import sys
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "xenium_cache.log")
        ),
        logging.StreamHandler(),
    ],
)


def generate_xenium_cache():
    """Generate a cache of all experiment.xenium files and save to project root."""
    # Get the project root directory (one level up from the script location)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    output_file = os.path.join(project_root, "xenium_cache.json")

    bucket = "cholab-xenium-explorer-storage"
    logging.info(f"Starting cache generation for s3://{bucket}/")

    try:
        # Fetch all files in bucket
        cmd = ["aws", "s3", "ls", f"s3://{bucket}/", "--recursive"]
        logging.info(f"Running AWS command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        all_files = result.stdout.splitlines()
        logging.info(f"Found {len(all_files)} total files in S3 bucket")
    except subprocess.CalledProcessError as e:
        logging.error(f"Error accessing S3 bucket: {e}")
        logging.error(f"Error details: {e.stderr}")
        return False

    # Process experiment.xenium files and extract metadata
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

    # Write cache to file in project root
    with open(output_file, "w") as f:
        json.dump(cache, f, indent=2)

    logging.info(f"Cache generated with {len(xenium_files)} experiment.xenium files")
    logging.info(f"Skipped {skipped_files} files in .zarr directories")
    logging.info(f"Cache saved to {output_file}")

    return True


def extract_metadata_from_path(path):
    """Extract metadata fields from the path."""
    metadata = {
        "project": None,
        "brp_id": None,  # Block ID
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
            # Extract Block ID (e.g., 50006A)
            block_match = re.match(r"^(\w+)\-", part)
            if block_match:
                metadata["brp_id"] = block_match.group(1)

            # Extract Panel (e.g., TUQ97N)
            panel_match = re.match(r"^\w+\-(\w+)\-", part)
            if panel_match:
                metadata["panel"] = panel_match.group(1)

    return metadata


if __name__ == "__main__":
    generate_xenium_cache()
