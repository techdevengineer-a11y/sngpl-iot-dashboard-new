"""
Script to list all station locations organized by section
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sngpl_iot")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def list_station_locations():
    """List all stations grouped by section with their locations"""
    db = SessionLocal()

    try:
        sections = ['I', 'II', 'III', 'IV', 'V']

        print("\n" + "="*100)
        print("STATION LOCATIONS BY SECTION")
        print("="*100)

        for section in sections:
            print(f"\n{'='*100}")
            print(f"SECTION {section}")
            print(f"{'='*100}")

            query = text("""
                SELECT
                    client_id,
                    device_name,
                    location,
                    region,
                    latitude,
                    longitude,
                    is_active
                FROM devices
                WHERE client_id LIKE :pattern
                ORDER BY client_id
            """)

            stations = db.execute(query, {"pattern": f'SMS-{section}-%'}).fetchall()

            if not stations:
                print(f"\n  No stations found in Section {section}")
                continue

            print(f"\nTotal Stations: {len(stations)}\n")
            print(f"{'Client ID':<15} {'Station Name':<35} {'Location/Region':<40} {'Active'}")
            print("-"*100)

            for station in stations:
                client_id = station[0]
                device_name = station[1] or 'N/A'
                location = station[2] or 'N/A'
                region = station[3] or 'N/A'
                lat = station[4]
                lon = station[5]
                is_active = station[6]

                # Combine location and region
                location_str = f"{location[:25]}, {region[:12]}" if location != 'N/A' else region[:40]
                active_icon = '✓' if is_active else '✗'

                print(f"{client_id:<15} {device_name[:33]:<35} {location_str:<40} {active_icon}")

                # Show coordinates if available
                if lat and lon and (lat != 0 or lon != 0):
                    print(f"{'':>15} Coordinates: {lat:.6f}, {lon:.6f}")

        # Summary by region
        print("\n" + "="*100)
        print("SUMMARY BY REGION")
        print("="*100)

        region_query = text("""
            SELECT
                region,
                section,
                COUNT(*) as station_count
            FROM devices
            WHERE client_id LIKE 'SMS-%'
            GROUP BY region, section
            ORDER BY region, section
        """)

        regions = db.execute(region_query).fetchall()

        print(f"\n{'Region':<25} {'Section':<10} {'Station Count'}")
        print("-"*50)

        for region in regions:
            region_name = region[0] or 'Unknown'
            section = region[1] or 'N/A'
            count = region[2]
            print(f"{region_name:<25} {section:<10} {count}")

        # Stations without coordinates
        print("\n" + "="*100)
        print("STATIONS WITHOUT COORDINATES (lat=0 or lon=0 or NULL)")
        print("="*100)

        no_coords_query = text("""
            SELECT
                client_id,
                device_name,
                location,
                region
            FROM devices
            WHERE client_id LIKE 'SMS-%'
              AND (latitude IS NULL OR longitude IS NULL OR latitude = 0 OR longitude = 0)
            ORDER BY client_id
        """)

        no_coords = db.execute(no_coords_query).fetchall()

        if no_coords:
            print(f"\nTotal: {len(no_coords)} stations\n")
            print(f"{'Client ID':<15} {'Station Name':<35} {'Location':<40}")
            print("-"*95)

            for station in no_coords:
                client_id = station[0]
                device_name = station[1] or 'N/A'
                location = station[2] or 'N/A'
                region = station[3] or 'N/A'
                location_str = f"{location[:25]}, {region}" if location != 'N/A' else region

                print(f"{client_id:<15} {device_name[:33]:<35} {location_str[:40]:<40}")
        else:
            print("\n✓ All stations have coordinates!")

        print("\n" + "="*100)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    list_station_locations()
